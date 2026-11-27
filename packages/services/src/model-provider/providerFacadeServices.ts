import type { Event } from "@mcode/rpc";
import { ServiceChannels } from "@mcode/shared";
import {
  type ModelConfigObject,
  type ModelId,
  type ModelSelection,
  type ModelSelectionFacade,
  type ModelSelectionView,
  type ModelSelectionViewInput,
  type ProviderApiType,
  type ProviderConfigObject,
  type ProviderId,
  type ProviderSettingsFacade,
  type ProviderSettingsCreationResult,
  type ModelConfigResolution,
  type ProviderSettingsView,
  type ResolveModelConfigInput,
  type SavePersonalModelDraftInput,
} from "@mcode/provider";
import { createServiceDescriptor } from "../descriptors.js";
import type { ModelConnectivityResult } from "@mcode/shared";
import { createServiceLogger } from "../logger/serviceLogger.js";

export interface DiscoverProviderModelsInput {
  readonly providerId: ProviderId;
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly apiType?: ProviderApiType;
  readonly headers?: Record<string, string>;
}

export interface DiscoveredProviderModel {
  readonly modelId: string;
  readonly displayName?: string;
  readonly ownedBy?: string;
  readonly matchedBuiltinRule: boolean;
  readonly inferredCapabilities?: boolean;
  readonly resolution: ModelConfigResolution;
}

export interface DiscoverProviderModelsResult {
  readonly models: readonly DiscoveredProviderModel[];
  readonly endpointUrl: string;
}

export interface ProbeProviderModelCapabilitiesInput {
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly apiType?: ProviderApiType;
  readonly headers?: Record<string, string>;
}

export interface ProbeProviderModelCapabilitiesResult {
  readonly modelId: string;
  readonly reachable: boolean;
  readonly supportsImage: boolean | null;
  readonly supportsReasoning: boolean | null;
}

const DISCOVER_TIMEOUT_MS = 15_000;
const PROBE_TIMEOUT_MS = 12_000;
const ANTHROPIC_API_VERSION = "2023-06-01";
// 1x1 透明 PNG，仅 67 字节，用于极低开销实测模型是否接受图像输入。
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const KNOWN_ENDPOINT_SUFFIXES = [
  "/chat/completions",
  "/completions",
  "/responses",
  "/messages",
  "/models",
];

/** 未命中内置规则时的保守默认参数，确保用户勾选后立即可用。 */
export const FALLBACK_DISCOVERED_MODEL_CONFIG: ModelConfigObject = {
  enabled: true,
  properties: {
    contextWindow: 128_000,
    inputFormat: {
      supportsText: true,
      supportsImage: false,
      supportsVideo: false,
      supportsAudio: false,
      supportsPdf: false,
    },
  },
  optionSpecs: { maxOutputTokens: { max: 8_192 } },
};

