import { describe, expect, it } from "vitest";
import {
  consumeMcodeJwtInvalidRestartMarker,
  markMcodeJwtInvalidRestart,
} from "../src/root/mcodeJwtInvalidRestartMarker.js";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("mcode JWT invalid restart marker", () => {
  it("is consumed exactly once after relaunch", () => {
    const storage = createStorage();
    markMcodeJwtInvalidRestart(storage);

    expect(consumeMcodeJwtInvalidRestartMarker(storage)).toBe(true);
    expect(consumeMcodeJwtInvalidRestartMarker(storage)).toBe(false);
  });
});
