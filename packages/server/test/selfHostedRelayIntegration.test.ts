/**
 * 自建远控中转（deploy/remote-relay）与真实 Mcode transport 的互通测试。
 *
 * 只有设置 MCODE_RELAY_IT_URL 时运行，例如：
 *   MCODE_RELAY_IT_URL=ws://127.0.0.1:8787/ws   （本地 wrangler dev）
 *   MCODE_RELAY_IT_URL=wss://remote.hjh.im/ws    （线上）
 * 桌面 device 用 @mcode/server 的生产 transport，手机 terminal 用 packages/web 的生产 transport，
 * 两端都使用各自生产的 HMAC proof 实现。
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { WebRemoteControlAppPayload } from "@mcode/shared";
import {
  WebRemoteControlDeviceTransport,
  type WebRemoteControlDeviceTransportState,
} from "../src/web-remote-control/webRemoteControlTransport.js";
import { createNodeWebRemoteControlRelayAuthProvider } from "../src/web-remote-control/webRemoteControlRelayAuthProvider.js";
import {
  WebRemoteControlTerminalTransport,
  type WebRemoteControlTerminalTransportState,
} from "../../web/src/webRemoteControlTransport.js";
import { createBrowserWebRemoteControlRelayAuthProvider } from "../../web/src/webRemoteControlRelayAuthProvider.js";

const relayUrl = process.env["MCODE_RELAY_IT_URL"]?.trim();

function waitUntil(assertion: () => boolean, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      if (assertion()) return resolve();
      if (Date.now() - startedAt > timeoutMs) return reject(new Error("Timed out waiting"));
      setTimeout(tick, 20);
    };
    tick();
  });
}

const logger = { info: () => {}, warn: () => {}, error: () => {} };

describe.skipIf(!relayUrl)("self-hosted relay interoperability", () => {
  it("pairs the real desktop device transport with the real mobile terminal transport", async () => {
    const nodeAuth = createNodeWebRemoteControlRelayAuthProvider();
    const passHash = nodeAuth.createPassHash(nodeAuth.createPassword());
    const deviceMid = randomUUID();
    const deviceStates: WebRemoteControlDeviceTransportState[] = [];
    const devicePayloads: WebRemoteControlAppPayload[] = [];
    let registered: { deviceSid: string; passHash: string } | undefined;

    const device = new WebRemoteControlDeviceTransport({
      relayWsUrl: relayUrl!,
      deviceMid,
      auth: { mode: "register", passHash },
      meta: { platform: "linux", version: "it", name: "relay-it" },
      authProvider: nodeAuth,
      logger,
      onRegisteredAuth: (auth) => {
        registered = auth;
      },
      onStateChange: (state) => deviceStates.push(state),
      onPayload: (payload) => devicePayloads.push(payload),
      onError: () => {},
      onInvalidPersistedAuth: async () => {},
    } as ConstructorParameters<typeof WebRemoteControlDeviceTransport>[0]);

    const terminalStates: WebRemoteControlTerminalTransportState[] = [];
    const terminalPayloads: WebRemoteControlAppPayload[] = [];
    let terminal: WebRemoteControlTerminalTransport | undefined;

    try {
      device.start();
      await waitUntil(() => deviceStates.includes("waiting_terminal"));
      expect(registered?.deviceSid).toMatch(/^mc_/);

      terminal = new WebRemoteControlTerminalTransport({
        relayWsUrl: relayUrl!,
        deviceSid: registered!.deviceSid,
        passHash: registered!.passHash,
        deviceMid,
        WebSocketCtor: WebSocket as unknown as typeof globalThis.WebSocket,
        authProvider: createBrowserWebRemoteControlRelayAuthProvider(),
        onPayload: (payload) => terminalPayloads.push(payload),
        onStateChange: (state) => terminalStates.push(state),
        onFailure: () => {},
        onError: () => {},
        reloadPage: () => {},
      });
      terminal.start();

      await waitUntil(() => terminalStates.includes("paired") && deviceStates.at(-1) === "paired");

      const request: WebRemoteControlAppPayload = {
        zcode_type: "bootstrap-request",
        requestId: "it-1",
      } as WebRemoteControlAppPayload;
      expect(terminal.sendPayload(request)).toBe(true);
      await waitUntil(() => devicePayloads.length > 0);
      expect(devicePayloads[0]).toMatchObject({ zcode_type: "bootstrap-request", requestId: "it-1" });

      const response = {
        zcode_type: "app-error",
        reason: "unexpected-error",
        error: "ping-from-desktop",
      } as WebRemoteControlAppPayload;
      expect(device.sendPayload(response)).toBe(true);
      await waitUntil(() => terminalPayloads.length > 0);
      expect(terminalPayloads[0]).toMatchObject({ zcode_type: "app-error", error: "ping-from-desktop" });
    } finally {
      terminal?.dispose();
      device.dispose();
    }
  }, 60_000);
});
