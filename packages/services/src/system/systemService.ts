import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { arch, cpus, freemem, homedir, hostname, loadavg, totalmem } from "node:os";
import { Socket } from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import type {
  IntegratedTerminalShellOption,
  IntranetProbeRequest,
  IntranetProbeResult,
  IntranetProbeServiceResponse,
  IntranetProbeServiceTarget,
  IntranetProbeServiceTargetResult,
  IntranetProbeTarget,
  IntranetProbeTcpTarget,
  IntranetProbeTcpTargetResult,
  SystemEnvironmentKind,
  SystemEnvironmentLoad,
  SystemInfo,
} from "@mcode/shared";
import type { WindowsGitBashDiscoveryOptions } from "@mcode/shared/node";
import type { ISystemService } from "./system.js";
import { listIntegratedTerminalShellOptions } from "./integratedTerminalShells.js";

const DEFAULT_PROBE_TIMEOUT_MS = 800;
const DEFAULT_PROBE_ATTEMPTS = 2;
const MAX_PROBE_ATTEMPTS = 3;
const DEFAULT_PROBE_PORT = 22;

interface NormalizedProbeTarget {
  kind: "tcp";
  targetId: string;
  host: string;
  port: number;
  timeoutMs: number;
}

interface NormalizedServiceProbeTarget {
  kind: "service";
  targetId: string;
  url: string;
  expectedMarker?: string;
  token?: string;
  timeoutMs: number;
}

type NormalizedTarget = NormalizedProbeTarget | NormalizedServiceProbeTarget;

interface TcpProbeParams {
  host: string;
  port: number;
  timeoutMs: number;
}

interface CreateSystemServiceOptions {
  env?: NodeJS.ProcessEnv;
  gitBashDiscovery?: Omit<WindowsGitBashDiscoveryOptions, "env" | "platform" | "isExecutable">;
  isExecutable?: WindowsGitBashDiscoveryOptions["isExecutable"];
  platform?: NodeJS.Platform;
  tcpProbe?: (params: TcpProbeParams) => Promise<number>;
  serviceProbe?: (params: ServiceProbeParams) => Promise<ServiceProbeResult>;
  now?: () => number;
}

interface ServiceProbeParams {
  url: string;
  timeoutMs: number;
  token?: string;
}

interface ServiceProbeResult {
  latencyMs: number;
  marker?: string;
}

function normalizeProbeAttempts(attempts: number | undefined): number {
  if (typeof attempts !== "number" || !Number.isFinite(attempts)) {
    return DEFAULT_PROBE_ATTEMPTS;
  }

  return Math.min(MAX_PROBE_ATTEMPTS, Math.max(1, Math.floor(attempts)));
}

function normalizeRequiredSuccessCount(
  requiredSuccessCount: number | undefined,
  totalTargets: number,
): number {
  if (totalTargets <= 0) {
    return 1;
  }

  if (typeof requiredSuccessCount !== "number" || !Number.isFinite(requiredSuccessCount)) {
    return 1;
  }

  return Math.min(totalTargets, Math.max(1, Math.floor(requiredSuccessCount)));
}

function normalizeProbeTimeout(timeoutMs: number | undefined): number {
  return typeof timeoutMs === "number" && Number.isFinite(timeoutMs)
    ? Math.min(10_000, Math.max(100, Math.floor(timeoutMs)))
    : DEFAULT_PROBE_TIMEOUT_MS;
}

function normalizeTcpTarget(target: IntranetProbeTcpTarget): NormalizedProbeTarget | null {
  const host = target.host.trim();
  if (host.length === 0) {
    return null;
  }

  const resolvedPort =
    typeof target.port === "number" &&
    Number.isInteger(target.port) &&
    target.port >= 1 &&
    target.port <= 65535
      ? target.port
      : DEFAULT_PROBE_PORT;

  return {
    kind: "tcp",
    targetId: target.id?.trim() || `${host}:${resolvedPort}`,
    host,
    port: resolvedPort,
    timeoutMs: normalizeProbeTimeout(target.timeoutMs),
  };
}

