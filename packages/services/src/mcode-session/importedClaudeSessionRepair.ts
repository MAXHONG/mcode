import type { McodeSessionStateSnapshot } from "@mcode/shared";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { repairImportedClaudeSessionSnapshot } from "#src/session/claude-native/importedClaudeHistoryRepair.js";
import type { IMcodeAgentService } from "#src/mcode-agent/mcodeAgent.js";
import type {
  McodeSessionReadParams,
  McodeSessionResumeParams,
} from "#src/mcode-session/mcodeSession.js";

const logger = createServiceLogger("mcode-session-service");

export async function repairEmptyImportedClaudeSessionSnapshot(params: {
  agentService: IMcodeAgentService;
  snapshot: McodeSessionStateSnapshot;
  target: McodeSessionResumeParams | McodeSessionReadParams;
}): Promise<McodeSessionStateSnapshot> {
  const repaired = await repairImportedClaudeSessionSnapshot({
    snapshot: params.snapshot,
    target: {
      workspacePath: params.target.workspacePath,
      workspaceIdentity: params.target.workspaceIdentity,
      taskId: params.target.sessionId,
      ...("mcpServers" in params.target && params.target.mcpServers
        ? { mcpServers: params.target.mcpServers }
        : {}),
    },
    createSession: (input) => params.agentService.createSession(input),
    onRepair: (history) => {
      logger.warn(
        undefined,
        `[mcode-session-service] Claude 导入 session 历史异常，按 ${history.source} 回填 taskId=${params.target.sessionId}`,
      );
    },
  });
  return repaired ?? params.snapshot;
}
