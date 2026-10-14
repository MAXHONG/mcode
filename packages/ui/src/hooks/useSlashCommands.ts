/**
 * Mcode Agent Slash Commands 便捷 hook
 *
 * 返回当前 workspace 下 Agent 广播的可用 slash commands 列表。
 */
import { useMcodeSessionStore, selectWorkspaceMcodeState } from "../store/mcodeSessionStore.js";

export function useSlashCommands(workspacePath: string, workspaceIdentity?: string) {
  return useMcodeSessionStore(
    (state) => selectWorkspaceMcodeState(state, workspacePath, workspaceIdentity).slashCommands,
  );
}
