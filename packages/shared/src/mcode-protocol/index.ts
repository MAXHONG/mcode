import { requestVerificationReasons } from "../request-security-edition/verification-policy.js";
import { mcodeProtocolTraceSchema } from "./trace.js";
// Bot 反向回复的名字解析/待澄清结果与 App、CLI 使用同一严格 schema。
export { channelReplyRequestSchema, channelReplyResultSchema } from "../channel-mention.js";
export { mcodeProtocolTraceSchema, type McodeProtocolTrace } from "./trace.js";
import {
  databaseMigrationFactsSchema,
  databaseStartupErrorCodeSchema,
  databaseStartupErrorDetailsSchema,
} from "../database-startup.js";
import {
  MCP_APPS_APP_TOOLS_MAX_PER_INSTANCE,
  MCP_APPS_APP_TOOL_CALL_ID_MAX_CHARS,
  MCP_APPS_APP_TOOL_ERROR_MESSAGE_MAX_CHARS,
  mcpAppsAppToolCallResultSchema,
  mcpAppsAppToolDescriptorSchema,
} from "../mcp-apps/appTools.js";
import { mcpAppsSamplingParamsSchema, mcpAppsSamplingResultSchema } from "../mcp-apps/sampling.js";
import { mcpAppInstanceSchema } from "../mcp-apps/instance.js";
export { conversationQuoteSchema, conversationQuotesSchema } from "../conversationSelection.js";
/* oxlint-disable eslint(max-lines) -- Mcode Protocol schema 需要单文件导出，方便 app 与 agent 共享同一份协议契约。 */
// ── 旧协议删除边界──────────────────────
// 剩余 ~257 个导出：旧 Mcode Protocol 方法契约、请求/响应/事件 schema、
// session/workspace state snapshot 投影等（承重类型已迁 mcode-protocol-legacy-types.ts）。
// 已连根删除的死词（词表+schema+两侧实现）：session/steer、session/rewind、
// session/rewindCascade、session/previewFileRewind、session/applyFileRewind、
// prompt/enhance 全簇（含 promptEnhanceResult 通知）、plugins/marketplace/list；
// session/fork 客户端链已删（op+schema 留存 = v4 forkSessionAtMessage 钩子消费）。
// 消费者：services 旧栈（mcodeProtocolClient/mcodeAgent/mcodeAgentService/mcodeSession*）、
// CLI bootstrap 旧协议 server（mcode-protocol/server-operations、plugins、session-mapper 等）、
// UI 旧投影（mcodeSessionProjection 等读路径）。
// 上述旧协议 client/server 组删除时，本文件整体删除。
// 注：外部零消费 schema 多为存活 schema 联合的内部依赖，随宿主文件一起处理，勿单删。
import { z } from "zod";
import { accountProviderUnavailableReasonSchema } from "../account-provider-state.js";
import { bashOutputDisplaySchema } from "../bash-output-display.js";
import { mcodeAutomationBotDeliveryTargetSchema } from "../bots.js";
import { executionOutputPreviewSchema } from "../execution-output-preview.js";
import { completeModelPropertiesDataSchema } from "../model-config.js";
import { modelExecutionSchema } from "../model-execution.js";
export type { ModelExecutionSelectionFallback } from "../model-execution.js";
export * from "../off-peak-execution.js";
import { modelSelectionSchema } from "../model-selection.js";
import { APP_USAGE_RANGES, appUsageSnapshotSchema } from "../usage-stats.js";
import { DYNAMIC_WORKFLOW_MODES } from "../dynamic-workflow-feature.js";
import { errorAttributionSchema } from "../mcode-protocol-v4/snapshot.js";
// 后台详情共享精简的只读响应 schema，不携带命令或计时元数据。
export * from "../background-bash-output.js";
export * from "../process-diagnostic.js";
export { attachmentSourceKindSchema, type AttachmentSourceKind } from "../attachment-source.js";
import { PROTOCOL_V4_LIMITS } from "../mcode-protocol-v4/core.js";

export const mcodeTopicResourceReadParamsSchema = z
  .object({
    requestId: z.string().min(1).max(256),
    taskId: z.string().min(1).max(256),
    inputId: z.string().min(1).max(256),
    authorizationId: z.string().min(1).max(256),
    messageId: z.string().min(1).max(256),
    resourceIndex: z.number().int().nonnegative(),
  })
  .strict();
export const mcodeTopicResourceReadResultSchema = z
  .object({
    ref: z.string().min(1),
    fileName: z.string().min(1).max(1024),
    mime: z.string().min(1).max(256),
    bytes: z.number().int().min(0).max(PROTOCOL_V4_LIMITS.attachmentMaxBytes),
  })
  .strict();
export const mcodeTopicResourceCancelParamsSchema = z
  .object({ requestId: z.string().min(1).max(256), taskId: z.string().min(1).max(256) })
  .strict();
export const mcodeTopicResourceCancelResultSchema = z.object({ cancelled: z.boolean() }).strict();
export type McodeTopicResourceReadParams = z.infer<typeof mcodeTopicResourceReadParamsSchema>;
export type McodeTopicResourceReadResult = z.infer<typeof mcodeTopicResourceReadResultSchema>;
export { activeWorkSummarySchema, type ActiveWorkSummary } from "../mcode-protocol-v4/snapshot.js";
// browser-use 命令/结果契约单一来源：agent 构造、协议校验和 main executor 共用同一 schema。
import {
  browserBackendListResultSchema,
  browserSessionContextKindSchema,
} from "../browser-use/backend.js";
import { browserClientModeSchema, browserCommandSchema } from "../browser-use/commands.js";
import { browserCommandResultSchema } from "../browser-use/result.js";
import { appToolSearchModeSchema } from "../app-runtime-preferences.js";
import { integratedTerminalShellSelectionSchema } from "../validationAppSettings.js";
import { mcodeTaskModeSchema } from "../mcode-task-mode-schema.js";
import {
  OFFICIAL_AUTH_CONSUMER_KINDS,
  OFFICIAL_MCP_AUTH_PORT_FAILURE_REASONS,
} from "../official-mcp-auth.js";
import {
  mcodeSyntheticUserMessageSourceSchema as legacyMcodeSyntheticUserMessageSourceSchema,
  mcodeDeliveryKindSchema,
  mcodeInteractionRequestOriginSchema,
  mcodeMessagePartSchema,
  mcodeMessageVisibilitySchema,
  mcodeMessageWithPartsSchema,
  mcodePermissionDecisionSchema,
  mcodePermissionResponseSchema,
  mcodePermissionUpdateSchema,
  mcodeSessionApiRetryStatusSchema,
  mcodeSessionContextUsageSchema,
  mcodeSessionGoalSchema,
  mcodeSessionGoalVerificationSchema,
  mcodeSessionGoalVerificationTimelineSchema,
  mcodeSessionInfoSchema,
  mcodeSessionKindSchema,
  mcodeSessionModeSchema,
  mcodeSessionRuntimeStateSchema,
  mcodeSessionStatusSchema,
  mcodeToolStateSchema,
  mcodeWorkspaceRefSchema,
} from "../mcode-protocol-legacy-types.js";

export * from "../local-ttft/contract.js";
export {
  hookExecutionProjectionSchema,
  hookInvocationRowSchema,
  type HookExecutionProjection,
  type HookInvocationRow,
} from "../mcode-protocol-v4/rows.js";

export {
  sessionsIndexReconcileParamsSchema,
  sessionsIndexReconcileResultSchema,
  type SessionsIndexReconcileParams,
  type SessionsIndexReconcileResult,
} from "../mcode-protocol-v4/sessions-index.js";

export const MCODE_PROTOCOL_NAME = "Mcode Protocol" as const;
export const MCODE_PROTOCOL_VERSION = 1 as const;
// V4 wire 与 legacy 主协议并存；禁止为了 V4 physical framing 改写 legacy 版本。
export const MCODE_PROTOCOL_V4_WIRE_VERSION = 3 as const;
export const mcodeRuntimeCapabilitiesSchema = z.object({
  sessionDirectorySource: z.boolean().optional(),
  sessionWorkspaceRouting: z.boolean().optional(),
  genUiContext: z.boolean().optional(),
  historyFirst: z.boolean().optional(),
  independentPlanState: z.boolean().optional(),
  /** CLI 认识 rowsRange 的 residency 参数；旧 CLI 会剥掉它并冷恢复，Host 据此拒绝转发。 */
  residentRowsRange: z.boolean().optional(),
});
export const mcodeRuntimeCapabilitiesParamsSchema = z
  .object({
    hostCapabilities: z
      .object({
        sessionDirectorySource: z.boolean().optional(),
        sessionWorkspaceRouting: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const mcodeProtocolErrorCodes = {
  sessionUnavailable: -32004,
} as const;

const nonEmptyString = z.string().trim().min(1);
const jsonObjectSchema = z.record(z.string(), z.unknown());
const timestampMsSchema = z.number().int().nonnegative();
const protocolInstantSchema = z.union([timestampMsSchema, nonEmptyString, z.date()]);

// Tool result display 不受模型文本 budget 约束；Node REPL 图片必须在 Agent/App 协议边界
// 做严格限长，避免截图把 continuous 或 replayable 消息扩成无界载荷。
export const mcodeNodeReplImageToolResultDisplaySchema = z
  .object({
    kind: z.literal("node_repl_images"),
    images: z
      .array(
        z
          .object({
            base64: z
              .string()
              .min(1)
              .max(200 * 1024),
            mimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/iu),
          })
          .strict(),
      )
      .min(1)
      .max(2),
    truncated: z.boolean().optional(),
    source: z.literal("browser_turn_end").optional(),
  })
  .strict();

// 同理：CreateWorkflow 的类型检查诊断也是 display 通道，必须在协议边界限长，
// 避免大量诊断把 continuous/replayable 消息扩成无界载荷。
// causalityGraph 在工具输出边界已限长，这里镜像同一组上界（与 v4 rows 保持一致）。
// 图的词汇表刻意很小：step 卡片 + actor 车道 + 一种箭头（runs after，`back` 只标回边）+
// 返回物标记。分析器的 kind / certainty / exact / region 不进载荷。
// 名字只在运行时成形（`` agent(`研究员${i + 1}`) ``）时静态能拿到的形状：第一个洞之前的
// 字面量（head）与最后一个洞之后的字面量（tail）。至少一个在场，两者都已 trim 且含实义字符。
// Bug 修复：这两个字段随 0a8b059f40 落进 contracts 与 v4 镜像，v3 这份漏改——.strict()
// 之下带插值名的工作流会让整个 display 验证失败、图整块消失，所以这里必须与 v4 逐字段对齐。
const mcodeWorkflowNamePatternSchema = z
  .object({
    head: z.string().min(1).max(128).optional(),
    tail: z.string().min(1).max(128).optional(),
  })
  .strict();

// 一条边 = runs after；step 边与阶段边同形，`back` 只标循环回边。
const mcodeWorkflowEdgeSchema = z
  .object({
    from: z.string().min(1).max(64),
    to: z.string().min(1).max(64),
    back: z.literal(true).optional(),
  })
  .strict();

const mcodeCreateWorkflowCausalityGraphDisplaySchema = z
  .object({
    steps: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            // `hole`：开着的留白自己的站点（docs/dynamic-workflow/presentation.md「Holes on the timeline」）；镜像 v4。
            kind: z.enum(["ask", "world-read", "hole"]),
            label: z.string().min(1).max(128),
            // 内联 `agent()` receiver 让 label 落到兜底串时，那个名字的静态形状。
            labelPattern: mcodeWorkflowNamePatternSchema.optional(),
            line: z.number().int().positive().optional(),
            column: z.number().int().positive().optional(),
            lane: z.string().min(1).max(64),
            lanes: z.array(z.string().min(1).max(64)).max(32).optional(),
            // 展开自的站点 id，只出现在 may-set 车道展开的拷贝上（实时叠加的关联键）；
            // 加字段是 additive 的，不带它的旧载荷照常通过 .strict()。
            source: z.string().min(1).max(64).optional(),
            // 作者用 `phase("…")` 标记划入的阶段。
            // 与图的 phases / phaseEdges / exits 同进同退：全在场或全缺席。
            phase: z.string().min(1).max(64).optional(),
            repeat: z.enum(["stack", "serial"]).optional(),
            // 这个站点是某次补全写进来的：值是那个留白的站点 id；镜像 v4。
            fill: z.string().min(1).max(64).optional(),
          })
          .strict(),
      )
      .max(64),
    lanes: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            name: z.string().min(1).max(128).optional(),
            // `name` 缺席而 agent() 首参是带洞的模板串时的静态形状；与 name 互斥。
            namePattern: mcodeWorkflowNamePatternSchema.optional(),
            line: z.number().int().positive().optional(),
            column: z.number().int().positive().optional(),
          })
          .strict(),
      )
      .max(32),
    // 参与者与交接；镜像 v4。
    participants: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            phase: z.string().min(1).max(64),
            lane: z.string().min(1).max(64),
            steps: z.array(z.string().min(1).max(64)).min(1).max(64),
            member: z
              .object({ index: z.number().int().nonnegative(), of: z.number().int().positive() })
              .strict()
              .optional(),
            many: z.literal(true).optional(),
          })
          .strict(),
      )
      .max(64),
    handoffs: z
      .array(
        mcodeWorkflowEdgeSchema
          .extend({ types: z.array(z.string().min(1).max(128)).min(1).max(8).optional() })
          .strict(),
      )
      .max(256),
    // 阶段词汇表：作者施加的分组结构，主画面以它为节点。与 phaseEdges / exits / Step.phase
    // 全有或全无——零标记脚本全缺席，UI 据此退回 step/车道视图。零成员阶段也在表里。
    // `unphased` 无 name，显示名由 UI 本地化。
    phases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            name: z.string().min(1).max(128).optional(),
            line: z.number().int().positive().optional(),
            column: z.number().int().positive().optional(),
            // 进入本阶段时还在跑的其他阶段（它们的 strand 尚未 join），阶段表序，不含自己，
            // 为空时缺席。是节点事实而不是边——控制没有从那里转移过来，所以不进 phaseEdges。
            // 时间轴据此把相邻阶段折成一条分叉的「带」，侧栏迷你轨道画成双线段。
            alongside: z.array(z.string().min(1).max(64)).min(1).max(32).optional(),
            // 这个阶段是某次补全写进来的：值是那个留白的站点 id；镜像 v4。
            fill: z.string().min(1).max(64).optional(),
          })
          .strict(),
      )
      .max(32)
      .optional(),
    phaseEdges: z.array(mcodeWorkflowEdgeSchema).max(128).optional(),
    // 阶段流（docs/dynamic-workflow/presentation.md「Streams」）：两端互为 alongside 的 data 边，
    // 只有 {from, to}——不是 runs after，不进 phaseEdges、不带 back。与词汇表同进同退。
    phaseStreams: z
      .array(z.object({ from: z.string().min(1).max(64), to: z.string().min(1).max(64) }).strict())
      .max(128)
      .optional(),
    // 还开着的留白，源码序（docs/dynamic-workflow/authoring.md「Holes」）；镜像 v4。
    holes: z
      .array(
        z
          .object({
            siteId: z.string().min(1).max(64),
            name: z.string().min(1).max(128),
            type: z.string().min(1).max(128),
            phase: z.string().min(1).max(64).optional(),
            tail: z.boolean().optional(),
          })
          .strict(),
      )
      .max(32)
      .optional(),
    // 控制流可在其后正常完成的阶段（阶段视图的「阶段 → 返回物」箭头）；组内可为空数组。
    exits: z.array(z.string().min(1).max(64)).max(32).optional(),
    sink: z.array(z.string().min(1).max(64)).max(64).optional(),
    truncated: z.boolean().optional(),
  })
  .strict();

