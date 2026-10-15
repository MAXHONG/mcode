import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IMcodeSessionService } from "@mcode/services";
import { invalidateDeferredDraftSessionForSkillChange } from "../src/lib/mcodeDraftSkillInvalidation.js";
import { useMcodeSessionStore } from "../src/store/mcodeSessionStore.js";

function createSessionService(
  closeSession: IMcodeSessionService["closeSession"] = vi.fn(async () => {}),
): Pick<IMcodeSessionService, "closeSession"> {
  return { closeSession };
}

beforeEach(() => {
  useMcodeSessionStore.setState((state) => ({
    ...state,
    workspaces: {},
  }));
});

describe("invalidateDeferredDraftSessionForSkillChange", () => {
  it("closes and clears the current workspace draft session", async () => {
    const closeSession = vi.fn(async () => {});
    const workspacePath = "/workspace/app";
    const workspaceIdentity = "ssh:dev";
    useMcodeSessionStore.getState().setDraftSessionId(workspacePath, "draft-1", workspaceIdentity);

    await invalidateDeferredDraftSessionForSkillChange({
      reason: "test",
      workspacePath,
      workspaceIdentity,
      zcodeSessionService: createSessionService(closeSession),
    });

    expect(closeSession).toHaveBeenCalledWith({
      workspacePath,
      workspaceIdentity,
      sessionId: "draft-1",
    });
    expect(
      useMcodeSessionStore.getState().getWorkspaceState(workspacePath, workspaceIdentity)
        .draftSessionId,
    ).toBeNull();
    expect(
      useMcodeSessionStore.getState().getWorkspaceState(workspacePath, workspaceIdentity)
        .draftRuntimeInvalidationVersion,
    ).toBe(1);
  });

  it("invalidates a protocol-v4 prewarm even when there is no legacy draft session", async () => {
    const closeSession = vi.fn(async () => {});
    const workspacePath = "/workspace/app";

    await invalidateDeferredDraftSessionForSkillChange({
      reason: "test",
      workspacePath,
      zcodeSessionService: createSessionService(closeSession),
    });

    expect(closeSession).not.toHaveBeenCalled();
    expect(
      useMcodeSessionStore.getState().getWorkspaceState(workspacePath)
        .draftRuntimeInvalidationVersion,
    ).toBe(1);
  });

  it("still clears the draft when closing the stale session fails", async () => {
    const closeSession = vi.fn(async () => {
      throw new Error("stale draft");
    });
    const workspacePath = "/workspace/app";
    useMcodeSessionStore.getState().setDraftSessionId(workspacePath, "draft-1");

    await invalidateDeferredDraftSessionForSkillChange({
      reason: "test",
      workspacePath,
      zcodeSessionService: createSessionService(closeSession),
    });

    expect(closeSession).toHaveBeenCalledWith({
      workspacePath,
      sessionId: "draft-1",
    });
    expect(
      useMcodeSessionStore.getState().getWorkspaceState(workspacePath).draftSessionId,
    ).toBeNull();
    expect(
      useMcodeSessionStore.getState().getWorkspaceState(workspacePath)
        .draftRuntimeInvalidationVersion,
    ).toBe(1);
  });
});