function normalizeServiceTarget(
  target: IntranetProbeServiceTarget,
): NormalizedServiceProbeTarget | null {
  const urlText = target.url.trim();
  if (urlText.length === 0) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlText);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  const expectedMarker = target.expectedMarker?.trim();
  const token = target.token?.trim();

  return {
    kind: "service",
    targetId: target.id?.trim() || parsedUrl.toString(),
    url: parsedUrl.toString(),
    expectedMarker: expectedMarker && expectedMarker.length > 0 ? expectedMarker : undefined,
    token: token && token.length > 0 ? token : undefined,
    timeoutMs: normalizeProbeTimeout(target.timeoutMs),
  };
}

function normalizeProbeTarget(target: IntranetProbeTarget): NormalizedTarget | null {
  if (target.kind === "service") {
    return normalizeServiceTarget(target);
  }

  return normalizeTcpTarget(target);
}

async function runProbeWithRetry(
  target: NormalizedProbeTarget,
  attempts: number,
  tcpProbe: (params: TcpProbeParams) => Promise<number>,
): Promise<IntranetProbeTcpTargetResult> {
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const latencyMs = await tcpProbe({
        host: target.host,
        port: target.port,
        timeoutMs: target.timeoutMs,
      });
      return {
        targetId: target.targetId,
        kind: "tcp",
        host: target.host,
        port: target.port,
        reachable: true,
        attemptCount: attempt,
        latencyMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    targetId: target.targetId,
    kind: "tcp",
    host: target.host,
    port: target.port,
    reachable: false,
    attemptCount: attempts,
    latencyMs: null,
    error: lastError || "probe failed",
  };
}

function parseProbeServiceResponse(payload: unknown): IntranetProbeServiceResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("invalid service response");
  }

  const response = payload as IntranetProbeServiceResponse;
  if (typeof response.ok !== "boolean") {
    throw new Error("invalid service response: missing ok");
  }

  if (
    "marker" in response &&
    response.marker !== undefined &&
    typeof response.marker !== "string"
  ) {
    throw new Error("invalid service response: marker must be string");
  }

  return response;
}

