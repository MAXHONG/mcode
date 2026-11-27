import type { AppSessionControl, AppSessionTrustedContext } from "@mcode/session-control/contracts";
import type { McodeProtocolAgentServerContext } from "../mcode-protocol/server-types.js";

export interface AppSessionControlBindingOptions {
  requestClient: McodeProtocolAgentServerContext["requestClient"];
  sessionId: string;
  workspacePath: string;
  workspaceIdentity?: string;
  sourceServerId?: string;
}
export interface AppSessionControlBinding {
  kind: "app";
  control: AppSessionControl;
  /** 模型工具是会话类调用方：上下文总带根会话。 */
  context(): AppSessionTrustedContext;
}