export function buildDiscoverModelsUrls(rawBaseUrl: string): string[] {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/u, "");
  if (!trimmed) throw new Error("Base URL is required to discover models");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid Base URL: ${trimmed}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported Base URL protocol: ${parsed.protocol}`);
  }
  let pathname = parsed.pathname.replace(/\/+$/u, "");
  for (const suffix of KNOWN_ENDPOINT_SUFFIXES) {
    if (pathname.toLowerCase().endsWith(suffix)) {
      pathname = pathname.slice(0, -suffix.length);
      break;
    }
  }
  const base = `${parsed.origin}${pathname}`;
  const hasVersionSegment = /\/v\d+(?:alpha|beta)?$/iu.test(pathname);
  return [...new Set(hasVersionSegment ? [`${base}/models`] : [`${base}/v1/models`, `${base}/models`])];
}

function hasHeaderIgnoreCase(headers: Record<string, string>, target: string): boolean {
  const lower = target.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

interface RawDiscoveredModelRecord {
  readonly modelId: string;
  readonly displayName?: string;
  readonly ownedBy?: string;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly supportsImage?: boolean;
  readonly supportsReasoning?: boolean;
}

function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

export function parseDiscoveredModelsPayload(payload: unknown): RawDiscoveredModelRecord[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { models?: unknown }).models)
        ? (payload as { models: unknown[] }).models
        : [];
  const seen = new Set<string>();
  const results: RawDiscoveredModelRecord[] = [];
  for (const item of list) {
    if (typeof item === "string") {
      const id = item.trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        results.push({ modelId: id });
      }
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const rawId =
      typeof record["id"] === "string"
        ? record["id"]
        : typeof record["name"] === "string"
          ? record["name"].replace(/^models\//u, "")
          : "";
    const modelId = rawId.trim();
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    const displayName =
      typeof record["display_name"] === "string"
        ? record["display_name"].trim()
        : typeof record["displayName"] === "string"
          ? record["displayName"].trim()
          : undefined;
    const ownedBy =
      typeof record["owned_by"] === "string" ? record["owned_by"].trim() : undefined;
    const arch =
      record["architecture"] && typeof record["architecture"] === "object"
        ? (record["architecture"] as Record<string, unknown>)
        : undefined;
    const caps =
      record["capabilities"] && typeof record["capabilities"] === "object"
        ? (record["capabilities"] as Record<string, unknown>)
        : undefined;
    const topProvider =
      record["top_provider"] && typeof record["top_provider"] === "object"
        ? (record["top_provider"] as Record<string, unknown>)
        : undefined;
    const contextWindow =
      readPositiveNumber(record["context_length"]) ??
      readPositiveNumber(record["context_window"]) ??
      readPositiveNumber(record["inputTokenLimit"]) ??
      readPositiveNumber(topProvider?.["context_length"]);
    const maxOutputTokens =
      readPositiveNumber(record["max_output_tokens"]) ??
      readPositiveNumber(record["max_completion_tokens"]) ??
      readPositiveNumber(record["outputTokenLimit"]) ??
      readPositiveNumber(topProvider?.["max_completion_tokens"]);
    const modalities = Array.isArray(arch?.["input_modalities"])
      ? (arch["input_modalities"] as unknown[]).map((v) => String(v).toLowerCase())
      : [];
    const supportsImage =
      typeof caps?.["vision"] === "boolean"
        ? caps["vision"]
        : modalities.length > 0
          ? modalities.includes("image")
          : undefined;
    const supportsReasoning =
      typeof caps?.["reasoning"] === "boolean" ? caps["reasoning"] : undefined;
    results.push({
      modelId,
      ...(displayName ? { displayName } : {}),
      ...(ownedBy ? { ownedBy } : {}),
      ...(contextWindow ? { contextWindow } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      ...(supportsImage !== undefined ? { supportsImage } : {}),
      ...(supportsReasoning !== undefined ? { supportsReasoning } : {}),
    });
  }
  return results.sort((left, right) => left.modelId.localeCompare(right.modelId));
}

/**
 * 针对上游规则库尚未收录或带 -latest 别名的主流国产/国际新模型（如 hy-latest、hy-flash-latest、
 * qwen-max-latest、qwen-max-flash-latest 等）提供智能参数推断，并优先融合网关返回的元数据。
 */
export function inferHeuristicModelConfig(raw: RawDiscoveredModelRecord): ModelConfigObject | null {
  const id = raw.modelId.toLowerCase();
  const baseName = id.includes("/") ? (id.split("/").pop() ?? id) : id;

  let contextWindow = raw.contextWindow;
  let maxOutputTokens = raw.maxOutputTokens;
  let supportsImage = raw.supportsImage;
  let supportsReasoning = raw.supportsReasoning;
  let matchedFamily = false;

  if (/^(?:hy|hunyuan)(?:-|$)/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= 256_000;
    maxOutputTokens ??= 16_384;
    // 最新混元 hy-latest / hy-flash-latest / hy-vision / hunyuan-2* 等均为多模态视觉模型
    supportsImage ??= /(?:latest|vision|vl|2\.|t1|turbos|flash)/u.test(baseName);
    supportsReasoning ??= /(?:t1|think|reason|latest)/u.test(baseName);
  } else if (/^(?:qwen|qwq)(?:-|\d|$)/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= /(?:qwen3|max|plus|flash|long)/u.test(baseName) ? 256_000 : 128_000;
    maxOutputTokens ??= 16_384;
    // 最新 qwen-max-latest / qwen-max-flash-latest / qwen3.5 / vl / omni 均支持视觉
    supportsImage ??= /(?:vl|omni|vision|max-latest|flash-latest|qwen-max|qwen3\.5|qwen3-max)/u.test(
      baseName,
    );
    supportsReasoning ??= /(?:qwq|qwen3|think|reason|max-latest|flash-latest)/u.test(baseName);
  } else if (/^(?:glm-4\.[5-9]|glm-5|glm-4v)/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= 200_000;
    maxOutputTokens ??= 16_384;
    supportsImage ??= /(?:v|vision|4\.5|4\.6|4\.7|5)/u.test(baseName);
    supportsReasoning ??= /(?:4\.5|4\.6|4\.7|5|z1)/u.test(baseName);
  } else if (/^(?:doubao|seed)/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= 256_000;
    maxOutputTokens ??= 16_384;
    supportsImage ??= /(?:vision|seed|1-5|1\.5|2\.0|latest)/u.test(baseName);
    supportsReasoning ??= /(?:think|seed|1-5|2\.0)/u.test(baseName);
  } else if (/^(?:kimi|moonshot)/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= 256_000;
    maxOutputTokens ??= 16_384;
    supportsImage ??= /(?:k2|vision|vl|latest)/u.test(baseName);
    supportsReasoning ??= /(?:k2|think|reason)/u.test(baseName);
  } else if (/^deepseek/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= 128_000;
    maxOutputTokens ??= 16_384;
    supportsImage ??= /(?:vl|vision)/u.test(baseName);
    supportsReasoning ??= /(?:r1|reasoner|v3\.2|v4)/u.test(baseName);
  } else if (/^(?:gemini-[23]|claude-(?:3|4|sonnet-4|opus-4|haiku-4)|gpt-(?:4o|4\.1|4\.5|5)|o[134]|grok-[34])/u.test(baseName)) {
    matchedFamily = true;
    contextWindow ??= /^gemini/u.test(baseName) ? 1_000_000 : 200_000;
    maxOutputTokens ??= 16_384;
    supportsImage ??= true;
    supportsReasoning ??= /^(?:gemini-2\.5|gemini-3|claude-(?:3\.7|4|sonnet-4|opus-4)|gpt-5|o[134]|grok-[34])/u.test(
      baseName,
    );
  }

  if (
    !matchedFamily &&
    contextWindow == null &&
    maxOutputTokens == null &&
    supportsImage === undefined &&
    supportsReasoning === undefined
  ) {
    return null;
  }

  return {
    enabled: true,
    properties: {
      contextWindow: contextWindow ?? 128_000,
      inputFormat: {
        supportsText: true,
        supportsImage: supportsImage ?? false,
        supportsVideo: false,
        supportsAudio: false,
        supportsPdf: false,
      },
    },
    optionSpecs: {
      maxOutputTokens: { max: maxOutputTokens ?? 8_192 },
      ...(supportsReasoning ? { reasoningLevel: { values: ["low", "medium", "high"] } } : {}),
    },
  };
}

/**
 * 极轻量真机能力探针：发送 1x1 像素 PNG 与 max_tokens=16，实测模型是否支持视觉输入及思考/推理输出。
 */
export async function probeProviderModelCapabilitiesImpl(options: {
  readonly baseUrl: string;
  readonly modelId: string;
  readonly apiKey?: string;
  readonly apiType?: ProviderApiType;
  readonly headers?: Record<string, string>;
  readonly fetchImpl?: typeof fetch;
}): Promise<ProbeProviderModelCapabilitiesResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const modelsUrl = buildDiscoverModelsUrls(options.baseUrl)[0]!;
  const isAnthropic = options.apiType === "anthropic-messages";
  const endpointUrl = modelsUrl.replace(/\/models$/u, isAnthropic ? "/messages" : "/chat/completions");
  const trimmedKey = options.apiKey?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  if (trimmedKey) {
    if (isAnthropic) {
      if (!hasHeaderIgnoreCase(headers, "x-api-key")) headers["x-api-key"] = trimmedKey;
      if (!hasHeaderIgnoreCase(headers, "anthropic-version")) {
        headers["anthropic-version"] = ANTHROPIC_API_VERSION;
      }
    } else if (!hasHeaderIgnoreCase(headers, "authorization")) {
      headers["Authorization"] = `Bearer ${trimmedKey}`;
    }
  }

  const body = isAnthropic
    ? {
        model: options.modelId,
        max_tokens: 16,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/png", data: TINY_PNG_BASE64 },
              },
              { type: "text", text: "ok" },
            ],
          },
        ],
      }
    : {
        model: options.modelId,
        max_tokens: 16,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "ok" },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${TINY_PNG_BASE64}` },
              },
            ],
          },
        ],
      };

  try {
    const response = await fetchImpl(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (response.ok) {
      const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const choices = Array.isArray(json?.["choices"]) ? (json["choices"] as Record<string, unknown>[]) : [];
      const msg = choices[0]?.["message"] as Record<string, unknown> | undefined;
      const contentBlocks = Array.isArray(json?.["content"]) ? (json["content"] as Record<string, unknown>[]) : [];
      const hasReasoning =
        typeof msg?.["reasoning_content"] === "string" ||
        typeof msg?.["reasoning"] === "string" ||
        contentBlocks.some((b) => b?.["type"] === "thinking");
      return {
        modelId: options.modelId,
        reachable: true,
        supportsImage: true,
        supportsReasoning: hasReasoning ? true : null,
      };
    }
    const errText = (await response.text().catch(() => "")).toLowerCase();
    const clearlyNoVision =
      /(?:image|vision|multimodal|media_type|image_url).*(?:not support|unsupported|invalid|not allow|cannot|disable)/iu.test(
        errText,
      ) || /does not support image/iu.test(errText);
    return {
      modelId: options.modelId,
      reachable: response.status < 500,
      supportsImage: clearlyNoVision ? false : null,
      supportsReasoning: null,
    };
  } catch {
    return {
      modelId: options.modelId,
      reachable: false,
      supportsImage: null,
      supportsReasoning: null,
    };
  }
}

