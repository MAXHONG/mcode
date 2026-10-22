import type {
  BotConfig,
  BotProviderCallbackResult,
  BotsConfigFile,
} from "@mcode/shared";
import type { ICredentialService } from "../credential/credential.js";
import {
  DINGTALK_BOT_MESSAGE_TOPIC,
  getDingTalkClientId,
  openDingTalkStreamConnection,
} from "./providers/dingtalkProvider.js";
import {
  acquireDingTalkStreamLock,
  BOT_RUNTIME_LOCK_RETRY_MS,
  createBotConnectionFingerprint,
  createLatestRuntimeRefreshQueue,
  type BotRuntimeLogger,
  type BotRuntimeStatusSink,
  waitFor,
} from "./channelRuntime.js";

/** 钉钉服务端约每 20 秒 ping 一次；超过该时长没有任何下行帧视为连接僵死，主动重连。 */
const DINGTALK_STREAM_IDLE_TIMEOUT_MS = 90_000;
const DINGTALK_STREAM_RETRY_BASE_MS = 2_000;
const DINGTALK_STREAM_RETRY_MAX_MS = 60_000;

/** 运行时只依赖 WHATWG WebSocket 的最小子集，便于测试替身注入。 */
export interface DingTalkStreamSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  addEventListener(type: "close", listener: (event: { code?: number; reason?: string }) => void): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
}

export type DingTalkStreamSocketFactory = (url: string) => DingTalkStreamSocket;

interface DingTalkStreamFrame {
  type?: string;
  headers?: Record<string, unknown>;
  data?: unknown;
}

interface DingTalkChannelRuntimeDeps {
  runBackgroundTasks?: boolean;
  credentialService: ICredentialService;
  logger: BotRuntimeLogger;
  statusSink: BotRuntimeStatusSink;
  ensureBotStorageMigrated(): Promise<void>;
  readConfig(): Promise<BotsConfigFile>;
  processProviderCallback(
    provider: "dingtalk",
    payload: unknown,
  ): Promise<BotProviderCallbackResult>;
  openConnection?: typeof openDingTalkStreamConnection;
  createSocket?: DingTalkStreamSocketFactory;
  acquireStreamLock?: typeof acquireDingTalkStreamLock;
  idleTimeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultCreateSocket(url: string): DingTalkStreamSocket {
  const WebSocketCtor = (globalThis as { WebSocket?: new (url: string) => DingTalkStreamSocket })
    .WebSocket;
  if (!WebSocketCtor) {
    throw new Error("WebSocket is not available in this runtime.");
  }
  return new WebSocketCtor(url);
}

function decodeFrameData(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }
  return null;
}

function buildAck(messageId: string, data: string): string {
  return JSON.stringify({
    code: 200,
    headers: { contentType: "application/json", messageId },
    message: "OK",
    data,
  });
}

export function isDingTalkBotRunnable(bot: BotConfig): boolean {
  return (
    bot.provider === "dingtalk" &&
    bot.enabled &&
    Boolean(bot.credentialRef) &&
    Boolean(getDingTalkClientId(bot))
  );
}

