import { describe, expect, it } from "vitest";
import { resolveDefaultEmbeddedSearchBackend } from "../src/app/embedded-search-backend.js";

describe("resolveDefaultEmbeddedSearchBackend", () => {
  it("uses bundled bfs, ugrep, and ripgrep paths by default", () => {
    expect(
      resolveDefaultEmbeddedSearchBackend({
        env: {
          MCODE_BFS_BINARY: "/opt/mcode/tools/bfs/bfs",
          MCODE_RG_BINARY: "/opt/mcode/tools/ripgrep/rg",
          MCODE_UGREP_BINARY: "/opt/mcode/tools/ugrep/ugrep",
        },
      }),
    ).toEqual({
      kind: "native-binaries",
      findCommand: "/opt/mcode/tools/bfs/bfs",
      grepCommand: "/opt/mcode/tools/ugrep/ugrep",
      rgCommand: "/opt/mcode/tools/ripgrep/rg",
    });
  });

  it("falls back to bfs, ugrep, and rg command names when bundled paths are unavailable", () => {
    expect(resolveDefaultEmbeddedSearchBackend({ env: {} })).toEqual({
      kind: "native-binaries",
      findCommand: "bfs",
      grepCommand: "ugrep",
      rgCommand: "rg",
    });
  });

  it("preserves the explicit internal CLI compatibility override", () => {
    expect(
      resolveDefaultEmbeddedSearchBackend({
        env: { MCODE_EMBEDDED_SEARCH_COMMAND: "/tmp/mcode-test" },
      }),
    ).toEqual({
      kind: "internal-cli",
      command: "/tmp/mcode-test",
      args: ["__internal-search"],
    });
  });
});
