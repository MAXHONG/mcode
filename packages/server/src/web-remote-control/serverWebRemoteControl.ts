/**
 * 无界面 Linux Web 版的手机扫码远控（经 z.ai relay）。
 *
 * 与桌面版共用同一个 WebRemoteControlManager：它负责 relay 设备注册、二维码、配对、
 * workspace bridge 与可靠传输。桌面版的 "host 进程" 由 Electron utility process 提供；
 * 这里直接在 server 进程内用 MessageChannel 把 bridge 接到本进程的 ServiceCollection，
 * 并按 `web-remote-replayable` 客户端模式暴露服务（与普通 `/ws` 浏览器客户端同权限）。
 */
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { basename } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import {
  ChannelServer,
  MessagePortProtocol,
  type MessagePortLike,
  type MessagePortPayload,
} from "@mcode/rpc";
import {
  ICredentialService,
  IMcodeAgentService,
  IMcodeTaskService,
  IProviderProvisioningTargetService,
  ISettingService,
  createMcodeAgentConnectionScope,
  type ServiceCollection,
} from "@mcode/services";
import { ensureTelemetryDeviceMid } from "@mcode/services/node";
import {
  DEFAULT_MCODE_ENDPOINT_ORIGIN,
  MCODE_REMOTE_UPSTREAM_VERSION,
  MCODE_VERSION,
  buildMcodeEndpointUrls,
  normalizeWebRemoteControlRelayProvider,
  resolveWebRemoteControlRelayEndpoints,
  type WebRemoteControlRelayProvider,
  type McodeTaskMeta,
  type WebRemoteControlContext,
  type WebRemoteControlStartResult,
  type WebRemoteControlStatus,
  type WebRemoteControlTaskTarget,
  type WebRemoteControlWorkspaceTarget,
} from "@mcode/shared";
import { createWebRemoteControlFeatureGate } from "./webRemoteControlFeatureGate.js";
import {
  createWebRemoteControlManager,
  type WebRemoteControlHostAttachmentHandle,
  type WebRemoteControlHostPort,
} from "./webRemoteControlManager.js";
import { createNodeWebRemoteControlRelayAuthProvider } from "./webRemoteControlRelayAuthProvider.js";
import { createWebRemoteControlRelayAuthStorageProvider } from "./webRemoteControlRelayAuthStorageProvider.js";

/** server 只有一个“窗口”：固定 windowId。 */
const SERVER_WINDOW_ID = 1;
const TASK_SYNC_INTERVAL_MS = 5_000;

type Logger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export interface ServerWebRemoteControl {
  start(options?: { initialTaskId?: string }): Promise<WebRemoteControlStartResult>;
  resetPairing(): Promise<WebRemoteControlStartResult>;
  stop(): Promise<void>;
  getStatus(): WebRemoteControlStatus;
  dispose(): Promise<void>;
}

function wrapNodePort(port: MessagePort): MessagePortLike {
  return {
    addEventListener(_type, listener) {
      port.on("message", (data) => listener({ data }));
    },
    removeEventListener() {
      // MessagePortProtocol 只在 disconnect 时移除监听；随后整个端口会被 close。
    },
    postMessage(data) {
      port.postMessage(data);
    },
    start() {
      port.start();
    },
    close() {
      port.close();
    },
  };
}

/** 把 node:worker_threads 的 MessagePort 适配成 manager 期望的 Electron 风格端口。 */
function adaptHostPort(port: MessagePort): WebRemoteControlHostPort {
  type Listener = (event: { data: MessagePortPayload }) => void;
  const listeners = new Map<Listener, (data: MessagePortPayload) => void>();
  return {
    on(_event, listener: Listener) {
      const wrapped = (data: MessagePortPayload) => listener({ data });
      listeners.set(listener, wrapped);
      port.on("message", wrapped);
      return this;
    },
    off(_event, listener: Listener) {
      const wrapped = listeners.get(listener);
      if (wrapped) port.off("message", wrapped);
      listeners.delete(listener);
      return this;
    },
    postMessage(data) {
      port.postMessage(data);
    },
    start() {
      port.start();
    },
    close() {
      port.close();
    },
  };
}

function toTaskTarget(
  task: McodeTaskMeta,
  workspaceLabel: string,
): WebRemoteControlTaskTarget {
  return {
    taskId: task.taskId,
    title: task.title,
    workspacePath: task.workspacePath,
    ...(task.workspaceIdentity ? { workspaceIdentity: task.workspaceIdentity } : {}),
    workspaceLabel,
    workspaceKind: "local",
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    ...(task.provider ? { provider: task.provider } : {}),
    ...(typeof task.unreadAt === "number" ? { unreadAt: task.unreadAt } : {}),
  };
}

