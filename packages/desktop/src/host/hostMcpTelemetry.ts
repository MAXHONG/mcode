import type { IDisposable } from "@mcode/rpc";
import type { IMcodeAgentService } from "@mcode/services";
import type { ProcessResourceRuntimeSurface } from "@mcode/shared";
import { HostResponseTypes } from "@mcode/shared";

interface RegisterHostMcpTelemetryOptions {
  agentService: Pick<IMcodeAgentService, "onDynamicMcpTelemetry">;
  postMessage(message: unknown): void;
  runtimeSurface: ProcessResourceRuntimeSurface;
}

export function registerHostMcpTelemetry(options: RegisterHostMcpTelemetryOptions): IDisposable {
  return options.agentService.onDynamicMcpTelemetry()((event) => {
    try {
      options.postMessage({
        type: HostResponseTypes.McpTelemetry,
        runtimeSurface: options.runtimeSurface,
        event,
      });
    } catch {
      // main 已退出或 IPC 不可用时只丢当前遥测，不影响 MCP 生命周期。
    }
  });
}
