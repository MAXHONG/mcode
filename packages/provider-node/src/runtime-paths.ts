export const MCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV = "MCODE_BUILTIN_PROVIDER_CONFIG_FILE";
export const MCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV =
  "MCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE";
export const MCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV = "MCODE_PERSONAL_PROVIDER_CONFIG_FILE";
export const PERSONAL_PROVIDER_CONFIG_FILE_NAME = "provider_config.json";

export interface NodeProviderRuntimePaths {
  readonly mcodeBuiltinFilePath: string;
  readonly personalFilePath: string;
}

export function createNodeProviderRuntimePathEnv(
  paths: NodeProviderRuntimePaths,
): Record<string, string> {
  return {
    [MCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: paths.mcodeBuiltinFilePath,
    [MCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: paths.personalFilePath,
  };
}

export function resolveNodeProviderRuntimePaths(
  env: Readonly<Record<string, string | undefined>>,
): NodeProviderRuntimePaths | null {
  const mcodeBuiltinFilePath = env[MCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
  const personalFilePath = env[MCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
  if (!mcodeBuiltinFilePath && !personalFilePath) return null;
  if (!mcodeBuiltinFilePath || !personalFilePath) {
    throw new Error("Mcode Built-in 与 Personal Provider Config 路径必须同时提供");
  }
  return Object.freeze({ mcodeBuiltinFilePath, personalFilePath });
}
