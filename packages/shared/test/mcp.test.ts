import { describe, expect, it } from "vitest";
import {
  convertToMcodeAgentMcpServer,
  isMcodeCuaMcpCommand,
  isMcodeCuaMcpPackageArg,
} from "../src/mcp.js";

describe("mcode-cua MCP matcher (single source of truth for services + CLI bootstrap)", () => {
  it("matches the mcode-cua command by leaf name", () => {
    expect(isMcodeCuaMcpCommand("mcode-cua")).toBe(true);
    expect(isMcodeCuaMcpCommand("/opt/homebrew/bin/mcode-cua")).toBe(true);
    expect(isMcodeCuaMcpCommand("uvx")).toBe(false);
    expect(isMcodeCuaMcpCommand("mcode-cua-server")).toBe(false);
  });

  it("matches uvx/pip package spec forms", () => {
    for (const arg of ["mcode-cua", "mcode-cua[macos]", "mcode-cua@v0.1.3", "mcode-cua[macos]@v0.1.3"]) {
      expect(isMcodeCuaMcpPackageArg(arg)).toBe(true);
    }
  });

  it("matches git and local-path forms (the drift that broke desktop/services parity)", () => {
    expect(isMcodeCuaMcpPackageArg("mcode-cua.git")).toBe(true);
    expect(isMcodeCuaMcpPackageArg("git+https://github.com/x/mcode-cua.git@v0.1.3")).toBe(true);
    expect(isMcodeCuaMcpPackageArg("/Users/me/src/mcode-cua")).toBe(true);
    expect(isMcodeCuaMcpPackageArg("C:\\src\\mcode-cua")).toBe(true);
  });

  it("does not match unrelated args", () => {
    for (const arg of ["--from", "run", "mcode-cua-server", "not-mcode-cua", "server.js"]) {
      expect(isMcodeCuaMcpPackageArg(arg)).toBe(false);
    }
  });

  it("recognizes a package spec placed in COMMAND position (command/arg matchers stay consistent)", () => {
    // 之前 command matcher 只认精确叶子 mcode-cua，会漏判把包规格直接当 command 的配置 → 漏注入 broker。
    for (const command of ["mcode-cua@1.2.3", "mcode-cua[macos]", "mcode-cua.git", "/opt/tools/mcode-cua@1.2.3"]) {
      expect(isMcodeCuaMcpCommand(command), command).toBe(true);
    }
  });

  it("recognizes pip == pins and the mcode_cua underscore distribution name (PyPI treats _ == -)", () => {
    for (const arg of ["mcode-cua==1.2.3", "mcode_cua", "mcode_cua==1.2.3", "mcode_cua@v0.1.3"]) {
      expect(isMcodeCuaMcpPackageArg(arg), arg).toBe(true);
    }
    expect(isMcodeCuaMcpCommand("mcode_cua")).toBe(true);
  });

  it("does not false-positive on sibling packages like mcode-cua-proxy", () => {
    for (const value of ["mcode-cua-proxy", "mcode-cua-proxy@1.0.0", "mcode-cua-helper"]) {
      expect(isMcodeCuaMcpCommand(value), value).toBe(false);
      expect(isMcodeCuaMcpPackageArg(value), value).toBe(false);
    }
  });

  it("recognizes `python -m mcode_cua.server` submodule form (M1 fail-open fix)", () => {
    // `python -m mcode_cua.server` → arg 是 `mcode_cua.server`；旧 matcher 漏判 → 不注入 broker → fail-open。
    for (const arg of ["mcode_cua.server", "mcode-cua.server", "mcode_cua.main", "mcode-cua.__main__"]) {
      expect(isMcodeCuaMcpPackageArg(arg), arg).toBe(true);
    }
  });

  it("recognizes local paths with a trailing separator (M1 fail-open fix)", () => {
    // `.../mcode-cua/` 直接取叶子会得到空串 → 漏判 → fail-open。
    expect(isMcodeCuaMcpPackageArg("/Users/me/src/mcode-cua/")).toBe(true);
    expect(isMcodeCuaMcpPackageArg("C:\\src\\mcode-cua\\")).toBe(true);
    expect(isMcodeCuaMcpCommand("/opt/homebrew/bin/mcode-cua/")).toBe(true);
    // 但带尾斜杠的 sibling 仍不误判。
    expect(isMcodeCuaMcpPackageArg("/Users/me/src/mcode-cua-proxy/")).toBe(false);
  });
});

