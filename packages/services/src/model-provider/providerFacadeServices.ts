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
  readonly resolution: ModelConfigResolution;
}

export interface DiscoverProviderModelsResult {
  readonly models: readonly DiscoveredProviderModel[];
  readonly endpointUrl: string;
}

const DISCOVER_TIMEOUT_MS = 15_000;
const ANTHROPIC_API_VERSION = "2023-06-01";
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

export function parseDiscoveredModelsPayload(
  payload: unknown,
): Array<{ readonly modelId: string; readonly displayName?: string; readonly ownedBy?: string }> {
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
  const results: Array<{
    readonly modelId: string;
    readonly displayName?: string;
    readonly ownedBy?: string;
  }> = [];
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
    results.push({
      modelId,
      ...(displayName ? { displayName } : {}),
      ...(ownedBy ? { ownedBy } : {}),
    });
  }
  return results.sort((left, right) => left.modelId.localeCompare(right.modelId));
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
            return {
              modelId: raw.modelId,
              ...(raw.displayName ? { displayName: raw.displayName } : {}),
              ...(raw.ownedBy ? { ownedBy: raw.ownedBy } : {}),
              matchedBuiltinRule,
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
