// 本地端到端：把 z.ai CDN 上游 zcode-server.cjs 当作「远端」，验证 Mcode 桌面侧的握手与 RPC 契约。
// 用法：bash scripts/dev/remote-upstream-e2e.sh（自动下载并校验上游组件）
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Emitter } from "@mcode/rpc";
import type { IRemoteBackend, StdioStream } from "../src/remote/backend.js";
import { connectRemote } from "../src/remote/connect.js";

const fakeHome = process.env.UPSTREAM_FAKE_HOME;
if (!fakeHome) throw new Error("UPSTREAM_FAKE_HOME is required");

const backend: IRemoteBackend = {
  async detect() {
    return { platform: "linux", arch: "x64" };
  },
  async upload() {
    throw new Error("upload not expected (skipDeploy)");
  },
  async exists(p) {
    return existsSync(p.replace(/^~/, fakeHome));
  },
  async readFile(p) {
    return readFileSync(p.replace(/^~/, fakeHome), "utf8");
  },
  async exec(command): Promise<StdioStream> {
    console.log("[e2e] exec:", command);
    const child = spawn("sh", ["-c", command], {
      env: { PATH: process.env.PATH, HOME: fakeHome },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const onClose = new Emitter<number>();
    child.on("close", (code) => onClose.fire(code ?? 0));
    return { stdin: child.stdin, stdout: child.stdout, stderr: child.stderr, onClose: onClose.event };
  },
  dispose() {},
};

const results: Record<string, string> = {};
async function probe(name: string, fn: () => Promise<unknown>) {
  try {
    const v = await Promise.race([
      fn(),
      new Promise((_, r) => setTimeout(() => r(new Error("timeout 20s")), 20_000)),
    ]);
    results[name] = "OK " + JSON.stringify(v)?.slice(0, 160);
  } catch (e) {
    results[name] = "ERR " + (e instanceof Error ? e.message : String(e)).slice(0, 200);
  }
}

const conn = await connectRemote(backend, {
  skipDeploy: true,
  clientId: "mcode-e2e",
  appVersion: "3.15.1",
  handshakeTimeout: 30_000,
  remoteRuntimeEnv: { MCODE_ENV: "production" },
} as never);
console.log("[e2e] handshake OK");
const s = conn.services as any;
const ws = join(fakeHome, "ws");
await probe("systemService.info", () => s.systemService.info());
await probe("fileService.stat", () => s.fileService.stat({ path: fakeHome }));
await probe("zcodeTaskService.initialize", () => s.zcodeTaskService.initialize({ workspacePath: ws }));
await probe("zcodeAgentService.initialize", () => s.zcodeAgentService.initialize({ workspacePath: ws }));
await probe("zcodeAgentService.listSessions", () => s.zcodeAgentService.listSessions({ workspacePath: ws }));
console.log(JSON.stringify(results, null, 2));
const failed = Object.entries(results).filter(([, v]) => v.startsWith("ERR"));
await conn.disposeAndWait({ timeoutMs: 5000 }).catch(() => conn.dispose());
process.exit(failed.length ? 1 : 0);
