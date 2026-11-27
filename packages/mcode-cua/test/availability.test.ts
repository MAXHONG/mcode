import { describe, expect, it } from "vitest";
import { createComputerUseRuntime } from "../index.js";
import { callBrokerMethod } from "../broker.js";
import { startInProcessComputerUseBroker } from "../broker-in-process.js";
import { BROKER_SOCKET_ENV, IN_PROCESS_BROKER_SOCKET, mintBrokerSocketPath } from "../broker-socket-path.js";

describe("Mcode open-source Computer Use runtime", () => {
  it("request_access 返回当前平台与开源后端状态，未知工具返回结构化错误", async () => {
    const runtime = createComputerUseRuntime();
    const access = await runtime.execute({
      toolName: "request_access",
      arguments: {},
      context: { sessionId: "s1", runtimeScope: "main", workspaceKey: "ws1" },
    });
    expect(access.isError).toBeFalsy();
    const parsed = JSON.parse((access.content[0] as { text: string }).text);
    expect(parsed).toMatchObject({
      granted: true,
      platform: process.platform,
      backend: "mcode-open-cua",
      capabilities: expect.arrayContaining(["ax_tree", "screenshot", "click", "drag", "scroll", "set_value"]),
    });

    const missingEl = await runtime.execute({
      toolName: "left_click",
      arguments: { element_index: 99 },
      context: { sessionId: "s1", runtimeScope: "main", workspaceKey: "ws1" },
    });
    expect(missingEl.isError).toBe(true);
    expect((missingEl.content[0] as { text: string }).text).toContain("element_unavailable");

    const unknown = await runtime.execute({
      toolName: "non_existent_tool",
      arguments: {},
      context: { sessionId: "s1", runtimeScope: "main", workspaceKey: "ws1" },
    });
    expect(unknown.isError).toBe(true);

    const stopped = await runtime.execute({
      toolName: "stop_computer_control",
      arguments: {},
      context: { sessionId: "s1", runtimeScope: "main", workspaceKey: "ws1" },
    });
    expect(stopped.isError).toBeFalsy();
    await runtime.dispose();
  });

  it("broker 方法保留占位不可用契约，不破坏独立打包检测", async () => {
    await expect(
      callBrokerMethod({ method: "example", socketPath: "unused" }),
    ).rejects.toMatchObject({ code: "unavailable" });
    await expect(startInProcessComputerUseBroker()).rejects.toMatchObject({
      code: "helper_unavailable",
    });
    expect(BROKER_SOCKET_ENV).toBe("MCODE_CUA_PERMISSION_BROKER_SOCKET");
    expect(IN_PROCESS_BROKER_SOCKET).toBe("in-process");
    expect(mintBrokerSocketPath()).toMatch(/\.sock$/u);
  });
});
