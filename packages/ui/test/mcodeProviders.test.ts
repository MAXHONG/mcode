import { describe, expect, it } from "vitest";
import {
  shouldHideMcodeSessionForkAction,
  supportsMcodeSessionFork,
} from "../src/lib/mcodeProviders.js";

describe("supportsMcodeSessionFork", () => {
  it("所有 provider 都开放 session fork 入口", () => {
    expect(supportsMcodeSessionFork("glm")).toBe(true);
    expect(supportsMcodeSessionFork("claude")).toBe(true);
    expect(supportsMcodeSessionFork("codex")).toBe(true);
    expect(supportsMcodeSessionFork("gemini")).toBe(true);
    expect(supportsMcodeSessionFork("opencode")).toBe(true);
  });
});

describe("shouldHideMcodeSessionForkAction", () => {
  it("所有 provider 都不再隐藏 fork UI 入口", () => {
    expect(shouldHideMcodeSessionForkAction("glm")).toBe(false);
    expect(shouldHideMcodeSessionForkAction("claude")).toBe(false);
    expect(shouldHideMcodeSessionForkAction("codex")).toBe(false);
    expect(shouldHideMcodeSessionForkAction("gemini")).toBe(false);
    expect(shouldHideMcodeSessionForkAction("opencode")).toBe(false);
  });
});