export async function fetchAndMatchProviderModels(options: {
  readonly providerId: ProviderId;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly apiType?: ProviderApiType;
  readonly headers?: Record<string, string>;
  readonly resolveModelConfig: (modelId: string) => Promise<ModelConfigResolution>;
  readonly fetchImpl?: typeof fetch;
}): Promise<DiscoverProviderModelsResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const candidateUrls = buildDiscoverModelsUrls(options.baseUrl);
  const trimmedKey = options.apiKey?.trim();
  const buildAuthHeaders = (useAnthropicAuth: boolean): Record<string, string> => {
    const next: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers ?? {}),
    };
    if (!trimmedKey) return next;
    if (useAnthropicAuth) {
      if (!hasHeaderIgnoreCase(next, "x-api-key")) next["x-api-key"] = trimmedKey;
      if (!hasHeaderIgnoreCase(next, "anthropic-version")) {
        next["anthropic-version"] = ANTHROPIC_API_VERSION;
      }
    } else if (!hasHeaderIgnoreCase(next, "authorization")) {
      next["Authorization"] = `Bearer ${trimmedKey}`;
    }
    return next;
  };
  const primaryAnthropic = options.apiType === "anthropic-messages";
  const authVariants = trimmedKey
    ? [buildAuthHeaders(primaryAnthropic), buildAuthHeaders(!primaryAnthropic)]
    : [buildAuthHeaders(false)];

  let lastError: Error | undefined;
  for (const endpointUrl of candidateUrls) {
    for (let authIndex = 0; authIndex < authVariants.length; authIndex += 1) {
      try {
        const response = await fetchImpl(endpointUrl, {
          method: "GET",
          headers: authVariants[authIndex]!,
          signal: AbortSignal.timeout(DISCOVER_TIMEOUT_MS),
        });
        if (!response.ok) {
          const bodyText = (await response.text().catch(() => "")).slice(0, 200).trim();
          lastError = new Error(
            `HTTP ${response.status} ${response.statusText}${bodyText ? `: ${bodyText}` : ""}`,
          );
          // 401/403 时自动切换 Bearer <-> x-api-key 重试，兼容 OneAPI / NewAPI 等各类中转站。
          if ((response.status === 401 || response.status === 403) && authIndex + 1 < authVariants.length) {
            continue;
          }
          if (response.status === 404 && endpointUrl !== candidateUrls.at(-1)) break;
          throw lastError;
        }
        const payload: unknown = await response.json();
        const rawModels = parseDiscoveredModelsPayload(payload);
        const matchedModels = await Promise.all(
          rawModels.map(async (raw): Promise<DiscoveredProviderModel> => {
            const resolution = await options.resolveModelConfig(raw.modelId);
            const matchedBuiltinRule =
              resolution.issues.length === 0 &&
              resolution.inheritedConfig.properties?.contextWindow != null;
            if (matchedBuiltinRule) {
              return {
                modelId: raw.modelId,
                ...(raw.displayName ? { displayName: raw.displayName } : {}),
                ...(raw.ownedBy ? { ownedBy: raw.ownedBy } : {}),
                matchedBuiltinRule: true,
                resolution,
              };
            }
            const heuristic = inferHeuristicModelConfig(raw);
            if (heuristic) {
              return {
                modelId: raw.modelId,
                ...(raw.displayName ? { displayName: raw.displayName } : {}),
                ...(raw.ownedBy ? { ownedBy: raw.ownedBy } : {}),
                matchedBuiltinRule: false,
                inferredCapabilities: true,
                resolution: {
                  ...resolution,
                  inheritedConfig: heuristic,
                  issues: [],
                },
              };
            }
            return {
              modelId: raw.modelId,
              ...(raw.displayName ? { displayName: raw.displayName } : {}),
              ...(raw.ownedBy ? { ownedBy: raw.ownedBy } : {}),
              matchedBuiltinRule: false,
              resolution,
            };
          }),
        );
        return { models: matchedModels, endpointUrl };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (endpointUrl === candidateUrls.at(-1) && authIndex + 1 >= authVariants.length) {
          throw lastError;
        }
      }
    }
  }
  throw lastError ?? new Error("Failed to discover models");
}