export const mcodeCreateWorkflowToolResultDisplaySchema = z
  .object({
    kind: z.literal("create_workflow"),
    ok: z.boolean(),
    errorCount: z.number().int().nonnegative(),
    diagnostics: z
      .array(
        z
          .object({
            line: z.number().int().nonnegative(),
            column: z.number().int().nonnegative(),
            code: z.number().int().nonnegative(),
            message: z.string().min(1).max(2_048),
          })
          .strict(),
      )
      .max(100),
    causalityGraph: mcodeCreateWorkflowCausalityGraphDisplaySchema.optional(),
    truncated: z.boolean().optional(),
    // FillWorkflowHole 行补的是哪处留白（docs/dynamic-workflow/presentation.md「The fill row」）；镜像 v4。
    // 修复原因：dwf-recursive 只给 contracts 与 v4 加了留白字段，v3 的 .strict() 拒掉整条 tool.updated，
    // 桌面端 v3 订阅于是把含留白的 CreateWorkflow / FillWorkflowHole 结果当无效事件丢掉。
    fill: z
      .object({
        siteId: z.string().min(1).max(64),
        name: z.string().min(1).max(128),
        draftPath: z.string().min(1).max(1_024).optional(),
        line: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const mcodeToolResultObjectSchema = jsonObjectSchema.superRefine((result, context) => {
  const display = result.display;
  if (typeof display !== "object" || display === null || Array.isArray(display)) {
    return;
  }
  const kind = (display as Record<string, unknown>).kind;
  const schemaByKind: Record<string, z.ZodTypeAny> = {
    node_repl_images: mcodeNodeReplImageToolResultDisplaySchema,
    create_workflow: mcodeCreateWorkflowToolResultDisplaySchema,
    bash_output: bashOutputDisplaySchema,
  };
  const schema = typeof kind === "string" ? schemaByKind[kind] : undefined;
  if (!schema) return;
  const parsed = schema.safeParse(display);
  if (parsed.success) return;
  for (const issue of parsed.error.issues) {
    context.addIssue({ ...issue, path: ["display", ...issue.path] });
  }
});

export const mcodeProtocolRequestIdSchema = z.union([z.string(), z.number().int()]);
export type McodeProtocolRequestId = z.infer<typeof mcodeProtocolRequestIdSchema>;

// 远程历史附件仅通过现有连接的私有反向频道传输，单块保持在 RPC 帧预算内。
export const TOPIC_RESOURCE_RELAY_CHUNK_BYTES = 384 * 1024;
export const TOPIC_RESOURCE_RELAY_CHANNEL = "host-topic-resource";
export const mcodeTopicResourceRelayRequestSchema = mcodeTopicResourceReadParamsSchema
  .extend({
    workspacePath: z.string().min(1).max(4096),
    workspaceIdentity: z.string().min(1).max(4096),
    remoteSessionId: z.string().min(1).max(256),
    trace: mcodeProtocolTraceSchema.optional(),
  })
  .strict();
export type McodeTopicResourceRelayRequest = z.infer<typeof mcodeTopicResourceRelayRequestSchema>;
export const mcodeTopicResourceRelayKeySchema = mcodeTopicResourceCancelParamsSchema;
export const mcodeTopicResourceRelayChunkRequestSchema = mcodeTopicResourceRelayKeySchema
  .extend({
    index: z.number().int().nonnegative(),
  })
  .strict();
export const mcodeTopicResourceRelayMetadataSchema = z
  .object({
    fileName: z.string().min(1).max(1024),
    mime: z.string().min(1).max(256),
    bytes: z.number().int().min(0).max(PROTOCOL_V4_LIMITS.attachmentMaxBytes),
    totalChunks: z
      .number()
      .int()
      .min(0)
      .max(Math.ceil(PROTOCOL_V4_LIMITS.attachmentMaxBytes / TOPIC_RESOURCE_RELAY_CHUNK_BYTES)),
    checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict();
export const mcodeTopicResourceRelayChunkSchema = z
  .object({
    dataBase64: z.string().max((TOPIC_RESOURCE_RELAY_CHUNK_BYTES / 3) * 4),
  })
  .strict();

export const mcodeProtocolRequestSchema = z
  .object({
    id: mcodeProtocolRequestIdSchema,
    method: nonEmptyString,
    params: z.unknown().optional(),
    trace: mcodeProtocolTraceSchema.optional(),
  })
  .strict();
export type McodeProtocolRequest = z.infer<typeof mcodeProtocolRequestSchema>;

export const mcodeProtocolNotificationSchema = z
  .object({
    method: nonEmptyString,
    params: z.unknown().optional(),
    trace: mcodeProtocolTraceSchema.optional(),
  })
  .strict();
export type McodeProtocolNotification = z.infer<typeof mcodeProtocolNotificationSchema>;

export const mcodeProtocolResponseSchema = z
  .object({
    id: mcodeProtocolRequestIdSchema,
    result: z.unknown(),
  })
  .strict();
export type McodeProtocolResponse = z.infer<typeof mcodeProtocolResponseSchema>;

export const mcodeProtocolErrorSchema = z
  .object({
    id: mcodeProtocolRequestIdSchema,
    error: z
      .object({
        code: z.number().int(),
        message: nonEmptyString,
        data: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();
export type McodeProtocolError = z.infer<typeof mcodeProtocolErrorSchema>;

export const mcodeProtocolMessageSchema = z.union([
  mcodeProtocolRequestSchema,
  mcodeProtocolNotificationSchema,
  mcodeProtocolResponseSchema,
  mcodeProtocolErrorSchema,
]);
export type McodeProtocolMessage = z.infer<typeof mcodeProtocolMessageSchema>;

export const mcodeProtocolNotifications = {
  storageStartup: "startup/storageState",
  providerRuntimeHeadersCancelled: "interaction/providerRuntimeHeadersCancelled",
  mcpTelemetry: "process/mcpTelemetry",
  mcpResourceSamples: "process/mcpResourceSamples",
  toolExecResource: "process/toolExecResource",
  pluginOperationProgress: "plugins/operationProgress",
  processResourceSample: "process/resourceSample",
  processNetworkRequests: "process/networkRequests",
} as const;

/** 启动控制面独立于 task stream；数据库身份不可携带路径/凭据。 */
export const mcodeStorageStartupStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().min(1).max(128),
    sequence: z.number().int().positive(),
    databaseId: z.string().min(1).max(128),
    databaseKind: z.enum(["session", "tasks-index"]),
    phase: z.enum(["checking", "waiting_for_lock", "migrating", "committing", "ready", "failed"]),
    // 包含锁内、版本 SQL 之前的可选 lastAppliedMigrationId；旧通知仍可解析。
    migration: databaseMigrationFactsSchema.optional(),
    elapsedMs: z.number().nonnegative().finite(),
    completed: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
    errorCode: databaseStartupErrorCodeSchema.optional(),
    ...databaseStartupErrorDetailsSchema.shape,
  })
  .strict()
  .superRefine((state, context) => {
    if (state.phase === "failed" && !state.errorCode)
      context.addIssue({ code: "custom", message: "failed requires errorCode" });
  });
export type McodeStorageStartupState = z.infer<typeof mcodeStorageStartupStateSchema>;

const mcodeMcpTelemetryPlatformSchema = z.enum([
  "aix",
  "android",
  "darwin",
  "freebsd",
  "haiku",
  "linux",
  "netbsd",
  "openbsd",
  "sunos",
  "win32",
  "cygwin",
]);
const mcodeMcpTelemetryArchSchema = z.enum([
  "arm",
  "arm64",
  "ia32",
  "loong64",
  "mips",
  "mipsel",
  "ppc",
  "ppc64",
  "riscv64",
  "s390",
  "s390x",
  "x64",
]);
const mcodeMcpTelemetryBaseSchema = z
  .object({
    arch: mcodeMcpTelemetryArchSchema,
    occurredAt: z.number().int().nonnegative(),
    platform: mcodeMcpTelemetryPlatformSchema,
  })
  .strict();
const zcodeMcpProcessTelemetryBaseShape = {
  mcpId: z
    .string()
    .regex(
      /^(?:builtin:(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+(?::(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+)*|(?:plugin|custom):[a-f0-9]{12})$/,
    ),
  mcpInstanceId: nonEmptyString,
  mcpIsolation: z.enum(["session", "workspace"]),
  mcpSource: z.enum(["builtin", "plugin", "custom"]),
} as const;

export const mcodeMcpTelemetryEventSchema = z.discriminatedUnion("kind", [
  mcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("process_start"),
      ...zcodeMcpProcessTelemetryBaseShape,
    })
    .strict(),
  mcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("process_crash"),
      ...zcodeMcpProcessTelemetryBaseShape,
      affectedSessionCount: z.number().int().nonnegative().max(10_000),
      exitCode: z.number().int().nullable(),
      signal: nonEmptyString.nullable(),
      uptimeMs: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })
    .strict(),
  mcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("session_startup"),
      configuredCount: z.number().int().nonnegative().max(10_000),
      connectedCount: z.number().int().nonnegative().max(10_000),
      failedCount: z.number().int().nonnegative().max(10_000),
      processCount: z.number().int().nonnegative().max(10_000),
      sessionId: nonEmptyString,
    })
    .strict(),
  mcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("memory"),
      ...zcodeMcpProcessTelemetryBaseShape,
      memoryKb: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
      memoryScope: z.enum(["process_tree", "direct_process"]),
      orphanSuspected: z.boolean(),
      ownerSessionCount: z.number().int().nonnegative().max(10_000),
      unownedSeconds: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })
    .strict(),
]);
export type McodeMcpTelemetryEvent = z.infer<typeof mcodeMcpTelemetryEventSchema>;

/** MCP 每五分钟只探测一次，周期由生产者与设备总量过期判据共用。 */
export const MCODE_MCP_RESOURCE_SAMPLE_INTERVAL_MS = 5 * 60_000;

export const mcodeMcpResourceSampleSchema = z
  .object({
    mcpId: zcodeMcpProcessTelemetryBaseShape.mcpId,
    instanceToken: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
    sampledAt: z.number().int().nonnegative(),
    intervalMs: z.number().finite().positive(),
    processCount: z.number().int().positive().max(100_000),
    rssKbTotal: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    rssKbMaxProcess: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    cpuTimeMsDelta: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    uptimeMinutes: z.number().int().nonnegative(),
    platform: mcodeMcpTelemetryPlatformSchema,
    arch: mcodeMcpTelemetryArchSchema,
    logicalCpuCount: z.number().int().positive().max(4_096),
    totalMemoryGb: z.number().int().nonnegative().max(1_048_576),
  })
  .strict();
export type McodeMcpResourceSample = z.infer<typeof mcodeMcpResourceSampleSchema>;
// 通知输入有界；main 另按每个上报窗口的 32 个 MCP 分组执行事件额度。
export const mcodeMcpResourceSamplesSchema = z.array(mcodeMcpResourceSampleSchema).max(1_024);

export const BASH_RESOURCE_SAMPLE_INTERVAL_MS = 15_000;
export const BASH_RESOURCE_MAX_SAMPLES = 20;

/** Bash 子进程的有界完成事实；禁止命令、路径与会话标识进入遥测旁路。 */
export const mcodeToolExecResourceSchema = z
  .object({
    // 同一完成事实可能经多个 Host 转发；随机标识仅供 main 去重，旧 CLI 缺字段仍兼容。
    completionToken: z.string().uuid().optional(),
    platform: mcodeMcpTelemetryPlatformSchema,
    toolName: z.literal("bash"),
    durationMs: z.number().finite().min(BASH_RESOURCE_SAMPLE_INTERVAL_MS),
    exitKind: z.enum(["completed", "timeout", "killed", "error"]),
    treeRssKbPeak: z.number().finite().nonnegative().optional(),
    treeCpuTimeMs: z.number().finite().nonnegative().optional(),
    sampleCount: z.number().int().nonnegative().max(BASH_RESOURCE_MAX_SAMPLES),
    cliRssKb: z.number().finite().nonnegative(),
    systemFreeMemoryKb: z.number().finite().nonnegative(),
  })
  .strict();
export type McodeToolExecResource = z.infer<typeof mcodeToolExecResourceSchema>;

export const mcodeProcessResourceSampleSchema = z
  .object({
    platform: z.enum([
      "aix",
      "android",
      "darwin",
      "freebsd",
      "haiku",
      "linux",
      "netbsd",
      "openbsd",
      "sunos",
      "win32",
      "cygwin",
    ]),
    arch: z.enum([
      "arm",
      "arm64",
      "ia32",
      "loong64",
      "mips",
      "mipsel",
      "ppc",
      "ppc64",
      "riscv64",
      "s390",
      "s390x",
      "x64",
    ]),
    logicalCpuCount: z.number().int().positive().max(4_096),
    intervalMs: z
      .number()
      .int()
      .positive()
      .max(7 * 24 * 60 * 60 * 1_000),
    cpuCores: z.number().finite().nonnegative().max(4_096),
    cpuPercent: z.number().finite().nonnegative().max(100_000),
    rssKb: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    /**
     * 以下四项为遥测新增字段，全部可选：旧 CLI 发来的样本仍能通过校验，因此
     * **不递增协议握手版本号**（握手版本是兼容性开关，不是字段版本）。
     */
    heapUsedKb: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    uptimeMinutes: z
      .number()
      .int()
      .nonnegative()
      .max(10 * 365 * 24 * 60)
      .optional(),
    totalMemoryGb: z.number().int().nonnegative().max(1_048_576).optional(),
    /**
     * CLI 进程启动时随机生成的实例标识，仅供 app 侧 main 统计「同时存活几个 CLI 进程」
     * 与「最大单进程 RSS」。不进 ARMS 属性、不含 pid。收紧字符集是隐私红线的机械保障：
     * 路径、workspace 标识这类内容不可能通过校验。
     */
    instanceToken: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,64}$/)
      .optional(),
  })
  .strict();
export type McodeProcessResourceSample = z.infer<typeof mcodeProcessResourceSampleSchema>;

export const mcodeProcessChildProcessesParamsSchema = z.object({}).strict();
export const mcodeProcessChildProcessSchema = z
  .object({
    pid: z.number().int().positive(),
    serverName: nonEmptyString,
    mcpSource: z.enum(["builtin", "plugin", "custom"]),
    /** 官方/第三方插件的插件名（`plugin:<name>:<key>` 的 name，或官方 host MCP 对应插件）；custom 无 */
    pluginName: nonEmptyString.optional(),
  })
  .strict();
export const mcodeProcessChildProcessesResultSchema = z
  .object({
    processes: z.array(mcodeProcessChildProcessSchema).max(10_000),
  })
  .strict();
export type McodeProcessChildProcess = z.infer<typeof mcodeProcessChildProcessSchema>;
export type McodeProcessChildProcessesResult = z.infer<
  typeof mcodeProcessChildProcessesResultSchema
>;

export type McodeDeliveryKind = z.infer<typeof mcodeDeliveryKindSchema>;
// TurnStarted 与持久 message 必须共用同一来源词表；否则 live event 能通过而 cold
// message 在 app/agent 边界被拒绝，造成 continuous/replayable 语义分叉。
// 持久消息与输入沿用同一 source schema；agent_listing_delta 只作 provider context，不触发新 turn。
const mcodeTurnInputSourceSchema = legacyMcodeSyntheticUserMessageSourceSchema;
export const mcodeSessionPersistenceSchema = z.enum(["immediate", "deferred"]);
export type McodeSessionPersistence = z.infer<typeof mcodeSessionPersistenceSchema>;
export type McodeWorkspaceRef = z.infer<typeof mcodeWorkspaceRefSchema>;
export const mcodePermissionOptionSchema = z
  .object({
    optionId: nonEmptyString,
    kind: nonEmptyString,
    name: nonEmptyString,
    description: z.string().optional(),
    response: mcodePermissionResponseSchema,
  })
  .strict();

const mcodeProtocolMcpEntrySchema = z
  .object({
    name: nonEmptyString,
    value: z.string(),
  })
  .strict();

const mcodeProtocolMcpOAuthSchema = z.union([
  z
    .object({
      type: z.literal("client_credentials"),
      clientId: nonEmptyString,
      clientSecret: nonEmptyString,
      clientName: nonEmptyString.optional(),
      scope: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("authorization_code"),
      clientId: nonEmptyString.optional(),
      clientSecret: nonEmptyString.optional(),
      clientName: nonEmptyString.optional(),
      redirectPath: nonEmptyString.optional(),
      scope: z.string().optional(),
    })
    .strict(),
]);

export const mcodeProtocolMcpServerSchema = z.union([
  z
    .object({
      name: nonEmptyString,
      scope: z.enum(["user", "workspace"]).optional(),
      command: nonEmptyString,
      cwd: nonEmptyString.optional(),
      args: z.array(z.string()),
      env: z.array(mcodeProtocolMcpEntrySchema),
      isolation: z.enum(["session", "workspace"]).optional(),
      protocolVersion: z.enum(["legacy", "auto", "2026-07-28"]).optional(),
      alwaysLoad: z.boolean().optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      name: nonEmptyString,
      scope: z.enum(["user", "workspace"]).optional(),
      type: z.enum(["http", "sse"]),
      url: nonEmptyString,
      headers: z.array(mcodeProtocolMcpEntrySchema),
      oauth: mcodeProtocolMcpOAuthSchema.optional(),
      isolation: z.enum(["session", "workspace"]).optional(),
      protocolVersion: z.enum(["legacy", "auto", "2026-07-28"]).optional(),
      alwaysLoad: z.boolean().optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .strict(),
]);
export type McodeProtocolMcpServer = z.infer<typeof mcodeProtocolMcpServerSchema>;

export const mcodeMcpServerStatusKindSchema = z.enum([
  "connecting",
  "connected",
  "disabled",
  "disconnected",
  "failed",
  "untrusted",
]);
export const MCP_SERVER_FAILURE_KINDS = [
  "config_invalid",
  "runtime_unavailable",
  "process_start_failed",
  "network_unreachable",
  "connection_timeout",
  "protocol_negotiation_failed",
  "tool_list_failed",
  "unexpected_disconnect",
  "oauth_authorization_failed",
  "official_origin_untrusted",
  "not_authenticated",
  "coding_plan_required",
  "server_not_found",
  "server_unavailable",
  "rate_limited",
  "server_internal_error",
  "protocol_error",
  "status_unavailable",
  "connection_failed",
] as const;
export const mcpServerFailureKindSchema = z.enum(MCP_SERVER_FAILURE_KINDS);
export type McpServerFailureKind = z.infer<typeof mcpServerFailureKindSchema>;
export const workspaceMcpTrustReviewSchema = z
  .object({
    declarationDigest: z.string().regex(/^[a-f0-9]{64}$/u),
    sourcePaths: z.array(nonEmptyString),
    display: z.string(),
    trusted: z.boolean(),
    configuredEnabled: z.boolean(),
    transport: z.enum(["stdio", "http", "sse"]),
  })
  .strict();
export type WorkspaceMcpTrustReview = z.infer<typeof workspaceMcpTrustReviewSchema>;
export const mcodeWorkspaceMcpTrustParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    serverName: nonEmptyString,
    declarationDigest: z.string().regex(/^[a-f0-9]{64}$/u),
    trusted: z.boolean(),
  })
  .strict();
export const mcodeWorkspaceMcpTrustResultSchema = z
  .object({
    accepted: z.boolean(),
    reasonCode: z
      .enum(["workspace_mcp_declaration_changed", "workspace_mcp_trust_unavailable"])
      .optional(),
  })
  .strict();
