import { describe, expect, it } from "vitest";

import {
  decodeMarkdownArtifactImageSource,
  extractMarkdownArtifactImageRefs,
  rewriteMarkdownArtifactImageSources,
} from "../src/markdown-artifact-images.js";

describe("Markdown artifact image references", () => {
  it("extracts only image destinations and deduplicates them", () => {
    expect(
      extractMarkdownArtifactImageRefs(
        [
          "![first](mcode-artifact://session/a)",
          "[download](mcode-artifact://session/not-an-image)",
          '![again](<mcode-artifact://session/a> "preview")',
          "![second](mcode-artifact://session/b 'title')",
        ].join("\n"),
      ),
    ).toEqual(["mcode-artifact://session/a", "mcode-artifact://session/b"]);
  });

  it("does not authorize image-looking text inside fenced code", () => {
    expect(
      extractMarkdownArtifactImageRefs(
        "```md\n![secret](mcode-artifact://session/secret)\n```\n![ok](mcode-artifact://session/ok)",
      ),
    ).toEqual(["mcode-artifact://session/ok"]);
  });

  it("rewrites artifact image destinations to a harden-safe relative source", () => {
    const rewritten = rewriteMarkdownArtifactImageSources(
      "before ![shot](mcode-artifact://session/shot-1) after",
    );
    expect(rewritten).not.toContain("mcode-artifact://");
    const source = rewritten.match(/!\[shot\]\(([^)]+)\)/u)?.[1];
    expect(source).toBeTruthy();
    expect(decodeMarkdownArtifactImageSource(source ?? "")).toBe("mcode-artifact://session/shot-1");
  });

  it("leaves normal images, links, and fenced examples unchanged", () => {
    const markdown = [
      "![web](https://example.com/image.png)",
      "[artifact](mcode-artifact://session/file)",
      "```md",
      "![example](mcode-artifact://session/example)",
      "```",
    ].join("\n");
    expect(rewriteMarkdownArtifactImageSources(markdown)).toBe(markdown);
  });
});