export type {
  ProviderSettingsProviderView,
  ModelSelectionView,
  ModelSelectionViewInput,
  ProviderSettingsView,
} from "@mcode/provider";

export interface IProviderSettingsService {
  readonly onDidChange: Event<ProviderSettingsView>;
  getView(): Promise<ProviderSettingsView>;
  refresh(reason: string): Promise<ProviderSettingsView>;
  createPersonalProvider(
    input?: Parameters<ProviderSettingsFacade["createPersonalProvider"]>[0],
  ): Promise<ProviderSettingsCreationResult>;
  resolveModelConfig(input: ResolveModelConfigInput): Promise<ModelConfigResolution>;
  savePersonalProviderOverlay(
    providerId: ProviderId,
    config: ProviderConfigObject,
    metadata?: Parameters<ProviderSettingsFacade["savePersonalProviderOverlay"]>[2],
  ): Promise<ProviderSettingsView>;
  deletePersonalProvider(providerId: ProviderId): Promise<ProviderSettingsView>;
  reorderPersonalProviders(providerIds: readonly ProviderId[]): Promise<ProviderSettingsView>;
  reorderPersonalModels(
    providerId: ProviderId,
    modelIds: readonly ModelId[],
  ): Promise<ProviderSettingsView>;
  addPersonalModel(
    providerId: ProviderId,
    modelId: ModelId,
    config: ModelConfigObject,
    useRecommendedConfig?: boolean,
  ): Promise<ProviderSettingsView>;
  renamePersonalModel(
    providerId: ProviderId,
    currentModelId: ModelId,
    nextModelId: ModelId,
  ): Promise<ProviderSettingsView>;
  deletePersonalModel(providerId: ProviderId, modelId: ModelId): Promise<ProviderSettingsView>;
  savePersonalModelDraft(input: SavePersonalModelDraftInput): Promise<ProviderSettingsView>;
  setPersonalModelEnabled(
    providerId: ProviderId,
    modelId: ModelId,
    enabled: boolean,
  ): Promise<ProviderSettingsView>;
  /** 测试已经保存并进入目标 Environment Registry 的正式 Model。 */
  testModelConnectivity(
    input: ProviderSettingsConnectivityRequest,
  ): Promise<ModelConnectivityResult>;
  /** 调用服务商 /models 端点自动发现可用模型，并按内置规则匹配参数框架。 */
  discoverProviderModels(
    input: DiscoverProviderModelsInput,
  ): Promise<DiscoverProviderModelsResult>;
  /** 极轻量实测模型是否支持视觉输入与思考/推理输出。 */
  probeProviderModelCapabilities(
    input: ProbeProviderModelCapabilitiesInput,
  ): Promise<ProbeProviderModelCapabilitiesResult>;
}

