import { downloadMcodeBuiltinRelease, type McodeBuiltinDownloadResult } from "@mcode/provider-node";
import type { ApiClient, McodeJwtTokenResolver } from "@mcode/shared";

export interface FetchMcodeBuiltinRemoteReleaseOptions {
  readonly apiClient: ApiClient;
  readonly endpointOrigin: string;
  readonly appVersion: string;
  readonly platform: string;
  readonly signal?: AbortSignal;
  readonly resolveMcodeJwtToken?: McodeJwtTokenResolver;
  readonly reuseUrl?: string;
}

/** Services 仅注入既有网络装配；URL、预算与 Release 校验由 provider-node 唯一实现。 */
export async function fetchMcodeBuiltinRemoteRelease(
  options: FetchMcodeBuiltinRemoteReleaseOptions,
): Promise<McodeBuiltinDownloadResult> {
  return downloadMcodeBuiltinRelease({
    endpointOrigin: options.endpointOrigin,
    appVersion: options.appVersion,
    platform: options.platform,
    signal: options.signal,
    resolveMcodeJwtToken: options.resolveMcodeJwtToken,
    request: (url, init) => options.apiClient.request(url, init),
    ...(options.reuseUrl ? { reuseUrl: options.reuseUrl } : {}),
  });
}
