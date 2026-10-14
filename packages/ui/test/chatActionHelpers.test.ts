import { describe, expect, it } from "vitest";
import type { McodeConfigOption } from "@mcode/shared";
import { readCurrentMcodeMode } from "../src/hooks/chatActionHelpers.js";

function createModeOption(currentValue: string | boolean): McodeConfigOption {
  return {
    id: "mode",
    name: "Mode",
    category: "mode",
    type: "select",
    currentValue,
  };
}

describe("chatActionHelpers", () => {
  it("reads yolo from Mcode Agent mode config options", () => {
    expect(readCurrentMcodeMode([createModeOption("yolo")])).toBe("yolo");
  });

  it("reads edit from Mcode Agent mode config options", () => {
    expect(readCurrentMcodeMode([createModeOption("edit")])).toBe("edit");
  });

  it("keeps provider-native Mcode Agent modes", () => {
    expect(readCurrentMcodeMode([createModeOption("bypassPermissions")])).toBe("bypassPermissions");
  });

  it("does not normalize retired provider-native agent mode ids", () => {
    const readMode = readCurrentMcodeMode as (
      options: readonly McodeConfigOption[],
      provider?: string,
    ) => unknown;
    expect(readCurrentMcodeMode([createModeOption("agent")])).toBeUndefined();
    expect(readMode([createModeOption("agent-full-access")], "gemini")).toBeUndefined();
  });

  it("ignores invalid mode values", () => {
    expect(readCurrentMcodeMode([createModeOption("unknown")])).toBeUndefined();
    expect(readCurrentMcodeMode([createModeOption(true)])).toBeUndefined();
  });
});
