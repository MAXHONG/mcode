import type { McodeEnv } from "./env.js";

export const DEFAULT_MCODE_ENDPOINT_ORIGIN = "https://zcode.z.ai";
export const TEST_MCODE_ENDPOINT_ORIGIN = "https://zcode.z.ai";
export const CODING_PLAN_LOCAL_WEBVIEW_ORIGIN = "http://localhost:3000";
export const DEFAULT_BIGMODEL_API_ORIGIN = "https://bigmodel.cn";
export const TEST_BIGMODEL_API_ORIGIN = "https://bigmodel.cn";
export const DEFAULT_ZAI_OAUTH_ORIGIN = "https://chat.z.ai";
export const TEST_ZAI_OAUTH_ORIGIN = "https://chat.z.ai";
export const DEFAULT_ZAI_BUSINESS_BASE_URL = "https://api.z.ai";
export const TEST_ZAI_BUSINESS_BASE_URL = "https://api.z.ai";
export const DEFAULT_ZAI_OAUTH_CLIENT_ID = "client_P8X5CMWmlaRO9gyO-KSqtg";
export const TEST_ZAI_OAUTH_CLIENT_ID = "client_P8X5CMWmlaRO9gyO-KSqtg";
export const DEFAULT_WEB_REMOTE_CONTROL_RELAY_WS_URL = "wss://zcode.z.ai/ws";
/**
 * Mcode 自建远控中转（deploy/remote-relay，Cloudflare Worker）：协议兼容官方 relay V1，
 * 同域托管 Mcode 品牌手机页。Mcode 默认使用自建中转，z.ai 官方 relay 作为备用。
 */
export const MCODE_SELF_HOSTED_REMOTE_ORIGIN = "https://remote.hjh.im";
export const MCODE_SELF_HOSTED_RELAY_WS_URL = "wss://remote.hjh.im/ws";
export const MCODE_SELF_HOSTED_REMOTE_PAGE_URL = `${MCODE_SELF_HOSTED_REMOTE_ORIGIN}/remote/v4`;

/** 手机远控走哪条中转：mcode = 自建（默认），zai = z.ai 官方（备用）。 */
export type WebRemoteControlRelayProvider = "mcode" | "zai";
export const DEFAULT_WEB_REMOTE_CONTROL_RELAY_PROVIDER: WebRemoteControlRelayProvider = "mcode";

export function normalizeWebRemoteControlRelayProvider(
  value: unknown,
): WebRemoteControlRelayProvider {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "zai" || normalized === "official" || normalized === "z.ai") return "zai";
  }
  return DEFAULT_WEB_REMOTE_CONTROL_RELAY_PROVIDER;
}

export interface ResolvedWebRemoteControlRelayEndpoints {
  provider: WebRemoteControlRelayProvider;
  relayWsUrl: string;
  remoteUrl: string;
}

/**
 * 统一解析手机远控的中转与手机页地址。优先级：显式环境变量覆盖 > 所选 provider 默认值。
 * `officialRemoteUrl` 是按 endpoint 与 app_version 推导的官方页面（/remote/v4）。
 */
export function resolveWebRemoteControlRelayEndpoints(options: {
  provider?: unknown;
  endpointOrigin?: string | null | undefined;
  officialRemoteUrl: string;
  relayWsOverride?: string | null | undefined;
  remoteUrlOverride?: string | null | undefined;
}): ResolvedWebRemoteControlRelayEndpoints {
  const provider = normalizeWebRemoteControlRelayProvider(options.provider);
  const relayWsOverride = options.relayWsOverride?.trim();
  const remoteUrlOverride = options.remoteUrlOverride?.trim();
  if (provider === "zai") {
    return {
      provider,
      relayWsUrl: resolveWebRemoteControlRelayWsUrl({
        endpointOrigin: options.endpointOrigin,
        overrideUrl: relayWsOverride,
      }),
      remoteUrl: remoteUrlOverride || options.officialRemoteUrl,
    };
  }
  return {
    provider,
    relayWsUrl: relayWsOverride || MCODE_SELF_HOSTED_RELAY_WS_URL,
    remoteUrl: remoteUrlOverride || MCODE_SELF_HOSTED_REMOTE_PAGE_URL,
  };
}
export const WEB_REMOTE_CONTROL_V4_MIN_APP_VERSION = "3.4.0";