export function createDingTalkChannelRuntime(deps: DingTalkChannelRuntimeDeps) {
  interface RuntimeEntry {
    controller: AbortController;
    fingerprint: string;
    done: Promise<void>;
  }

  const runtimes = new Map<string, RuntimeEntry>();
  const refreshQueue = createLatestRuntimeRefreshQueue();
  const createSocket = deps.createSocket ?? defaultCreateSocket;
  const idleTimeoutMs = deps.idleTimeoutMs ?? DINGTALK_STREAM_IDLE_TIMEOUT_MS;

  async function getConnectionFingerprint(bot: BotConfig): Promise<string> {
    const credential = bot.credentialRef
      ? await deps.credentialService.load(bot.credentialRef)
      : null;
    return createBotConnectionFingerprint([
      bot.provider,
      getDingTalkClientId(bot),
      bot.credentialRef ?? "",
      credential ?? "",
    ]);
  }

  function setStatus(
    bot: BotConfig,
    status: "connected" | "idle" | "error" | "disabled",
    messageId: string,
    message: string,
  ): void {
    deps.statusSink.setRuntimeStatus({
      botId: bot.id,
      provider: "dingtalk",
      status,
      messageId,
      message,
    });
  }

  /**
   * 处理单条机器人消息回调。机器人消息是 fire-and-forget，ACK 只用于诊断，
   * 因此先 ACK 再串行进入业务队列，避免长任务阻塞 ping 响应导致服务端断连。
   */
  function createMessageQueue(bot: BotConfig, signal: AbortSignal) {
    let queue: Promise<void> = Promise.resolve();
    return (data: unknown) => {
      queue = queue
        .then(async () => {
          if (signal.aborted) return;
          const message = typeof data === "string" ? (JSON.parse(data) as unknown) : data;
          const result = await deps.processProviderCallback("dingtalk", {
            botId: bot.id,
            message,
          });
          if (!result.ok) {
            deps.logger.warn(
              undefined,
              `dingtalk callback failed bot=${bot.id} status=${result.status ?? "unknown"}`,
            );
          }
        })
        .catch((error: unknown) => {
          deps.logger.warn(
            undefined,
            `dingtalk message handling failed bot=${bot.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    };
  }

  /** 建立一条 Stream 连接并运行到断开；正常断开（服务端轮换）返回 true。 */
  async function runConnection(bot: BotConfig, signal: AbortSignal): Promise<boolean> {
    const { url } = await (deps.openConnection ?? openDingTalkStreamConnection)({
      bot,
      deps: { loadCredential: (key) => deps.credentialService.load(key) },
      signal,
    });
    if (signal.aborted) return true;
    const enqueueMessage = createMessageQueue(bot, signal);
    return await new Promise<boolean>((resolve, reject) => {
      let settled = false;
      let opened = false;
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const socket = createSocket(url);
      const finish = (error?: Error, graceful = false) => {
        if (settled) return;
        settled = true;
        if (idleTimer) clearTimeout(idleTimer);
        signal.removeEventListener("abort", onAbort);
        try {
          socket.close();
        } catch {
          // 已关闭的 socket 再 close 只会抛状态错误，可以忽略。
        }
        if (error) reject(error);
        else resolve(graceful);
      };
      const armIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          finish(new Error("DingTalk Stream connection is idle; reconnecting."));
        }, idleTimeoutMs);
      };
      const onAbort = () => finish(undefined, true);
      signal.addEventListener("abort", onAbort, { once: true });

      socket.addEventListener("open", () => {
        opened = true;
        armIdleTimer();
        setStatus(bot, "connected", "bots.runtime.dingtalkStreamRunning", "DingTalk Stream is running.");
      });
      socket.addEventListener("message", (event) => {
        armIdleTimer();
        const raw = decodeFrameData(event.data);
        if (!raw) return;
        let frame: DingTalkStreamFrame;
        try {
          frame = JSON.parse(raw) as DingTalkStreamFrame;
        } catch {
          return;
        }
        const headers = isRecord(frame.headers) ? frame.headers : {};
        const topic = typeof headers.topic === "string" ? headers.topic : "";
        const messageId = typeof headers.messageId === "string" ? headers.messageId : "";
        const data = typeof frame.data === "string" ? frame.data : "";
        if (frame.type === "SYSTEM") {
          if (topic === "ping" && messageId) {
            socket.send(buildAck(messageId, data || "{}"));
          } else if (topic === "disconnect") {
            // 服务端定期轮换连接，静默 10 秒后断开；立即重建连接即可无缝衔接。
            finish(undefined, true);
          }
          return;
        }
        if (frame.type === "CALLBACK" && topic === DINGTALK_BOT_MESSAGE_TOPIC) {
          if (messageId) socket.send(buildAck(messageId, JSON.stringify({ response: null })));
          enqueueMessage(data);
          return;
        }
        if (messageId) {
          // 未订阅的事件也回 ACK，避免服务端按超时重推。
          socket.send(buildAck(messageId, JSON.stringify({ status: "SUCCESS", message: "ignored" })));
        }
      });
      socket.addEventListener("close", (event) => {
        finish(
          opened
            ? undefined
            : new Error(
                `DingTalk Stream closed before open${event.code ? ` (code=${event.code})` : ""}.`,
              ),
          opened,
        );
      });
      socket.addEventListener("error", () => {
        finish(new Error("DingTalk Stream WebSocket error."));
      });
    });
  }

  async function runBot(bot: BotConfig, signal: AbortSignal): Promise<void> {
    let failures = 0;
    while (!signal.aborted) {
      let lock: Awaited<ReturnType<typeof acquireDingTalkStreamLock>>;
      try {
        lock = await (deps.acquireStreamLock ?? acquireDingTalkStreamLock)(bot);
      } catch (error) {
        if (signal.aborted) return;
        setStatus(
          bot,
          "error",
          "bots.runtime.dingtalkStreamFailed",
          `DingTalk Stream lock failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        await waitFor(5_000, signal);
        continue;
      }
      if (!lock) {
        setStatus(
          bot,
          "idle",
          "bots.runtime.dingtalkStreamHandledElsewhere",
          "DingTalk Stream is handled by another Mcode window.",
        );
        await waitFor(BOT_RUNTIME_LOCK_RETRY_MS, signal);
        continue;
      }
      try {
        // 持锁期间连续重连：服务端轮换（graceful）立即重连，异常按指数退避。
        while (!signal.aborted) {
          try {
            setStatus(
              bot,
              "connected",
              "bots.runtime.dingtalkStreamConnecting",
              "DingTalk Stream is connecting.",
            );
            await runConnection(bot, signal);
            failures = 0;
          } catch (error) {
            if (signal.aborted) return;
            failures += 1;
            const message = error instanceof Error ? error.message : String(error);
            deps.logger.warn(undefined, `dingtalk stream failed bot=${bot.id}: ${message}`);
            deps.statusSink.setRuntimeStatus({
              botId: bot.id,
              provider: "dingtalk",
              status: "error",
              message: `DingTalk Stream failed: ${message}`,
            });
            await waitFor(
              Math.min(
                DINGTALK_STREAM_RETRY_BASE_MS * 2 ** Math.min(failures - 1, 6),
                DINGTALK_STREAM_RETRY_MAX_MS,
              ),
              signal,
            );
          }
        }
      } finally {
        await lock.release().catch((error: unknown) => {
          deps.logger.debug(
            undefined,
            `release DingTalk Stream lock failed bot=${bot.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
    }
  }

  async function stopStream(botId: string): Promise<void> {
    const runtime = runtimes.get(botId);
    runtime?.controller.abort();
    if (runtime) {
      await runtime.done;
      if (runtimes.get(botId) === runtime) runtimes.delete(botId);
    }
    const previous = deps.statusSink.getRuntimeStatus(botId);
    if (previous) {
      deps.statusSink.setRuntimeStatus({
        ...previous,
        status: "idle",
        messageId: "bots.runtime.dingtalkStreamStopped",
        message: "DingTalk Stream is stopped.",
      });
    }
  }

  function startStream(bot: BotConfig, fingerprint: string): void {
    if (runtimes.has(bot.id)) return;
    const controller = new AbortController();
    setStatus(bot, "connected", "bots.runtime.dingtalkStreamStarting", "DingTalk Stream is starting.");
    const runtime: RuntimeEntry = { controller, fingerprint, done: Promise.resolve() };
    runtime.done = runBot(bot, controller.signal).finally(() => {
      if (runtimes.get(bot.id) === runtime) {
        runtimes.delete(bot.id);
      }
    });
    runtimes.set(bot.id, runtime);
  }

  async function reconcile(
    config: BotsConfigFile | undefined,
    isLatest: () => boolean,
  ): Promise<void> {
    await deps.ensureBotStorageMigrated();
    const currentConfig = config ?? (await deps.readConfig());
    if (!isLatest()) return;
    const activeIds = new Set(
      currentConfig.bots.filter(isDingTalkBotRunnable).map((bot) => bot.id),
    );
    for (const botId of runtimes.keys()) {
      if (!activeIds.has(botId)) {
        await stopStream(botId);
        if (!isLatest()) return;
      }
    }
    for (const bot of currentConfig.bots) {
      if (isDingTalkBotRunnable(bot)) {
        const fingerprint = await getConnectionFingerprint(bot);
        if (!isLatest()) return;
        const runtime = runtimes.get(bot.id);
        if (runtime && runtime.fingerprint !== fingerprint) {
          // 凭据变化后旧连接仍以旧应用身份在线，必须先完整退出再以新凭据接管。
          await stopStream(bot.id);
          if (!isLatest()) return;
        }
        startStream(bot, fingerprint);
      } else if (bot.provider === "dingtalk" && !bot.enabled) {
        setStatus(bot, "disabled", "bots.runtime.botDisabled", "Bot is disabled.");
      }
    }
  }

  function refresh(config?: BotsConfigFile): Promise<void> {
    return refreshQueue.enqueue((isLatest) => reconcile(config, isLatest));
  }

  function scheduleRefresh(config?: BotsConfigFile): void {
    if (deps.runBackgroundTasks === false) {
      // 与其他 channel 一致：后台长连接只属于本地桌面 host，attached remote 不抢跑。
      return;
    }
    void refresh(config).catch((error: unknown) => {
      deps.logger.warn(
        undefined,
        `refresh DingTalk Stream failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  async function dispose(): Promise<void> {
    refreshQueue.invalidate();
    const active = [...runtimes.values()];
    for (const runtime of active) runtime.controller.abort();
    await Promise.allSettled(active.map((runtime) => runtime.done));
    for (const [botId, runtime] of runtimes) {
      if (active.includes(runtime)) runtimes.delete(botId);
    }
  }

  return { dispose, refresh, scheduleRefresh, stopStream };
}
