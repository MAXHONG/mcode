import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { McodeProvider } from "./mcode-task-types-core.js";

export const MCODE_AGENT_PROVIDER = "glm" satisfies McodeProvider;
export const MCODE_AGENT_PROVIDER_LABEL = "Mcode Agent";
export const MCODE_COMMAND_AGENT_SOURCE = "zcodeAgent" satisfies CommandAgentSource;

/**
 * 解析持久化/relay 数据时的 provider 归一 schema：
 * 已移除的第三方 provider 历史值仅作为归一化输入保留，统一收敛为 glm；
 * 其它非法值保持拒绝，与收窄前的校验边界一致。
 */
export const legacyMcodeProviderSchema = z
  .enum(["claude", "opencode", "gemini", "codex", "glm"])
  .transform((): typeof MCODE_AGENT_PROVIDER => MCODE_AGENT_PROVIDER);

export const MCODE_ENABLED_AGENT_PROVIDERS = [
  MCODE_AGENT_PROVIDER,
] as const satisfies readonly McodeProvider[];

export const MCODE_COMMAND_AGENT_SOURCES = [
  MCODE_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToMcodeAgent(
  _provider?: McodeProvider | null,
): McodeProvider {
  return MCODE_AGENT_PROVIDER;
}

export function normalizeAgentProvidersToMcodeAgent(
  _providers?: ReadonlyArray<McodeProvider> | null,
): McodeProvider[] {
  return [...MCODE_ENABLED_AGENT_PROVIDERS];
}

export function normalizeCommandAgentSourceToMcodeAgent(
  _agentSource?: CommandAgentSource | null,
): CommandAgentSource {
  return MCODE_COMMAND_AGENT_SOURCE;
}

export function isMcodeAgentProvider(
  provider: McodeProvider | null | undefined,
): provider is typeof MCODE_AGENT_PROVIDER {
  return provider === MCODE_AGENT_PROVIDER;
}