export interface BuildMcodeEndpointUrlsOptions {
  appVersion?: string;
}

function isWebRemoteControlV4AppVersion(appVersion: string | undefined): boolean {
  if (!appVersion) {
    return false;
  }

  // mcodeEndpoint 会被 Vite 配置在 Node 加载期直接导入，不能依赖源码态 `.js` runtime import。
  // 这里只比较固定的稳定版门槛；高于 3.4.0 的预发布版本仍满足门槛，3.4.0 自身的预发布版本不满足。
  const normalizedVersion = appVersion.trim().replace(/^v/i, "");
  const match = normalizedVersion.match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([^+]+))?(?:\+(.+))?$/,
  );
  if (!match) {
    return false;
  }

  const prereleaseIdentifiers = match[4]?.split(".");
  const hasValidPrerelease =
    prereleaseIdentifiers === undefined ||
    prereleaseIdentifiers.every(
      (identifier) =>
        /^[0-9A-Za-z-]+$/.test(identifier) &&
        (!/^\d+$/.test(identifier) || /^(0|[1-9]\d*)$/.test(identifier)),
    );
  const buildIdentifiers = match[5]?.split(".");
  const hasValidBuild =
    buildIdentifiers === undefined ||
    buildIdentifiers.every((identifier) => /^[0-9A-Za-z-]+$/.test(identifier));
  if (!hasValidPrerelease || !hasValidBuild) {
    return false;
  }

  const versionParts = [Number(match[1]), Number(match[2]), Number(match[3])];
  const floorParts = WEB_REMOTE_CONTROL_V4_MIN_APP_VERSION.split(".").map(Number);
  for (let index = 0; index < floorParts.length; index += 1) {
    if (versionParts[index]! !== floorParts[index]!) {
      return versionParts[index]! > floorParts[index]!;
    }
  }

  return prereleaseIdentifiers === undefined;
}

export interface McodeEndpointUrls {
  origin: string;
  apiBaseUrl: string;
  remoteUrl: string;
  webRemoteCallbackUrl: string;
  webShareCallbackUrl: string;
  relayWsUrl: string;
  zcodePlanOpenAiBaseUrl: string;
  zcodePlanAnthropicBaseUrl: string;
  zcodePlanBillingCurrentUrl: string;
  zcodePlanBillingBalanceUrl: string;
}

export interface RuntimeMcodeEndpointEnv {
  [key: string]: string | undefined;
  MCODE_ENV?: string;
  MCODE_BASE_URL?: string;
  MCODE_ENDPOINT_ORIGIN?: string;
  MCODE_TEST_BASE_URL?: string;
  MCODE_PRODUCTION_BASE_URL?: string;
}

export interface RuntimeBigModelApiEnv {
  [key: string]: string | undefined;
  MCODE_ENV?: string;
  BIGMODEL_API_BASE_URL?: string;
  BIGMODEL_TEST_API_BASE_URL?: string;
  BIGMODEL_PRODUCTION_API_BASE_URL?: string;
}

export interface RuntimeZaiEndpointEnv {
  [key: string]: string | undefined;
  MCODE_ENV?: string;
  ZAI_OAUTH_ORIGIN?: string;
  ZAI_TEST_OAUTH_ORIGIN?: string;
  ZAI_PRODUCTION_OAUTH_ORIGIN?: string;
  ZAI_BUSINESS_BASE_URL?: string;
  ZAI_TEST_BUSINESS_BASE_URL?: string;
  ZAI_PRODUCTION_BUSINESS_BASE_URL?: string;
  ZAI_OAUTH_CLIENT_ID?: string;
  ZAI_TEST_OAUTH_CLIENT_ID?: string;
  ZAI_PRODUCTION_OAUTH_CLIENT_ID?: string;
  ZAI_OAUTH_APP_ID?: string;
}

export interface RuntimeProductEndpointEnv
  extends RuntimeMcodeEndpointEnv, RuntimeBigModelApiEnv, RuntimeZaiEndpointEnv {}

