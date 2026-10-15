import {
  MCODE_AGENT_PROVIDER,
  MCODE_COMMAND_AGENT_SOURCES,
  type McodeProvider,
  type CommandAgentSource,
} from "@mcode/shared";

export const COMMAND_AGENT_SOURCES = [
  ...MCODE_COMMAND_AGENT_SOURCES,
] as const satisfies readonly CommandAgentSource[];

export const COMMAND_AGENT_SOURCE_META: Record<
  CommandAgentSource,
  {
    labelId: string;
    provider: McodeProvider;
    pathHint: string;
  }
> = {
  zcodeAgent: {
    labelId: "settings.commands.source.zcodeAgent",
    pathHint: "~/.mcode/commands",
    provider: MCODE_AGENT_PROVIDER,
  },
};
