import {
  buildRuntimeMcodeEndpointUrls,
  MCODE_ENV,
  type RuntimeMcodeEndpointEnv,
} from "@mcode/shared";

interface RendererImportMetaEnv {
  VITE_MCODE_BASE_URL?: string;
  VITE_MCODE_ENDPOINT_ORIGIN?: string;
}

function readRendererImportMetaEnv(): RendererImportMetaEnv {
  return ((import.meta as ImportMeta & { env?: RendererImportMetaEnv }).env ??
    {}) as RendererImportMetaEnv;
}

export function createRendererMcodeEndpointEnv(
  env: RendererImportMetaEnv = readRendererImportMetaEnv(),
): RuntimeMcodeEndpointEnv {
  return {
    MCODE_ENV,
    // UI 侧的 zcode-plan 占位 provider 以前只看 MCODE_ENV，
    // 没有消费 Vite 注入的 base url，导致自定义测试域名时 renderer 和 host/service 可能不一致。
    MCODE_BASE_URL: env.VITE_MCODE_BASE_URL,
    MCODE_ENDPOINT_ORIGIN: env.VITE_MCODE_ENDPOINT_ORIGIN,
  };
}

export const RENDERER_MCODE_ENDPOINT_URLS = buildRuntimeMcodeEndpointUrls(
  createRendererMcodeEndpointEnv(),
);
