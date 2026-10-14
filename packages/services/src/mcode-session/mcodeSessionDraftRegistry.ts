import type { McodeSessionStateSnapshot } from "@mcode/shared";
import type {
  McodeSessionWorkspaceTarget,
  McodeTaskTarget,
} from "#src/mcode-session/mcodeSession.js";

function getWorkspaceKey(target: McodeSessionWorkspaceTarget): string {
  return target.workspaceIdentity?.trim() || target.workspacePath;
}

function getSessionScopedKey(target: McodeTaskTarget): string {
  return `${getWorkspaceKey(target)}\0${target.sessionId}`;
}

export function createMcodeDeferredDraftRegistry() {
  const sessionKeys = new Set<string>();

  return {
    remember(params: McodeSessionWorkspaceTarget, snapshot: McodeSessionStateSnapshot): void {
      sessionKeys.add(
        getSessionScopedKey({
          workspacePath: snapshot.session.workspace.workspacePath,
          workspaceIdentity:
            snapshot.session.workspace.workspaceIdentity ?? params.workspaceIdentity,
          sessionId: snapshot.session.sessionId,
        }),
      );
    },

    has(target: McodeTaskTarget): boolean {
      return sessionKeys.has(getSessionScopedKey(target));
    },

    forget(target: McodeTaskTarget): void {
      sessionKeys.delete(getSessionScopedKey(target));
    },
  };
}