export async function createServerWebRemoteControl(options: {
  services: ServiceCollection;
  workspacePath: string;
  logger: Logger;
}): Promise<ServerWebRemoteControl> {
  const { services, workspacePath, logger } = options;
  const settingService = services.get(ISettingService);
  const credentialService = services.get(ICredentialService);
  const taskService = services.getOptional(IMcodeTaskService);
  const agentService = services.getOptional(IMcodeAgentService);
  const deviceMid = (await ensureTelemetryDeviceMid().catch(() => undefined)) ?? randomUUID();
  // 手机页面托管在 zcode.z.ai，按 app_version 选择 /remote/v4/<版本>/ 资源；必须用对齐的上游版本。
  const appVersion = MCODE_REMOTE_UPSTREAM_VERSION || MCODE_VERSION;
  const relayWsOverride = process.env["MCODE_WEB_REMOTE_CONTROL_RELAY_WS_URL"]?.trim();
  const remoteUrlOverride = process.env["MCODE_WEB_REMOTE_CONTROL_URL"]?.trim();
  const endpointUrls = buildMcodeEndpointUrls(DEFAULT_MCODE_ENDPOINT_ORIGIN, { appVersion });
  const workspaceLabel = basename(workspacePath) || workspacePath;

  const attachments = new Map<string, { port: MessagePort; dispose: () => void }>();
  let nextAttachmentId = 0;

  function attachLocalServices(): WebRemoteControlHostAttachmentHandle {
    const { port1, port2 } = new MessageChannel();
    const attachmentId = `server-web-remote-attachment-${++nextAttachmentId}`;
    const protocol = new MessagePortProtocol(wrapNodePort(port2));
    const channelServer = new ChannelServer(protocol, "server");
    const connectionScope = agentService
      ? createMcodeAgentConnectionScope(agentService, {
          connectionId: `server-web-remote-${randomUUID()}`,
          clientMode: "web-remote-replayable",
          role: "terminal-client",
        })
      : undefined;
    const overrides = new Map<string, unknown>();
    if (connectionScope) overrides.set(IMcodeAgentService.channelName, connectionScope.service);
    if (services.getOptional(IProviderProvisioningTargetService)) {
      overrides.set(IProviderProvisioningTargetService.channelName, {
        apply: async () => {
          throw new Error("Provider Provisioning 仅支持受信 Desktop Host");
        },
      });
    }
    services.exposeOnChannelServer(channelServer, overrides);
    attachments.set(attachmentId, {
      port: port2,
      dispose: () => {
        protocol.disconnect();
        void connectionScope?.dispose();
        channelServer.dispose();
        port2.close();
      },
    });
    return {
      entryId: "server-host",
      attachmentId,
      port: adaptHostPort(port1),
    };
  }

  function releaseAttachment(attachmentId: string): void {
    const attachment = attachments.get(attachmentId);
    if (!attachment) return;
    attachments.delete(attachmentId);
    try {
      attachment.dispose();
    } catch (error) {
      logger.warn("[web-remote-control] failed to release attachment", { attachmentId, error });
    }
  }

  const workspaceTarget: WebRemoteControlWorkspaceTarget = {
    workspacePath,
    label: workspaceLabel,
    kind: "local",
    connectionState: "connected",
  };

  // Mcode：默认走自建中转 remote.hjh.im；设置 webRemoteControlRelayProvider=zai 或环境变量
  // MCODE_WEB_REMOTE_CONTROL_RELAY=zai 切回 z.ai 官方 relay（备用）。环境变量优先。
  const resolveRelayProvider = async (): Promise<WebRemoteControlRelayProvider> => {
    const envProvider = process.env["MCODE_WEB_REMOTE_CONTROL_RELAY"]?.trim();
    if (envProvider) return normalizeWebRemoteControlRelayProvider(envProvider);
    try {
      return normalizeWebRemoteControlRelayProvider(
        (await settingService.get()).webRemoteControlRelayProvider,
      );
    } catch {
      return normalizeWebRemoteControlRelayProvider(undefined);
    }
  };
  const resolveRelayEndpoints = (provider: unknown) =>
    resolveWebRemoteControlRelayEndpoints({
      provider,
      endpointOrigin: endpointUrls.origin,
      officialRemoteUrl: endpointUrls.remoteUrl,
      relayWsOverride,
      remoteUrlOverride,
    });
  const defaultRelayEndpoints = resolveRelayEndpoints(await resolveRelayProvider());

  const manager = createWebRemoteControlManager({
    getEndpointUrls: async () => {
      const relay = resolveRelayEndpoints(await resolveRelayProvider());
      return { ...endpointUrls, relayWsUrl: relay.relayWsUrl, remoteUrl: relay.remoteUrl };
    },
    relayWsUrl: defaultRelayEndpoints.relayWsUrl,
    mobileRemoteControlUrl: defaultRelayEndpoints.remoteUrl,
    deviceMid,
    deviceName: process.env["MCODE_SERVER_NAME"]?.trim() || hostname(),
    appVersion,
    authProvider: createNodeWebRemoteControlRelayAuthProvider(),
    authStorageProvider: createWebRemoteControlRelayAuthStorageProvider({
      scope: resolveRelayProvider,
      credentialService,
      loadSettings: () => settingService.get(),
      patchSettings: (patch) => settingService.update(patch),
      logger,
    }),
    startupRestoreStorageProvider: {
      load: async () => (await settingService.get()).webRemoteControlLastEnabledContext,
      save: async (context) => {
        await settingService.update({
          webRemoteControlLastEnabledContext: {
            workspacePath: context.workspacePath,
            workspaceIdentity: context.workspaceIdentity,
            initialTaskId: context.initialTaskId,
          },
        });
      },
      clear: async () => {
        await settingService.update({ webRemoteControlLastEnabledContext: undefined });
      },
    },
    featureGate: createWebRemoteControlFeatureGate(),
    logger,
    platformHandlers: {
      isDockerAvailable: async () => false,
      listWSLDistros: async () => [],
      listDockerContainers: async () => [],
      listSSHConfigAliases: async () => [],
      createTempTextAttachment: async () => {
        throw new Error("Temporary text attachments are not supported on the Linux Web server");
      },
      loadMcpFromUserDirectory: async () => {
        throw new Error("Not supported on the Linux Web server");
      },
      saveMcpToUserDirectory: async () => ({
        success: false,
        error: "Not supported on the Linux Web server",
      }),
      migrateLegacyCommonMcp: async () => {
        throw new Error("Not supported on the Linux Web server");
      },
    },
    // server 只有本地工作区，没有需要重连的远程 workspace。
    reconnectWorkspace: async () => {},
    attachWorkspaceHost: async (_windowId, context) => {
      if (context.kind !== "local") {
        throw Object.assign(new Error("Linux Web 版只支持本地工作区"), {
          code: "REMOTE_SESSION_MISSING",
        });
      }
      return attachLocalServices();
    },
    releaseWorkspaceHostAttachment: releaseAttachment,
    disposeWorkspaceHostAttachmentsForWindow: () => {
      for (const id of Array.from(attachments.keys())) releaseAttachment(id);
    },
    disposeWorkspaceHostAttachmentsForRemoteSession: () => {},
  });

  let taskSyncTimer: ReturnType<typeof setInterval> | undefined;

  async function syncTasks(): Promise<void> {
    if (!taskService) return;
    try {
      const tasks = await taskService.listTasks({ workspacePath });
      manager.syncAvailableTasks(
        SERVER_WINDOW_ID,
        tasks.map((task) => toTaskTarget(task, workspaceLabel)),
      );
    } catch (error) {
      logger.warn("[web-remote-control] task snapshot sync failed", { error });
    }
  }

  function startSync(): void {
    manager.syncAvailableWorkspaces(SERVER_WINDOW_ID, [workspaceTarget]);
    void syncTasks();
    if (!taskSyncTimer) {
      taskSyncTimer = setInterval(() => void syncTasks(), TASK_SYNC_INTERVAL_MS);
      taskSyncTimer.unref?.();
    }
  }

  function stopSync(): void {
    if (taskSyncTimer) clearInterval(taskSyncTimer);
    taskSyncTimer = undefined;
  }

  const context = (initialTaskId?: string): WebRemoteControlContext => ({
    workspacePath,
    ...(initialTaskId ? { initialTaskId } : {}),
  });

  const api: ServerWebRemoteControl = {
    async start(startOptions) {
      const result = await manager.start(SERVER_WINDOW_ID, context(startOptions?.initialTaskId));
      startSync();
      return result;
    },
    async resetPairing() {
      const result = await manager.resetPairing(SERVER_WINDOW_ID, context());
      startSync();
      return result;
    },
    async stop() {
      stopSync();
      await manager.stop(SERVER_WINDOW_ID);
    },
    getStatus() {
      return manager.getStatus(SERVER_WINDOW_ID);
    },
    async dispose() {
      stopSync();
      await manager.disposeWindow(SERVER_WINDOW_ID);
    },
  };

  // 上次开启过远控的服务重启后自动恢复，与桌面版行为一致。
  void manager
    .restorePreviouslyEnabled(SERVER_WINDOW_ID, [context()])
    .then((restored) => {
      if (restored) {
        logger.info("[web-remote-control] restored previously enabled remote control");
        startSync();
      }
    })
    .catch(() => {});

  return api;
}
