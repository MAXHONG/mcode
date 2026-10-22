/* eslint-disable max-lines -- 钉钉 provider 集中处理 Stream 网关、入站解析、OpenAPI 发送和附件下载。 */
import type {
  BotConfig,
  BotInboundAttachment,
  BotInboundMessage,
  BotOutboundMessage,
} from "@mcode/shared";
import type { BotProviderAdapter } from "./types.js";
import { fetchBotProviderJson } from "#src/bots/providers/providerRequest.js";

/**
 * 钉钉企业内部应用机器人（Stream 模式）。
 *
 * - 入站：通过 Stream 网关建立 WebSocket 长连接订阅 `/v1.0/im/bot/messages/get`，
 *   桌面端无需公网回调地址。
 * - 出站：单聊走 `/v1.0/robot/oToMessages/batchSend`，群聊回复走入站消息携带的 sessionWebhook。
 * - 凭据：Client ID(AppKey) 明文保存在 `dingtalkClientId`，Client Secret 只进 CredentialService。
 */
export const DINGTALK_API_BASE_URL = "https://api.dingtalk.com";
export const DINGTALK_BOT_MESSAGE_TOPIC = "/v1.0/im/bot/messages/get";
const DINGTALK_GATEWAY_PATH = "/v1.0/gateway/connections/open";
const DINGTALK_ACCESS_TOKEN_PATH = "/v1.0/oauth2/accessToken";
const DINGTALK_PRIVATE_SEND_PATH = "/v1.0/robot/oToMessages/batchSend";
const DINGTALK_GROUP_SEND_PATH = "/v1.0/robot/groupMessages/send";
const DINGTALK_FILE_DOWNLOAD_PATH = "/v1.0/robot/messageFiles/download";
const DINGTALK_ACCESS_TOKEN_REFRESH_MARGIN_MS = 5 * 60_000;
/** 钉钉 markdown 消息正文上限约 5000 字，预留标题和换行转换的余量。 */
const DINGTALK_MARKDOWN_CHUNK_LIMIT = 3_500;
const DINGTALK_SESSION_WEBHOOK_HOST = /^https:\/\/(?:oapi|api)\.dingtalk\.com\//u;
export const DINGTALK_STREAM_UA = "mcode-dingtalk-stream/1.0";

export interface DingTalkProviderDeps {
  loadCredential(key: string): Promise<string | null>;
  now?: () => number;
}

