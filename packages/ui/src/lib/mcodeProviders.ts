import {
  MCODE_AGENT_PROVIDER,
  MCODE_AGENT_PROVIDER_LABEL,
  type McodeProvider,
} from "@mcode/shared";

export const MCODE_AGENT_PROVIDERS: McodeProvider[] = [MCODE_AGENT_PROVIDER];

export const MCODE_AGENT_PROVIDER_LABELS: Record<McodeProvider, string> = {
  glm: MCODE_AGENT_PROVIDER_LABEL,
};

export function supportsMcodeSessionFork(provider: McodeProvider): boolean {
  void provider;
  // 功能开关：fork 入口恢复对所有 Mcode provider 开放；实际可操作性仍由 task 状态、
  // assistant 目标和运行中保护 guard 控制，避免把 active/failed 分支暴露为可 fork。
  return true;
}

export function shouldHideMcodeSessionForkAction(provider: McodeProvider): boolean {
  return !supportsMcodeSessionFork(provider);
}