export type McodeWorkspaceMcpTrustResult = z.infer<typeof mcodeWorkspaceMcpTrustResultSchema>;
export const mcodeMcpServerStatusSnapshotSchema = z
  .object({
    status: mcodeMcpServerStatusKindSchema,
    workspaceTrust: workspaceMcpTrustReviewSchema.optional(),
    transport: z.enum(["stdio", "http", "sse"]),
    toolCount: z.number().int().nonnegative(),
    updatedAt: nonEmptyString,
    error: z.string().optional(),
    failureKind: mcpServerFailureKindSchema.optional(),
    serverRequestId: nonEmptyString.optional(),
    protocolEra: z.enum(["legacy", "modern"]).optional(),
    authorization: z
      .object({
        type: z.literal("oauth_authorization_code"),
        authorizationUrl: nonEmptyString,
        startedAt: nonEmptyString,
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodeMcpServerStatusSnapshot = z.infer<typeof mcodeMcpServerStatusSnapshotSchema>;

export const mcodeMcpListModeSchema = z.enum(["connect", "status"]);
export type McodeMcpListMode = z.infer<typeof mcodeMcpListModeSchema>;

export const mcodeMcpListParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    mcpServers: z.array(mcodeProtocolMcpServerSchema).optional(),
    mode: mcodeMcpListModeSchema.default("connect"),
  })
  .strict();
export const mcodeMcpListResultSchema = z
  .object({
    statuses: z.record(z.string(), mcodeMcpServerStatusSnapshotSchema),
  })
  .strict();
export type McodeMcpListResult = z.infer<typeof mcodeMcpListResultSchema>;

// 插件 UI：UI 发起的 MCP 资源读取与工具调用，
// 按 pluginId 限定 server 归属，agent 侧 fail closed。
export const mcodeMcpUiOpenInstanceParamsSchema = z
  .object({
    accountContext: z.string().max(256).optional(),
    workspace: mcodeWorkspaceRefSchema,
    sessionId: nonEmptyString,
    pluginId: nonEmptyString,
    serverName: nonEmptyString,
    scopeId: nonEmptyString.max(4096),
    resourceUri: nonEmptyString.max(2048),
    ownerWebContentsId: z.number().int().positive(),
  })
  .strict();
export const mcodeMcpUiOpenInstanceResultSchema = mcpAppInstanceSchema;
export type McodeMcpUiOpenInstanceParams = z.infer<typeof mcodeMcpUiOpenInstanceParamsSchema>;
const zcodeMcpUiPluginScopeShape = {
  instance: mcpAppInstanceSchema,

  workspace: mcodeWorkspaceRefSchema,
  sessionId: nonEmptyString,
  pluginId: nonEmptyString,
  serverName: nonEmptyString,
};
export const mcodeMcpUiCloseInstanceParamsSchema = z
  .object({ ...zcodeMcpUiPluginScopeShape, onlyIfIdle: z.boolean().optional() })
  .strict();
export const mcodeMcpUiCloseInstanceResultSchema = z.object({ closed: z.boolean() }).strict();
export const mcodeMcpReadResourceParamsSchema = z
  .object({ ...zcodeMcpUiPluginScopeShape, uri: nonEmptyString.max(2048) })
  .strict();
export type McodeMcpReadResourceParams = z.infer<typeof mcodeMcpReadResourceParamsSchema>;
export const mcodeMcpResourceContentSchema = z
  .object({
    uri: z.string(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    blob: z.string().optional(),
    _meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export const mcodeMcpReadResourceResultSchema = z
  .object({ contents: z.array(mcodeMcpResourceContentSchema) })
  .strict();
export type McodeMcpReadResourceResult = z.infer<typeof mcodeMcpReadResourceResultSchema>;

/**
 * 插件页面发起的 `resources/read` 代理。
 * 与 `mcp/readResource`（宿主取 ui:// HTML）参数同形，但结果去掉 `_meta`、受 8 MiB 与 mimeType 白名单约束。
 */
export const mcodeMcpUiReadResourceParamsSchema = mcodeMcpReadResourceParamsSchema;
export type McodeMcpUiReadResourceParams = z.infer<typeof mcodeMcpUiReadResourceParamsSchema>;
export const mcodeMcpUiResourceContentSchema = z
  .object({
    uri: z.string(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    blob: z.string().optional(),
  })
  .strict();
export const mcodeMcpUiReadResourceResultSchema = z
  .object({ contents: z.array(mcodeMcpUiResourceContentSchema) })
  .strict();
export type McodeMcpUiReadResourceResult = z.infer<typeof mcodeMcpUiReadResourceResultSchema>;

export const mcodeMcpUiSamplingParamsSchema = z
  .object({
    ...zcodeMcpUiPluginScopeShape,
    operationId: nonEmptyString.max(128),
    request: mcpAppsSamplingParamsSchema,
  })
  .strict();
export const mcodeMcpUiCancelSamplingParamsSchema = z
  .object({ ...zcodeMcpUiPluginScopeShape, operationId: nonEmptyString.max(128) })
  .strict();
export const mcodeMcpUiSamplingResultSchema = mcpAppsSamplingResultSchema;
export type McodeMcpUiSamplingParams = z.infer<typeof mcodeMcpUiSamplingParamsSchema>;
export type McodeMcpUiCancelSamplingParams = z.infer<typeof mcodeMcpUiCancelSamplingParamsSchema>;

export const mcodeMcpUiCallToolParamsSchema = z
  .object({
    ...zcodeMcpUiPluginScopeShape,
    toolName: nonEmptyString,
    arguments: z.record(z.string(), z.unknown()).optional(),
    /** 宿主生成的调用 id，配合 `mcp/uiCancelCall` 取消进行中的调用。 */
    callId: nonEmptyString.max(128),
  })
  .strict();
export type McodeMcpUiCallToolParams = z.infer<typeof mcodeMcpUiCallToolParamsSchema>;
/** 取消页面发起的工具调用（卡片卸载、会话切换）；agent 侧 abort 到 MCP client。 */
export const mcodeMcpUiCancelCallParamsSchema = z
  .object({ ...zcodeMcpUiPluginScopeShape, callId: nonEmptyString.max(128) })
  .strict();
export type McodeMcpUiCancelCallParams = z.infer<typeof mcodeMcpUiCancelCallParamsSchema>;
export const mcodeMcpUiCancelCallResultSchema = z.object({ cancelled: z.boolean() }).strict();
export type McodeMcpUiCancelCallResult = z.infer<typeof mcodeMcpUiCancelCallResultSchema>;
/** 页面发起的 resources/list、resources/templates/list、subscribe、unsubscribe 代理。 */
export const mcodeMcpUiListResourcesParamsSchema = z
  .object({ ...zcodeMcpUiPluginScopeShape, cursor: nonEmptyString.max(2048).optional() })
  .strict();
export type McodeMcpUiListResourcesParams = z.infer<typeof mcodeMcpUiListResourcesParamsSchema>;
const mcodeMcpUiResourceDescriptorSchema = z
  .object({
    uri: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    mimeType: z.string().optional(),
    // MCP Resource 的标准字段；规范把资源级 csp / prefersBorder 放在这里，宿主读 HTML 项缺 _meta 时回退用。
    _meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export const mcodeMcpUiListResourcesResultSchema = z
  .object({
    resources: z.array(mcodeMcpUiResourceDescriptorSchema),
    nextCursor: z.string().optional(),
  })
  .strict();
export type McodeMcpUiListResourcesResult = z.infer<typeof mcodeMcpUiListResourcesResultSchema>;
export const mcodeMcpUiListResourceTemplatesResultSchema = z
  .object({
    resourceTemplates: z.array(
      z
        .object({
          uriTemplate: z.string(),
          name: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          mimeType: z.string().optional(),
        })
        .strict(),
    ),
    nextCursor: z.string().optional(),
  })
  .strict();
export type McodeMcpUiListResourceTemplatesResult = z.infer<
  typeof mcodeMcpUiListResourceTemplatesResultSchema
>;
/** 订阅者身份 = 会话 + 沙箱作用域 + 实例代际（initId）；dispose 只退订本代际，新实例不受影响。 */
export const mcodeMcpUiResourceSubscriptionParamsSchema = z
  .object({
    ...zcodeMcpUiPluginScopeShape,
    scopeId: nonEmptyString.max(256),
    generation: z.number().int().nonnegative(),
    uri: nonEmptyString.max(2048),
  })
  .strict();
export type McodeMcpUiResourceSubscriptionParams = z.infer<
  typeof mcodeMcpUiResourceSubscriptionParamsSchema
>;
export const mcodeMcpUiResourceSubscriptionResultSchema = z.object({}).strict();
/**
 * App-Provided Tools：实例身份 = 会话 + 沙箱作用域 + 代际（与资源订阅同一三元组）。
 * 登记按实例整体替换；调用认领 / 回传按 callId 幂等。
 */
const zcodeMcpUiAppToolInstanceShape = {
  ...zcodeMcpUiPluginScopeShape,
  scopeId: nonEmptyString.max(256),
  generation: z.number().int().nonnegative(),
};
export const mcodeMcpUiRegisterAppToolsParamsSchema = z
  .object({
    ...zcodeMcpUiAppToolInstanceShape,
    tools: z.array(mcpAppsAppToolDescriptorSchema).max(MCP_APPS_APP_TOOLS_MAX_PER_INSTANCE),
  })
  .strict();
export type McodeMcpUiRegisterAppToolsParams = z.infer<
  typeof mcodeMcpUiRegisterAppToolsParamsSchema
>;
export const mcodeMcpUiRegisterAppToolsResultSchema = z
  .object({ tools: z.array(z.object({ name: z.string(), modelName: z.string() }).strict()) })
  .strict();
export type McodeMcpUiRegisterAppToolsResult = z.infer<
  typeof mcodeMcpUiRegisterAppToolsResultSchema
>;
export const mcodeMcpUiUnregisterAppToolsParamsSchema = z
  .object(zcodeMcpUiAppToolInstanceShape)
  .strict();
export type McodeMcpUiUnregisterAppToolsParams = z.infer<
  typeof mcodeMcpUiUnregisterAppToolsParamsSchema
>;
export const mcodeMcpUiUnregisterAppToolsResultSchema = z
  .object({ removed: z.number().int().nonnegative() })
  .strict();
export type McodeMcpUiUnregisterAppToolsResult = z.infer<
  typeof mcodeMcpUiUnregisterAppToolsResultSchema
>;
export const mcodeMcpUiClaimAppToolCallParamsSchema = z
  .object({
    ...zcodeMcpUiAppToolInstanceShape,
    callId: nonEmptyString.max(MCP_APPS_APP_TOOL_CALL_ID_MAX_CHARS),
  })
  .strict();
export type McodeMcpUiClaimAppToolCallParams = z.infer<
  typeof mcodeMcpUiClaimAppToolCallParamsSchema
>;
export const mcodeMcpUiAppToolAcceptedResultSchema = z.object({ accepted: z.boolean() }).strict();
export type McodeMcpUiAppToolAcceptedResult = z.infer<typeof mcodeMcpUiAppToolAcceptedResultSchema>;
export const mcodeMcpUiResolveAppToolCallParamsSchema = z
  .object({
    ...zcodeMcpUiAppToolInstanceShape,
    callId: nonEmptyString.max(MCP_APPS_APP_TOOL_CALL_ID_MAX_CHARS),
    result: mcpAppsAppToolCallResultSchema.optional(),
    error: z
      .object({ message: z.string().max(MCP_APPS_APP_TOOL_ERROR_MESSAGE_MAX_CHARS) })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => (value.result === undefined) !== (value.error === undefined), {
    message: "exactly one of result or error is required",
  });
export type McodeMcpUiResolveAppToolCallParams = z.infer<
  typeof mcodeMcpUiResolveAppToolCallParamsSchema
>;
export const mcodeMcpUiCallToolResultSchema = z
  .object({
    content: z.array(z.record(z.string(), z.unknown())),
    structuredContent: z.unknown().optional(),
    isError: z.boolean().optional(),
    _meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type McodeMcpUiCallToolResult = z.infer<typeof mcodeMcpUiCallToolResultSchema>;

export const mcodeSessionImportMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: timestampMsSchema.optional(),
  })
  .strict();
export type McodeSessionImportMessage = z.infer<typeof mcodeSessionImportMessageSchema>;

export const mcodeSessionImportHistorySchema = z.discriminatedUnion("source", [
  z
    .object({
      source: z.literal("claudeCode"),
      title: z.string().optional(),
      createdAt: timestampMsSchema.optional(),
      updatedAt: timestampMsSchema.optional(),
      messages: z.array(mcodeSessionImportMessageSchema).min(1),
    })
    .strict(),
  z
    .object({
      source: z.literal("sharedContext"),
      title: z.string().trim().min(1),
      createdAt: timestampMsSchema.optional(),
      markdown: z.string().min(1),
      provenance: z
        .object({
          shareId: z.string().trim().min(1),
          contextId: z.string().trim().min(1).optional(),
          shareUrl: z.string().url().optional(),
          status: z.enum(["pending", "reserved", "attached", "discarded"]).optional(),
          projectionSha256: z.string().regex(/^[0-9a-f]{64}$/u),
          artifactSetSha256: z.string().regex(/^[0-9a-f]{64}$/u),
          formatterVersion: z.literal(1),
          markdownSha256: z.string().regex(/^[0-9a-f]{64}$/u),
          installedArtifacts: z.array(
            z
              .object({
                artifactId: z.string().trim().min(1),
                workspaceRelativePath: z.string().trim().min(1),
              })
              .strict(),
          ),
        })
        .strict(),
    })
    .strict(),
]);
export type McodeSessionImportHistory = z.infer<typeof mcodeSessionImportHistorySchema>;

export const mcodeThoughtLevelOptionSchema = z
  .object({
    value: nonEmptyString,
    label: nonEmptyString,
    description: z.string().optional(),
  })
  .strict();
export const mcodeModelReasoningOptionsSchema = z
  .object({
    levels: z.array(mcodeThoughtLevelOptionSchema),
    defaultLevel: nonEmptyString.optional(),
  })
  .strict();
export type McodeModelReasoningOptions = z.infer<typeof mcodeModelReasoningOptionsSchema>;

export const mcodeModelFormatPropertiesSchema = completeModelPropertiesDataSchema.pick({
  inputFormat: true,
  outputFormat: true,
});
export type McodeModelFormatProperties = z.infer<typeof mcodeModelFormatPropertiesSchema>;

export const mcodeModelOptionSchema = z
  .object({
    ref: modelSelectionSchema,
    label: nonEmptyString,
    providerLabel: nonEmptyString.optional(),
    description: z.string().optional(),
    contextWindow: z.number().int().positive().optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    reasoning: mcodeModelReasoningOptionsSchema.optional(),
    properties: mcodeModelFormatPropertiesSchema,
    disabledReason: z.string().optional(),
  })
  .strict();
export type McodeModelOption = z.infer<typeof mcodeModelOptionSchema>;

export const mcodeAccountAccessSchema = z.discriminatedUnion("planKind", [
  z
    .object({
      type: z.literal("zhipu-account"),
      family: z.enum(["zai", "bigmodel"]),
      planKind: z.literal("start-plan"),
    })
    .strict(),
  z
    .object({
      type: z.literal("zhipu-account"),
      family: z.enum(["zai", "bigmodel"]),
      planKind: z.literal("individual-coding-plan"),
    })
    .strict(),
  z
    .object({
      type: z.literal("zhipu-account"),
      family: z.enum(["zai", "bigmodel"]),
      planKind: z.literal("team-coding-plan"),
      productId: nonEmptyString,
      organizationId: nonEmptyString,
      projectId: nonEmptyString,
    })
    .strict(),
]);
export type McodeAccountAccess = z.infer<typeof mcodeAccountAccessSchema>;

/** Active Model 固定的账号访问类别；当前商品和 Team scope 由账号服务在请求期解析。 */
export const mcodeProviderAccountAccessSchema = z
  .object({
    type: z.literal("zhipu-account"),
    accountType: z.enum(["zai", "bigmodel"]),
    // `highspeed` 指加速卡这一账号访问类别（隐藏 Provider + 免签网关），与模型名
    // GLM-5.1-Highspeed 无关，仅字面重合。见 docs/highspeed/highspeed-access-mode-migration.md。
    mode: z.enum([
      "start-plan",
      "individual-coding-plan",
      "team-coding-plan",
      "off-peak",
      "highspeed",
    ]),
    entitled: z.boolean(),
  })
  .strict();
export type McodeProviderAccountAccess = z.infer<typeof mcodeProviderAccountAccessSchema>;

export type McodeSessionMode = z.infer<typeof mcodeSessionModeSchema>;
export type McodeSessionKind = z.infer<typeof mcodeSessionKindSchema>;
export type McodeSessionGoal = z.infer<typeof mcodeSessionGoalSchema>;

export const mcodeSessionTodoItemSchema = z
  .object({
    content: nonEmptyString,
    status: z.enum(["pending", "in_progress", "completed"]),
    priority: z.enum(["high", "medium", "low"]),
  })
  .strict();
export const mcodeSessionGoalStatsSchema = z
  .object({
    timeUsedSeconds: z.number().int().nonnegative(),
    tokensUsed: z.number().int().nonnegative(),
    tokenBudget: z.number().int().positive().nullable(),
    contextUsed: z.number().int().nonnegative(),
    contextWindow: z.number().int().nonnegative(),
    toolCallCount: z.number().int().nonnegative(),
    iterationCount: z.number().int().nonnegative(),
  })
  .strict();
export type McodeSessionGoalStats = z.infer<typeof mcodeSessionGoalStatsSchema>;
export type McodeSessionGoalVerification = z.infer<typeof mcodeSessionGoalVerificationSchema>;
export type McodeSessionGoalVerificationTimeline = z.infer<
  typeof mcodeSessionGoalVerificationTimelineSchema
>;

export const mcodeSessionTodoGroupSchema = z
  .object({
    id: nonEmptyString,
    source: z.enum(["goal_iteration", "session"]),
    goalIteration: z.number().int().positive().optional(),
    targetId: nonEmptyString.optional(),
    startedAt: timestampMsSchema.optional(),
    updatedAt: timestampMsSchema.optional(),
    todos: z.array(mcodeSessionTodoItemSchema),
  })
  .strict();
export type McodeSessionTodoGroup = z.infer<typeof mcodeSessionTodoGroupSchema>;

export const mcodeSessionSettingsStateSchema = z
  .object({
    model: z
      .object({
        // 未绑定是合法恢复状态；不能为满足协议而伪造模型或阻断历史读取。
        current: modelSelectionSchema.optional(),
        available: z.array(mcodeModelOptionSchema),
        lastUsed: modelSelectionSchema.optional(),
      })
      .strict(),
    thoughtLevel: z
      .object({
        enabled: z.boolean(),
        current: nonEmptyString.optional(),
        defaultLevel: nonEmptyString.optional(),
        available: z.array(mcodeThoughtLevelOptionSchema),
      })
      .strict(),
    mode: z
      .object({
        current: mcodeSessionModeSchema,
      })
      .strict(),
    permission: z
      .object({
        mode: mcodeSessionModeSchema.optional(),
        rulesRevision: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodeSessionSettingsState = z.infer<typeof mcodeSessionSettingsStateSchema>;
export const mcodePendingPermissionSchema = z
  .object({
    requestId: nonEmptyString,
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    reason: z.string(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    input: z.unknown().optional(),
    origin: mcodeInteractionRequestOriginSchema.optional(),
    options: z.array(mcodePermissionOptionSchema).min(1),
    requestedAt: timestampMsSchema,
  })
  .strict();
export type McodePendingPermission = z.infer<typeof mcodePendingPermissionSchema>;

export const mcodeActiveToolCallSchema = z
  .object({
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    status: z.enum(["pending", "running", "completed", "failed", "denied"]),
    startedAt: timestampMsSchema.optional(),
  })
  .strict();
export type McodeActiveToolCall = z.infer<typeof mcodeActiveToolCallSchema>;

export const mcodeSessionProjectionSchema = z
  .object({
    sessionId: nonEmptyString,
    status: mcodeSessionStatusSchema,
    mode: mcodeSessionModeSchema,
    turnCount: z.number().int().nonnegative(),
    totalTokenCount: z.number().int().nonnegative(),
    contextUsed: z.number().int().nonnegative(),
    contextWindow: z.number().int().nonnegative(),
    currentTurnId: nonEmptyString.optional(),
    pendingPermissions: z.array(mcodePendingPermissionSchema),
    activeToolCalls: z.array(mcodeActiveToolCallSchema),
    backgroundJobs: z.array(jsonObjectSchema),
    target: mcodeSessionGoalSchema.nullable().optional(),
    lastError: z
      .object({
        type: nonEmptyString,
        code: nonEmptyString.optional(),
        message: nonEmptyString,
        detail: z.string().optional(),
        attribution: errorAttributionSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodeSessionProjection = z.infer<typeof mcodeSessionProjectionSchema>;
export type McodeToolState = z.infer<typeof mcodeToolStateSchema>;
export const mcodeSlashCommandSchema = z
  .object({
    name: nonEmptyString,
    description: z.string(),
    inputHint: z.string().optional(),
    source: z.enum(["builtin", "custom"]).optional(),
  })
  .strict();
export type McodeSessionApiRetryStatus = z.infer<typeof mcodeSessionApiRetryStatusSchema>;
export type McodeSessionContextUsage = z.infer<typeof mcodeSessionContextUsageSchema>;
export const mcodeModelStreamingKindSchema = z.enum([
  "start",
  "finish",
  "error",
  "text_start",
  "text_delta",
  "text_end",
  "reasoning_start",
  "reasoning_delta",
  "reasoning_end",
  "tool_input_start",
  "tool_input_delta",
  "tool_input_end",
  "tool_call",
]);
export const mcodeModelStreamingEventPayloadSchema = z
  .object({
    assistantMessageId: z.string().optional(),
    delta: z.string().optional(),
    done: z.boolean().optional(),
    input: z.unknown().optional(),
    kind: mcodeModelStreamingKindSchema,
    partId: z.string().optional(),
    providerExecuted: z.boolean().optional(),
    toolCallId: z.string().optional(),
    toolName: z.string().optional(),
  })
  .strict();
export const mcodeSessionStateSnapshotSchema = z
  .object({
    protocol: z
      .object({
        name: z.literal(MCODE_PROTOCOL_NAME),
        version: z.literal(MCODE_PROTOCOL_VERSION),
      })
      .strict(),
    session: mcodeSessionInfoSchema,
    settings: mcodeSessionSettingsStateSchema,
    projection: mcodeSessionProjectionSchema,
    runtime: mcodeSessionRuntimeStateSchema,
    messages: z.array(mcodeMessageWithPartsSchema),
    goalStats: mcodeSessionGoalStatsSchema.optional(),
    todos: z.array(mcodeSessionTodoItemSchema).optional(),
    todoGroups: z.array(mcodeSessionTodoGroupSchema).optional(),
    slashCommands: z.array(mcodeSlashCommandSchema).optional(),
  })
  .strict();
export type McodeSessionStateSnapshot = z.infer<typeof mcodeSessionStateSnapshotSchema>;

export const mcodeEventEnvelopeSchema = z
  .object({
    eventId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    seq: z.number().int().nonnegative(),
    traceId: nonEmptyString.optional(),
    timestamp: timestampMsSchema,
    deliveryKind: mcodeDeliveryKindSchema.optional(),
  })
  .strict();

const mcodeComputerUseOperationEventBaseSchema = z
  .object({
    eventId: nonEmptyString,
    sequenceNumber: z.number().int().nonnegative(),
    sessionId: nonEmptyString,
    timestamp: timestampMsSchema,
  })
  .strict();

const mcodeComputerUseTurnStartedEventSchema = mcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("turn-started"),
  turnId: nonEmptyString,
});
const mcodeComputerUseTurnCompletedEventSchema = mcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("turn-completed"),
  turnId: nonEmptyString,
});
const mcodeComputerUseTurnFailedEventSchema = mcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("turn-failed"),
  turnId: nonEmptyString,
});
const mcodeComputerUseToolScheduledEventSchema = mcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("tool-scheduled"),
  turnId: nonEmptyString,
  toolCallId: nonEmptyString,
  toolName: nonEmptyString,
  // 这个 cell 是否在用 Computer Use。只表达布尔事实，不再携带动作名——旧的
  // operationAction 靠从模型源码里抽取动作名得到，SDK 面一变就整体失配（见
  // bootstrap/src/mcode-protocol/computer-use-operation-event.ts 的 usesComputerUse）。
  // 只挂在 scheduled 上：ToolCallStartedPayload 没有 input，start 时已拿不到模型源码。
  computerUse: z.literal(true).optional(),
});
const mcodeComputerUseToolStartedEventSchema = mcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("tool-started"),
  turnId: nonEmptyString.optional(),
  toolCallId: nonEmptyString,
  toolName: nonEmptyString.optional(),
});
const mcodeComputerUseSessionClosedEventSchema = mcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("session-closed"),
});

export const mcodeComputerUseOperationEventSchema = z.discriminatedUnion("kind", [
  mcodeComputerUseTurnStartedEventSchema,
  mcodeComputerUseTurnCompletedEventSchema,
  mcodeComputerUseTurnFailedEventSchema,
  mcodeComputerUseToolScheduledEventSchema,
  mcodeComputerUseToolStartedEventSchema,
  mcodeComputerUseSessionClosedEventSchema,
]);
export type McodeComputerUseOperationEvent = z.infer<typeof mcodeComputerUseOperationEventSchema>;

export const mcodeSessionEventTypeSchema = z.enum([
  "session.created",
  "session.resumed",
  "session.updated",
  "session.titleUpdated",
  "session.closed",
  "turn.started",
  "turn.steerQueued",
  "turn.steerDrained",
  "turn.completed",
  "turn.failed",
  "message.upserted",
  "message.removed",
  "part.started",
  "part.delta",
  "part.upserted",
  "part.removed",
  "model.streaming",
  "tool.updated",
  "permission.requested",
  "permission.resolved",
  "userInput.requested",
  "userInput.resolved",
  "checkpoint.created",
  "rewind.triggered",
  "streamRecovery.updated",
]);
export type McodeSessionEventType = z.infer<typeof mcodeSessionEventTypeSchema>;

export const mcodeProtocolErrorDetailSchema = z
  .object({
    type: nonEmptyString,
    message: nonEmptyString,
    stack: z.string().optional(),
    code: z.string().optional(),
    detail: z.string().optional(),
    underlyingErrorMessage: z.string().optional(),
    underlyingErrorDetail: z.string().optional(),
    attribution: errorAttributionSchema.optional(),
    retryable: z.boolean().optional(),
    data: z.unknown().optional(),
  })
  .strict();
export const mcodeSessionCreatedEventPayloadSchema = z
  .object({
    mode: mcodeSessionModeSchema,
    contextWindow: z.number().int().nonnegative(),
  })
  .strict();
export const mcodeSessionResumedEventPayloadSchema = z
  .object({
    directory: nonEmptyString,
    interruptedToolCount: z.number().int().nonnegative(),
    messageCount: z.number().int().nonnegative(),
    partCount: z.number().int().nonnegative(),
    recoveredCompactTimelineCount: z.number().int().nonnegative().optional(),
    recoveredSteerInputCount: z.number().int().nonnegative().optional(),
    resumedTodoCount: z.number().int().nonnegative().optional(),
  })
  .strict();
export const mcodeSessionTitleUpdatedEventPayloadSchema = z
  .object({
    messageID: nonEmptyString.optional(),
    previousTitle: z.string(),
    source: z.enum(["default", "first_input", "generated", "custom"]),
    title: z.string(),
  })
  .strict();
export const mcodeTurnStartedEventPayloadSchema = z
  .object({
    // CLI 的高精度执行时间可含小数；漏声明会使 strict 校验丢弃整条开始事件，Bot 因此无法清空上一轮回复。
    executionStartedAt: z.number().nonnegative().optional(),
    turnNumber: z.number().int().nonnegative(),
    input: z.string(),
    inputId: nonEmptyString.optional(),
    queryId: nonEmptyString.optional(),
    // Bugfix：CLI 会把 Host 准入的后台执行归因写入 turn.started。这里漏声明时，
    // strict 校验会丢弃整条开始事件，复用中的 Bot 私聊订阅就无法切换到新轮次。
    automationId: nonEmptyString.optional(),
    offPeakTaskId: nonEmptyString.optional(),
    offPeakRunType: z.enum(["init", "resume"]).optional(),
    inputSource: mcodeTurnInputSourceSchema.optional(),
    inputVisibility: mcodeMessageVisibilitySchema.optional(),
    executionKind: z.enum(["agent", "controlOnly"]).optional(),
    targetId: nonEmptyString.optional(),
    messageId: nonEmptyString.optional(),
    foregroundExecutionId: nonEmptyString.optional(),
    intent: jsonObjectSchema.optional(),
    originMeta: jsonObjectSchema.optional(),
    // runtime 会透传后台唤醒来源，strict schema 必须同步声明以免丢弃整条事件。
    backgroundSource: z.enum(["bash", "subagent"]).optional(),
    attachments: z.array(jsonObjectSchema).optional(),
  })
  .strict();
const mcodeTurnSteerSourceSchema = z.enum(["plan_approval_feedback", "workflow_refine_feedback"]);
const mcodeTurnSteerCommandKindSchema = z.enum(["sendText", "sendGoalCommand", "compact"]);
const mcodeTurnSteerDeliverySchema = z.enum(["queue", "guide"]);

export const mcodeTurnSteerQueuedEventPayloadSchema = z
  .object({
    pendingInputId: nonEmptyString,
    inputId: nonEmptyString.optional(),
    queryId: nonEmptyString.optional(),
    input: z.string(),
    inputPreview: z.string(),
    inputSize: z.number().int().nonnegative(),
    commandKind: mcodeTurnSteerCommandKindSchema.optional(),
    source: mcodeTurnSteerSourceSchema.optional(),
    toolDisallowlist: z.array(nonEmptyString).optional(),
    delivery: mcodeTurnSteerDeliverySchema.optional(),
    targetTurnId: nonEmptyString,
    queueLength: z.number().int().nonnegative(),
    intent: jsonObjectSchema.optional(),
  })
  .strict();
export const mcodeTurnSteerDrainedEventPayloadSchema = z
  .object({
    pendingInputIds: z.array(nonEmptyString),
    queryIds: z.array(nonEmptyString).optional(),
    targetTurnId: nonEmptyString,
    injectedMessageIds: z.array(nonEmptyString),
    drainedInputs: z
      .array(
        z
          .object({
            pendingInputId: nonEmptyString,
            messageId: nonEmptyString,
            text: z.string(),
            delivery: mcodeTurnSteerDeliverySchema.optional(),
            intent: jsonObjectSchema.optional(),
            toolDisallowlist: z.array(nonEmptyString).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export const mcodeTurnCompletedEventPayloadSchema = z
  .object({
    response: z.string(),
    tokenCount: z.number().int().nonnegative(),
    usage: z.unknown().optional(),
    toolCallCount: z.number().int().nonnegative(),
    historyRoundCount: z.number().int().nonnegative().optional(),
    duration: z.number().nonnegative(),
    // runtime turn.completed 会附带 cacheStats，协议 schema 之前漏掉该字段。
    // strict 校验失败会让桌面端丢掉终态事件，表现为消息已完成但 UI 一直没有回复。
    cacheStats: z
      .object({
        totalMessages: z.number().int().nonnegative(),
        cachedMessages: z.number().int().nonnegative(),
        lastCacheHit: z.boolean(),
        cacheReadTokens: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
    inputId: nonEmptyString.optional(),
    resultType: z.enum([
      "success",
      // "cancelled": 用户主动中断属于正常结束，复用 turn.completed 上报，避免被映射成 turn.failed。
      "cancelled",
      "error_max_turns",
      "error_max_budget",
      "error_during_execution",
      "error_max_tool_calls",
    ]),
    backgroundSubagentResultConsumed: z.boolean().optional(),
  })
  .strict();
export const mcodeTurnFailedEventPayloadSchema = z
  .object({
    error: mcodeProtocolErrorDetailSchema,
    turnPhase: z.string(),
    inputId: nonEmptyString.optional(),
    backgroundSubagentResultConsumed: z.boolean().optional(),
  })
  .strict();
export const mcodeMessageUpsertedEventPayloadSchema = z
  .object({
    content: z.string(),
    attachments: z.array(z.unknown()).optional(),
    toolCalls: z.array(z.unknown()).optional(),
    type: z.string().optional(),
    compactBoundary: z.unknown().optional(),
  })
  .strict();
export const mcodeMessageRemovedEventPayloadSchema = z
  .object({
    messageId: nonEmptyString,
    reason: z.string().optional(),
  })
  .strict();
export const mcodeMessagePartDeltaEventPayloadSchema = z
  .object({
    messageId: nonEmptyString,
    partId: nonEmptyString,
    field: z.enum(["text", "reasoning", "input", "output"]).optional(),
    delta: z.string(),
  })
  .strict();
export const mcodeMessagePartUpsertedEventPayloadSchema = z
  .object({
    part: mcodeMessagePartSchema,
  })
  .strict();
export const mcodeMessagePartRemovedEventPayloadSchema = z
  .object({
    messageId: nonEmptyString,
    partId: nonEmptyString,
    reason: z.string().optional(),
  })
  .strict();
const mcodeToolCallBasePayloadSchema = z
  .object({
    toolCallId: nonEmptyString,
    toolName: z.string().optional(),
    parentToolCallId: nonEmptyString.optional(),
    source: z.enum(["subagent"]).optional(),
    agentId: nonEmptyString.optional(),
    agentType: nonEmptyString.optional(),
    // subagent mirror 会携带后台归因；strict schema 漏字段会让 session/event 整条被丢弃。
    background: z.boolean().optional(),
    childSessionId: nonEmptyString.optional(),
    childToolCallId: nonEmptyString.optional(),
    description: z.string().optional(),
  })
  .strict();

export const mcodeToolUpdatedEventPayloadSchema = z.discriminatedUnion("kind", [
  mcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("scheduled"),
      // 修复：CLI 调度事件已携带所属消息 ID；漏声明会让严格校验丢弃整条事件。
      assistantMessageId: nonEmptyString.optional(),
      toolName: nonEmptyString,
      input: z.unknown().optional(),
      inputByteLength: z.number().int().nonnegative().optional(),
      inputOmitted: z.boolean().optional(),
      inputRef: z.literal("model_stream").optional(),
      dependencies: z.array(nonEmptyString).optional(),
      parallelGroupIndex: z.number().int().nonnegative().optional(),
      canRunParallel: z.boolean().optional(),
      schedule: jsonObjectSchema.optional(),
    })
    .strict(),
  mcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("started"),
      startedAt: protocolInstantSchema,
    })
    .strict(),
  mcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("progress"),
      elapsedMs: z.number().nonnegative().optional(),
      pid: z.number().int().optional(),
      stdoutBytes: z.number().int().nonnegative().optional(),
      stderrBytes: z.number().int().nonnegative().optional(),
      outputBytes: z.number().int().nonnegative().optional(),
      outputPreview: executionOutputPreviewSchema.optional(),
      stdoutTail: z.string().optional(),
      stderrTail: z.string().optional(),
    })
    .strict(),
  mcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("result"),
      result: mcodeToolResultObjectSchema,
      duration: z.number().nonnegative(),
    })
    .strict(),
  mcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("error"),
      error: mcodeProtocolErrorDetailSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("batch"),
      toolCallIds: z.array(nonEmptyString),
      successCount: z.number().int().nonnegative(),
      errorCount: z.number().int().nonnegative(),
    })
    .strict(),
  mcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("raw"),
      payload: jsonObjectSchema,
    })
    .strict(),
]);
export const mcodePermissionRequestedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString.optional(),
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    reason: z.string(),
    input: z.unknown(),
    suggestedPermissionUpdates: z.array(mcodePermissionUpdateSchema).optional(),
    approvalMode: z.literal("user-once").optional(),
    origin: mcodeInteractionRequestOriginSchema.optional(),
    options: z.array(mcodePermissionOptionSchema).min(1),
    childSessionId: nonEmptyString.optional(),
    background: z.boolean().optional(),
  })
  .strict();