async function probeServiceEndpoint(params: ServiceProbeParams): Promise<ServiceProbeResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const response = await fetch(params.url, {
      method: "GET",
      headers: params.token ? { "x-zcode-intranet-token": params.token } : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const responseBody = parseProbeServiceResponse(await response.json());
    if (!responseBody.ok) {
      throw new Error("service returned ok=false");
    }

    return {
      latencyMs: Math.max(0, Date.now() - startedAt),
      marker: responseBody.marker,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`timeout(${params.timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runServiceProbeWithRetry(
  target: NormalizedServiceProbeTarget,
  attempts: number,
  serviceProbe: (params: ServiceProbeParams) => Promise<ServiceProbeResult>,
): Promise<IntranetProbeServiceTargetResult> {
  let lastError = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await serviceProbe({
        url: target.url,
        timeoutMs: target.timeoutMs,
        token: target.token,
      });

      if (target.expectedMarker && result.marker !== target.expectedMarker) {
        throw new Error(
          `marker mismatch(expected=${target.expectedMarker}, actual=${result.marker ?? "<empty>"})`,
        );
      }

      return {
        targetId: target.targetId,
        kind: "service",
        url: target.url,
        reachable: true,
        attemptCount: attempt,
        latencyMs: result.latencyMs,
        marker: result.marker,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    targetId: target.targetId,
    kind: "service",
    url: target.url,
    reachable: false,
    attemptCount: attempts,
    latencyMs: null,
    error: lastError || "probe failed",
  };
}

function resolveProbeStrategy(targets: NormalizedTarget[]): IntranetProbeResult["strategy"] {
  if (targets.every((target) => target.kind === "tcp")) {
    return "tcp-connect";
  }
  if (targets.every((target) => target.kind === "service")) {
    return "service-http";
  }
  return "mixed";
}

function probeTcpPort(params: TcpProbeParams): Promise<number> {
  const { host, port, timeoutMs } = params;
  const startedAt = Date.now();

  return new Promise<number>((resolve, reject) => {
    const socket = new Socket();
    let settled = false;

    const finalize = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      handler();
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      const latencyMs = Math.max(0, Date.now() - startedAt);
      finalize(() => resolve(latencyMs));
    });
    socket.once("timeout", () => {
      finalize(() => reject(new Error(`timeout(${timeoutMs}ms)`)));
    });
    socket.once("error", (error) => {
      finalize(() => reject(error));
    });
    socket.connect(port, host);
  });
}

const ENV_LOAD_CACHE_TTL_MS = 1_000;

async function readTextOptional(path: string): Promise<string | null> {
  try {
    return (await readFile(path, "utf8")).trim();
  } catch {
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

async function detectEnvironmentKind(platform: NodeJS.Platform): Promise<SystemEnvironmentKind> {
  if (platform !== "linux") return "host";
  if ((await fileExists("/.dockerenv")) || (await fileExists("/run/.containerenv"))) {
    return "docker";
  }
  const cgroup = (await readTextOptional("/proc/1/cgroup")) ?? "";
  if (/docker|containerd|kubepods|podman/iu.test(cgroup)) return "docker";
  if (/lxc|sandbox|gvisor|kata/iu.test(cgroup)) return "sandbox";
  return "host";
}

async function readContainerCpuCores(hostCores: number): Promise<number> {
  const cpuMax = await readTextOptional("/sys/fs/cgroup/cpu.max");
  if (cpuMax) {
    const [quotaRaw, periodRaw] = cpuMax.split(/\s+/u);
    const quota = Number(quotaRaw);
    const period = Number(periodRaw);
    if (Number.isFinite(quota) && Number.isFinite(period) && quota > 0 && period > 0) {
      return Math.max(0.1, Math.min(hostCores, Math.round((quota / period) * 10) / 10));
    }
  }
  const quotaV1 = Number(await readTextOptional("/sys/fs/cgroup/cpu/cpu.cfs_quota_us"));
  const periodV1 = Number(await readTextOptional("/sys/fs/cgroup/cpu/cpu.cfs_period_us"));
  if (Number.isFinite(quotaV1) && Number.isFinite(periodV1) && quotaV1 > 0 && periodV1 > 0) {
    return Math.max(0.1, Math.min(hostCores, Math.round((quotaV1 / periodV1) * 10) / 10));
  }
  return hostCores;
}

async function readContainerCpuUsageUsec(): Promise<number | null> {
  const cpuStat = await readTextOptional("/sys/fs/cgroup/cpu.stat");
  if (cpuStat) {
    const match = cpuStat.match(/^usage_usec\s+(\d+)/mu);
    if (match) return Number(match[1]);
  }
  const usageNs = await readTextOptional("/sys/fs/cgroup/cpuacct/cpuacct.usage");
  if (usageNs && /^\d+$/u.test(usageNs)) return Math.floor(Number(usageNs) / 1_000);
  return null;
}

async function readContainerMemory(
  hostTotalBytes: number,
): Promise<{ usedBytes: number; totalBytes: number } | null> {
  const currentV2 = await readTextOptional("/sys/fs/cgroup/memory.current");
  const maxV2 = await readTextOptional("/sys/fs/cgroup/memory.max");
  if (currentV2 && /^\d+$/u.test(currentV2)) {
    const used = Number(currentV2);
    const limit = maxV2 && /^\d+$/u.test(maxV2) ? Number(maxV2) : hostTotalBytes;
    const total = limit > 0 && limit < hostTotalBytes * 16 ? Math.min(limit, hostTotalBytes) : hostTotalBytes;
    return { usedBytes: Math.min(used, total), totalBytes: total };
  }
  const currentV1 = await readTextOptional("/sys/fs/cgroup/memory/memory.usage_in_bytes");
  const maxV1 = await readTextOptional("/sys/fs/cgroup/memory/memory.limit_in_bytes");
  if (currentV1 && /^\d+$/u.test(currentV1)) {
    const used = Number(currentV1);
    const limit = maxV1 && /^\d+$/u.test(maxV1) ? Number(maxV1) : hostTotalBytes;
    const total = limit > 0 && limit < hostTotalBytes * 16 ? Math.min(limit, hostTotalBytes) : hostTotalBytes;
    return { usedBytes: Math.min(used, total), totalBytes: total };
  }
  return null;
}

async function readLinuxHostMemory(
  fallbackTotal: number,
  fallbackFree: number,
): Promise<{ usedBytes: number; totalBytes: number }> {
  const meminfo = await readTextOptional("/proc/meminfo");
  if (meminfo) {
    const totalKb = Number(meminfo.match(/^MemTotal:\s+(\d+)/mu)?.[1]);
    const availKb = Number(meminfo.match(/^MemAvailable:\s+(\d+)/mu)?.[1]);
    if (Number.isFinite(totalKb) && totalKb > 0 && Number.isFinite(availKb) && availKb >= 0) {
      const totalBytes = totalKb * 1024;
      return { usedBytes: Math.max(0, totalBytes - availKb * 1024), totalBytes };
    }
  }
  return { usedBytes: Math.max(0, fallbackTotal - fallbackFree), totalBytes: fallbackTotal };
}

async function readDarwinHostMemory(
  fallbackTotal: number,
  fallbackFree: number,
): Promise<{ usedBytes: number; totalBytes: number }> {
  try {
    const { stdout } = await execFileAsync("vm_stat", [], { timeout: 1_500 });
    const pageSize = Number(stdout.match(/page size of (\d+) bytes/u)?.[1]) || 16_384;
    const readPages = (label: string): number => {
      const match = stdout.match(new RegExp(`^${label}:\\s+(\\d+)`, "mu"));
      return match ? Number(match[1]) : 0;
    };
    // 与 macOS 活动监视器口径一致：App Memory (Anonymous - Purgeable) + Wired + Compressed
    const anonymous = readPages("Anonymous pages");
    const purgeable = readPages("Pages purgeable");
    const wired = readPages("Pages wired down");
    const compressed = readPages("Pages occupied by compressor");
    const usedPages = Math.max(0, anonymous - purgeable) + wired + compressed;
    if (usedPages > 0) {
      return {
        usedBytes: Math.min(fallbackTotal, usedPages * pageSize),
        totalBytes: fallbackTotal,
      };
    }
  } catch {
    // 回退 os.freemem()
  }
  return { usedBytes: Math.max(0, fallbackTotal - fallbackFree), totalBytes: fallbackTotal };
}

function readHostCpuTotals(): { idle: number; total: number; cores: number } {
  const list = cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of list) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total, cores: Math.max(1, list.length) };
}

interface StaticHardwareSpec {
  readonly arch: string;
  readonly cpuModel?: string;
  readonly cpuSpec?: string;
  readonly memoryType?: string;
  readonly memorySpeedMhz?: number;
}

function parseSpeedMhz(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  if (typeof raw === "string") {
    const match = raw.match(/(\d+(?:\.\d+)?)\s*(?:MHz|MT\/s)/iu);
    if (match) return Math.round(Number(match[1]));
  }
  return undefined;
}

async function readStaticHardwareSpec(platform: NodeJS.Platform): Promise<StaticHardwareSpec> {
  const hostCpus = cpus();
  const baseCpuModel = hostCpus[0]?.model?.trim() || undefined;
  const baseSpeedMhz = hostCpus[0]?.speed && hostCpus[0].speed > 0 ? hostCpus[0].speed : undefined;
  const systemArch = arch();
  let cpuModel = baseCpuModel;
  let cpuSpec = baseSpeedMhz ? `${(baseSpeedMhz / 1000).toFixed(2)} GHz` : undefined;
  let memoryType: string | undefined;
  let memorySpeedMhz: number | undefined;

  if (platform === "darwin") {
    try {
      const { stdout } = await execFileAsync(
        "system_profiler",
        ["SPMemoryDataType", "SPHardwareDataType", "-json"],
        { timeout: 3_000, maxBuffer: 2 * 1024 * 1024 },
      );
      const parsed = JSON.parse(stdout) as {
        SPHardwareDataType?: Array<Record<string, unknown>>;
        SPMemoryDataType?: Array<Record<string, unknown>>;
      };
      const hw = parsed.SPHardwareDataType?.[0];
      if (typeof hw?.["chip_type"] === "string" && hw["chip_type"].trim()) {
        cpuModel = hw["chip_type"].trim();
      }
      if (typeof hw?.["number_processors"] === "string") {
        // Apple Silicon 格式如 "proc 10:0:4:6" -> 4P+6E
        const m = hw["number_processors"].match(/proc\s+(\d+):\d+:(\d+):(\d+)/u);
        if (m) cpuSpec = `${m[2]}P+${m[3]}E`;
      }
      const memItem = parsed.SPMemoryDataType?.[0];
      const dimms = Array.isArray(memItem?.["_items"])
        ? (memItem["_items"] as Array<Record<string, unknown>>)
        : memItem
          ? [memItem]
          : [];
      for (const dimm of dimms) {
        if (!memoryType && typeof dimm["dimm_type"] === "string" && dimm["dimm_type"].trim()) {
          memoryType = dimm["dimm_type"].trim();
        }
        if (!memorySpeedMhz) memorySpeedMhz = parseSpeedMhz(dimm["dimm_speed"]);
      }
    } catch {
      // 忽略，保留 os.cpus() 基础信息
    }
  } else if (platform === "win32") {
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1 SMBIOSMemoryType,Speed | ConvertTo-Json -Compress",
        ],
        { timeout: 3_000 },
      );
      const parsed = JSON.parse(stdout.trim() || "{}") as {
        SMBIOSMemoryType?: number;
        Speed?: number;
      };
      const typeMap: Record<number, string> = {
        24: "DDR3",
        26: "DDR4",
        29: "LPDDR3",
        30: "LPDDR4",
        34: "DDR5",
        35: "LPDDR5",
      };
      if (parsed.SMBIOSMemoryType && typeMap[parsed.SMBIOSMemoryType]) {
        memoryType = typeMap[parsed.SMBIOSMemoryType];
      }
      memorySpeedMhz = parseSpeedMhz(parsed.Speed);
    } catch {
      // 忽略
    }
  } else if (platform === "linux") {
    try {
      const { stdout } = await execFileAsync("dmidecode", ["-t", "memory"], { timeout: 2_000 });
      const typeMatch = stdout.match(/^\s*Type:\s*(DDR\d|LPDDR\d\w*)/mu);
      if (typeMatch) memoryType = typeMatch[1];
      const speedMatch = stdout.match(/^\s*(?:Configured Memory Speed|Speed):\s*(\d+\s*(?:MHz|MT\/s))/mu);
      if (speedMatch) memorySpeedMhz = parseSpeedMhz(speedMatch[1]);
    } catch {
      // 非 root 或容器环境静默忽略
    }
  }

  return {
    arch: systemArch,
    ...(cpuModel ? { cpuModel } : {}),
    ...(cpuSpec ? { cpuSpec } : {}),
    ...(memoryType ? { memoryType } : {}),
    ...(memorySpeedMhz ? { memorySpeedMhz } : {}),
  };
}

export function createSystemService(options: CreateSystemServiceOptions = {}): ISystemService {
  const tcpProbe = options.tcpProbe ?? probeTcpPort;
  const serviceProbe = options.serviceProbe ?? probeServiceEndpoint;
  const now = options.now ?? Date.now;
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;

  let cachedKindPromise: Promise<SystemEnvironmentKind> | null = null;
  let cachedHardwareSpecPromise: Promise<StaticHardwareSpec> | null = null;
  let cachedLoad: SystemEnvironmentLoad | null = null;
  let prevHostCpu: { idle: number; total: number } | null = null;
  let prevContainerCpu: { usageUsec: number; tsMs: number } | null = null;

  return {
    async info(): Promise<SystemInfo> {
      return { homedir: homedir(), platform: process.platform };
    },

    async getEnvironmentLoad(): Promise<SystemEnvironmentLoad> {
      const sampledAt = now();
      if (cachedLoad && sampledAt - cachedLoad.sampledAt < ENV_LOAD_CACHE_TTL_MS) {
        return cachedLoad;
      }
      if (!cachedKindPromise) {
        cachedKindPromise = detectEnvironmentKind(platform);
      }
      if (!cachedHardwareSpecPromise) {
        cachedHardwareSpecPromise = readStaticHardwareSpec(platform);
      }
      const [environmentKind, hwSpec] = await Promise.all([
        cachedKindPromise,
        cachedHardwareSpecPromise,
      ]);
      const hostTotalMem = totalmem();
      const hostFreeMem = freemem();
      const hostCpu = readHostCpuTotals();
      const isContainer = environmentKind !== "host";

      let cpuCores = hostCpu.cores;
      let cpuPercent = 0;
      if (isContainer) {
        cpuCores = await readContainerCpuCores(hostCpu.cores);
        const usageUsec = await readContainerCpuUsageUsec();
        if (usageUsec !== null) {
          if (prevContainerCpu && sampledAt > prevContainerCpu.tsMs) {
            const deltaUsec = Math.max(0, usageUsec - prevContainerCpu.usageUsec);
            const elapsedUsec = (sampledAt - prevContainerCpu.tsMs) * 1_000;
            cpuPercent = clampPercent((deltaUsec / (elapsedUsec * cpuCores)) * 100);
          }
          prevContainerCpu = { usageUsec, tsMs: sampledAt };
        }
      }
      if (!isContainer || prevContainerCpu === null) {
        if (prevHostCpu && hostCpu.total > prevHostCpu.total) {
          const totalDelta = hostCpu.total - prevHostCpu.total;
          const idleDelta = Math.max(0, hostCpu.idle - prevHostCpu.idle);
          cpuPercent = clampPercent(((totalDelta - idleDelta) / totalDelta) * 100);
        } else if (platform !== "win32") {
          const avg1 = loadavg()[0] ?? 0;
          cpuPercent = clampPercent((avg1 / cpuCores) * 100);
        }
        prevHostCpu = { idle: hostCpu.idle, total: hostCpu.total };
      }

      const mem = isContainer
        ? ((await readContainerMemory(hostTotalMem)) ?? {
            usedBytes: Math.max(0, hostTotalMem - hostFreeMem),
            totalBytes: hostTotalMem,
          })
        : platform === "linux"
          ? await readLinuxHostMemory(hostTotalMem, hostFreeMem)
          : platform === "darwin"
            ? await readDarwinHostMemory(hostTotalMem, hostFreeMem)
            : { usedBytes: Math.max(0, hostTotalMem - hostFreeMem), totalBytes: hostTotalMem };

      const memoryPercent =
        mem.totalBytes > 0 ? clampPercent((mem.usedBytes / mem.totalBytes) * 100) : 0;
      const loadAvg1m =
        platform === "win32" ? undefined : Math.round(((loadavg()[0] ?? 0) * 100)) / 100;

      cachedLoad = {
        environmentKind,
        hostname: hostname(),
        platform,
        arch: hwSpec.arch,
        ...(hwSpec.cpuModel ? { cpuModel: hwSpec.cpuModel } : {}),
        ...(hwSpec.cpuSpec ? { cpuSpec: hwSpec.cpuSpec } : {}),
        cpuPercent,
        cpuCores,
        memoryUsedBytes: mem.usedBytes,
        memoryTotalBytes: mem.totalBytes,
        memoryPercent,
        ...(hwSpec.memoryType ? { memoryType: hwSpec.memoryType } : {}),
        ...(hwSpec.memorySpeedMhz ? { memorySpeedMhz: hwSpec.memorySpeedMhz } : {}),
        ...(loadAvg1m !== undefined ? { loadAvg1m } : {}),
        sampledAt,
      };
      return cachedLoad;
    },

    async listIntegratedTerminalShells(): Promise<IntegratedTerminalShellOption[]> {
      return listIntegratedTerminalShellOptions({
        env,
        gitBashDiscovery: options.gitBashDiscovery,
        isExecutable: options.isExecutable,
        platform,
      });
    },

    async probeIntranet(request: IntranetProbeRequest): Promise<IntranetProbeResult> {
      const normalizedTargets = request.targets
        .map(normalizeProbeTarget)
        .filter((target): target is NormalizedTarget => target !== null);
      const attempts = normalizeProbeAttempts(request.attempts);
      const requiredSuccessCount = normalizeRequiredSuccessCount(
        request.requiredSuccessCount,
        normalizedTargets.length,
      );

      const results = await Promise.all(
        normalizedTargets.map((target) => {
          if (target.kind === "service") {
            return runServiceProbeWithRetry(target, attempts, serviceProbe);
          }
          return runProbeWithRetry(target, attempts, tcpProbe);
        }),
      );
      const reachedTargetCount = results.filter((result) => result.reachable).length;

      return {
        isIntranet: normalizedTargets.length > 0 && reachedTargetCount >= requiredSuccessCount,
        reachedTargetCount,
        requiredSuccessCount,
        totalTargets: normalizedTargets.length,
        checkedAt: now(),
        strategy: resolveProbeStrategy(normalizedTargets),
        results,
      };
    },
  };
}
