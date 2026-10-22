import { afterEach, describe, expect, it, vi } from "vitest";
import type { BotConfig } from "@mcode/shared";
import {
  createDingTalkBotProvider,
  parseDingTalkBotMessage,
  splitDingTalkText,
  toDingTalkMarkdown,
} from "../src/bots/providers/dingtalkProvider.js";
import { createDingTalkChannelRuntime } from "../src/bots/dingtalkChannelRuntime.js";

function createBot(overrides: Partial<BotConfig> = {}): BotConfig {
  return {
    id: "ding-bot",
    name: "Ding",
    provider: "dingtalk",
    enabled: true,
    credentialRef: "secret-ref",
    dingtalkClientId: "dingclient",
    allowedWorkspaces: ["*"],
    allowedCommands: {
      status: true,
      new: true,
      workspace: true,
      model: true,
      thoughtLevel: true,
      reply: true,
    },
    currentOptions: {},
    replyMode: "assistant_changes",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DingTalk provider", () => {
  it("parses private text messages with staff id as provider user", () => {
    const parsed = parseDingTalkBotMessage("ding-bot", {
      msgId: "m1",
      msgtype: "text",
      text: { content: " /bind ABC123 " },
      senderStaffId: "staff-1",
      senderId: "$:LWCP:x",
      senderNick: "Alice",
      conversationType: "1",
      conversationId: "cid-private",
    });
    expect(parsed).toEqual({
      botId: "ding-bot",
      text: "/bind ABC123",
      actor: {
        provider: "dingtalk",
        botId: "ding-bot",
        providerUserId: "staff-1",
        displayName: "Alice",
        chatType: "private",
        providerMessageId: "m1",
      },
    });
  });

  it("parses group messages with chat id and trusted session webhook only", () => {
    const parsed = parseDingTalkBotMessage("ding-bot", {
      msgId: "m2",
      msgtype: "text",
      text: { content: "hi" },
      senderStaffId: "staff-1",
      conversationType: "2",
      conversationId: "cidGroup==",
      sessionWebhook: "https://oapi.dingtalk.com/robot/sendBySession?session=abc",
    });
    expect(parsed?.actor).toMatchObject({
      chatType: "group",
      chatId: "cidGroup==",
      providerContextToken: "https://oapi.dingtalk.com/robot/sendBySession?session=abc",
    });
    const untrusted = parseDingTalkBotMessage("ding-bot", {
      msgtype: "text",
      text: { content: "hi" },
      senderStaffId: "staff-1",
      conversationType: "2",
      conversationId: "cidGroup==",
      sessionWebhook: "https://evil.example.com/hook",
    });
    expect(untrusted?.actor.providerContextToken).toBeUndefined();
  });

  it("parses picture messages as image attachments", () => {
    const parsed = parseDingTalkBotMessage("ding-bot", {
      msgId: "m3",
      msgtype: "picture",
      content: { downloadCode: "dl-code" },
      senderStaffId: "staff-1",
      conversationType: "1",
    });
    expect(parsed?.attachments).toEqual([
      expect.objectContaining({ kind: "image", providerFileId: "dl-code" }),
    ]);
  });

  it("formats markdown hard line breaks outside code blocks and splits long text", () => {
    expect(toDingTalkMarkdown("a\nb\n```\nx\ny\n```")).toBe("a  \nb  \n```\nx\ny\n```");
    const chunks = splitDingTalkText(`${"a".repeat(30)}\n${"b".repeat(30)}`, 40);
    expect(chunks).toEqual(["a".repeat(30), "b".repeat(30)]);
  });

  it("sends private replies through batchSend with a cached access token", async () => {
    const calls: Array<{ url: string; body: unknown; headers: Record<string, string> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({
          url,
          body: JSON.parse(String(init.body)),
          headers: init.headers as Record<string, string>,
        });
        const payload = url.endsWith("/oauth2/accessToken")
          ? { accessToken: "token-1", expireIn: 7200 }
          : { processQueryKey: "q" };
        return new Response(JSON.stringify(payload), { status: 200 });
      }),
    );
    const provider = createDingTalkBotProvider({ loadCredential: async () => "secret" });
    const message = {
      botId: "ding-bot",
      provider: "dingtalk" as const,
      providerUserId: "staff-1",
      text: "hello",
    };
    await provider.send(createBot(), message);
    await provider.send(createBot(), message);
    expect(calls.filter((call) => call.url.endsWith("/oauth2/accessToken"))).toHaveLength(1);
    const send = calls.find((call) => call.url.endsWith("/robot/oToMessages/batchSend"));
    expect(send?.headers["x-acs-dingtalk-access-token"]).toBe("token-1");
    expect(send?.body).toMatchObject({
      robotCode: "dingclient",
      userIds: ["staff-1"],
      msgKey: "sampleMarkdown",
    });
  });
});

describe("DingTalk Stream runtime", () => {
  it("acks ping and bot callbacks, and forwards messages to the bot pipeline", async () => {
    const listeners: Record<string, Array<(event: never) => void>> = {};
    const sent: string[] = [];
    const socket = {
      readyState: 1,
      send: (data: string) => sent.push(data),
      close: vi.fn(),
      addEventListener: (type: string, listener: (event: never) => void) => {
        (listeners[type] ??= []).push(listener);
      },
    };
    const emit = (type: string, event: unknown) =>
      listeners[type]?.forEach((listener) => listener(event as never));
    const processed: unknown[] = [];
    const bot = createBot();
    const runtime = createDingTalkChannelRuntime({
      credentialService: { load: async () => "secret" } as never,
      logger: { debug: () => undefined, info: () => undefined, warn: () => undefined },
      statusSink: { getRuntimeStatus: () => undefined, setRuntimeStatus: () => undefined },
      ensureBotStorageMigrated: async () => undefined,
      readConfig: async () => ({ version: 3, bots: [bot] }),
      processProviderCallback: async (_provider, payload) => {
        processed.push(payload);
        return { ok: true, replies: [] };
      },
      openConnection: async () => ({ url: "wss://example.test/connect?ticket=t" }),
      createSocket: () => socket,
      acquireStreamLock: async () => ({ release: async () => undefined }),
    });
    await runtime.refresh();
    await vi.waitFor(() => expect(listeners.open?.length).toBeGreaterThan(0));
    emit("open", {});
    emit("message", {
      data: JSON.stringify({
        type: "SYSTEM",
        headers: { topic: "ping", messageId: "p1" },
        data: '{"opaque":"o"}',
      }),
    });
    emit("message", {
      data: JSON.stringify({
        type: "CALLBACK",
        headers: { topic: "/v1.0/im/bot/messages/get", messageId: "c1" },
        data: JSON.stringify({ msgId: "m", msgtype: "text", text: { content: "hi" } }),
      }),
    });
    await vi.waitFor(() => expect(processed).toHaveLength(1));
    expect(JSON.parse(sent[0]!)).toMatchObject({ headers: { messageId: "p1" }, data: '{"opaque":"o"}' });
    expect(JSON.parse(sent[1]!)).toMatchObject({ code: 200, headers: { messageId: "c1" } });
    expect(processed[0]).toMatchObject({ botId: "ding-bot", message: { msgId: "m" } });
    await runtime.dispose();
  });
});