export const mcodePermissionResolvedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString.optional(),
    toolCallId: nonEmptyString,
    toolName: nonEmptyString.optional(),
    decision: mcodePermissionDecisionSchema.optional(),
    reason: z.string().optional(),
    modifiedInput: z.unknown().optional(),
    inputSummary: z.unknown().optional(),
    childSessionId: nonEmptyString.optional(),
    background: z.boolean().optional(),
  })
  .strict();
export const mcodeUserInputRequestedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString,
    prompt: z.string(),
    inputType: z.enum(["text", "choice", "confirm"]).optional(),
    choices: z.array(z.string()).optional(),
  })
  .strict();
export const mcodeUserInputResolvedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString,
    value: z.unknown().optional(),
    cancelled: z.boolean().optional(),
  })
  .strict();
export const mcodeSessionClosedEventPayloadSchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();

function mcodeSessionEventEnvelopeFor<T extends McodeSessionEventType>(
  type: T,
  payload: z.ZodTypeAny,
) {
  return mcodeEventEnvelopeSchema.extend({
    type: z.literal(type),
    payload: payload.optional(),
  });
}

export const mcodeSessionEventSchema = z.discriminatedUnion("type", [
  mcodeSessionEventEnvelopeFor("session.created", mcodeSessionCreatedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("session.resumed", mcodeSessionResumedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("session.updated", jsonObjectSchema),
  mcodeSessionEventEnvelopeFor("session.titleUpdated", mcodeSessionTitleUpdatedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("session.closed", mcodeSessionClosedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("turn.started", mcodeTurnStartedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("turn.steerQueued", mcodeTurnSteerQueuedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("turn.steerDrained", mcodeTurnSteerDrainedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("turn.completed", mcodeTurnCompletedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("turn.failed", mcodeTurnFailedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("message.upserted", mcodeMessageUpsertedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("message.removed", mcodeMessageRemovedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("part.started", mcodeMessagePartUpsertedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("part.delta", mcodeMessagePartDeltaEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("part.upserted", mcodeMessagePartUpsertedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("part.removed", mcodeMessagePartRemovedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("model.streaming", mcodeModelStreamingEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("tool.updated", mcodeToolUpdatedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("permission.requested", mcodePermissionRequestedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("permission.resolved", mcodePermissionResolvedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("userInput.requested", mcodeUserInputRequestedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("userInput.resolved", mcodeUserInputResolvedEventPayloadSchema),
  mcodeSessionEventEnvelopeFor("checkpoint.created", jsonObjectSchema),
  mcodeSessionEventEnvelopeFor("rewind.triggered", jsonObjectSchema),
  mcodeSessionEventEnvelopeFor("streamRecovery.updated", jsonObjectSchema),
]);
export type McodeSessionEvent = z.infer<typeof mcodeSessionEventSchema>;

export const mcodeSessionEventsResultSchema = z
  .object({
    events: z.array(mcodeSessionEventSchema),
  })
  .strict();
export const mcodeSessionMessagesResultSchema = z
  .object({
    messages: z.array(mcodeMessageWithPartsSchema),
  })
  .strict();
export const mcodeStateUpdatedNotificationSchema = z
  .object({
    type: z.literal("state.updated"),
    scope: z.enum(["server", "workspace", "session"]),
    workspace: mcodeWorkspaceRefSchema.optional(),
    sessionId: nonEmptyString.optional(),
    revision: z.number().int().nonnegative(),
    reason: z.string().optional(),
    patch: z.unknown(),
  })
  .strict();
export type McodeStateUpdatedNotification = z.infer<typeof mcodeStateUpdatedNotificationSchema>;

export const mcodeSessionSubscribeParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    deliveryKind: mcodeDeliveryKindSchema,
    afterSeq: z.number().int().nonnegative().optional(),
    includeSnapshot: z.boolean().default(false),
  })
  .strict();
export type McodeSessionSubscribeParams = z.infer<typeof mcodeSessionSubscribeParamsSchema>;

export const mcodeSessionSubscribeResultSchema = z
  .object({
    sessionId: nonEmptyString,
    eventSeq: z.number().int().nonnegative(),
    events: z.array(mcodeSessionEventSchema),
    snapshot: mcodeSessionStateSnapshotSchema.optional(),
  })
  .strict();
export const mcodeSessionListResultSchema = z
  .object({
    sessions: z.array(mcodeSessionInfoSchema),
  })
  .strict();

const mcodeSessionSubagentBaseSchema = z
  .object({
    childSessionId: nonEmptyString,
    agentId: nonEmptyString.optional(),
    toolCallId: nonEmptyString.optional(),
    subagentType: nonEmptyString,
    title: nonEmptyString,
    summary: z.string().optional(),
    startedAt: z.number().int().nonnegative().optional(),
    endedAt: z.number().int().nonnegative().optional(),
  })
  .strict();

export const mcodeSessionRunningSubagentSchema = mcodeSessionSubagentBaseSchema.extend({
  status: z.enum(["running", "waiting", "blocked"]),
});
export type McodeSessionRunningSubagent = z.infer<typeof mcodeSessionRunningSubagentSchema>;

export const mcodeSessionEndedSubagentSchema = mcodeSessionSubagentBaseSchema.extend({
  status: z.enum(["success", "failed", "cancelled", "lost"]),
});
export type McodeSessionEndedSubagent = z.infer<typeof mcodeSessionEndedSubagentSchema>;

export const mcodeSessionSubagentsResultSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    childSessionIds: z.array(nonEmptyString),
    running: z.array(mcodeSessionRunningSubagentSchema),
    ended: z
      .object({
        total: z.number().int().nonnegative(),
        items: z.array(mcodeSessionEndedSubagentSchema),
        nextCursor: nonEmptyString.optional(),
      })
      .strict(),
  })
  .strict();
export type McodeSessionSubagentsResult = z.infer<typeof mcodeSessionSubagentsResultSchema>;
/** 服务端 feature key 的取值域在协议里的 zod 形态（packages/shared/src/dynamic-workflow-feature.ts）。 */
export const mcodeDynamicWorkflowModeSchema = z.enum(DYNAMIC_WORKFLOW_MODES);

export const mcodeSessionCreateParamsSchema = z
  .object({
    additionalDirectories: z.array(nonEmptyString).max(256).optional(),
    sessionId: nonEmptyString.optional(),
    workspace: mcodeWorkspaceRefSchema,
    parentSessionId: nonEmptyString.optional(),
    mode: mcodeSessionModeSchema.optional(),
    model: modelSelectionSchema.optional(),
    persistence: mcodeSessionPersistenceSchema.optional(),
    thoughtLevel: nonEmptyString.optional(),
    titleGenerationEnabled: z.boolean().optional(),
    mcpServers: z.array(mcodeProtocolMcpServerSchema).optional(),
    toolAllowlist: z.array(nonEmptyString).optional(),
    toolDenylist: z.array(nonEmptyString).optional(),
    importedHistory: mcodeSessionImportHistorySchema.optional(),
    // host 只按本地服务装配/远程/端形态决定是否注册工具，不读取灰度；
    // 缺省不下发 = 不注册；灰度与套餐准入在实际创建的 Host handler 校验。
    offPeakToolEnabled: z.boolean().optional(),
    // 动态工作流灰度：与 offPeakToolEnabled 同一
    // 模式——host 裁决后下发，缺省不下发 = 不注册工作流工具簇（fail-closed）。
    dynamicWorkflowEnabled: z.boolean().optional(),
    // 灰度 mode 随布尔同行下发（launch.md「On demand: activation」）：`onDemand` 让 CLI 把十个
    // 工具推迟到会话首次 `/workflow` 才注册；缺席 = 按布尔行事（alwaysOn），供旧 Host 配对。
    dynamicWorkflowMode: mcodeDynamicWorkflowModeSchema.optional(),
  })
  .strict();
export type McodeSessionCreateParams = z.infer<typeof mcodeSessionCreateParamsSchema>;

export const mcodeSessionResumeParamsSchema = z
  .object({
    additionalDirectories: z.array(nonEmptyString).max(256).optional(),
    sessionId: nonEmptyString,
    workspace: mcodeWorkspaceRefSchema.optional(),
    // 旧 session 尚无 runtime/model_selection entry 时，由同 task 的索引元数据提供迁移 hint。
    thoughtLevel: nonEmptyString.optional(),
    mcpServers: z.array(mcodeProtocolMcpServerSchema).optional(),
    // 冷恢复重建 runtime 时必须沿用 create 的工具面约束（否则会绕过 allow/deny，尤其 CUA 会话）。
    toolAllowlist: z.array(nonEmptyString).optional(),
    toolDenylist: z.array(nonEmptyString).optional(),
    // 与 create 同语义；resume 不带会导致冷恢复丢 Off-Peak 工具面。
    offPeakToolEnabled: z.boolean().optional(),
    // 与 create 同语义；resume 不带会导致冷恢复丢工作流工具簇。
    dynamicWorkflowEnabled: z.boolean().optional(),
    dynamicWorkflowMode: mcodeDynamicWorkflowModeSchema.optional(),
  })
  .strict();
export type McodeSessionResumeParams = z.infer<typeof mcodeSessionResumeParamsSchema>;

export const mcodeSessionListParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema.optional(),
    sessionIds: z.array(nonEmptyString).min(1).max(64).optional(),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type McodeSessionListParams = z.infer<typeof mcodeSessionListParamsSchema>;

export const mcodeSessionSubagentsParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    endedCursor: nonEmptyString.optional(),
    endedLimit: z.number().int().positive().max(100).default(20),
  })
  .strict();
export type McodeSessionSubagentsParams = z.infer<typeof mcodeSessionSubagentsParamsSchema>;

export const mcodeUsageStatsParamsSchema = z
  .object({
    range: z.enum(APP_USAGE_RANGES),
    timeZone: z.string().optional(),
  })
  .strict();
export const mcodeUsageStatsResultSchema = appUsageSnapshotSchema;
export const mcodeTaskTokenUsageParamsSchema = z
  .object({
    sessionId: nonEmptyString,
  })
  .strict();
export const mcodeTaskTokenUsageResultSchema = z
  .object({
    sessionId: nonEmptyString,
    totalTokens: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    reasoningTokens: z.number().int().nonnegative(),
    cacheCreationTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    modelRequestCount: z.number().int().nonnegative(),
    modelErrorCount: z.number().int().nonnegative(),
    inputBaselineBySource: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();
export type McodeTaskTokenUsageResult = z.infer<typeof mcodeTaskTokenUsageResultSchema>;

export const mcodeSessionReadParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    deliveryKind: mcodeDeliveryKindSchema.optional(),
    messageLimit: z.number().int().positive().optional(),
    afterSeq: z.number().int().nonnegative().optional(),
    // "index"：仅 task index resync 使用，返回剥离 tool/reasoning/data URL 大载荷的同结构 snapshot，
    // 结果禁止回写 UI 状态；缺省等同 "full"。
    contentProfile: z.enum(["full", "index"]).optional(),
  })
  .strict();
export type McodeSessionReadParams = z.infer<typeof mcodeSessionReadParamsSchema>;

export const mcodeSessionMessagesParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    afterMessageId: nonEmptyString.optional(),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type McodeSessionMessagesParams = z.infer<typeof mcodeSessionMessagesParamsSchema>;

export const mcodeSessionEventsParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    afterSeq: z.number().int().nonnegative().optional(),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type McodeSessionEventsParams = z.infer<typeof mcodeSessionEventsParamsSchema>;

export const mcodeSessionRuntimePreferencesScopeSchema = z.enum([
  "runtime-materialization",
  "user-execution",
]);
export type McodeSessionRuntimePreferencesScope = z.infer<
  typeof mcodeSessionRuntimePreferencesScopeSchema
>;

// subagents/readRuntimeConfig 返回 Host 已解析的完整快照或显式内置回退，不再传 Markdown。
export {
  subagentRuntimeConfigSchema,
  type SubagentRuntimeConfig,
} from "../subagent-runtime-config.js";
export const mcodeSubagentsReadRuntimeConfigParamsSchema = z
  .object({ sessionId: nonEmptyString, workspace: mcodeWorkspaceRefSchema.optional() })
  .strict();

export const MCODE_SESSION_RUNTIME_PREFERENCES_REQUEST_TIMEOUT_MS = 15_000;

export const mcodeSessionRequestRuntimePreferencesParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    scope: mcodeSessionRuntimePreferencesScopeSchema,
    workspace: mcodeWorkspaceRefSchema.optional(),
    // CLI 依据持久化父链给出目录来源；目标 sessionId 仍保留 child 身份。
    directorySessionId: nonEmptyString.optional(),
  })
  .strict();
export type McodeSessionRequestRuntimePreferencesParams = z.infer<
  typeof mcodeSessionRequestRuntimePreferencesParamsSchema
>;

export const DEFAULT_MCODE_MODEL_CONTEXT_BUDGET_STRATEGY = "preflight-v1" as const;

// 3.12.2：legacy 仅为旧协议接收兼容；Runtime 一律归一为上面的共享默认策略。
export const mcodeModelContextBudgetStrategySchema = z.enum(["legacy", "preflight-v1"]);
export type McodeModelContextBudgetStrategy = z.infer<typeof mcodeModelContextBudgetStrategySchema>;

export const mcodeSessionRuntimePreferencesResultSchema = z
  .object({
    additionalDirectories: z.array(nonEmptyString).max(256).optional(),
    nativeSearchEnhancementsEnabled: z.boolean(),
    toolSearchMode: appToolSearchModeSchema.default("off"),
    subagentRuntimeConfigEnabled: z.boolean().optional(),
    memoryEnabled: z.boolean().default(false),
    askUserQuestionAutoResolutionEnabled: z.boolean().default(true),
    integratedTerminalShell: integratedTerminalShellSelectionSchema.optional(),
    // 兼容旧 Host：缺少字段时在协议解析边界使用当前默认策略。
    modelContextBudgetStrategy: mcodeModelContextBudgetStrategySchema.default(
      DEFAULT_MCODE_MODEL_CONTEXT_BUDGET_STRATEGY,
    ),
  })
  .strict();
export type McodeSessionRuntimePreferencesResult = z.infer<
  typeof mcodeSessionRuntimePreferencesResultSchema
>;

/**
 * App 在提交 prompt 前只读采集的 IAB 可见状态。该字段只用于 provider-visible
 * ambient context，不进入用户可见 transcript；内容有界，禁止携带页面正文或凭据。
 */
export const mcodeBrowserAmbientContextSchema = z
  .object({
    tabCount: z.number().int().positive().max(100),
    currentUrl: z.string().trim().min(1).max(4096).optional(),
  })
  .strict();
export type McodeBrowserAmbientContext = z.infer<typeof mcodeBrowserAmbientContextSchema>;

export const mcodeSessionSendParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    modelSelection: modelSelectionSchema.optional(),
    modelExecution: modelExecutionSchema.optional(),
    inputId: nonEmptyString.optional(),
    queryId: nonEmptyString.optional(),
    content: z.string(),
    attachments: z.array(jsonObjectSchema).optional(),
    browserAmbientContext: mcodeBrowserAmbientContextSchema.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    expectedProviderRevision: nonEmptyString.optional(),
    automationId: nonEmptyString.optional(),
    offPeakTaskId: nonEmptyString.optional(),
    offPeakRunType: z.enum(["init", "resume"]).optional(),
    botDeliveryTarget: mcodeAutomationBotDeliveryTargetSchema.optional(),
    toolDenylist: z.array(nonEmptyString).optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.automationId && payload.offPeakTaskId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "automationId and offPeakTaskId are mutually exclusive",
      });
    }
    if (payload.offPeakRunType && !payload.offPeakTaskId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "offPeakRunType requires offPeakTaskId",
        path: ["offPeakRunType"],
      });
    }
    if (payload.modelExecution && !payload.modelSelection) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "modelExecution requires modelSelection",
        path: ["modelExecution"],
      });
    }
  });
export const mcodeSessionSendResultSchema = z
  .object({
    sessionId: nonEmptyString,
    accepted: z.literal(true),
    stateRevision: z.number().int().nonnegative(),
  })
  .strict();
export type McodeSessionSendResult = z.infer<typeof mcodeSessionSendResultSchema>;

export const mcodeSessionHistoryTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("turn"),
      turnIndex: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("message"),
      messageId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal("checkpoint"),
      checkpointId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal("latestCheckpoint"),
    })
    .strict(),
]);
export type McodeSessionHistoryTarget = z.infer<typeof mcodeSessionHistoryTargetSchema>;

export const mcodeSessionForkParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    target: mcodeSessionHistoryTargetSchema.default({
      kind: "latestCheckpoint",
    }),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type McodeSessionForkParams = z.infer<typeof mcodeSessionForkParamsSchema>;

export const mcodeSessionForkResultSchema = z
  .object({
    forkedSessionId: nonEmptyString,
    parentSessionId: nonEmptyString.optional(),
    targetMessageId: nonEmptyString.optional(),
    targetCheckpointId: nonEmptyString.optional(),
    response: z.string(),
    snapshot: mcodeSessionStateSnapshotSchema,
  })
  .strict();
export type McodeSessionForkResult = z.infer<typeof mcodeSessionForkResultSchema>;

export const mcodeSessionCompactParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    inputId: nonEmptyString.optional(),
    instructions: z.string().optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type McodeSessionCompactParams = z.infer<typeof mcodeSessionCompactParamsSchema>;