export interface RuntimeProductEndpointConfig {
  zcodeEnv: McodeEnv;
  zcodeEndpointOrigin: string;
  mcodeEndpointUrls: McodeEndpointUrls;
  zaiOAuthOrigin: string;
  zaiBusinessBaseUrl: string;
  zaiOAuthClientId: string;
  bigModelApiOrigin: string;
}

function readRuntimeEnvValue(
  env: Record<string, string | undefined>,
  key: string,
): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function readRuntimeMcodeEnvScopedValue(
  env: Record<string, string | undefined>,
  zcodeEnv: McodeEnv,
  testKey: string,
  productionKey: string,
): string | undefined {
  return readRuntimeEnvValue(env, zcodeEnv === "production" ? productionKey : testKey);
}

export function normalizeMcodeEndpointOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Mcode endpoint origin is empty");
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Mcode endpoint origin must use http or https");
  }
  return parsed.origin;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isTrustedCodingPlanWebviewOrigin(
  value: string | null | undefined,
  options?: {
    e2eStoreBridgeEnabled?: boolean;
  },
): boolean {
  if (!value) return false;
  try {
    const origin = normalizeMcodeEndpointOrigin(value);
    if (
      origin === DEFAULT_MCODE_ENDPOINT_ORIGIN ||
      origin === TEST_MCODE_ENDPOINT_ORIGIN ||
      origin === CODING_PLAN_LOCAL_WEBVIEW_ORIGIN
    ) {
      return true;
    }
    const parsed = new URL(origin);
    return options?.e2eStoreBridgeEnabled === true && isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveZCodeEndpointOrigin(options?: {
  env?: McodeEnv;
  envBaseOrigin?: string | null;
  overrideOrigin?: string | null;
}): string {
  const env = options?.env ?? "test";
  const envBaseOrigin = options?.envBaseOrigin?.trim();
  if (env === "production") {
    return envBaseOrigin
      ? normalizeMcodeEndpointOrigin(envBaseOrigin)
      : DEFAULT_MCODE_ENDPOINT_ORIGIN;
  }

  const overrideOrigin = options?.overrideOrigin?.trim();
  if (overrideOrigin) {
    return normalizeMcodeEndpointOrigin(overrideOrigin);
  }

  return envBaseOrigin ? normalizeMcodeEndpointOrigin(envBaseOrigin) : TEST_MCODE_ENDPOINT_ORIGIN;
}

export function resolveRuntimeMcodeEnv(env: RuntimeMcodeEndpointEnv = {}): McodeEnv {
  // 独立 CLI / 服务测试未注入 MCODE_ENV 时默认生产域；桌面测试包会显式下发 MCODE_ENV=test。
  return env.MCODE_ENV?.trim().toLowerCase() === "test" ? "test" : "production";
}

export function resolveRuntimeMcodeEndpointOrigin(
  env: RuntimeMcodeEndpointEnv = {},
  options?: { overrideOrigin?: string | null },
): string {
  const zcodeEnv = resolveRuntimeMcodeEnv(env);
  const scopedBaseOrigin =
    zcodeEnv === "production"
      ? readRuntimeEnvValue(env, "MCODE_PRODUCTION_BASE_URL")
      : readRuntimeEnvValue(env, "MCODE_TEST_BASE_URL");

  return resolveZCodeEndpointOrigin({
    env: zcodeEnv,
    envBaseOrigin:
      readRuntimeEnvValue(env, "MCODE_BASE_URL") ??
      readRuntimeEnvValue(env, "MCODE_ENDPOINT_ORIGIN") ??
      scopedBaseOrigin,
    overrideOrigin: options?.overrideOrigin,
  });
}

export function buildRuntimeMcodeEndpointUrls(
  env: RuntimeMcodeEndpointEnv = {},
): McodeEndpointUrls {
  return buildMcodeEndpointUrls(resolveRuntimeMcodeEndpointOrigin(env));
}

export function buildRuntimeMcodeApiUrl(env: RuntimeMcodeEndpointEnv = {}, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveRuntimeMcodeEndpointOrigin(env)}${normalizedPath}`;
}

export function resolveWebRemoteControlRelayWsUrl(options?: {
  endpointOrigin?: string | null | undefined;
  overrideUrl?: string | null | undefined;
}): string {
  const overrideUrl = options?.overrideUrl?.trim();
  if (overrideUrl) {
    return overrideUrl;
  }

  // Bugfix：标准 test endpoint 已部署独立 relay；继续固定到生产 relay 会让测试环境跨环境配对。
  // 仅识别规范 test origin，避免改变 production、localhost 和其他自定义 endpoint 的既有行为。
  if (options?.endpointOrigin?.trim() === TEST_MCODE_ENDPOINT_ORIGIN) {
    return "wss://zcode.z.ai/ws";
  }

  return DEFAULT_WEB_REMOTE_CONTROL_RELAY_WS_URL;
}

export function resolveBigModelApiOrigin(env: RuntimeBigModelApiEnv = {}): string {
  const zcodeEnv = resolveRuntimeMcodeEnv(env);
  const scopedBaseOrigin =
    zcodeEnv === "production"
      ? readRuntimeEnvValue(env, "BIGMODEL_PRODUCTION_API_BASE_URL")
      : readRuntimeEnvValue(env, "BIGMODEL_TEST_API_BASE_URL");
  const fallbackOrigin =
    zcodeEnv === "production" ? DEFAULT_BIGMODEL_API_ORIGIN : TEST_BIGMODEL_API_ORIGIN;

  return normalizeMcodeEndpointOrigin(
    readRuntimeEnvValue(env, "BIGMODEL_API_BASE_URL") ?? scopedBaseOrigin ?? fallbackOrigin,
  );
}

export function buildBigModelApiUrl(env: RuntimeBigModelApiEnv = {}, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveBigModelApiOrigin(env)}${normalizedPath}`;
}

export function buildBigModelCodingPlanPersonalManageUrl(env: RuntimeBigModelApiEnv = {}): string {
  // 修复原因：BigModel Coding Plan 管理页要跟随 MCODE_ENV；
  // 测试环境如果继续写死 bigmodel.cn，会把测试账号带到生产套餐页。
  return buildBigModelApiUrl(env, "/coding-plan/personal/overview");
}

export function buildBigModelCodingPlanTeamManageUrl(env: RuntimeBigModelApiEnv = {}): string {
  return buildBigModelApiUrl(env, "/coding-plan/team/plans");
}

export function resolveZaiOAuthOrigin(env: RuntimeZaiEndpointEnv = {}): string {
  const zcodeEnv = resolveRuntimeMcodeEnv(env);
  const scopedOrigin = readRuntimeMcodeEnvScopedValue(
    env,
    zcodeEnv,
    "ZAI_TEST_OAUTH_ORIGIN",
    "ZAI_PRODUCTION_OAUTH_ORIGIN",
  );
  const fallbackOrigin =
    zcodeEnv === "production" ? DEFAULT_ZAI_OAUTH_ORIGIN : TEST_ZAI_OAUTH_ORIGIN;

  return normalizeMcodeEndpointOrigin(
    readRuntimeEnvValue(env, "ZAI_OAUTH_ORIGIN") ?? scopedOrigin ?? fallbackOrigin,
  );
}

export function resolveZaiBusinessBaseUrl(env: RuntimeZaiEndpointEnv = {}): string {
  const zcodeEnv = resolveRuntimeMcodeEnv(env);
  const scopedOrigin = readRuntimeMcodeEnvScopedValue(
    env,
    zcodeEnv,
    "ZAI_TEST_BUSINESS_BASE_URL",
    "ZAI_PRODUCTION_BUSINESS_BASE_URL",
  );
  const fallbackOrigin =
    zcodeEnv === "production" ? DEFAULT_ZAI_BUSINESS_BASE_URL : TEST_ZAI_BUSINESS_BASE_URL;

  return normalizeMcodeEndpointOrigin(
    readRuntimeEnvValue(env, "ZAI_BUSINESS_BASE_URL") ?? scopedOrigin ?? fallbackOrigin,
  );
}

export function resolveZaiOAuthClientId(env: RuntimeZaiEndpointEnv = {}): string {
  const zcodeEnv = resolveRuntimeMcodeEnv(env);
  const scopedClientId = readRuntimeMcodeEnvScopedValue(
    env,
    zcodeEnv,
    "ZAI_TEST_OAUTH_CLIENT_ID",
    "ZAI_PRODUCTION_OAUTH_CLIENT_ID",
  );
  const fallbackClientId =
    zcodeEnv === "production" ? DEFAULT_ZAI_OAUTH_CLIENT_ID : TEST_ZAI_OAUTH_CLIENT_ID;

  return (
    readRuntimeEnvValue(env, "ZAI_OAUTH_CLIENT_ID") ??
    scopedClientId ??
    readRuntimeEnvValue(env, "ZAI_OAUTH_APP_ID") ??
    fallbackClientId
  );
}

export function buildZaiOAuthUrl(origin: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeMcodeEndpointOrigin(origin)}${normalizedPath}`;
}

export function buildRuntimeZaiOAuthUrl(env: RuntimeZaiEndpointEnv = {}, path: string): string {
  return buildZaiOAuthUrl(resolveZaiOAuthOrigin(env), path);
}

export function buildRuntimeZaiBusinessUrl(env: RuntimeZaiEndpointEnv = {}, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveZaiBusinessBaseUrl(env)}${normalizedPath}`;
}