export const IProviderSettingsService = createServiceDescriptor<IProviderSettingsService>(
  ServiceChannels.ProviderSettings,
);

export interface ProviderSettingsConnectivityTestInput {
  readonly workspacePath: string;
  readonly workspaceIdentity?: string;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
}

export interface ProviderSettingsConnectivityRequest {
  readonly workspacePath: string;
  readonly workspaceIdentity?: string;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
}

export type ProviderSettingsConnectivityTester = (
  input: ProviderSettingsConnectivityTestInput,
) => Promise<ModelConnectivityResult>;

export interface IModelSelectionService {
  readonly onDidChange: Event<ModelSelectionView>;
  getView(input?: ModelSelectionViewInput): Promise<ModelSelectionView>;
}

export interface ModelSelectionConfiguredDefaultSource {
  read(): Promise<ModelSelection | undefined>;
  onDidChange?(listener: () => void): () => void;
}

export const IModelSelectionService = createServiceDescriptor<IModelSelectionService>(
  ServiceChannels.ModelSelection,
);

export function createProviderSettingsService(
  facade: ProviderSettingsFacade,
  ensureReady: () => Promise<void> = async () => {},
  testConnectivity?: ProviderSettingsConnectivityTester,
): IProviderSettingsService {
  return {
    onDidChange: toEvent((listener) => facade.onDidChange(listener)),
    getView: async () => {
      await ensureReady();
      return facade.getView();
    },
    refresh: async (reason) => {
      await ensureReady();
      return facade.refresh(reason);
    },
    createPersonalProvider: async (input) => {
      await ensureReady();
      return facade.createPersonalProvider(input);
    },
    resolveModelConfig: async (input) => {
      await ensureReady();
      return facade.resolveModelConfig(input);
    },
    savePersonalProviderOverlay: async (providerId, config, metadata) => {
      await ensureReady();
      return facade.savePersonalProviderOverlay(providerId, config, metadata);
    },
    deletePersonalProvider: async (providerId) => {
      await ensureReady();
      return facade.deletePersonalProvider(providerId);
    },
    reorderPersonalProviders: async (providerIds) => {
      await ensureReady();
      return facade.reorderPersonalProviders(providerIds);
    },
    reorderPersonalModels: async (providerId, modelIds) => {
      await ensureReady();
      return facade.reorderPersonalModels(providerId, modelIds);
    },
    addPersonalModel: async (providerId, modelId, config, useRecommendedConfig) => {
      await ensureReady();
      return facade.addPersonalModel(providerId, modelId, config, useRecommendedConfig);
    },
    renamePersonalModel: async (providerId, currentModelId, nextModelId) => {
      await ensureReady();
      return facade.renamePersonalModel(providerId, currentModelId, nextModelId);
    },
    deletePersonalModel: async (providerId, modelId) => {
      await ensureReady();
      return facade.deletePersonalModel(providerId, modelId);
    },
    savePersonalModelDraft: async (input) => {
      await ensureReady();
      return facade.savePersonalModelDraft(input);
    },
    setPersonalModelEnabled: async (providerId, modelId, enabled) => {
      await ensureReady();
      return facade.setPersonalModelEnabled(providerId, modelId, enabled);
    },
    testModelConnectivity: async (input) => {
      await ensureReady();
      if (!testConnectivity) {
        throw new Error("当前 Environment 未装配模型连通性测试能力");
      }
      await facade.waitForProviderOperations(input.providerId);
      // 禁用对象仍存在于配置视图，但不进入执行 Registry；不能把未发布误报成配置丢失。
      // 只消费操作完成后的公共资格，不另查 Key、权益，也不替代目标 Environment 最终校验。
      const provider = facade
        .getView()
        .providers.find((item) => item.providerId === input.providerId);
      const model = provider?.models.find((item) => item.modelId === input.modelId);
      const unavailable =
        !provider || !provider.enabled
          ? "provider-unavailable"
          : !model || !model.enabled || model.issues.length > 0
            ? "model-unavailable"
            : !provider.executable
              ? "provider-unavailable"
              : !model.executable
                ? "model-unavailable"
                : undefined;
      if (unavailable) {
        return {
          success: false,
          error: {
            code: unavailable,
            message:
              unavailable === "provider-unavailable"
                ? "This provider is currently unavailable for connectivity testing."
                : "This model is currently unavailable for connectivity testing.",
          },
        };
      }
      return testConnectivity({
        workspacePath: input.workspacePath,
        ...(input.workspaceIdentity ? { workspaceIdentity: input.workspaceIdentity } : {}),
        providerId: input.providerId,
        modelId: input.modelId,
      });
    },
    discoverProviderModels: async (input) => {
      await ensureReady();
      const baseUrl = input.baseUrl?.trim() || "";
      return fetchAndMatchProviderModels({
        providerId: input.providerId,
        baseUrl,
        ...(input.apiKey ? { apiKey: input.apiKey } : {}),
        ...(input.apiType ? { apiType: input.apiType } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
        resolveModelConfig: async (modelId) =>
          facade.resolveModelConfig({ providerId: input.providerId, modelId }),
      });
    },
    probeProviderModelCapabilities: async (input) => {
      await ensureReady();
      return probeProviderModelCapabilitiesImpl({
        baseUrl: input.baseUrl?.trim() || "",
        modelId: input.modelId,
        ...(input.apiKey ? { apiKey: input.apiKey } : {}),
        ...(input.apiType ? { apiType: input.apiType } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      });
    },
  };
}

export function createModelSelectionService(
  facade: ModelSelectionFacade,
  ensureReady: () => Promise<void> = async () => {},
  configuredDefaultSource?: ModelSelectionConfiguredDefaultSource,
): IModelSelectionService & { dispose(): void } {
  const log = createServiceLogger("model-selection");
  let revision = 0;
  let disposed = false;
  const listeners = new Set<(view: ModelSelectionView) => void>();
  const getView = async (input?: ModelSelectionViewInput): Promise<ModelSelectionView> => {
    await ensureReady();
    if (disposed) throw new Error("ModelSelectionService 已 dispose");
    const configuredDefault = await configuredDefaultSource?.read();
    if (disposed) throw new Error("ModelSelectionService 已 dispose");
    const base = facade.getView(configuredDefault);
    if (revision < base.revision) revision = base.revision;
    return facade.getView(configuredDefault, revision, input);
  };
  const emit = (): void => {
    if (disposed) return;
    revision += 1;
    void getView().then(
      (view) => {
        if (disposed) return;
        for (const listener of listeners) listener(view);
      },
      (error: unknown) => {
        // Registry 事件触发的异步 View 重建没有 owner；Host dispose 后它仍会继续
        // 读取已释放的配置仓库，并形成未处理 rejection。dispose 是明确的取消边界；仅在服务
        // 仍存活时记录真实读取失败。
        if (disposed) return;
        log.warn(undefined, `ModelSelection View 刷新失败: ${String(error)}`);
      },
    );
  };
  const disposeFacade = facade.onDidChange(emit);
  const disposeConfiguredDefault = configuredDefaultSource?.onDidChange?.(emit);

  return {
    onDidChange: (listener) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    getView,
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeFacade();
      disposeConfiguredDefault?.();
      listeners.clear();
    },
  };
}

function toEvent<T>(subscribe: (listener: (event: T) => void) => () => void): Event<T> {
  return (listener) => {
    const dispose = subscribe(listener);
    return { dispose };
  };
}