export const mcodeSessionCompactResultSchema = z
  .object({
    response: z.string(),
    snapshot: mcodeSessionStateSnapshotSchema,
    compact: z
      .object({
        state: z.enum(["accepted", "already_running"]),
        inputId: nonEmptyString.optional(),
        operationId: nonEmptyString.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodeSessionCompactResult = z.infer<typeof mcodeSessionCompactResultSchema>;

export const mcodeSessionGoalActionSchema = z.enum([
  "show",
  "set",
  "replace",
  "pause",
  "resume",
  "clear",
]);
export type McodeSessionGoalAction = z.infer<typeof mcodeSessionGoalActionSchema>;

export const mcodeSessionGoalParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    inputId: nonEmptyString.optional(),
    action: mcodeSessionGoalActionSchema,
    objective: z.string().optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type McodeSessionGoalParams = z.infer<typeof mcodeSessionGoalParamsSchema>;

export const mcodeSessionGoalResultSchema = z
  .object({
    response: z.string(),
    snapshot: mcodeSessionStateSnapshotSchema,
    startedTurn: z.boolean().optional(),
  })
  .strict();
export type McodeSessionGoalResult = z.infer<typeof mcodeSessionGoalResultSchema>;

export const mcodeSessionStopParamsSchema = z
  .object({
    sessionId: nonEmptyString,
  })
  .strict();
const mcodeBackgroundTaskInfoStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "timed_out",
  "cancelled",
  "spawn_error",
  "lost",
]);

export const mcodeBackgroundTaskInfoSchema = z
  .object({
    taskId: nonEmptyString,
    toolCallId: nonEmptyString.optional(),
    toolName: nonEmptyString.optional(),
    taskKind: z.enum(["bash", "subagent"]).optional(),
    blocked: z.boolean().optional(),
    blockedReason: z.string().optional(),
    cancellable: z.boolean().optional(),
    cancelRequestedAt: protocolInstantSchema.optional(),
    command: z.string().optional(),
    description: z.string().optional(),
    status: mcodeBackgroundTaskInfoStatusSchema,
    pid: z.number().int().positive().optional(),
    startedAt: protocolInstantSchema.optional(),
    completedAt: protocolInstantSchema.optional(),
    outputPath: z.string().optional(),
    stderrPersistedOutputPath: z.string().optional(),
    stdoutPersistedOutputPath: z.string().optional(),
    outputBytes: z.number().int().nonnegative().optional(),
    outputTruncated: z.boolean().optional(),
    outputTail: z.string().optional(),
    stderrBytes: z.number().int().nonnegative().optional(),
    stderrTail: z.string().optional(),
    stdoutBytes: z.number().int().nonnegative().optional(),
    stdoutTail: z.string().optional(),
    terminalId: nonEmptyString.optional(),
  })
  .strict();
export const mcodeSessionCancelBackgroundTaskParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    taskId: nonEmptyString,
  })
  .strict();
export type McodeSessionCancelBackgroundTaskParams = z.infer<
  typeof mcodeSessionCancelBackgroundTaskParamsSchema
>;

export const mcodeSessionCancelBackgroundTaskResultSchema = z
  .object({
    cancelled: z.boolean(),
    reason: z.string().optional(),
    snapshot: mcodeBackgroundTaskInfoSchema.optional(),
    status: mcodeBackgroundTaskInfoStatusSchema,
    taskId: nonEmptyString,
  })
  .strict();
export type McodeSessionCancelBackgroundTaskResult = z.infer<
  typeof mcodeSessionCancelBackgroundTaskResultSchema
>;

export const mcodeSessionSetModelParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    model: modelSelectionSchema,
    expectedRevision: z.number().int().nonnegative().optional(),
    persistAsWorkspaceLastUsed: z.boolean().default(true),
  })
  .strict();
export type McodeSessionSetModelParams = z.infer<typeof mcodeSessionSetModelParamsSchema>;

export const mcodeSessionSetThoughtLevelParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    thoughtLevel: nonEmptyString.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    persistAsWorkspaceLastUsed: z.boolean().default(true),
  })
  .strict();
export type McodeSessionSetThoughtLevelParams = z.infer<
  typeof mcodeSessionSetThoughtLevelParamsSchema
>;

export const mcodeSessionSetModeParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    mode: mcodeSessionModeSchema,
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type McodeSessionSetModeParams = z.infer<typeof mcodeSessionSetModeParamsSchema>;

export const mcodeSessionCloseParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    expectedPersistence: mcodeSessionPersistenceSchema.optional(),
  })
  .strict();
export type McodeSessionCloseParams = z.infer<typeof mcodeSessionCloseParamsSchema>;
export const mcodeSessionCloseResultSchema = z
  .object({
    closed: z.boolean().optional(),
  })
  .strict();
export type McodeSessionCloseResult = z.infer<typeof mcodeSessionCloseResultSchema>;
export const mcodeWorkspaceReadPresentationParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema })
  .strict();
export const mcodeWorkspacePresentationSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    mode: mcodeSessionModeSchema,
    slashCommands: z.array(mcodeSlashCommandSchema),
  })
  .strict();
export type McodeWorkspacePresentation = z.infer<typeof mcodeWorkspacePresentationSchema>;
const workspaceHookSha256DigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const mcodeWorkspaceHookTrustGrantParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    bundleDigest: workspaceHookSha256DigestSchema,
    hookDeclarationDigest: workspaceHookSha256DigestSchema,
  })
  .strict();
export type McodeWorkspaceHookTrustGrantParams = z.infer<
  typeof mcodeWorkspaceHookTrustGrantParamsSchema
>;
export const mcodeWorkspaceHookTrustGrantReasonCodeSchema = z.enum([
  "workspace_hooks_blocked_by_policy",
  "workspace_hooks_bundle_changed",
  "workspace_hooks_snapshot_mismatch",
  "workspace_hooks_policy_requires_pretrust",
  "workspace_hooks_trust_store_corrupt",
  "workspace_hooks_config_unreadable",
]);
export type McodeWorkspaceHookTrustGrantReasonCode = z.infer<
  typeof mcodeWorkspaceHookTrustGrantReasonCodeSchema
>;
export const mcodeWorkspaceHookTrustGrantResultSchema = z
  .object({
    accepted: z.boolean(),
    reasonCode: mcodeWorkspaceHookTrustGrantReasonCodeSchema.optional(),
  })
  .strict();
export type McodeWorkspaceHookTrustGrantResult = z.infer<
  typeof mcodeWorkspaceHookTrustGrantResultSchema
>;
const mcodeWorkspaceModelToolCallSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    input: z.unknown(),
  })
  .strict();
const mcodeWorkspaceModelMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("system"), content: z.string() }).strict(),
  z.object({ role: z.literal("user"), content: z.string() }).strict(),
  z
    .object({
      role: z.literal("assistant"),
      content: z.string(),
      toolCalls: z.array(mcodeWorkspaceModelToolCallSchema).optional(),
    })
    .strict(),
  z
    .object({
      role: z.literal("tool"),
      content: z.string(),
      toolCallId: nonEmptyString,
      toolName: nonEmptyString,
      isError: z.boolean().optional(),
    })
    .strict(),
]);
const mcodeWorkspaceModelToolSchema = z
  .object({
    name: nonEmptyString,
    description: z.string().optional(),
    inputSchema: z.record(z.string(), z.unknown()),
  })
  .strict();

export const mcodeWorkspaceGenerateTextParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    selection: modelSelectionSchema,
    prompt: nonEmptyString.optional(),
    messages: z.array(mcodeWorkspaceModelMessageSchema).min(1).optional(),
    tools: z.array(mcodeWorkspaceModelToolSchema).optional(),
    querySource: nonEmptyString,
    maxOutputTokens: z.number().int().positive().optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict()
  .refine((value) => value.prompt !== undefined || value.messages !== undefined, {
    message: "prompt 或 messages 至少需要提供一个",
  });
export const mcodeWorkspaceGenerateTextResultSchema = z
  .object({
    text: z.string(),
    selection: modelSelectionSchema,
    toolCalls: z.array(mcodeWorkspaceModelToolCallSchema).optional(),
    // 可选以兼容仍在运行的旧 app-server；新 CLI 始终返回结构化结束原因。
    finishReason: z.string().optional(),
    usage: z
      .object({
        inputTokens: z.number().nonnegative().optional(),
        outputTokens: z.number().nonnegative().optional(),
        totalTokens: z.number().nonnegative().optional(),
        cacheReadTokens: z.number().nonnegative().optional(),
        cacheWriteTokens: z.number().nonnegative().optional(),
        reasoningTokens: z.number().nonnegative().optional(),
        serverToolUse: z
          .object({
            webSearchRequests: z.number().nonnegative().optional(),
            webFetchRequests: z.number().nonnegative().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodeWorkspaceGenerateTextParams = z.infer<
  typeof mcodeWorkspaceGenerateTextParamsSchema
>;
export type McodeWorkspaceModelMessage = z.infer<typeof mcodeWorkspaceModelMessageSchema>;
export type McodeWorkspaceModelTool = z.infer<typeof mcodeWorkspaceModelToolSchema>;
export type McodeWorkspaceGenerateTextResult = z.infer<
  typeof mcodeWorkspaceGenerateTextResultSchema
>;
export const mcodeWorkspaceCancelGenerateTextParamsSchema = z
  .object({ operationId: nonEmptyString })
  .strict();
export const mcodeWorkspaceCancelGenerateTextResultSchema = z
  .object({ operationId: nonEmptyString, cancelled: z.boolean() })
  .strict();

export const mcodeProviderTestModelConnectivityParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    selection: modelSelectionSchema,
  })
  .strict();
export const mcodeProviderTestModelConnectivityResultSchema = z
  .object({ success: z.literal(true) })
  .strict();
export type McodeProviderTestModelConnectivityParams = z.infer<
  typeof mcodeProviderTestModelConnectivityParamsSchema
>;
export type McodeProviderTestModelConnectivityResult = z.infer<
  typeof mcodeProviderTestModelConnectivityResultSchema
>;

export const mcodeProviderUpdateAccountConfigParamsSchema = z
  .object({
    revision: nonEmptyString,
    basedOnZCodeBuiltinRevision: nonEmptyString,
    // Provider Config 的字段校验由 @mcode/provider 负责；协议层只约束可传输信封。
    providers: z.record(z.string(), z.unknown()),
    // 账号状态与 Overlay 必须一起传递，否则 Worker 会丢失非当前套餐的执行门禁。
    states: z.record(
      z.string(),
      z
        .object({
          availability: z.enum(["available", "pending", "unavailable", "unknown"]),
          entitled: z.boolean(),
          unavailableReason: accountProviderUnavailableReasonSchema.optional(),
          current: z.boolean().optional(),
          connectionKey: z.string().optional(),
          effectiveAt: z.number().finite().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export const mcodeProviderUpdateAccountConfigResultSchema = z
  .object({
    // 收到账号结果不代表配套 Built-in 已到达；应用版本只能读取 Registry 快照。
    receivedRevision: nonEmptyString,
    providerCount: z.number().int().nonnegative(),
    status: z.enum(["received", "unchanged"]),
  })
  .strict();
export type McodeProviderUpdateAccountConfigResult = z.infer<
  typeof mcodeProviderUpdateAccountConfigResultSchema
>;
/** Worker 从所属 Environment 的正式 Config Store 重建进程内 Provider Registry。 */
export const mcodeProviderRefreshRegistryParamsSchema = z
  .object({
    reason: nonEmptyString,
  })
  .strict();
export const mcodeProviderRefreshRegistryResultSchema = z
  .object({
    refreshed: z.literal(true),
  })
  .strict();
export type McodeProviderRefreshRegistryParams = z.infer<
  typeof mcodeProviderRefreshRegistryParamsSchema
>;
export type McodeProviderRefreshRegistryResult = z.infer<
  typeof mcodeProviderRefreshRegistryResultSchema
>;
export const mcodeInteractionPreferencesSchema = z
  .object({
    askUserQuestionAutoResolutionEnabled: z.boolean(),
  })
  .strict();
export type McodeInteractionPreferences = z.infer<typeof mcodeInteractionPreferencesSchema>;

export const mcodeWorkspaceUpdateInteractionPreferencesParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    preferences: mcodeInteractionPreferencesSchema,
  })
  .strict();
export type McodeWorkspaceUpdateInteractionPreferencesParams = z.infer<
  typeof mcodeWorkspaceUpdateInteractionPreferencesParamsSchema
>;

export const mcodeWorkspaceUpdateInteractionPreferencesResultSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    askUserQuestionAutoResolutionEnabled: z.boolean(),
    snoozedInteractionCount: z.number().int().nonnegative(),
  })
  .strict();
export type McodeWorkspaceUpdateInteractionPreferencesResult = z.infer<
  typeof mcodeWorkspaceUpdateInteractionPreferencesResultSchema
>;

export const mcodeModelIoPreferencesSchema = z
  .object({
    fullRetentionEnabled: z.boolean(),
  })
  .strict();
export type McodeModelIoPreferences = z.infer<typeof mcodeModelIoPreferencesSchema>;

export const mcodeWorkspaceUpdateModelIoPreferencesParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    preferences: mcodeModelIoPreferencesSchema,
  })
  .strict();
export type McodeWorkspaceUpdateModelIoPreferencesParams = z.infer<
  typeof mcodeWorkspaceUpdateModelIoPreferencesParamsSchema
>;

export const mcodeWorkspaceUpdateModelIoPreferencesResultSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    fullRetentionEnabled: z.boolean(),
    updatedSessionCount: z.number().int().nonnegative(),
  })
  .strict();
export type McodeWorkspaceUpdateModelIoPreferencesResult = z.infer<
  typeof mcodeWorkspaceUpdateModelIoPreferencesResultSchema
>;

export const mcodeWorkspaceUpdateOffPeakToolPolicyParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type McodeWorkspaceUpdateOffPeakToolPolicyParams = z.infer<
  typeof mcodeWorkspaceUpdateOffPeakToolPolicyParamsSchema
>;

export const mcodeWorkspaceUpdateOffPeakToolPolicyResultSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type McodeWorkspaceUpdateOffPeakToolPolicyResult = z.infer<
  typeof mcodeWorkspaceUpdateOffPeakToolPolicyResultSchema
>;

// 动态工作流灰度门禁：workspace 级事实，
// 与 Off-Peak 同一套 host→CLI 同步模式；旧 CLI method-not-found → host 降级忽略。
export const mcodeWorkspaceUpdateDynamicWorkflowPolicyParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    enabled: z.boolean(),
    // launch.md「On demand: activation」：mode 与布尔同行；缺席时 CLI 按布尔行事（alwaysOn）。
    mode: mcodeDynamicWorkflowModeSchema.optional(),
  })
  .strict();
export type McodeWorkspaceUpdateDynamicWorkflowPolicyParams = z.infer<
  typeof mcodeWorkspaceUpdateDynamicWorkflowPolicyParamsSchema
>;

export const mcodeWorkspaceUpdateDynamicWorkflowPolicyResultSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type McodeWorkspaceUpdateDynamicWorkflowPolicyResult = z.infer<
  typeof mcodeWorkspaceUpdateDynamicWorkflowPolicyResultSchema
>;

export const mcodePermissionRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    reason: z.string(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    input: z.unknown(),
    origin: mcodeInteractionRequestOriginSchema.optional(),
    options: z.array(mcodePermissionOptionSchema).min(1),
  })
  .strict();
export type McodePermissionRequestParams = z.infer<typeof mcodePermissionRequestParamsSchema>;

/** Agent 请求 app 枚举当前 workspace/session 可达且已完成握手的 browser backend。 */
export const mcodeBrowserListParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    workspaceKey: nonEmptyString,
    workspacePath: nonEmptyString,
    workspaceIdentity: nonEmptyString.optional(),
    remoteSessionId: nonEmptyString.optional(),
    clientMode: browserClientModeSchema,
    sessionContext: browserSessionContextKindSchema,
  })
  .strict();
export type McodeBrowserListParams = z.infer<typeof mcodeBrowserListParamsSchema>;

export const mcodeBrowserListResultSchema = browserBackendListResultSchema;
export type McodeBrowserListResult = z.infer<typeof mcodeBrowserListResultSchema>;

/** Agent 把一条 browser-use 命令发送给 app 执行。 */
export const mcodeBrowserExecuteParamsSchema = z
  .object({
    controlScopeId: nonEmptyString.optional(),
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    browserId: nonEmptyString.optional(),
    browserGeneration: z.number().int().nonnegative().optional(),
    workspaceKey: nonEmptyString.optional(),
    workspacePath: nonEmptyString.optional(),
    workspaceIdentity: nonEmptyString.optional(),
    remoteSessionId: nonEmptyString.optional(),
    clientMode: browserClientModeSchema.optional(),
    sessionContext: browserSessionContextKindSchema.optional(),
    command: browserCommandSchema,
  })
  .strict();
export type McodeBrowserExecuteParams = z.infer<typeof mcodeBrowserExecuteParamsSchema>;

// browser command result 是 app/agent 的同源协议结果；其中 duplicate_request_id 用于在真正维护
// pending/running 生命周期的边界拒绝 correlation key 冲突，不能依赖上游 UUID 概率保证。
export const mcodeBrowserExecuteResultSchema = browserCommandResultSchema;
export type McodeBrowserExecuteResult = z.infer<typeof mcodeBrowserExecuteResultSchema>;

export const mcodeUserInputOptionSchema = z
  .object({
    value: nonEmptyString,
    label: nonEmptyString,
    description: z.string().optional(),
    preview: z.string().optional(),
  })
  .strict();
export const mcodeUserInputQuestionSchema = z
  .object({
    question: nonEmptyString,
    header: nonEmptyString,
    options: z.array(mcodeUserInputOptionSchema).min(1),
    multiSelect: z.boolean().optional(),
  })
  .strict();
export type McodeUserInputQuestion = z.infer<typeof mcodeUserInputQuestionSchema>;

export const mcodeUserInputRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    toolCallId: nonEmptyString.optional(),
    toolName: nonEmptyString.optional(),
    prompt: z.string().optional(),
    questions: z.array(mcodeUserInputQuestionSchema).min(1).optional(),
    input: z.unknown().optional(),
    origin: mcodeInteractionRequestOriginSchema.optional(),
    schema: z.unknown().optional(),
  })
  .strict();
export type McodeUserInputRequestParams = z.infer<typeof mcodeUserInputRequestParamsSchema>;

export const mcodeUserInputResponseSchema = z
  .object({
    action: z.enum(["accept", "decline", "cancel"]),
    content: jsonObjectSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type McodeUserInputResponse = z.infer<typeof mcodeUserInputResponseSchema>;

export const mcodeProviderRuntimeHeadersRequestReasonSchema = z.enum(requestVerificationReasons);
export const mcodeProviderRuntimeHeadersRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    workspace: mcodeWorkspaceRefSchema,
    modelSelection: modelSelectionSchema,
    providerId: nonEmptyString,
    accountAccess: mcodeProviderAccountAccessSchema.optional(),
    expectedAccountScope: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    rejectedProjectTokenFingerprint: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    reason: mcodeProviderRuntimeHeadersRequestReasonSchema,
  })
  .strict();
export type McodeProviderRuntimeHeadersRequestParams = z.infer<
  typeof mcodeProviderRuntimeHeadersRequestParamsSchema
>;

/** 请求取消只作用于同 workspace/session 的这一轮凭据刷新。 */
export const mcodeProviderRuntimeHeadersCancelledSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    workspace: mcodeWorkspaceRefSchema,
  })
  .strict();
export type McodeProviderRuntimeHeadersCancelled = z.infer<
  typeof mcodeProviderRuntimeHeadersCancelledSchema
>;

// 标准 JSON-RPC error 保留旧版 schema 兼容，不向严格校验的 response 增加字段。
export const MCODE_PROVIDER_CONFIG_NETWORK_ERROR = -32032;

export const mcodeProviderRuntimeHeadersErrorCode = {
  configNetwork: "request_verification_config_network",
  configInvalid: "request_verification_config_invalid",
} as const;

export const mcodeProviderRuntimeHeadersResponseSchema = z.discriminatedUnion("headersApplied", [
  z
    .object({
      headersApplied: z.literal(true),
      // 合并重接：成功必须携带当前请求的鉴权材料，不依赖旧 Registry 已被写入。
      requestAuth: z
        .object({
          apiKey: nonEmptyString.optional(),
          apiKeyId: z.string().trim().min(1).optional(),
          accountScope: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .optional(),
          headers: z.record(nonEmptyString, nonEmptyString).optional(),
        })
        .strict(),
      errorMessage: nonEmptyString.optional(),
    })
    .strict(),
  z
    .object({
      headersApplied: z.literal(false),
      errorMessage: nonEmptyString.optional(),
    })
    .strict(),
]);
export type McodeProviderRuntimeHeadersResponse = z.infer<
  typeof mcodeProviderRuntimeHeadersResponseSchema
>;

// ── 官方 Server MCP 鉴权──
// Agent 进程不是用户身份权威：它把 (pluginId, mcpKey, targetOrigin) 报给 host，由 host
// 解析当前 Coding Plan 凭证并回传本次请求的身份头。请求侧不含任何秘密。
// 与 interaction/requestProviderRuntimeHeaders 同类：Agent 发起、host 自动响应、零 UI。
//
// `consumer` 缺省为 `mcp-server`（旧版 agent 不带该字段），此时必须带 `mcpKey`；
// `plugin-command` 是官方插件命令进程经 agent 代理端点发起的请求，没有 MCP，不带 `mcpKey`，
// host 按「套餐可选」解析：没有套餐时只给 Mcode 登录身份（技术方案 5.8）。
export const mcodeOfficialMcpAuthHeadersRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    consumer: z.enum(OFFICIAL_AUTH_CONSUMER_KINDS).optional(),
    mcpKey: nonEmptyString.optional(),
    targetOrigin: nonEmptyString,
  })
  .strict()
  .superRefine((params, ctx) => {
    const isCommand = params.consumer === "plugin-command";
    if (isCommand && params.mcpKey !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "plugin-command must not carry mcpKey",
        path: ["mcpKey"],
      });
    }
    if (!isCommand && params.mcpKey === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "mcpKey is required for mcp-server",
        path: ["mcpKey"],
      });
    }
  });
export type McodeOfficialMcpAuthHeadersRequestParams = z.infer<
  typeof mcodeOfficialMcpAuthHeadersRequestParamsSchema
>;

/**
 * 失败原因必须可枚举，避免调用方按文本分流；因此响应不含 errorMessage。
 *
 * `official_mcp_origin_untrusted` 是 host 侧二次校验的拒绝原因：`targetOrigin` 不等于当前
 * Mcode API origin。判定只看 origin，`pluginId` / `mcpKey` 仅用于日志归属。与"未登录/无凭据"
 * 分开，才能在排查时区分"被拒绝"和"没身份"。
 */
export const mcodeOfficialMcpAuthFailureReasonSchema = z.enum(
  OFFICIAL_MCP_AUTH_PORT_FAILURE_REASONS,
);

export const mcodeOfficialMcpAuthHeadersResponseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      headers: z.record(z.string(), z.string()),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      reason: mcodeOfficialMcpAuthFailureReasonSchema,
    })
    .strict(),
]);
export type McodeOfficialMcpAuthHeadersResponse = z.infer<
  typeof mcodeOfficialMcpAuthHeadersResponseSchema
>;

