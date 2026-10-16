import {
  BIGMODEL_PROVIDER_ID,
  ZAI_PROVIDER_ID,
  buildBigModelApiUrl,
  buildRuntimeZaiBusinessUrl,
} from "@mcode/shared";
import type { ICredentialService } from "#src/credential/credential.js";
import { resolveBigModelUserinfoUrl } from "#src/oauth/providers/bigmodelProviderConfig.js";
import { resolveZaiUserinfoUrl } from "#src/oauth/providers/zaiProviderConfig.js";

function tryResolveHttpUrl(resolve: () => string | URL): URL | null {
  try {
    const url = new URL(resolve());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// 3.15.3：业务接口按前缀识别（/api/biz/、/api/pay/），不再枚举少数路径。
const OAUTH_BUSINESS_PREFIXES = ["/api/biz/", "/api/pay/"] as const;

async function isCurrentBusinessOAuthCredentialRequest(options: {
  input: string | URL;
  headers: Headers;
  credentialService: Pick<ICredentialService, "load">;
  env?: NodeJS.ProcessEnv;
}): Promise<boolean> {
  const authorization = options.headers.get("authorization")?.trim() ?? "";
  if (!authorization) return false;

  const provider = await options.credentialService.load("oauth:active_provider");
  if (!(await isOAuthBusinessRequest({ ...options, provider }))) return false;

  const accessToken = (
    await options.credentialService.load(`oauth:${provider}:access_token`)
  )?.trim();
  if (!accessToken || (authorization !== accessToken && authorization !== `Bearer ${accessToken}`))
    return false;
  // 读取磁盘期间可能切换平台，不能拿上一平台残留 token 的 401 清理当前登录。
  return (await options.credentialService.load("oauth:active_provider")) === provider;
}

export async function isOAuthBusinessRequest(options: {
  input: string | URL;
  credentialService: Pick<ICredentialService, "load">;
  env?: NodeJS.ProcessEnv;
  provider?: string | null;
}): Promise<boolean> {
  const provider =
    options.provider ?? (await options.credentialService.load("oauth:active_provider"));
  if (provider !== BIGMODEL_PROVIDER_ID && provider !== ZAI_PROVIDER_ID) return false;
  const env = options.env ?? process.env;
  const requestUrl = tryResolveHttpUrl(() => options.input);
  if (!requestUrl) return false;
  const buildBusinessUrl = (path: string) =>
    provider === BIGMODEL_PROVIDER_ID
      ? buildBigModelApiUrl(env, path)
      : buildRuntimeZaiBusinessUrl(env, path);
  if (
    OAUTH_BUSINESS_PREFIXES.some((path) => {
      const expected = tryResolveHttpUrl(() => buildBusinessUrl(path));
      return (
        expected !== null &&
        requestUrl.origin === expected.origin &&
        requestUrl.pathname.startsWith(expected.pathname)
      );
    })
  )
    return true;
  const userinfo = tryResolveHttpUrl(() =>
    provider === BIGMODEL_PROVIDER_ID ? resolveBigModelUserinfoUrl(env) : resolveZaiUserinfoUrl(env),
  );
  return (
    userinfo !== null &&
    requestUrl.origin === userinfo.origin &&
    requestUrl.pathname === userinfo.pathname
  );
}

export interface OAuthBusinessCredentialValidationRequest {
  url: string;
  authorization: string;
  emptyBodyMeansInvalid: boolean;
}

/**
 * 3.15.3：业务接口返回 403 / 零字节 200 时，不能直接据此清理登录态；
 * 先用 customerInfo 身份接口复核一次，确认凭证确实失效后才退出。
 */
export async function resolveOAuthBusinessCredentialValidationRequest(options: {
  input: string | URL;
  headers: Headers;
  credentialService: Pick<ICredentialService, "load">;
  env?: NodeJS.ProcessEnv;
}): Promise<OAuthBusinessCredentialValidationRequest | null> {
  const provider = await options.credentialService.load("oauth:active_provider");
  if (provider !== BIGMODEL_PROVIDER_ID && provider !== ZAI_PROVIDER_ID) return null;
  if (!(await isCurrentBusinessOAuthCredentialRequest(options))) return null;
  if ((await options.credentialService.load("oauth:active_provider")) !== provider) return null;
  const env = options.env ?? process.env;
  const url = tryResolveHttpUrl(() =>
    provider === BIGMODEL_PROVIDER_ID
      ? buildBigModelApiUrl(env, "/api/biz/customer/getCustomerInfo")
      : buildRuntimeZaiBusinessUrl(env, "/api/biz/customer/getCustomerInfo"),
  );
  if (!url) return null;
  const token = (options.headers.get("authorization") ?? "").trim().replace(/^Bearer\s+/i, "");
  return {
    url: url.toString(),
    // 两平台 customerInfo 都要求裸业务 token；加 Bearer 会把格式拒绝误判成登录失效。
    authorization: token,
    // BigModel 注销后 customerInfo 返回零字节 200；不扩散到 ZAI 或任意空业务响应。
    emptyBodyMeansInvalid: provider === BIGMODEL_PROVIDER_ID,
  };
}

export async function isCurrentOAuthBusinessCredentialRequest(options: {
  input: string | URL;
  headers: Headers;
  credentialService: Pick<ICredentialService, "load">;
  env?: NodeJS.ProcessEnv;
}): Promise<boolean> {
  return isCurrentBusinessOAuthCredentialRequest(options);
}

// 这里只判定候选请求；实际退出须由 OAuthService 在会话变更队列内复核，不能依赖异步旧快照。
export async function isCurrentOAuthCredentialRequest(options: {
  input: string | URL;
  headers: Headers;
  credentialService: Pick<ICredentialService, "load">;
  env?: NodeJS.ProcessEnv;
}): Promise<boolean> {
  const authorization = options.headers.get("authorization")?.trim() ?? "";
  if (!authorization) return false;
  const currentJwt = (await options.credentialService.load("zcodejwttoken"))?.trim() ?? "";
  if (currentJwt && authorization === `Bearer ${currentJwt}`) return true;
  return isCurrentBusinessOAuthCredentialRequest(options);
}
