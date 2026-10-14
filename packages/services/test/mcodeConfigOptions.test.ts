import { describe, expect, it } from "vitest";
import type { McodeSessionSettingsState } from "@mcode/shared";
import {
  getMcodeAgentAvailableModes,
  normalizeAvailableMcodeMode,
  settingsToConfigOptions,
} from "../src/mcode-agent/mcodeConfigOptions.js";

function settingsWithMode(
  mode: McodeSessionSettingsState["mode"]["current"],
): McodeSessionSettingsState {
  return {
    model: {
      current: { providerId: "glm", modelId: "glm-5" },
      available: [],
    },
    thoughtLevel: {
      enabled: false,
      available: [],
    },
    mode: { current: mode },
  };
}

describe("mcodeConfigOptions", () => {
  it("keeps persisted edit while the shared menu replaces it with guarded", () => {
    const options = settingsToConfigOptions(settingsWithMode("edit"));
    const modeOption = options.find((option) => option.category === "mode");

    expect(modeOption?.currentValue).toBe("edit");
    expect(modeOption?.options?.map((option) => option.value)).toEqual([
      "build",
      "guarded",
      "plan",
      "yolo",
    ]);
    expect(getMcodeAgentAvailableModes().map((mode) => mode.id)).toEqual([
      "build",
      "guarded",
      "plan",
      "yolo",
    ]);
    expect(normalizeAvailableMcodeMode("edit")).toBe("edit");
  });
});