// ── Plugin management (list + enable/disable) ──
// 镜像 @mcode/contracts 的 PluginMetadata, 仅保留 UI 需要的可序列化字段。
export const mcodePluginOptionValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type McodePluginOptionValue = z.infer<typeof mcodePluginOptionValueSchema>;
export const mcodePluginScopeSchema = z.enum(["user", "workspace"]);
export type McodePluginScope = z.infer<typeof mcodePluginScopeSchema>;
export const mcodePluginHookDetailSchema = z
  .object({
    event: nonEmptyString,
    matcher: z.string().optional(),
    type: z.enum(["command", "process"]),
    command: nonEmptyString,
    args: z.array(z.string()).optional(),
    async: z.boolean().optional(),
    shell: z.union([z.literal(true), z.string()]).optional(),
    timeout: z.number().positive().optional(),
    timeoutMs: z.number().int().positive().optional(),
    statusMessage: z.string().optional(),
    sourcePath: z.string(),
    runnable: z.boolean(),
  })
  .strict();
export const mcodePluginUserConfigOptionSchema = z
  .object({
    default: mcodePluginOptionValueSchema.optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    title: z.string().optional(),
    type: z.enum(["string", "number", "boolean", "directory", "file"]).optional(),
  })
  .strict();
export type McodePluginUserConfigOption = z.infer<typeof mcodePluginUserConfigOptionSchema>;

// 组件类型与详情弹窗/市场详情共用的分组顺序保持一致：agent / command / skill / hook / mcp。
// 注意：这三个 schema 必须定义在 mcodePluginInfoSchema 之前，因为后者（.strict()）的 components 字段引用了它们。
export const mcodePluginComponentKindSchema = z.enum(["agent", "command", "skill", "hook", "mcp"]);
export type McodePluginComponentKind = z.infer<typeof mcodePluginComponentKindSchema>;

export const mcodePluginComponentItemSchema = z
  .object({
    name: nonEmptyString,
    // 描述来自组件 frontmatter（SKILL.md / command / agent）或 manifest；缺失时省略，不伪造。
    description: z.string().optional(),
  })
  .strict();
export const mcodePluginComponentGroupSchema = z
  .object({
    kind: mcodePluginComponentKindSchema,
    items: z.array(mcodePluginComponentItemSchema),
  })
  .strict();
export type McodePluginComponentGroup = z.infer<typeof mcodePluginComponentGroupSchema>;

export const mcodePluginUiSurfaceSchema = z
  .object({
    pluginId: nonEmptyString,
    pluginName: nonEmptyString,
    id: nonEmptyString.max(128),
    title: z.union([nonEmptyString, z.record(z.string(), z.string())]),
    icon: z.string().optional(),
    // 运行时 namespaced server 名（plugin:<name>:<server>），可直接用于 mcp/uiReadResource。
    server: nonEmptyString,
    resourceUri: nonEmptyString.max(2048),
    availability: z.literal("session"),
  })
  .strict();
export type McodePluginUiSurface = z.infer<typeof mcodePluginUiSurfaceSchema>;

export const mcodePluginInfoSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    description: z.string().optional(),
    version: z.string().optional(),
    enabled: z.boolean(),
    source: nonEmptyString,
    marketplace: nonEmptyString,
    // manifest（plugin.json）的作者/主页回退字段；商店 listing 缺失时详情页信息区用它兜底。
    author: z.string().optional(),
    authorUrl: z.string().optional(),
    homepage: z.string().optional(),
    skillCount: z.number().int().nonnegative().optional(),
    skillRootCount: z.number().int().nonnegative(),
    commandRootCount: z.number().int().nonnegative(),
    // 权威组件清单（名称 + 可选描述），由 CLI 对插件根目录枚举得出，与启用态无关。
    // 详情 UI 直接展示，取代旧的「数量取协议、名称靠 UI 侧 join」脆弱方案。optional 兼容旧 payload。
    components: z.array(mcodePluginComponentGroupSchema).optional(),
    uiSurfaces: z.array(mcodePluginUiSurfaceSchema).optional(),
    declaredMcpServerNames: z.array(z.string()).optional(),
    hostMcpServerNames: z.array(z.string()).optional(),
    mcpServerNames: z.array(z.string()),
    hookDetails: z.array(mcodePluginHookDetailSchema).optional(),
    rootPath: z.string(),
    userConfig: z.record(z.string(), mcodePluginUserConfigOptionSchema).optional(),
    configuredOptions: z.record(z.string(), mcodePluginOptionValueSchema).optional(),
    // 缺省表示 package 可用；missing 用于保留已声明但目标 Host 尚未物化的配置行。
    packageStatus: z.literal("missing").optional(),
    rootSource: mcodePluginScopeSchema.optional(),
    enabledSource: mcodePluginScopeSchema.optional(),
    optionSources: z.record(z.string(), mcodePluginScopeSchema).optional(),
  })
  .strict();
export type McodePluginInfo = z.infer<typeof mcodePluginInfoSchema>;

export const mcodePluginDiagnosticSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    severity: z.enum(["warning", "error"]).optional(),
    pluginId: z.string().optional(),
  })
  .strict();
export type McodePluginDiagnostic = z.infer<typeof mcodePluginDiagnosticSchema>;

export const mcodePluginsListParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    configScope: mcodePluginScopeSchema.optional(),
  })
  .strict();
export const mcodePluginsListResultSchema = z
  .object({
    plugins: z.array(mcodePluginInfoSchema),
    diagnostics: z.array(mcodePluginDiagnosticSchema),
  })
  .strict();
export type McodePluginsListResult = z.infer<typeof mcodePluginsListResultSchema>;

// ── 插件 UI 面板入口──
// 工作区级只读投影：已启用插件清单 `ui.surfaces[]` 的合法条目；插件启停后 host 重新拉取。
export const mcodePluginsListUiSurfacesParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema })
  .strict();
export type McodePluginsListUiSurfacesParams = z.infer<
  typeof mcodePluginsListUiSurfacesParamsSchema
>;
export const mcodePluginsListUiSurfacesResultSchema = z
  .object({ surfaces: z.array(mcodePluginUiSurfaceSchema) })
  .strict();
export type McodePluginsListUiSurfacesResult = z.infer<
  typeof mcodePluginsListUiSurfacesResultSchema
>;

// ── Plugin 对话引用 catalog（docs/plugin-reference-mention.md）──
// Session-scoped 只读投影：带 sessionId → 该 Session 创建时冻结的身份 catalog；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。身份与能力字段保持
// identifiers-only，不携带 rootPath/配置等；可选 icon/displayName(I18n)/description(I18n)
// 仅供 UI 展示与 Picker 搜索，不参与身份、权限或 runtime reminder。
export const mcodePluginReferenceCatalogEntrySchema = z
  .object({
    // 仅 referenceCatalogWithCategory 返回；旧入口保持原结构。
    category: nonEmptyString.optional(),
    pluginId: nonEmptyString,
    name: nonEmptyString,
    marketplace: nonEmptyString,
    icon: z.string().optional(),
    // 商店 listing 的 display-only 本地化显示名投影（沿 icon 先例）：让 Picker 能按
    // 中文显示名搜索/展示；locale 解析复用 shared 的 plugin-display-name helper。
    displayName: z.string().optional(),
    displayNameI18n: z.record(z.string(), z.string()).optional(),
    // 仅供 Picker 展示，不进入能力身份或 model-only reminder。
    description: z.string().optional(),
    descriptionI18n: z.record(z.string(), z.string()).optional(),
    enabled: z.boolean(),
    // 非空 = 与其他 enabled Plugin 共享 manifest name 的 V1 fail closed 冲突：
    // Picker 禁选并展示原因，runtime 解析按 ambiguous 跳过。
    conflictingPluginIds: z.array(nonEmptyString),
    skillQualifiedNames: z.array(nonEmptyString),
    mcpServerNames: z.array(nonEmptyString),
    // 旧 Host 不投影该字段时按空数组兼容；只有新 Agent 会把它用于 reminder live 交集。
    subagentNames: z.array(nonEmptyString).default([]),
  })
  .strict();
export type McodePluginReferenceCatalogEntry = z.infer<
  typeof mcodePluginReferenceCatalogEntrySchema
>;

export const mcodePluginsReferenceCatalogParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    // 已有 Session 的 Picker 必须带 sessionId 才能拿到 session-owned catalog；
    // session 不存在时按协议错误 fail closed，禁止静默回退 workspace authority。
    sessionId: nonEmptyString.optional(),
  })
  .strict();
export type McodePluginsReferenceCatalogParams = z.infer<
  typeof mcodePluginsReferenceCatalogParamsSchema
>;
export const mcodePluginsReferenceCatalogResultSchema = z
  .object({
    authority: z.enum(["session", "workspace"]),
    plugins: z.array(mcodePluginReferenceCatalogEntrySchema),
  })
  .strict();
export type McodePluginsReferenceCatalogResult = z.infer<
  typeof mcodePluginsReferenceCatalogResultSchema
>;

// ── Skill 对话引用 catalog──
// 新草稿读取 workspace 当前目录；已有 Session 读取 AgentRuntime 首次 context
// 初始化时冻结的发现结果。该协议只承载 Composer 的只读引用投影，不替代 Settings
// 的 Skill 管理接口，也不持久化 runtime 快照。
export const mcodeSkillReferenceCatalogEntrySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    description: z.string(),
    path: nonEmptyString,
    scope: z.enum(["workspace", "user", "plugin"]),
    enabled: z.literal(true),
    pluginName: nonEmptyString.optional(),
  })
  .strict();
export type McodeSkillReferenceCatalogEntry = z.infer<typeof mcodeSkillReferenceCatalogEntrySchema>;

export const mcodeSkillsReferenceCatalogParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    // 带 sessionId 时必须命中该进程内的 resident Session；未知 Session fail closed，
    // 禁止回退到 workspace 当前目录而把新 Skill 泄漏进旧对话。
    sessionId: nonEmptyString.optional(),
  })
  .strict();
export type McodeSkillsReferenceCatalogParams = z.infer<
  typeof mcodeSkillsReferenceCatalogParamsSchema
>;
export const mcodeSkillsReferenceCatalogResultSchema = z
  .object({
    authority: z.enum(["session", "workspace"]),
    skills: z.array(mcodeSkillReferenceCatalogEntrySchema),
  })
  .strict();
export type McodeSkillsReferenceCatalogResult = z.infer<
  typeof mcodeSkillsReferenceCatalogResultSchema
>;

// ── 已保存工作流的 GUI 中枢──
// workspace 级、无会话的五个方法，照 skills/referenceCatalog 的先例：每次调用现扫
// `<cwd>/.mcode/workflows/`（挂载时快照会漏掉手改的文件）。形状与 @mcode/contracts 的
// saved-workflow.ts 逐字对齐——依赖方向是 contracts → shared，所以这里结构化地再声明一遍，
// 而不是 import；两边的 strict 形状由 bootstrap 侧的协议测试互相钉住。
export const mcodeSavedWorkflowArgTypeSchema = z.enum(["string", "number", "boolean", "json"]);
export type McodeSavedWorkflowArgType = z.infer<typeof mcodeSavedWorkflowArgTypeSchema>;
export const mcodeSavedWorkflowArgDeclarationSchema = z
  .object({
    type: mcodeSavedWorkflowArgTypeSchema,
    description: z.string().optional(),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
  })
  .strict();
export type McodeSavedWorkflowArgDeclaration = z.infer<
  typeof mcodeSavedWorkflowArgDeclarationSchema
>;
export const mcodeSavedWorkflowArgsDeclarationSchema = z.record(
  z.string(),
  mcodeSavedWorkflowArgDeclarationSchema,
);
export type McodeSavedWorkflowArgsDeclaration = z.infer<
  typeof mcodeSavedWorkflowArgsDeclarationSchema
>;
export const mcodeSavedWorkflowMetaSchema = z
  .object({
    description: nonEmptyString,
    whenToUse: nonEmptyString.optional(),
    args: mcodeSavedWorkflowArgsDeclarationSchema.optional(),
  })
  .strict();
export type McodeSavedWorkflowMeta = z.infer<typeof mcodeSavedWorkflowMetaSchema>;
// 作用域两档：项目档落 `<cwd>/.mcode/workflows/`、全局档落 agent 机器的 `~/.mcode/workflows/`。作用域由文件所在目录推得，frontmatter 不存 scope。
export const mcodeSavedWorkflowScopeSchema = z.enum(["project", "global"]);
export type McodeSavedWorkflowScope = z.infer<typeof mcodeSavedWorkflowScopeSchema>;
export const mcodeSavedWorkflowEntrySchema = z
  .object({
    name: nonEmptyString,
    description: z.string(),
    whenToUse: z.string().optional(),
    args: mcodeSavedWorkflowArgsDeclarationSchema.optional(),
    scope: mcodeSavedWorkflowScopeSchema,
    path: nonEmptyString,
  })
  .strict();
export type McodeSavedWorkflowEntry = z.infer<typeof mcodeSavedWorkflowEntrySchema>;
export const mcodeSavedWorkflowInvalidEntrySchema = z
  .object({ path: nonEmptyString, reason: nonEmptyString })
  .strict();
export type McodeSavedWorkflowInvalidEntry = z.infer<typeof mcodeSavedWorkflowInvalidEntrySchema>;
/** 名字非法 / 未找到 / frontmatter 坏 / 读错——与 core store 的 resolve 失败四态逐字对应。 */
export const mcodeSavedWorkflowFailureReasonSchema = z.enum([
  "invalid_name",
  "not_found",
  "parse_error",
  "read_error",
]);
export type McodeSavedWorkflowFailureReason = z.infer<typeof mcodeSavedWorkflowFailureReasonSchema>;
const mcodeSavedWorkflowFailureSchema = z
  .object({
    ok: z.literal(false),
    reason: mcodeSavedWorkflowFailureReasonSchema,
    detail: z.string().optional(),
  })
  .strict();

export const mcodeWorkflowsListParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    // 缺省即 `project`（本项目档）。给 `global` 时改扫本机 `~/.mcode/workflows/`；此时 `workspace`
    // 仍必填，但只是**载体运行时**——协议处理器对全局档不读它的路径。
    scope: mcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type McodeWorkflowsListParams = z.infer<typeof mcodeWorkflowsListParamsSchema>;
export const mcodeWorkflowsListResultSchema = z
  .object({
    workflows: z.array(mcodeSavedWorkflowEntrySchema),
    invalid: z.array(mcodeSavedWorkflowInvalidEntrySchema),
    // 扫过的目录（本地绝对路径），即使目录还不存在也回：GUI 的文件监听靠它 watch。
    dir: nonEmptyString,
  })
  .strict();
export type McodeWorkflowsListResult = z.infer<typeof mcodeWorkflowsListResultSchema>;

export const mcodeWorkflowsGetParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    name: nonEmptyString,
    // 缺省 `project`；`global` 时只查本机全局根。`workspace` 语义同 list（全局档只当载体）。
    scope: mcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type McodeWorkflowsGetParams = z.infer<typeof mcodeWorkflowsGetParamsSchema>;
export const mcodeWorkflowsGetResultSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      name: nonEmptyString,
      path: nonEmptyString,
      scope: mcodeSavedWorkflowScopeSchema,
      meta: mcodeSavedWorkflowMetaSchema,
      /** 脚本本体（frontmatter 之后逐字节），即被类型检查与执行的那一份。 */
      script: z.string(),
    })
    .strict(),
  mcodeSavedWorkflowFailureSchema,
]);
export type McodeWorkflowsGetResult = z.infer<typeof mcodeWorkflowsGetResultSchema>;

export const mcodeWorkflowsUpdateMetaParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    name: nonEmptyString,
    meta: mcodeSavedWorkflowMetaSchema,
    // 缺省 `project`；`global` 时只写本机全局根那一份。`workspace` 语义同 list。
    scope: mcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type McodeWorkflowsUpdateMetaParams = z.infer<typeof mcodeWorkflowsUpdateMetaParamsSchema>;
export const mcodeWorkflowsUpdateMetaResultSchema = z.union([
  z.object({ ok: z.literal(true), path: nonEmptyString }).strict(),
  mcodeSavedWorkflowFailureSchema,
]);
export type McodeWorkflowsUpdateMetaResult = z.infer<typeof mcodeWorkflowsUpdateMetaResultSchema>;

export const mcodeWorkflowsDeleteParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    name: nonEmptyString,
    // 缺省 `project`；`global` 时按 scope 选根删除（不再写死 roots[0]）。`workspace` 语义同 list。
    scope: mcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type McodeWorkflowsDeleteParams = z.infer<typeof mcodeWorkflowsDeleteParamsSchema>;
export const mcodeWorkflowsDeleteResultSchema = z.union([
  z.object({ ok: z.literal(true), path: nonEmptyString }).strict(),
  mcodeSavedWorkflowFailureSchema,
]);
export type McodeWorkflowsDeleteResult = z.infer<typeof mcodeWorkflowsDeleteResultSchema>;

export const MCODE_WORKFLOWS_RUNS_MAX_LIMIT = 50;
export const mcodeWorkflowsRunsParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    /** 只要这个名字的 run（`dwf_run.name` 字面等值）；缺省即本项目全部 run。 */
    name: nonEmptyString.optional(),
    limit: z.number().int().min(1).max(MCODE_WORKFLOWS_RUNS_MAX_LIMIT),
    // 缺省 `project`：只查 `dwf_run.cwd === workspacePath` 的 run。`global` 时**不**按 cwd 过滤，
    // 跨所有项目取该名字的运行历史（全局工作流在任何项目里跑，历史因此跨 cwd）；结果行带 `cwd`
    // 供 GUI 标项目。`workspace` 语义同 list（全局档只当载体）。
    scope: mcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type McodeWorkflowsRunsParams = z.infer<typeof mcodeWorkflowsRunsParamsSchema>;
// 三终态词汇：errored = 脚本之错，stopped = 被停下（可恢复）。
export const mcodeSavedWorkflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "errored",
  "stopped",
]);
export type McodeSavedWorkflowRunStatus = z.infer<typeof mcodeSavedWorkflowRunStatusSchema>;
export const mcodeSavedWorkflowRunStopReasonSchema = z.enum([
  "user",
  "model",
  "provider",
  "interrupted",
  "superseded",
]);
export const mcodeSavedWorkflowRunSchema = z
  .object({
    runId: nonEmptyString,
    name: z.string().optional(),
    status: mcodeSavedWorkflowRunStatusSchema,
    // `status === "stopped"` 才在场。
    stopReason: mcodeSavedWorkflowRunStopReasonSchema.optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    spentTokens: z.number(),
    /** 发起它的会话与 CreateWorkflow 工具调用：有这两个才能从中枢打开实例详情。老行可缺。 */
    parentSessionId: z.string().optional(),
    toolCallId: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
    // 实际运行的项目目录（`dwf_run.cwd`）。全局档的 `workflows/runs` 跨 cwd 查询，GUI 用它给
    // 每行标项目；项目档变体里它恒等于 workspacePath，GUI 可忽略。老行可缺。
    cwd: z.string().optional(),
    // 这次运行发布的**用户面产物**：中枢的运行历史行在
    // 状态词之后画一串 kind chips，详情页头部的「最近产物」条取最近一次 completed run 的这一份。
    // ⚠ 术语：这里的 artifact 是脚本经 `artifact.*` 发布给用户看的产出，不是脚本的顶层返回值。
    // 只带 chip 画得下的字段（≤ 8 件，取最新版的元数据）；字节与条目经 v4 查询按需读。
    // optional，照上面 `cwd` 的先例：老 CLI 不发，少一个键是退化不是错误。
    artifacts: z
      .array(
        z
          .object({
            id: nonEmptyString,
            kind: z.enum(["file", "markdown", "chart", "table", "metrics", "board"]),
            title: z.string().optional(),
            version: z.number(),
            contentType: z.string().optional(),
          })
          .strict(),
      )
      .max(8)
      .optional(),
  })
  .strict();
export type McodeSavedWorkflowRun = z.infer<typeof mcodeSavedWorkflowRunSchema>;
export const mcodeWorkflowsRunsResultSchema = z
  .object({
    runs: z.array(mcodeSavedWorkflowRunSchema),
    /** 为真时才在场：还有更多 run 没进这一页（多取一条判定，不是 length === limit）。 */
    truncated: z.literal(true).optional(),
  })
  .strict();
export type McodeWorkflowsRunsResult = z.infer<typeof mcodeWorkflowsRunsResultSchema>;

// workflows/move：把本机全局根的同名文件搬到 `workspace` 项目根。**只此一向**：项目→全局不是搬文件而是模型的概括（「提升为
// 全局」在该项目开新会话、经 SaveWorkflow 另存），所以没有 `to` 参数。同机同用户，rename 优先、EXDEV
// 回落 copy+unlink；逐字节搬，不改内容（frontmatter 不存 scope）；`move` 不覆盖——目标已存在即拒绝
// （覆盖是 SaveWorkflow 经确认窗才有的动作，不变式 7）。`workspace` 既是载体运行时也是目标项目。
export const mcodeWorkflowsMoveParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    name: nonEmptyString,
  })
  .strict();
export type McodeWorkflowsMoveParams = z.infer<typeof mcodeWorkflowsMoveParamsSchema>;
export const mcodeWorkflowsMoveResultSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      /** 源落点路径（全局根，搬走前）。 */
      from: nonEmptyString,
      /** 目标落点路径（项目根，搬到处）。 */
      to: nonEmptyString,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      // target_exists：目标档已有同名（move 不覆盖）；not_found：源档没有这个名字；
      // read_error / write_error：搬运时的 I/O 失败；invalid_name：名字先验没过。
      reason: z.enum(["invalid_name", "not_found", "target_exists", "read_error", "write_error"]),
      path: z.string().optional(),
      detail: z.string().optional(),
    })
    .strict(),
]);
export type McodeWorkflowsMoveResult = z.infer<typeof mcodeWorkflowsMoveResultSchema>;

// ── 从一次 run 保存工作流（docs/dynamic-workflow/transcript-and-notifications.md「Saving the
// run, and running it again」）──
// 完成卡的「直接保存」走这条：**不收脚本，只收 runId**——要写的那份正文是这次 run 实际执行的
// 脚本，agent 从 journal 记录（`scriptText`）里读。脚本不经 GUI 走一圈有两个后果值得写下来：
// 修订过的 run 存下的是**结算它的**那一份，而工具行入参被快照裁成预览的老对话也照样存得出
// 同样的字节。名字合法性、覆盖、遮��与类型检查全部复用 SaveWorkflow 的同一套实现（不变式 3）。
/** 另一档已有同名定义（遮蔽事实）；与 contracts 的 SavedWorkflowShadowing 逐字对齐。 */
export const mcodeSavedWorkflowShadowingSchema = z.enum(["hides_global", "hidden_by_project"]);
export type McodeSavedWorkflowShadowing = z.infer<typeof mcodeSavedWorkflowShadowingSchema>;