export function resolveRuntimeProductEndpointConfig(
  env: RuntimeProductEndpointEnv = {},
): RuntimeProductEndpointConfig {
  const zcodeEnv = resolveRuntimeMcodeEnv(env);
  const zcodeEndpointOrigin = resolveRuntimeMcodeEndpointOrigin(env);

  return {
    zcodeEnv,
    zcodeEndpointOrigin,
    mcodeEndpointUrls: buildMcodeEndpointUrls(zcodeEndpointOrigin),
    zaiOAuthOrigin: resolveZaiOAuthOrigin(env),
    zaiBusinessBaseUrl: resolveZaiBusinessBaseUrl(env),
    zaiOAuthClientId: resolveZaiOAuthClientId(env),
    bigModelApiOrigin: resolveBigModelApiOrigin(env),
  };
}

export function buildMcodeEndpointUrls(
  origin: string,
  options: BuildMcodeEndpointUrlsOptions = {},
): McodeEndpointUrls {
  const normalizedOrigin = normalizeMcodeEndpointOrigin(origin);
  const parsed = new URL(normalizedOrigin);
  const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  const wsOrigin = `${wsProtocol}//${parsed.host}`;
  // 无法解析或低于分界版本时保守使用 v3，避免开发版本和旧客户端进入未兼容的 v4 页面。
  const remoteVersion = isWebRemoteControlV4AppVersion(options.appVersion) ? "v4" : "v3";

  return {
    origin: normalizedOrigin,
    apiBaseUrl: `${normalizedOrigin}/api/v1`,
    remoteUrl: `${normalizedOrigin}/remote/${remoteVersion}`,
    webRemoteCallbackUrl: `${normalizedOrigin}/web-remote/callback`,
    webShareCallbackUrl: `${normalizedOrigin}/cn/share/callback`,
    relayWsUrl: `${wsOrigin}/ws`,
    zcodePlanOpenAiBaseUrl: `${normalizedOrigin}/api/v1/zcode-plan`,
    zcodePlanAnthropicBaseUrl: `${normalizedOrigin}/api/v1/zcode-plan/anthropic`,
    zcodePlanBillingCurrentUrl: `${normalizedOrigin}/api/v1/zcode-plan/billing/current`,
    zcodePlanBillingBalanceUrl: `${normalizedOrigin}/api/v1/zcode-plan/billing/balance`,
  };
}

export function rewriteMcodeEndpointUrl(input: string | URL, endpointOrigin: string): string | URL {
  const originalUrl = typeof input === "string" ? input : input.toString();
  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return input;
  }
  const sourceOrigin = DEFAULT_MCODE_ENDPOINT_ORIGIN;
  if (parsed.origin !== sourceOrigin) {
    return input;
  }

  const targetOrigin = normalizeMcodeEndpointOrigin(endpointOrigin);
  if (targetOrigin === sourceOrigin) {
    return input;
  }

  const target = new URL(targetOrigin);
  target.pathname = parsed.pathname;
  target.search = parsed.search;
  target.hash = parsed.hash;
  return target.toString();
}