interface DingTalkAccessTokenCacheEntry {
  token: string;
  expiresAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown> | null | undefined, key: string): string {
  const value = record?.[key];
  if (typeof value === "string") return value;
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function readDingTalkError(payload: unknown, status: number): string {
  const record = isRecord(payload) ? payload : null;
  const code = readString(record, "code") || readString(record, "errcode");
  const message = readString(record, "message") || readString(record, "errmsg");
  return [code, message].filter(Boolean).join(": ") || `HTTP ${status}`;
}

export function getDingTalkClientId(bot: Pick<BotConfig, "dingtalkClientId">): string {
  return bot.dingtalkClientId?.trim() ?? "";
}

async function loadDingTalkClientSecret(
  bot: BotConfig,
  deps: Pick<DingTalkProviderDeps, "loadCredential">,
): Promise<string> {
  const secret = bot.credentialRef ? await deps.loadCredential(bot.credentialRef) : null;
  return secret?.trim() ?? "";
}

/**
 * 申请 Stream 网关连接票据。票据一次性使用，每次（重）连都需要重新申请。
 */
export async function openDingTalkStreamConnection(params: {
  bot: BotConfig;
  deps: Pick<DingTalkProviderDeps, "loadCredential">;
  signal?: AbortSignal;
}): Promise<{ url: string }> {
  const clientId = getDingTalkClientId(params.bot);
  const clientSecret = await loadDingTalkClientSecret(params.bot, params.deps);
  if (!clientId || !clientSecret) {
    throw new Error("DingTalk Client ID or Client Secret is missing.");
  }
  const response = await fetchBotProviderJson<{ endpoint?: string; ticket?: string }>(
    `${DINGTALK_API_BASE_URL}${DINGTALK_GATEWAY_PATH}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        clientId,
        clientSecret,
        ua: DINGTALK_STREAM_UA,
        subscriptions: [{ type: "CALLBACK", topic: DINGTALK_BOT_MESSAGE_TOPIC }],
      }),
      signal: params.signal,
    },
  );
  const endpoint = response.payload?.endpoint;
  const ticket = response.payload?.ticket;
  if (!response.ok || !endpoint || !ticket) {
    throw new Error(
      `DingTalk Stream gateway failed: ${readDingTalkError(response.payload, response.status)}`,
    );
  }
  const url = new URL(endpoint);
  url.searchParams.set("ticket", ticket);
  return { url: url.toString() };
}

function readDingTalkAttachments(
  message: Record<string, unknown>,
  msgId: string,
): BotInboundAttachment[] {
  const msgtype = readString(message, "msgtype");
  const content = isRecord(message.content) ? message.content : null;
  const attachments: BotInboundAttachment[] = [];
  const push = (
    kind: BotInboundAttachment["kind"],
    downloadCode: string,
    filename: string,
    mimeType: string,
    index: number,
  ) => {
    if (!downloadCode) return;
    attachments.push({
      id: `${msgId || "dingtalk"}-${index + 1}`,
      kind,
      filename,
      mimeType,
      providerFileId: downloadCode,
    });
  };
  if (msgtype === "picture") {
    push(
      "image",
      readString(content, "downloadCode") || readString(content, "pictureDownloadCode"),
      "dingtalk-image-1.png",
      "image/png",
      0,
    );
  } else if (msgtype === "file") {
    const filename = readString(content, "fileName") || "dingtalk-file";
    push("file", readString(content, "downloadCode"), filename, "application/octet-stream", 0);
  } else if (msgtype === "video") {
    push("video", readString(content, "downloadCode"), "dingtalk-video.mp4", "video/mp4", 0);
  } else if (msgtype === "richText") {
    const items = Array.isArray(content?.richText) ? content.richText.filter(isRecord) : [];
    let index = 0;
    for (const item of items) {
      const code = readString(item, "downloadCode") || readString(item, "pictureDownloadCode");
      if (code) {
        push("image", code, `dingtalk-image-${index + 1}.png`, "image/png", index);
        index += 1;
      }
    }
  }
  return attachments;
}

function readDingTalkText(message: Record<string, unknown>): string {
  const msgtype = readString(message, "msgtype");
  const text = isRecord(message.text) ? message.text : null;
  const content = isRecord(message.content) ? message.content : null;
  if (msgtype === "richText") {
    const items = Array.isArray(content?.richText) ? content.richText.filter(isRecord) : [];
    return items
      .map((item) => readString(item, "text"))
      .filter(Boolean)
      .join("\n");
  }
  if (msgtype === "audio") {
    // 钉钉语音消息会附带服务端语音识别结果；直接作为文本输入。
    return readString(content, "recognition");
  }
  return readString(text, "content") || readString(content, "content");
}

/**
 * 把 Stream 下发的机器人消息 data 解析为统一入站消息。
 */
export function parseDingTalkBotMessage(
  botId: string,
  message: unknown,
): BotInboundMessage | null {
  if (!isRecord(message)) return null;
  const msgId = readString(message, "msgId");
  // 群聊 @机器人 时正文前会带空格；统一 trim 后再交给命令解析器识别 /bind 等命令。
  const text = readDingTalkText(message).trim();
  const attachments = readDingTalkAttachments(message, msgId);
  // senderStaffId 是企业内员工 userId，单聊 OpenAPI 只认它；外部联系人没有 staffId 时退回 senderId。
  const userId = (readString(message, "senderStaffId") || readString(message, "senderId")).trim();
  if ((!text && attachments.length === 0) || !userId) return null;
  const isGroup = readString(message, "conversationType") === "2";
  const conversationId = readString(message, "conversationId").trim();
  const sessionWebhook = readString(message, "sessionWebhook").trim();
  return {
    botId,
    text,
    ...(attachments.length > 0 ? { attachments } : {}),
    actor: {
      provider: "dingtalk",
      botId,
      providerUserId: userId,
      displayName: readString(message, "senderNick") || undefined,
      chatType: isGroup ? "group" : "private",
      ...(isGroup && conversationId ? { chatId: conversationId } : {}),
      ...(msgId ? { providerMessageId: msgId } : {}),
      // 群聊没有稳定的 OpenAPI 收件人，回复使用入站携带的临时 sessionWebhook。
      ...(isGroup && DINGTALK_SESSION_WEBHOOK_HOST.test(sessionWebhook)
        ? { providerContextToken: sessionWebhook }
        : {}),
    },
  };
}

/**
 * 钉钉 markdown 里单个换行会被折叠；代码块外把换行转成 markdown 硬换行，代码块内保持原样。
 */
export function toDingTalkMarkdown(text: string): string {
  const normalized = text.replace(/\r\n|\r/gu, "\n");
  const parts = normalized.split(/(```[\s\S]*?```)/u);
  return parts
    .map((part) => (part.startsWith("```") ? part : part.replace(/(?<! {2})\n/gu, "  \n")))
    .join("");
}

export function splitDingTalkText(text: string, limit = DINGTALK_MARKDOWN_CHUNK_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < limit / 2) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/u, "");
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function buildMarkdownTitle(text: string): string {
  const firstLine =
    text
      .split("\n")
      .map((line) => line.replace(/[#*`>_~[\]]/gu, "").trim())
      .find(Boolean) ?? "Mcode";
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine;
}

export function createDingTalkBotProvider(deps: DingTalkProviderDeps): BotProviderAdapter {
  const tokenCache = new Map<string, DingTalkAccessTokenCacheEntry>();
  const now = deps.now ?? Date.now;

  async function getAccessToken(bot: BotConfig, signal?: AbortSignal): Promise<string> {
    const clientId = getDingTalkClientId(bot);
    const clientSecret = await loadDingTalkClientSecret(bot, deps);
    if (!clientId || !clientSecret) {
      throw new Error("DingTalk Client ID or Client Secret is missing.");
    }
    const cacheKey = `${clientId}:${bot.credentialRef ?? ""}:${clientSecret.length}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt - DINGTALK_ACCESS_TOKEN_REFRESH_MARGIN_MS > now()) {
      return cached.token;
    }
    const response = await fetchBotProviderJson<{ accessToken?: string; expireIn?: number }>(
      `${DINGTALK_API_BASE_URL}${DINGTALK_ACCESS_TOKEN_PATH}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appKey: clientId, appSecret: clientSecret }),
        signal,
      },
    );
    const token = response.payload?.accessToken;
    if (!response.ok || !token) {
      throw new Error(
        `DingTalk access token failed: ${readDingTalkError(response.payload, response.status)}`,
      );
    }
    tokenCache.set(cacheKey, {
      token,
      expiresAt: now() + (response.payload?.expireIn ?? 7_200) * 1_000,
    });
    return token;
  }

  async function postOpenApi<T>(
    bot: BotConfig,
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T | undefined> {
    const token = await getAccessToken(bot, signal);
    const response = await fetchBotProviderJson<T>(`${DINGTALK_API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-acs-dingtalk-access-token": token,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      throw Object.assign(
        new Error(`DingTalk ${path} failed: ${readDingTalkError(response.payload, response.status)}`),
        // 4xx 是钉钉明确拒绝（参数/权限/限流），不是“结果未知”。
        { deliveryRejected: response.status >= 400 && response.status < 500 },
      );
    }
    return response.payload;
  }

  async function sendMarkdownChunk(
    bot: BotConfig,
    message: BotOutboundMessage,
    text: string,
  ): Promise<void> {
    const markdown = { title: buildMarkdownTitle(text), text: toDingTalkMarkdown(text) };
    const sessionWebhook = message.providerContextToken?.trim();
    const isGroupTarget = message.providerUserId.startsWith("cid");
    if (isGroupTarget && sessionWebhook && DINGTALK_SESSION_WEBHOOK_HOST.test(sessionWebhook)) {
      const response = await fetchBotProviderJson<{ errcode?: number; errmsg?: string }>(
        sessionWebhook,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ msgtype: "markdown", markdown }),
        },
      );
      if (response.ok && (response.payload?.errcode ?? 0) === 0) return;
      // sessionWebhook 过期后退回群 OpenAPI，避免长任务结果丢失。
    }
    const robotCode = getDingTalkClientId(bot);
    const msgParam = JSON.stringify(markdown);
    if (isGroupTarget) {
      await postOpenApi(bot, DINGTALK_GROUP_SEND_PATH, {
        robotCode,
        openConversationId: message.providerUserId,
        msgKey: "sampleMarkdown",
        msgParam,
      });
      return;
    }
    const payload = await postOpenApi<{
      invalidStaffIdList?: string[];
      flowControlledStaffIdList?: string[];
    }>(bot, DINGTALK_PRIVATE_SEND_PATH, {
      robotCode,
      userIds: [message.providerUserId],
      msgKey: "sampleMarkdown",
      msgParam,
    });
    if (payload?.invalidStaffIdList?.includes(message.providerUserId)) {
      throw Object.assign(new Error("DingTalk rejected the recipient (invalid staff id)."), {
        deliveryRejected: true,
      });
    }
    if (payload?.flowControlledStaffIdList?.includes(message.providerUserId)) {
      throw new Error("DingTalk flow control rejected the message; retry later.");
    }
  }

  return {
    async test(bot) {
      if (!getDingTalkClientId(bot) || !bot.credentialRef) {
        return { ok: false, message: "DingTalk Client ID or Client Secret is missing." };
      }
      await getAccessToken(bot);
      return { ok: true, message: "DingTalk OpenAPI is reachable." };
    },

    async send(bot, message) {
      for (const chunk of splitDingTalkText(message.text)) {
        await sendMarkdownChunk(bot, message, chunk);
      }
    },

    async downloadAttachment(bot, attachment, _actor, signal) {
      if (!attachment.providerFileId) return null;
      const payload = await postOpenApi<{ downloadUrl?: string }>(
        bot,
        DINGTALK_FILE_DOWNLOAD_PATH,
        { downloadCode: attachment.providerFileId, robotCode: getDingTalkClientId(bot) },
        signal,
      );
      if (!payload?.downloadUrl) {
        throw new Error("DingTalk attachment download URL is missing.");
      }
      const response = await fetch(payload.downloadUrl, { signal });
      if (!response.ok) {
        throw new Error(`DingTalk attachment download failed: HTTP ${response.status}`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
      return {
        attachment: {
          ...attachment,
          sizeBytes: data.byteLength,
          ...(contentType && contentType !== "application/octet-stream"
            ? { mimeType: contentType }
            : {}),
        },
        data,
      };
    },

    parseCallback(payload): BotInboundMessage[] {
      if (!isRecord(payload)) return [];
      const botId = readString(payload, "botId");
      if (!botId) return [];
      const raw = payload.message;
      const messages = Array.isArray(raw) ? raw : [raw];
      return messages
        .map((message) => parseDingTalkBotMessage(botId, message))
        .filter((message): message is BotInboundMessage => message !== null);
    },
  };
}