export const mcodeWorkflowsSaveParamsSchema = z
  .object({
    // 两用：既是载体运行时，也是这次 run 的项目——journal 在它那里，项目根也在它那里。
    // 全局档同样带它（与 list/get 的「全局只当载体」不同）：脚本必须从这个 agent 的 journal 读。
    workspace: mcodeWorkspaceRefSchema,
    runId: nonEmptyString,
    name: nonEmptyString,
    meta: mcodeSavedWorkflowMetaSchema,
    // 缺省 `project`。
    scope: mcodeSavedWorkflowScopeSchema.optional(),
    // 只有 GUI 已经把覆盖警告摆给用户看过时才为 true；缺省即「目标已存在就拒绝」——
    // 覆盖是用户的决定，不是一次保存的副作用（与 `workflows/move` 不覆盖同一条纪律）。
    overwrite: z.boolean().optional(),
  })
  .strict();
export type McodeWorkflowsSaveParams = z.infer<typeof mcodeWorkflowsSaveParamsSchema>;
export const mcodeWorkflowsSaveResultSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      name: nonEmptyString,
      scope: mcodeSavedWorkflowScopeSchema,
      path: nonEmptyString,
      /** 写的那一刻重新判定，不回抄入参里的 `overwrite`（与 SaveWorkflow 的 `overwritten` 同源）。 */
      overwritten: z.boolean(),
      shadowing: mcodeSavedWorkflowShadowingSchema.optional(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      // run_not_found：journal 里没有这条 run；script_missing：老记录没存脚本原文；
      // target_exists：目标已存在而调用方没说覆盖；compile_failed：类型检查没过，一个字节都没写。
      reason: z.enum([
        "invalid_name",
        "run_not_found",
        "script_missing",
        "target_exists",
        "compile_failed",
        "write_error",
      ]),
      path: z.string().optional(),
      detail: z.string().optional(),
    })
    .strict(),
]);
export type McodeWorkflowsSaveResult = z.infer<typeof mcodeWorkflowsSaveResultSchema>;

// ── 一次 run 对应哪个已保存工作流 ──
// 完成卡的「已保存」芯片与「再次运行」都问这一个问题，而答案**推导得来、不记在卡上**：重开
// 会话、换一个窗口保存、在对话里保存，都走同一条判定。判定住在 agent 一侧，因为两份事实
// （run 的 journal 记录与磁盘上的定义）都在那里；返回解析好的 entry，用户后来删掉的那一份
// 因此会自动不再算数。
/** 转写自对话的候选：模型用 `SaveWorkflow` 存过、并在入参里认领了这次 run。 */
export const mcodeWorkflowsForRunCandidateSchema = z
  .object({ name: nonEmptyString, scope: mcodeSavedWorkflowScopeSchema.optional() })
  .strict();
export type McodeWorkflowsForRunCandidate = z.infer<typeof mcodeWorkflowsForRunCandidateSchema>;
/** 候选上界：一次 run 在一段对话里被存过的次数远小于它。 */
export const MCODE_WORKFLOWS_FOR_RUN_MAX_CANDIDATES = 8;
export const mcodeWorkflowsForRunParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    runId: nonEmptyString,
    candidates: z
      .array(mcodeWorkflowsForRunCandidateSchema)
      .max(MCODE_WORKFLOWS_FOR_RUN_MAX_CANDIDATES)
      .optional(),
  })
  .strict();
export type McodeWorkflowsForRunParams = z.infer<typeof mcodeWorkflowsForRunParamsSchema>;
export const mcodeWorkflowsForRunResultSchema = z
  .object({
    /** 命中的定义；缺席即这次 run 还没有对应的已保存工作流。 */
    entry: mcodeSavedWorkflowEntrySchema.optional(),
    /** 命中的是哪一条规则（诊断与测试用；UI 只看 entry 在不在）。 */
    match: z.enum(["candidate", "script", "name"]).optional(),
    /** 这次 run 跑时用的实参（journal 原样），供「再次运行」预填实参窗。 */
    runArgs: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type McodeWorkflowsForRunResult = z.infer<typeof mcodeWorkflowsForRunResultSchema>;

// 推荐 Prompt 的可信插件解析：UI 不拆解 stableId，也不从旧目录快照推断可安装性。
export const mcodePluginSuggestedReferenceStatusSchema = z.enum([
  "ready",
  "disabled",
  "missing",
  "conflict",
  "unavailable",
]);
export type McodePluginSuggestedReferenceStatus = z.infer<
  typeof mcodePluginSuggestedReferenceStatusSchema
>;
export const mcodePluginOperationStateSchema = z.enum([
  "checking",
  "refreshing",
  "installing",
  "enabling",
  "cancelling",
  "cancelled",
  "complete",
  "failed",
]);
export type McodePluginOperationState = z.infer<typeof mcodePluginOperationStateSchema>;
export const mcodePluginOperationProgressNotificationSchema = z
  .object({
    operationId: nonEmptyString,
    state: z.literal("refreshing"),
  })
  .strict();
export type McodePluginOperationProgressNotification = z.infer<
  typeof mcodePluginOperationProgressNotificationSchema
>;
export const mcodePluginsResolveSuggestedReferenceParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    stableId: nonEmptyString,
    operationId: nonEmptyString,
    clientMode: mcodeDeliveryKindSchema,
    deliveryKind: mcodeDeliveryKindSchema,
  })
  .strict();
export type McodePluginsResolveSuggestedReferenceParams = z.infer<
  typeof mcodePluginsResolveSuggestedReferenceParamsSchema
>;
export const mcodePluginsSetEnabledParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    enabled: z.boolean(),
    operationId: nonEmptyString.optional(),
    scope: mcodePluginScopeSchema.optional(),
  })
  .strict();
export const mcodePluginsSetEnabledResultSchema = z
  .object({
    plugin: mcodePluginInfoSchema,
    enabled: z.boolean(),
  })
  .strict();
export type McodePluginsSetEnabledResult = z.infer<typeof mcodePluginsSetEnabledResultSchema>;

// 商店信息（Store Listing）：目录条目携带的展示性元数据（显示名/icon/分类/作者/链接/hero/
// 示例提示词），全部可选，UI 缺失时按降级矩阵处理（字母头像/隐藏区块/省略信息行）。
// i18n 采用 `<字段>I18n` map，locale 解析复用 shared 的 plugin-display-name helper。
export const mcodePluginStoreListingSchema = z
  .object({
    displayName: z.string().optional(),
    displayNameI18n: z.record(z.string(), z.string()).optional(),
    descriptionI18n: z.record(z.string(), z.string()).optional(),
    icon: z.string().optional(),
    category: z.string().optional(),
    publisherType: z.enum(["official", "community"]).optional(),
    author: z.string().optional(),
    authorUrl: z.string().optional(),
    homepage: z.string().optional(),
    privacyPolicy: z.string().optional(),
    termsOfService: z.string().optional(),
    heroImage: z.string().optional(),
    examplePrompts: z.array(z.string()).optional(),
    examplePromptsI18n: z.record(z.string(), z.array(z.string())).optional(),
    /**
     * 需要付费套餐才好用的插件：市场目录条目声明 `requiresPaidPlan: true`，
     * UI 在标题右侧展示提示图标。描述的是「使用条件」而非「插件是收费商品」——
     * 不参与安装门禁与计费，命名也不绑定具体套餐商品名。
     */
    requiresPaidPlan: z.boolean().optional(),
  })
  .strict();
export type McodePluginStoreListing = z.infer<typeof mcodePluginStoreListingSchema>;

export const mcodePluginsResolveSuggestedReferenceResultSchema = z
  .object({
    stableId: nonEmptyString,
    status: mcodePluginSuggestedReferenceStatusSchema,
    marketplace: nonEmptyString.optional(),
    pluginName: nonEmptyString.optional(),
    sourceTrust: z.literal("official").optional(),
    // 官方 Marketplace listing 的可选展示投影；不参与身份、安装或权限判断。
    icon: z.string().optional(),
    listing: mcodePluginStoreListingSchema.optional(),
    diagnostics: z.array(mcodePluginDiagnosticSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status !== "ready" && value.status !== "disabled" && value.status !== "missing") {
      return;
    }
    if (!value.marketplace || !value.pluginName || value.sourceTrust !== "official") {
      context.addIssue({
        code: "custom",
        message: "actionable suggested Plugin results require trusted install identity",
      });
    }
  });
export type McodePluginsResolveSuggestedReferenceResult = z.infer<
  typeof mcodePluginsResolveSuggestedReferenceResultSchema
>;

export const mcodePluginMarketplaceSummarySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    source: jsonObjectSchema,
    description: z.string().optional(),
    lastUpdated: z.string().optional(),
    pluginCount: z.number().int().nonnegative(),
    isOfficial: z.boolean().optional(),
    // 目录顶层 featured 策展名单（商店「公开」分段 Featured 区）。
    featured: z.array(z.string()).optional(),
    refreshFailure: z
      .object({
        code: z.string(),
        failedAt: z.string(),
        message: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodePluginMarketplaceSummary = z.infer<typeof mcodePluginMarketplaceSummarySchema>;

export const mcodeAvailablePluginSummarySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    marketplace: nonEmptyString,
    description: z.string().optional(),
    version: z.string().optional(),
    installed: z.boolean(),
    componentTypes: z.array(z.string()).optional(),
    listing: mcodePluginStoreListingSchema.optional(),
  })
  .strict();
export type McodeAvailablePluginSummary = z.infer<typeof mcodeAvailablePluginSummarySchema>;

export const mcodeInstalledPluginSummarySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    marketplace: nonEmptyString,
    description: z.string().optional(),
    version: z.string().optional(),
    enabled: z.boolean(),
    scope: mcodePluginScopeSchema,
    installPath: z.string().optional(),
    installedAt: z.string().optional(),
    componentTypes: z.array(z.string()).optional(),
    hookDetails: z.array(mcodePluginHookDetailSchema).optional(),
    updateStatus: z.enum(["none", "update-available", "version-changed"]).optional(),
    latestVersion: z.string().optional(),
    listing: mcodePluginStoreListingSchema.optional(),
  })
  .strict();
export type McodeInstalledPluginSummary = z.infer<typeof mcodeInstalledPluginSummarySchema>;

export const mcodePluginsOverviewParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    configScope: mcodePluginScopeSchema.optional(),
  })
  .strict();
export const mcodePluginsOverviewResultSchema = z
  .object({
    marketplaces: z.array(mcodePluginMarketplaceSummarySchema),
    availablePlugins: z.array(mcodeAvailablePluginSummarySchema),
    installedPlugins: z.array(mcodeInstalledPluginSummarySchema),
    restorableBuiltins: z.array(mcodeAvailablePluginSummarySchema),
    diagnostics: z.array(mcodePluginDiagnosticSchema),
    capability: z
      .object({
        supported: z.boolean(),
        reason: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type McodePluginsOverviewResult = z.infer<typeof mcodePluginsOverviewResultSchema>;

export const mcodePluginsMarketplaceAddParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    source: nonEmptyString,
    dryRun: z.boolean().optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict();
export const mcodePluginsMarketplaceRemoveParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    marketplace: nonEmptyString,
  })
  .strict();
export const mcodePluginsMarketplaceUpdateParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    marketplace: nonEmptyString.optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict();
export const mcodePluginsMarketplaceMutationResultSchema = z
  .object({
    marketplace: mcodePluginMarketplaceSummarySchema.optional(),
    marketplaces: z.array(mcodePluginMarketplaceSummarySchema).optional(),
    diagnostics: z.array(mcodePluginDiagnosticSchema).optional(),
  })
  .strict();
export type McodePluginsMarketplaceMutationResult = z.infer<
  typeof mcodePluginsMarketplaceMutationResultSchema
>;

export const mcodePluginsInstallParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginName: nonEmptyString,
    marketplace: nonEmptyString,
    scope: mcodePluginScopeSchema.optional(),
    dryRun: z.boolean().optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict();
export const mcodePluginsCancelOperationParamsSchema = z
  .object({
    operationId: nonEmptyString,
  })
  .strict();
export type McodePluginsCancelOperationParams = z.infer<
  typeof mcodePluginsCancelOperationParamsSchema
>;

export const mcodePluginsCancelOperationResultSchema = z
  .object({
    operationId: nonEmptyString,
    cancelled: z.boolean(),
  })
  .strict();
export type McodePluginsCancelOperationResult = z.infer<
  typeof mcodePluginsCancelOperationResultSchema
>;
export const mcodePluginsUninstallParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString.optional(),
    pluginName: nonEmptyString.optional(),
    marketplace: nonEmptyString.optional(),
    removeCache: z.boolean().optional(),
  })
  .strict();
export const mcodePluginsInstallResultSchema = z
  .object({
    installedPlugins: z.array(mcodeInstalledPluginSummarySchema),
    dependencyClosure: z.array(z.string()),
    diagnostics: z.array(mcodePluginDiagnosticSchema),
  })
  .strict();
export type McodePluginsInstallResult = z.infer<typeof mcodePluginsInstallResultSchema>;

export const mcodePluginsUninstallResultSchema = z
  .object({
    removedPlugin: mcodeInstalledPluginSummarySchema.optional(),
    diagnostics: z.array(mcodePluginDiagnosticSchema),
  })
  .strict();
export type McodePluginsUninstallResult = z.infer<typeof mcodePluginsUninstallResultSchema>;

export const mcodePluginsUpdateParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString.optional(),
    marketplace: nonEmptyString.optional(),
  })
  .strict();
export const mcodePluginsRestoreBuiltinParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
  })
  .strict();
export const mcodePluginsRestoreBuiltinResultSchema = z
  .object({
    pluginId: nonEmptyString,
    diagnostics: z.array(mcodePluginDiagnosticSchema),
  })
  .strict();
export type McodePluginsRestoreBuiltinResult = z.infer<
  typeof mcodePluginsRestoreBuiltinResultSchema
>;

export const mcodePluginsConfigureParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    options: jsonObjectSchema,
    clearOptionKeys: z.array(nonEmptyString).optional(),
    scope: mcodePluginScopeSchema.optional(),
    dryRun: z.boolean().optional(),
  })
  .strict();
export const mcodePluginsConfigureResultSchema = z
  .object({
    pluginId: nonEmptyString,
    diagnostics: z.array(mcodePluginDiagnosticSchema),
  })
  .strict();
export type McodePluginsConfigureResult = z.infer<typeof mcodePluginsConfigureResultSchema>;

export const mcodePluginsResetConfigParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    scope: mcodePluginScopeSchema.optional(),
  })
  .strict();
export type McodePluginsResetConfigParams = z.infer<typeof mcodePluginsResetConfigParamsSchema>;

export const mcodePluginsValidateParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginName: nonEmptyString.optional(),
    marketplace: nonEmptyString.optional(),
    source: nonEmptyString.optional(),
  })
  .strict();
export const mcodePluginsValidateResultSchema = z
  .object({
    ok: z.boolean(),
    diagnostics: z.array(mcodePluginDiagnosticSchema),
    compatibility: z
      .object({
        runnable: z.array(z.string()),
        diagnosticOnly: z.array(z.string()),
        unsupported: z.array(z.string()),
      })
      .strict(),
  })
  .strict();
export type McodePluginsValidateResult = z.infer<typeof mcodePluginsValidateResultSchema>;

// plugins/describe：按需枚举单个插件的组件「名称 + 描述」。
// 已安装插件读本地缓存目录；未安装候选按需解析/临时 clone 源后枚举再清理。
export const mcodePluginsDescribeParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema,
    pluginName: nonEmptyString,
    marketplace: nonEmptyString,
  })
  .strict();
export const mcodePluginsDescribeResultSchema = z
  .object({
    components: z.array(mcodePluginComponentGroupSchema),
    diagnostics: z.array(mcodePluginDiagnosticSchema).optional(),
    // 插件包内 plugin.json 的展示性回退字段；未安装候选详情页信息区在商店 listing 缺失时兜底。
    metadata: z
      .object({
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        homepage: z.string().optional(),
        version: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type McodePluginsDescribeResult = z.infer<typeof mcodePluginsDescribeResultSchema>;

export const mcodeAutomationScheduleRuleSchema = z
  .object({
    unit: z.enum(["minute", "hourly", "daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().positive(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    anchorAt: z.number().int(),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    monthDays: z.array(z.number().int().min(1).max(31)).optional(),
    /** yearly 用：1-12 人类月份。缺省回退 anchorAt 的月份（兼容未写该字段的旧记录）。 */
    months: z.array(z.number().int().min(1).max(12)).optional(),
    monthlyMode: z.enum(["date", "weekday"]).optional(),
  })
  .strict();
export type McodeAutomationScheduleRuleProtocol = z.infer<typeof mcodeAutomationScheduleRuleSchema>;

/** 会话侧长间隔周期 carrier 的 unit 枚举（与 scheduleRule.unit 同集）。 */
export const mcodeAutomationIntervalUnitSchema = z.enum([
  "minute",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const mcodeAutomationProtocolSchema = z
  .object({
    automationId: nonEmptyString,
    title: z.string(),
    cronExpr: nonEmptyString,
    prompt: nonEmptyString,
    modelSelection: modelSelectionSchema.optional(),
    mode: mcodeTaskModeSchema.optional(),
    targetTaskId: nonEmptyString.optional(),
    enabled: z.boolean(),
    lifecycleStatus: z.enum(["active", "completed", "failed", "paused"]),
    nextRunAt: timestampMsSchema.optional(),
    lastRunAt: timestampMsSchema.optional(),
    runCount: z.number().int().nonnegative(),
    recurring: z.boolean(),
    maxRuns: z.number().int().positive().optional(),
    // 自定义重复规则；缺省时调度回退到解析 cronExpr。会话卡片必须读到本字段才能展示
    // cron 无法表达的真实间隔（如每50小时、每40天，兼容 cronExpr 只是 0 * * * *）。
    scheduleRule: mcodeAutomationScheduleRuleSchema.optional(),
  })
  .strict();
export type McodeAutomationProtocol = z.infer<typeof mcodeAutomationProtocolSchema>;

export const mcodeAutomationCreateParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema.optional(),
    title: z.string().optional(),
    cronExpr: nonEmptyString,
    relativeDelayMinutes: z.number().int().positive().max(525_600).optional(),
    prompt: nonEmptyString,
    modelSelection: modelSelectionSchema.optional(),
    mode: mcodeTaskModeSchema.optional(),
    targetTaskId: nonEmptyString.optional(),
    botDeliveryTarget: mcodeAutomationBotDeliveryTargetSchema.optional(),
    recurring: z.boolean().optional(),
    maxRuns: z.number().int().positive().optional(),
    // 会话侧自定义重复 carrier：每 N 分钟/小时/天/周/月/年均通过此字段归一化为权威 scheduleRule，
    // cronExpr 仅作合法兼容展示。
    intervalUnit: mcodeAutomationIntervalUnitSchema.optional(),
    interval: z.number().int().min(1).max(200).optional(),
  })
  .strict()
  // intervalUnit 与 interval 必须配对提交（只传一个无法确定真实间隔）。
  .refine((input) => (input.intervalUnit === undefined) === (input.interval === undefined), {
    message: "intervalUnit and interval must be set together",
    path: ["interval"],
  })
  // 周期 carrier 与一次性相对延迟语义冲突，禁止同传。
  .refine((input) => input.intervalUnit === undefined || input.relativeDelayMinutes === undefined, {
    message: "intervalUnit cannot combine with a relative delayMinutes",
    path: ["intervalUnit"],
  })
  .refine((input) => input.intervalUnit === undefined || input.recurring !== false, {
    message: "intervalUnit is a recurring carrier and cannot combine with recurring=false",
    path: ["recurring"],
  })
  .refine((input) => input.intervalUnit === undefined || input.maxRuns === undefined, {
    message: "intervalUnit is a recurring carrier and cannot combine with maxRuns",
    path: ["maxRuns"],
  });
export type McodeAutomationCreateProtocolParams = z.infer<typeof mcodeAutomationCreateParamsSchema>;

export const mcodeAutomationCreateResultSchema = z
  .object({ automation: mcodeAutomationProtocolSchema })
  .strict();
export type McodeAutomationCreateProtocolResult = z.infer<typeof mcodeAutomationCreateResultSchema>;

export const mcodeAutomationUpdateParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema.optional(),
    automationId: nonEmptyString,
    title: nonEmptyString.optional(),
    cronExpr: nonEmptyString.optional(),
    prompt: nonEmptyString.optional(),
    recurring: z.boolean().optional(),
    maxRuns: z.number().int().positive().nullable().optional(),
    // 会话侧自定义重复 carrier（同 create 侧语义）。
    intervalUnit: mcodeAutomationIntervalUnitSchema.optional(),
    interval: z.number().int().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.title !== undefined ||
      input.cronExpr !== undefined ||
      input.prompt !== undefined ||
      input.recurring !== undefined ||
      input.maxRuns !== undefined ||
      input.intervalUnit !== undefined,
    { message: "automation update requires at least one field" },
  )
  .refine((input) => input.maxRuns !== null || input.recurring === true, {
    message: "clearing maxRuns requires recurring=true",
    path: ["maxRuns"],
  })
  .refine((input) => input.recurring !== true || typeof input.maxRuns !== "number", {
    message: "recurring=true cannot be combined with a numeric maxRuns",
    path: ["maxRuns"],
  })
  // intervalUnit 与 interval 必须配对提交（同 create 侧语义）。
  .refine((input) => (input.intervalUnit === undefined) === (input.interval === undefined), {
    message: "intervalUnit and interval must be set together",
    path: ["interval"],
  })
  .refine((input) => input.intervalUnit === undefined || input.recurring !== false, {
    message: "intervalUnit is a recurring carrier and cannot combine with recurring=false",
    path: ["recurring"],
  })
  .refine(
    (input) =>
      input.intervalUnit === undefined ||
      input.maxRuns === undefined ||
      (input.maxRuns === null && input.recurring === true),
    {
      message:
        "intervalUnit is a recurring carrier and only allows maxRuns=null with recurring=true",
      path: ["maxRuns"],
    },
  );
export type McodeAutomationUpdateProtocolParams = z.infer<typeof mcodeAutomationUpdateParamsSchema>;
export const mcodeAutomationUpdateResultSchema = z
  .object({ automation: mcodeAutomationProtocolSchema })
  .strict();
export type McodeAutomationUpdateProtocolResult = z.infer<typeof mcodeAutomationUpdateResultSchema>;

export const mcodeAutomationListParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema.optional() })
  .strict();
export type McodeAutomationListProtocolParams = z.infer<typeof mcodeAutomationListParamsSchema>;
export const mcodeAutomationListResultSchema = z
  .object({ automations: z.array(mcodeAutomationProtocolSchema) })
  .strict();
export type McodeAutomationListProtocolResult = z.infer<typeof mcodeAutomationListResultSchema>;

export const mcodeAutomationCheckTaskBindingParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema.optional(), targetTaskId: nonEmptyString })
  .strict();
export type McodeAutomationCheckTaskBindingProtocolParams = z.infer<
  typeof mcodeAutomationCheckTaskBindingParamsSchema
>;
export const mcodeAutomationCheckTaskBindingResultSchema = z
  .object({ bound: z.boolean() })
  .strict();
export type McodeAutomationCheckTaskBindingProtocolResult = z.infer<
  typeof mcodeAutomationCheckTaskBindingResultSchema
>;

export const mcodeAutomationDeleteParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema.optional(), automationId: nonEmptyString })
  .strict();
