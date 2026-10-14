import { materializeMcodeBuiltinProviderConfig } from "@mcode/services/node";

declare const __MCODE_BUILTIN_PROVIDER_CONFIG_JSON__: string | undefined;

export interface MaterializeBundledMcodeBuiltinProviderConfigOptions {
  readonly environmentConfigRoot: string;
  readonly content: string;
}

/** 返回构建时嵌入远端 Server 的 Mcode Built-in Provider Config。 */
export function readBundledMcodeBuiltinProviderConfig(): string {
  if (typeof __MCODE_BUILTIN_PROVIDER_CONFIG_JSON__ !== "string") {
    throw new Error("当前构建未嵌入 Mcode Built-in Provider Config");
  }
  return __MCODE_BUILTIN_PROVIDER_CONFIG_JSON__;
}

/**
 * 将 Mcode Built-in Config 原子物化到所属环境的固定资源副本。
 * 升级前退出旧进程；不保留按内容 hash 增长的历史文件。
 */
export async function materializeBundledMcodeBuiltinProviderConfig(
  options: MaterializeBundledMcodeBuiltinProviderConfigOptions,
): Promise<string> {
  return materializeMcodeBuiltinProviderConfig(options);
}