describe("MCP config helpers", () => {
  it("passes legacy http_headers through to Mcode Agent MCP servers", () => {
    expect(
      convertToMcodeAgentMcpServer("web-search-prime", {
        type: "http",
        url: "https://bigmodel.example.test/mcp",
        timeoutMs: 5000,
        http_headers: {
          Authorization: "Bearer token",
        },
      }),
    ).toEqual({
      name: "web-search-prime",
      type: "http",
      url: "https://bigmodel.example.test/mcp",
      headers: [{ name: "Authorization", value: "Bearer token" }],
      timeoutMs: 5000,
    });
  });

  it("preserves timeoutMs when converting stdio MCP servers for Mcode Agent", () => {
    expect(
      convertToMcodeAgentMcpServer("context7", {
        type: "stdio",
        command: "npx",
        args: ["-y", "@upstash/context7-mcp"],
        timeoutMs: 3,
      }),
    ).toEqual({
      name: "context7",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env: [],
      timeoutMs: 3,
    });
  });

  it("preserves timeoutMs when converting sse MCP servers for Mcode Agent", () => {
    expect(
      convertToMcodeAgentMcpServer("stream", {
        type: "sse",
        url: "https://bigmodel.example.test/sse",
        timeoutMs: 8000,
      }),
    ).toEqual({
      name: "stream",
      type: "sse",
      url: "https://bigmodel.example.test/sse",
      headers: [],
      timeoutMs: 8000,
    });
  });

  it("preserves HTTP OAuth client credentials when converting MCP servers for Mcode Agent", () => {
    expect(
      convertToMcodeAgentMcpServer("protected", {
        type: "http",
        url: "https://mcp.example.test/mcp",
        oauth: {
          type: "client_credentials",
          clientId: "mcode-client",
          clientSecret: "secret",
          scope: "mcp:tools",
        },
      }),
    ).toMatchObject({
      name: "protected",
      type: "http",
      oauth: {
        type: "client_credentials",
        clientId: "mcode-client",
        clientSecret: "secret",
        scope: "mcp:tools",
      },
    });
  });

  it("preserves HTTP OAuth authorization code config when converting MCP servers for Mcode Agent", () => {
    expect(
      convertToMcodeAgentMcpServer("figma", {
        type: "http",
        url: "https://mcp.figma.com/mcp",
        oauth: {
          type: "authorization_code",
          clientName: "Mcode",
          redirectPath: "/oauth/callback/mcp/figma",
          scope: "mcp:connect",
        },
      }),
    ).toMatchObject({
      name: "figma",
      type: "http",
      oauth: {
        type: "authorization_code",
        clientName: "Mcode",
        redirectPath: "/oauth/callback/mcp/figma",
        scope: "mcp:connect",
      },
    });
  });

  it("does not persist implicit OAuth defaults when converting bare HTTP MCP servers", () => {
    expect(
      convertToMcodeAgentMcpServer("notion", {
        type: "http",
        url: "https://mcp.notion.com/mcp",
        timeoutMs: 30000,
      }),
    ).toEqual({
      name: "notion",
      type: "http",
      url: "https://mcp.notion.com/mcp",
      headers: [],
      timeoutMs: 30000,
    });
  });

  it("drops invalid timeoutMs when converting MCP servers for Mcode Agent", () => {
    expect(
      convertToMcodeAgentMcpServer("zero", {
        type: "stdio",
        command: "npx",
        timeoutMs: 0,
      }),
    ).not.toHaveProperty("timeoutMs");

    expect(
      convertToMcodeAgentMcpServer("fractional", {
        type: "http",
        url: "https://bigmodel.example.test/mcp",
        timeoutMs: 1.5,
      }),
    ).not.toHaveProperty("timeoutMs");
  });

  it("keeps headers ahead of legacy http_headers when both are present", () => {
    expect(
      convertToMcodeAgentMcpServer("web-reader", {
        type: "sse",
        url: "https://bigmodel.example.test/sse",
        headers: {
          Authorization: "Bearer fresh",
        },
        http_headers: {
          Authorization: "Bearer stale",
        },
      }),
    ).toMatchObject({
      headers: [{ name: "Authorization", value: "Bearer fresh" }],
    });
  });
});
