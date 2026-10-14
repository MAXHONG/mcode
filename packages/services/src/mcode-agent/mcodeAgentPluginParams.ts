import type {
  ModelSelection,
  McodeAgentMcpServer,
  McodeAutomationScheduleRule,
  McodeMcpListMode,
} from "@mcode/shared";
import type { McpAppsAppToolCallResult, McpAppsAppToolDescriptor } from "@mcode/shared/mcp-apps";

export interface McodeAgentWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  /** 远程 workspace 的运行时会话身份；只用于隔离/路由，不能替代 workspacePath。 */
  remoteSessionId?: string;
}

export interface McodeAgentPluginViewParams extends McodeAgentWorkspaceTarget {
  configScope?: "user" | "workspace";
}

export interface McodeAgentListMcpServerStatusesParams extends McodeAgentWorkspaceTarget {
  mcpServers?: McodeAgentMcpServer[];
  mode?: McodeMcpListMode;
}

export interface McodeAgentAddPluginMarketplaceParams extends McodeAgentWorkspaceTarget {
  dryRun?: boolean;
  operationId?: string;
  source: string;
}

export interface McodeAgentRemovePluginMarketplaceParams extends McodeAgentWorkspaceTarget {
  marketplace: string;
}

export interface McodeAgentUpdatePluginMarketplaceParams extends McodeAgentWorkspaceTarget {
  marketplace?: string;
  operationId?: string;
}

export interface McodeAgentInstallPluginParams extends McodeAgentWorkspaceTarget {
  dryRun?: boolean;
  marketplace: string;
  operationId?: string;
  pluginName: string;
  scope?: "user" | "workspace";
}

export interface McodeAgentCancelPluginOperationParams {
  operationId: string;
}

export interface McodeAgentUninstallPluginParams extends McodeAgentWorkspaceTarget {
  marketplace?: string;
  pluginId?: string;
  pluginName?: string;
  removeCache?: boolean;
}

export interface McodeAgentUpdatePluginParams extends McodeAgentWorkspaceTarget {
  pluginId?: string;
  marketplace?: string;
}

export interface McodeAgentRestoreBuiltinPluginParams extends McodeAgentWorkspaceTarget {
  pluginId: string;
}

export interface McodeAgentConfigurePluginParams extends McodeAgentWorkspaceTarget {
  clearOptionKeys?: string[];
  dryRun?: boolean;
  options: Record<string, unknown>;
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface McodeAgentResetPluginConfigParams extends McodeAgentWorkspaceTarget {
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface McodeAgentValidatePluginParams extends McodeAgentWorkspaceTarget {
  marketplace?: string;
  pluginName?: string;
  source?: string;
}

export interface McodeAgentDescribePluginParams extends McodeAgentWorkspaceTarget {
  marketplace: string;
  pluginName: string;
}

export interface McodeAgentSetPluginEnabledParams extends McodeAgentWorkspaceTarget {
  enabled: boolean;
  operationId?: string;
  pluginId: string;
  scope?: "user" | "workspace";
}

// Plugin 对话引用 catalog：
// 带 sessionId → session-owned 冻结 catalog（必须路由到持有该 session 的 workspace client）；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。
export interface McodeAgentPluginReferenceCatalogParams extends McodeAgentWorkspaceTarget {
  sessionId?: string;
}

// Composer Skill catalog：与 Plugin 引用相同，以 sessionId 区分 workspace 当前目录和
// resident Session runtime 快照；不参与 Settings 管理目录。
export interface McodeAgentSkillReferenceCatalogParams extends McodeAgentWorkspaceTarget {
  sessionId?: string;
}

/** 插件 UI：UI 发起的 `ui://` 资源读取。 */
export interface McodeAgentReadMcpResourceParams extends McodeAgentWorkspaceTarget {
  instance: import("@mcode/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  uri: string;
}

/** 插件 UI 页面发起的 `resources/read`；参数与 readMcpResource 同形，结果受 8 MiB 与 mimeType 白名单约束。 */
export type McodeAgentReadMcpResourceForUiParams = McodeAgentReadMcpResourceParams;

/** 插件 UI：UI 回调本插件工具；不进审批流，归属由 agent 侧 catalog fail closed。 */
export interface McodeAgentCallMcpToolForUiParams extends McodeAgentWorkspaceTarget {
  instance: import("@mcode/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  /** 宿主生成的调用 id，配合 cancelMcpToolCallForUi。 */
  callId: string;
}
/** 插件 UI 页面发起的 resources/list、resources/templates/list、subscribe、unsubscribe。 */
export interface McodeAgentListMcpResourcesForUiParams extends McodeAgentWorkspaceTarget {
  instance: import("@mcode/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  cursor?: string;
}
/** App-Provided Tools：实例身份 = 会话 + 沙箱作用域 + 代际。 */
export interface McodeAgentAppToolInstanceForUiParams extends McodeAgentWorkspaceTarget {
  instance: import("@mcode/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  scopeId: string;
  generation: number;
}
export interface McodeAgentRegisterAppToolsForUiParams extends McodeAgentAppToolInstanceForUiParams {
  tools: McpAppsAppToolDescriptor[];
}
export interface McodeAgentAppToolCallForUiParams extends McodeAgentAppToolInstanceForUiParams {
  callId: string;
}
export interface McodeAgentResolveAppToolCallForUiParams extends McodeAgentAppToolCallForUiParams {
  result?: McpAppsAppToolCallResult;
  error?: { message: string };
}
export interface McodeAgentMcpResourceSubscriptionForUiParams extends McodeAgentWorkspaceTarget {
  instance: import("@mcode/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  scopeId: string;
  generation: number;
  uri: string;
}
export interface McodeAgentCancelMcpToolCallForUiParams extends McodeAgentWorkspaceTarget {
  instance: import("@mcode/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  callId: string;
}
export interface McodeAgentResolveSuggestedPluginReferenceParams extends McodeAgentWorkspaceTarget {
  stableId: string;
  operationId: string;
  clientMode: "desktop-continuous" | "web-remote-replayable";
  deliveryKind: "desktop-continuous" | "web-remote-replayable";
}

// ---- 定时任务(automation)管理参数 ----

export interface McodeAgentCreateAutomationParams extends McodeAgentWorkspaceTarget {
  title: string;
  cronExpr: string;
  relativeDelayMinutes?: number;
  prompt: string;
  modelSelection?: ModelSelection;
  mode?: string;
  recurring?: boolean;
  maxRuns?: number;
  endAt?: number;
  scheduleRule?: McodeAutomationScheduleRule;
}

export interface McodeAgentUpdateAutomationParams extends McodeAgentWorkspaceTarget {
  automationId: string;
  title?: string;
  cronExpr?: string;
  prompt?: string;
  modelSelection?: ModelSelection | null;
  mode?: string | null;
  recurring?: boolean;
  maxRuns?: number | null;
  endAt?: number | null;
  scheduleRule?: McodeAutomationScheduleRule | null;
  scheduleEditedByUser?: boolean;
}

export interface McodeAgentAutomationIdParams extends McodeAgentWorkspaceTarget {
  automationId: string;
}

export interface McodeAgentSetAutomationEnabledParams extends McodeAgentWorkspaceTarget {
  automationId: string;
  enabled: boolean;
}

export interface McodeAgentDeleteAutomationRunParams extends McodeAgentWorkspaceTarget {
  runId: string;
}
