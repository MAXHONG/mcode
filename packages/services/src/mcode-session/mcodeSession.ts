import { ServiceChannels } from "@mcode/shared";
import type {
  TraceId,
  McodeAgentMcpServer,
  McodeDeliveryKind,
  McodeMessageWithParts,
  ModelSelection,
  McodePermissionRequestParams,
  McodeProviderRuntimeHeadersRequestParams,
  McodeUserInputRequestParams,
  McodeUserInputResponse,
  McodeSessionInfo,
  McodeSessionImportHistory,
  McodeSessionEvent,
  McodeSessionMode,
  McodeSessionPersistence,
  McodeSessionStateSnapshot,
  McodeStateUpdatedNotification,
  McodeWorkspacePresentation,
} from "@mcode/shared";
import { createServiceDescriptor } from "#src/descriptors.js";
import type { ProviderRuntimeHeadersUiResponse } from "#src/mcode-agent/mcodeAgent.js";

export interface McodeSessionWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
}

export type McodeSessionReadWorkspacePresentationParams = McodeSessionWorkspaceTarget;

export interface McodeTaskTarget extends McodeSessionWorkspaceTarget {
  sessionId: string;
}

export interface McodeSessionCreateParams extends McodeSessionWorkspaceTarget {
  /** 仅导入事务使用的预分配 ID；普通新会话继续由 Agent 分配。 */
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: McodeSessionMode;
  model?: ModelSelection;
  persistence?: McodeSessionPersistence;
  thoughtLevel?: string;
  mcpServers?: McodeAgentMcpServer[];
  importedHistory?: McodeSessionImportHistory;
}

export interface McodeSessionResumeParams extends McodeTaskTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: McodeAgentMcpServer[];
  /**
   * 默认广播 resume 得到的历史快照，并让 shadow 订阅请求初始 snapshot。
   * 续聊发送前的 runtime 预恢复会关闭它，避免旧终态快照覆盖本地已开始的新输入运行态。
   */
  broadcastSnapshot?: boolean;
}

export interface McodeSessionListParams extends McodeSessionWorkspaceTarget {
  includeArchived?: boolean;
  limit?: number;
}

export interface McodeSessionReadParams extends McodeTaskTarget {
  deliveryKind?: McodeDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
}

export interface McodeSessionMessagesParams extends McodeTaskTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface McodeSessionEventsParams extends McodeTaskTarget {
  afterSeq?: number;
  limit?: number;
}

export interface McodeSessionSetModelParams extends McodeTaskTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface McodeSessionSetThoughtLevelParams extends McodeTaskTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface McodeSessionSetModeParams extends McodeTaskTarget {
  mode: McodeSessionMode;
  expectedRevision?: number;
}

export interface McodeSessionRespondProviderRuntimeHeadersParams extends McodeTaskTarget {
  requestId: string;
  response: ProviderRuntimeHeadersUiResponse;
}

export interface McodeSessionSubscribeParams extends McodeTaskTarget {
  deliveryKind: McodeDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

export type McodeSessionServiceEvent =
  | { type: "session.event"; event: McodeSessionEvent }
  | { type: "state.updated"; notification: McodeStateUpdatedNotification }
  | { type: "permission.request"; request: McodePermissionRequestParams }
  | { type: "userInput.request"; request: McodeUserInputRequestParams }
  | {
      type: "userInput.response";
      requestId: string;
      response: McodeUserInputResponse;
    }
  | { type: "providerRuntimeHeaders.request"; request: McodeProviderRuntimeHeadersRequestParams }
  | { type: "snapshot"; snapshot: McodeSessionStateSnapshot };

export interface McodeSessionInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface McodeSessionWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export interface IMcodeSessionService {
  initializeWorkspace(params: McodeSessionWorkspaceTarget): Promise<McodeSessionInitializeResult>;
  getWorkspaceRuntimeIdentity(
    params: McodeSessionWorkspaceTarget,
  ): Promise<McodeSessionWorkspaceRuntimeIdentity>;
  readWorkspacePresentation(
    params: McodeSessionReadWorkspacePresentationParams,
  ): Promise<McodeWorkspacePresentation>;
  createSession(params: McodeSessionCreateParams): Promise<McodeSessionStateSnapshot>;
  resumeSession(params: McodeSessionResumeParams): Promise<McodeSessionStateSnapshot>;
  listSessions(params: McodeSessionListParams): Promise<McodeSessionInfo[]>;
  readSession(params: McodeSessionReadParams): Promise<McodeSessionStateSnapshot>;
  readSessionMessages(params: McodeSessionMessagesParams): Promise<McodeMessageWithParts[]>;
  readSessionEvents(params: McodeSessionEventsParams): Promise<McodeSessionEvent[]>;
  promoteDeferredDraftSession(params: McodeTaskTarget): Promise<void>;
  closeSession(params: McodeTaskTarget): Promise<void>;
  closeDeferredDraftSession(params: McodeTaskTarget): Promise<boolean>;
  setModel(params: McodeSessionSetModelParams): Promise<McodeSessionStateSnapshot>;
  setThoughtLevel(params: McodeSessionSetThoughtLevelParams): Promise<McodeSessionStateSnapshot>;
  setMode(params: McodeSessionSetModeParams): Promise<McodeSessionStateSnapshot>;
  respondProviderRuntimeHeaders(
    params: McodeSessionRespondProviderRuntimeHeadersParams,
  ): Promise<void>;
  // M5 删波次 2：onDynamicSessionEvent（旧 session/subscribe 词表的 renderer 订阅面）
  // 已删除——v4 UI 走 agentService 的 conversation/sessions-index 帧通道，
  // 该方法在 renderer 侧已无任何调用者（grep packages/ui packages/desktop 为零）。
}

export const IMcodeSessionService = createServiceDescriptor<IMcodeSessionService>(
  ServiceChannels.ZCodeSession,
);
