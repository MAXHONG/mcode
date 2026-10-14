import { describe, expect, it } from "vitest";
import { MCODE_AGENT_RUNTIME } from "@mcode/shared";

describe("Mcode Agent runtime", () => {
  it("starts the private Mcode Protocol server instead of the retired Mcode Agent command", () => {
    const retiredProtocolName = `${"a"}${"cp"}`;

    expect(MCODE_AGENT_RUNTIME.spawnArgs).toEqual(["app-server", "--stdio"]);
    expect(MCODE_AGENT_RUNTIME.spawnArgs).not.toContain(retiredProtocolName);
  });

  it("uses the Mcode Agent binary name", () => {
    expect(MCODE_AGENT_RUNTIME.resolveEntrySegments("darwin")).toEqual(["mcode-agent"]);
    expect(MCODE_AGENT_RUNTIME.resolveEntrySegments("win32")).toEqual(["mcode-agent.exe"]);
  });
});