export type McodeAutomationDeleteProtocolParams = z.infer<typeof mcodeAutomationDeleteParamsSchema>;
export const mcodeAutomationDeleteResultSchema = z.object({ deleted: z.boolean() }).strict();
export type McodeAutomationDeleteProtocolResult = z.infer<typeof mcodeAutomationDeleteResultSchema>;

// 执行轮自暂停（CronPauseSelf）：automationId 来自 CLI loop state，Host 只在当前 workspace
// 内做条件暂停（active 且 enabled 才转 paused）并回报是否生效。
export const mcodeAutomationPauseParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema.optional(), automationId: nonEmptyString })
  .strict();
export type McodeAutomationPauseProtocolParams = z.infer<typeof mcodeAutomationPauseParamsSchema>;
export const mcodeAutomationPauseResultSchema = z.object({ paused: z.boolean() }).strict();
export type McodeAutomationPauseProtocolResult = z.infer<typeof mcodeAutomationPauseResultSchema>;

// ---- Off-Peak（闲时任务）会话内创建协议----
// 与 automation 兄弟并列（独立域，禁止互相复用标记/表）。workspace 由 host 端从
// 当前 session 的已协商 workspace 注入。permissionMode 只开放产品
// 四档词表（D29-4）；缺省解析在 host 端（D49-4：yolo / allowed_models 末位 / 最高推理档）。
export const mcodeOffPeakPermissionModeSchema = z.enum([
  "build",
  "edit",
  "plan",
  "yolo",
  "guarded",
]);
export type McodeOffPeakProtocolPermissionMode = z.infer<typeof mcodeOffPeakPermissionModeSchema>;

export const mcodeOffPeakCreateParamsSchema = z
  .object({
    workspace: mcodeWorkspaceRefSchema.optional(),
    title: nonEmptyString,
    prompt: nonEmptyString,
    permissionMode: mcodeOffPeakPermissionModeSchema.optional(),
    model: nonEmptyString.optional(),
    thoughtLevel: nonEmptyString.optional(),
    // 会话内创建绑定当前会话（对齐 automation/create 的 targetTaskId），由 CLI 端口填入。
    boundSessionId: nonEmptyString.optional(),
  })
  .strict();
export type McodeOffPeakCreateProtocolParams = z.infer<typeof mcodeOffPeakCreateParamsSchema>;

// 协议侧任务快照：轮尾卡片与 OffPeakList 的最小字段面。
// 不暴露 serverTicketId（跨边界禁带）。
export const mcodeOffPeakTaskSnapshotSchema = z
  .object({
    offPeakTaskId: nonEmptyString,
    title: z.string(),
    status: z.enum(["queued", "paused", "running", "completed", "failed", "cancelled"]),
    queuePosition: z.number().int().positive().optional(),
    sessionId: nonEmptyString.optional(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();
export type McodeOffPeakTaskProtocolSnapshot = z.infer<typeof mcodeOffPeakTaskSnapshotSchema>;

// 失败分类跨协议保真（镜像 shared OffPeakTaskCreateResult 的判别联合，错误不降级为字符串）。
// model 白名单预校失败复用 client_validation 分类 + errorCode "model_not_allowed"，不扩分类枚举。
export const mcodeOffPeakCreateResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), task: mcodeOffPeakTaskSnapshotSchema }).strict(),
  z
    .object({
      ok: z.literal(false),
      failureStage: z.enum(["client_validation", "ticket_request", "local_persist"]),
      errorCategory: z.enum([
        "client_validation",
        "eligibility_3101",
        "quota_3103",
        "network",
        "invalid_response",
        "local_persist",
        "unknown",
      ]),
      errorCode: z.string(),
    })
    .strict(),
]);
export type McodeOffPeakCreateProtocolResult = z.infer<typeof mcodeOffPeakCreateResultSchema>;

export const mcodeOffPeakListParamsSchema = z
  .object({ workspace: mcodeWorkspaceRefSchema.optional() })
  .strict();
export type McodeOffPeakListProtocolParams = z.infer<typeof mcodeOffPeakListParamsSchema>;
export const mcodeOffPeakListResultSchema = z
  .object({ tasks: z.array(mcodeOffPeakTaskSnapshotSchema) })
  .strict();
export type McodeOffPeakListProtocolResult = z.infer<typeof mcodeOffPeakListResultSchema>;

// Session 运行实例生命周期；不同于 session/stop（停止生成）。
export const sessionLifecycleParamsSchema = z.object({ sessionId: z.string().min(1) }).strict();
export const sessionLifecycleStateSchema = z.enum([
  "unloaded",
  "starting",
  "ready",
  "stopping",
  "faulted",
]);
export const sessionLifecycleOperationSchema = z.enum(["ensureReady", "stop", "restart"]);
export const sessionLifecycleFailureSchema = z
  .object({
    operation: sessionLifecycleOperationSchema,
    code: z.string(),
    message: z.string(),
  })
  .strict();
export const sessionLifecycleSnapshotSchema = z
  .object({
    sessionId: z.string().min(1),
    state: sessionLifecycleStateSchema,
    generation: z.number().int().nonnegative().default(0),
    revision: z.number().int().nonnegative().default(0),
    lastError: sessionLifecycleFailureSchema.nullable(),
  })
  .strict();
export const sessionLifecycleResultSchema = z.object({ completed: z.literal(true) }).strict();
export type SessionLifecycleState = z.infer<typeof sessionLifecycleStateSchema>;
export type SessionLifecycleOperation = z.infer<typeof sessionLifecycleOperationSchema>;
export type SessionLifecycleFailure = z.infer<typeof sessionLifecycleFailureSchema>;
export type SessionLifecycleSnapshot = z.infer<typeof sessionLifecycleSnapshotSchema>;

export const mcodeProtocolMethods = {
  sessionLifecycleChanged: "session/lifecycle/changed",
  sessionLifecycleGetState: "session/lifecycle/getState",
  sessionLifecycleEnsureReady: "session/lifecycle/ensureReady",
  sessionLifecycleStop: "session/lifecycle/stop",
  sessionLifecycleRestart: "session/lifecycle/restart",
  runtimeCapabilities: "runtime/capabilities",
  computerUseOperationEvent: "computer-use/operation-event",
  sessionCreate: "session/create",
  sessionResume: "session/resume",
  sessionList: "session/list",
  sessionSubagents: "session/subagents",
  sessionRequestRuntimePreferences: "session/requestRuntimePreferences",
  subagentsReadRuntimeConfig: "subagents/readRuntimeConfig",
  sessionRead: "session/read",
  sessionMessages: "session/messages",
  sessionEvents: "session/events",
  sessionDebug: "session/debug",
  sessionSubscribe: "session/subscribe",
  // @deprecated（部分）：send 主路径已收敛 v4 sendText；仅剩 adapter 附件
  // 回退分支消费（v4 attachmentRef 上传/寄存命令面未建模），待附件命令面落地后移除。
  sessionSend: "session/send",
  // @deprecated：host 客户端方法已删（stop 已收敛 v4 stop 命令）。
  // wire case 留兼容（transport bypass 名单仍引用），随旧词整体删除时一并移除。
  sessionStop: "session/stop",
  // @deprecated：host 客户端方法已删（已收敛 v4 cancelBackgroundWork 命令）。
  // wire case 留兼容，随旧词整体删除时一并移除。
  sessionCancelBackgroundTask: "session/cancelBackgroundTask",
  // @deprecated：host 客户端方法已删（v4 forkAssistant 原生 handler 经
  // forkSessionAtMessage 钩子直调 server-operations.forkSession op）。wire case 与
  // fork params/result schema 保留＝op 存活面；fork record 归 v4 原生重写。
  sessionFork: "session/fork",
  sessionCompact: "session/compact",
  sessionGoal: "session/goal",
  sessionClose: "session/close",
  // setModel 仍被 zcodeSessionService 的 desktop 旧链路消费；replayable
  // switchModelConfig 已直接由目标 Environment Registry 解析 Selection。
  sessionSetModel: "session/setModel",
  // replayable facade 的思考深度/模式已收敛 v4 switchModelConfig/
  // switchCollaborationMode；剩余消费 = zcodeSessionService（desktop 旧链路，随
  // 桌面 v4 UI 收口清零）与 setMode 的 auto 值残留（v4 值域刻意排除 auto）。
  sessionSetThoughtLevel: "session/setThoughtLevel",
  sessionSetMode: "session/setMode",
  workspaceReadPresentation: "workspace/readPresentation",
  workspaceHookTrustGrant: "workspace/hooks/trustGrant",
  // 进程级 Account Provider Config 与 workspace 运行目录分离。
  providerUpdateAccountConfig: "provider/updateAccountConfig",
  providerRefreshRegistry: "provider/refreshRegistry",
  workspaceUpdateInteractionPreferences: "workspace/updateInteractionPreferences",
  workspaceUpdateModelIoPreferences: "workspace/updateModelIoPreferences",
  // Off-Peak 工具面门禁是 workspace 级事实（灰度 + 本地/远程），由 host 在 agent 就绪时同步；
  // CLI 对 legacy create/resume 与 v4 冷恢复统一读取。旧 CLI method-not-found → host 降级忽略。
  workspaceUpdateOffPeakToolPolicy: "workspace/updateOffPeakToolPolicy",
  // 动态工作流灰度门禁：同 Off-Peak 的同步模式。
  workspaceUpdateDynamicWorkflowPolicy: "workspace/updateDynamicWorkflowPolicy",
  // LLM 执行面在 CLI，直连不可行；消费仅 services 内部
  // （commit message），待 v4 workspace 查询/命令面覆盖后移除。
  workspaceGenerateText: "workspace/generateText",
  workspaceCancelGenerateText: "workspace/cancelGenerateText",
  providerTestModelConnectivity: "provider/testModelConnectivity",
  mcpList: "mcp/list",
  workspaceMcpTrust: "workspace/mcp/trust",
  mcpReadResource: "mcp/readResource",
  mcpUiOpenInstance: "mcp/uiOpenInstance",
  mcpUiCloseInstance: "mcp/uiCloseInstance",
  mcpUiValidateInstance: "mcp/uiValidateInstance",
  mcpUiSampling: "mcp/uiSampling",
  mcpUiCancelSampling: "mcp/uiCancelSampling",
  mcpUiCallTool: "mcp/uiCallTool",
  mcpUiCancelCall: "mcp/uiCancelCall",
  mcpUiReadResource: "mcp/uiReadResource",
  mcpUiListResources: "mcp/uiListResources",
  mcpUiListResourceTemplates: "mcp/uiListResourceTemplates",
  mcpUiSubscribeResource: "mcp/uiSubscribeResource",
  mcpUiUnsubscribeResource: "mcp/uiUnsubscribeResource",
  // App-Provided Tools：页面工具登记 / 注销，与模型调用的认领 / 回传（信箱投递走 v4 live 增量）。
  mcpUiRegisterAppTools: "mcp/uiRegisterAppTools",
  mcpUiUnregisterAppTools: "mcp/uiUnregisterAppTools",
  mcpUiClaimAppToolCall: "mcp/uiClaimAppToolCall",
  mcpUiResolveAppToolCall: "mcp/uiResolveAppToolCall",
  pluginsList: "plugins/list",
  pluginsReferenceCatalog: "plugins/referenceCatalog",
  pluginsListUiSurfaces: "plugins/listUiSurfaces",
  pluginsReferenceCatalogWithCategory: "plugins/referenceCatalogWithCategory",
  skillsReferenceCatalog: "skills/referenceCatalog",
  // 已保存工作流的 GUI 中枢：workspace 级、无会话。
  workflowsList: "workflows/list",
  workflowsGet: "workflows/get",
  workflowsUpdateMeta: "workflows/updateMeta",
  workflowsDelete: "workflows/delete",
  workflowsRuns: "workflows/runs",
  // 在项目档 / 全局档之间移动同名文件。
  workflowsMove: "workflows/move",
  // 完成卡的「直接保存」与「已保存」判定（docs/dynamic-workflow/transcript-and-notifications.md）：
  // 前者按 runId 从 journal 取脚本落盘，后者回答「这次 run 对应哪个已保存工作流」。
  workflowsSave: "workflows/save",
  workflowsForRun: "workflows/forRun",
  pluginsResolveSuggestedReference: "plugins/resolveSuggestedReference",
  pluginsSetEnabled: "plugins/setEnabled",
  pluginsOverview: "plugins/overview",
  pluginsMarketplaceAdd: "plugins/marketplace/add",
  pluginsMarketplaceRemove: "plugins/marketplace/remove",
  pluginsMarketplaceUpdate: "plugins/marketplace/update",
  pluginsInstall: "plugins/install",
  pluginsCancelOperation: "plugins/cancelOperation",
  pluginsUninstall: "plugins/uninstall",
  pluginsUpdate: "plugins/update",
  pluginsRestoreBuiltin: "plugins/restoreBuiltin",
  pluginsConfigure: "plugins/configure",
  pluginsResetConfig: "plugins/resetConfig",
  pluginsValidate: "plugins/validate",
  pluginsDescribe: "plugins/describe",
  automationCreate: "automation/create",
  topicResourceRead: "topic/resource/read",
  channelReply: "bot/channel/reply",
  topicResourceCancel: "topic/resource/cancel",
  automationUpdate: "automation/update",
  automationCheckTaskBinding: "automation/checkTaskBinding",
  automationList: "automation/list",
  automationDelete: "automation/delete",
  automationPause: "automation/pause",
  // Off-Peak 会话内创建：与 automation 兄弟并列的独立方法族。
  offPeakCreate: "offPeak/create",
  offPeakList: "offPeak/list",
  // @deprecated：host 消费已清零（zcodeAgentService 改走 v4/usage/stats）。
  // 仅剩 CLI server 的 wire 兼容 case；随旧词整体删除时一并移除。
  usageStats: "usage/stats",
  // Mcode Protocol 对 agent 只暴露 session-first 方法；task 是 UI 投影概念，不能泄露进协议方法名。
  // @deprecated：host 已改走 v4/conversation/usage；后续与 usage/stats 一并移除。
  sessionUsage: "session/usage",
  // 资源管理器：CLI 回报其 MCP 子进程 pid 与插件归属（纯内存，无 I/O），采样在 Host 侧完成。
  processChildProcesses: "process/childProcesses",
  processNetworkCapture: "process/networkCapture",
  interactionRequestPermission: "interaction/requestPermission",
  interactionRequestUserInput: "interaction/requestUserInput",
  interactionRequestProviderRuntimeHeaders: "interaction/requestProviderRuntimeHeaders",
  interactionRequestOfficialMcpAuthHeaders: "interaction/requestOfficialMcpAuthHeaders",
  // browser-use 反向请求由 agent 发起，host 转给 main 中的 CDP executor。
  interactionBrowserList: "interaction/browserList",
  interactionBrowserExecute: "interaction/browserExecute",
} as const;

export type McodeProtocolMethod = (typeof mcodeProtocolMethods)[keyof typeof mcodeProtocolMethods];

export const mcodeProtocolEmptyResultSchema = z.object({}).strict();

// 最新 V4 主链已不再依赖旧版全量方法表；这里仅保留仍被兼容测试和 browser broker
// 消费的最小契约集合，避免重新引入已移除的 legacy 方法。
export const mcodeProtocolSessionMethodContracts = {
  [mcodeProtocolMethods.mcpUiOpenInstance]: {
    params: mcodeMcpUiOpenInstanceParamsSchema,
    result: mcodeMcpUiOpenInstanceResultSchema,
  },
  [mcodeProtocolMethods.mcpUiCloseInstance]: {
    params: mcodeMcpUiCloseInstanceParamsSchema,
    result: mcodeMcpUiCloseInstanceResultSchema,
  },
  [mcodeProtocolMethods.mcpUiValidateInstance]: {
    params: mcodeMcpUiCloseInstanceParamsSchema,
    result: mcodeMcpUiResourceSubscriptionResultSchema,
  },
  [mcodeProtocolMethods.workspaceHookTrustGrant]: {
    params: mcodeWorkspaceHookTrustGrantParamsSchema,
    result: mcodeWorkspaceHookTrustGrantResultSchema,
  },
  [mcodeProtocolMethods.workspaceMcpTrust]: {
    params: mcodeWorkspaceMcpTrustParamsSchema,
    result: mcodeWorkspaceMcpTrustResultSchema,
  },
  [mcodeProtocolMethods.mcpList]: {
    params: mcodeMcpListParamsSchema,
    result: mcodeMcpListResultSchema,
  },
  [mcodeProtocolMethods.mcpReadResource]: {
    params: mcodeMcpReadResourceParamsSchema,
    result: mcodeMcpReadResourceResultSchema,
  },
  [mcodeProtocolMethods.mcpUiSampling]: {
    params: mcodeMcpUiSamplingParamsSchema,
    result: mcodeMcpUiSamplingResultSchema,
  },
  [mcodeProtocolMethods.mcpUiCancelSampling]: {
    params: mcodeMcpUiCancelSamplingParamsSchema,
    result: mcodeMcpUiCancelCallResultSchema,
  },
  [mcodeProtocolMethods.mcpUiCallTool]: {
    params: mcodeMcpUiCallToolParamsSchema,
    result: mcodeMcpUiCallToolResultSchema,
  },
  [mcodeProtocolMethods.mcpUiCancelCall]: {
    params: mcodeMcpUiCancelCallParamsSchema,
    result: mcodeMcpUiCancelCallResultSchema,
  },
  [mcodeProtocolMethods.mcpUiReadResource]: {
    params: mcodeMcpUiReadResourceParamsSchema,
    result: mcodeMcpUiReadResourceResultSchema,
  },
  [mcodeProtocolMethods.mcpUiListResources]: {
    params: mcodeMcpUiListResourcesParamsSchema,
    result: mcodeMcpUiListResourcesResultSchema,
  },
  [mcodeProtocolMethods.mcpUiListResourceTemplates]: {
    params: mcodeMcpUiListResourcesParamsSchema,
    result: mcodeMcpUiListResourceTemplatesResultSchema,
  },
  [mcodeProtocolMethods.mcpUiSubscribeResource]: {
    params: mcodeMcpUiResourceSubscriptionParamsSchema,
    result: mcodeMcpUiResourceSubscriptionResultSchema,
  },
  [mcodeProtocolMethods.mcpUiUnsubscribeResource]: {
    params: mcodeMcpUiResourceSubscriptionParamsSchema,
    result: mcodeMcpUiResourceSubscriptionResultSchema,
  },
  [mcodeProtocolMethods.mcpUiRegisterAppTools]: {
    params: mcodeMcpUiRegisterAppToolsParamsSchema,
    result: mcodeMcpUiRegisterAppToolsResultSchema,
  },
  [mcodeProtocolMethods.mcpUiUnregisterAppTools]: {
    params: mcodeMcpUiUnregisterAppToolsParamsSchema,
    result: mcodeMcpUiUnregisterAppToolsResultSchema,
  },
  [mcodeProtocolMethods.mcpUiClaimAppToolCall]: {
    params: mcodeMcpUiClaimAppToolCallParamsSchema,
    result: mcodeMcpUiAppToolAcceptedResultSchema,
  },
  [mcodeProtocolMethods.mcpUiResolveAppToolCall]: {
    params: mcodeMcpUiResolveAppToolCallParamsSchema,
    result: mcodeMcpUiAppToolAcceptedResultSchema,
  },
  [mcodeProtocolMethods.interactionBrowserList]: {
    params: mcodeBrowserListParamsSchema,
    result: mcodeBrowserListResultSchema,
  },
  [mcodeProtocolMethods.interactionBrowserExecute]: {
    params: mcodeBrowserExecuteParamsSchema,
    result: mcodeBrowserExecuteResultSchema,
  },
} as const satisfies Partial<
  Record<McodeProtocolMethod, { params: z.ZodTypeAny; result: z.ZodTypeAny }>
>;

export type McodeProtocolSessionMethodContract =
  (typeof mcodeProtocolSessionMethodContracts)[keyof typeof mcodeProtocolSessionMethodContracts];

// 启动入口的独立存储命令与严格结果 schema，和 CLI 共用一份契约。
export {
  STORAGE_MIGRATION_COMMAND,
  storageMigrationReportSchema,
} from "../sqlite-migrations/contract.js";

/** 仅存储准备子进程的私有控制帧，原始路径不进入业务事件或遥测。 */
export const mcodeStoragePreparationFrameSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("startup/storagePath"),
      params: z.object({ path: z.string().min(1).max(32768) }).strict(),
    })
    .strict(),
  z
    .object({ method: z.literal("startup/storagePrepared"), params: z.object({}).strict() })
    .strict(),
  z
    .object({ method: z.literal("startup/storageState"), params: mcodeStorageStartupStateSchema })
    .strict(),
]);
export const mcodeStoragePathReadySchema = z
  .object({ method: z.literal("startup/storagePathReady"), reuse: z.boolean().optional() })
  .strict();

// 桌面本地 TTFT 的严格事实合同；检查点不能替代实际内容帧。
export { localTtftFactsSchema } from "../local-ttft/contract.js";
// 群来源由可信 Host 注入，V4 命令与持久化输入使用相同运行时校验。
export {
  botIdentitySchema,
  botTopicInputMessageSchema,
  botGroupInputSourceSchema,
  type BotGroupInputSource,
} from "../bots.js";
export {
  botTopicContextSchema,
  botTopicMessageSchema,
  type BotTopicHistoryBatch,
  type BotTopicMessage,
} from "../bots.js";
