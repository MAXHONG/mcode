import { ChannelClient, ChannelServer, createQueuePair, ProxyChannel } from "@mcode/rpc";
import { describe, expect, it } from "vitest";
import { IMcodeAgentService } from "#src/mcode-agent/mcodeAgent.js";
import {
  MCODE_AGENT_MCP_STATUS_MODE_UNSUPPORTED_ERROR_CODE,
  McodeAgentMcpStatusModeUnsupportedError,
} from "#src/mcode-agent/mcodeAgentErrors.js";

describe("Mcode Agent RPC errors", () => {
  it("preserves the MCP status-only unsupported code across ChannelClient RPC", async () => {
    const [serverProtocol, clientProtocol] = createQueuePair();
    const server = new ChannelServer(serverProtocol, "test");
    const client = new ChannelClient(clientProtocol);
    server.registerChannel(
      IMcodeAgentService.channelName,
      ProxyChannel.fromService({
        async listMcpServerStatuses() {
          throw new McodeAgentMcpStatusModeUnsupportedError();
        },
      }),
    );
    const service = ProxyChannel.toService<IMcodeAgentService>(
      client.getChannel(IMcodeAgentService.channelName),
    );

    try {
      await expect(
        service.listMcpServerStatuses({
          mcpServers: [],
          mode: "status",
          workspacePath: "/tmp/workspace",
        }),
      ).rejects.toMatchObject({
        code: MCODE_AGENT_MCP_STATUS_MODE_UNSUPPORTED_ERROR_CODE,
        name: "McodeAgentMcpStatusModeUnsupportedError",
      });
    } finally {
      client.dispose();
      server.dispose();
    }
  });
});
