import type { AppSettings, WebRemoteControlAppPayload } from "@mcode/shared";
import type { WebRemoteControlRelayV2Meta } from "@mcode/shared/web-remote-relay";

export type WebRemoteControlRegisteredDevice = NonNullable<
  AppSettings["webRemoteControlRelayV2Device"]
>;
export interface WebRemoteControlDeviceStorage {
  load(): Promise<WebRemoteControlRegisteredDevice | undefined>;
  save(device: WebRemoteControlRegisteredDevice): Promise<void>;
  clearLegacy(): Promise<void>;
}

export interface WebRemoteControlLogin {
  userId: string;
  jwt: string;
}

export type WebRemoteControlDeviceTransportState =
  | "idle"
  | "connecting"
  | "authenticating"
  | "waiting_terminal"
  | "paired"
  | "kicked"
  | "error";

/**
 * Mcode 方案 A：自建中转（remote.hjh.im）走 relay V1 挑战应答握手，不需要 z.ai 登录。
 * 提供该字段即启用 V1；getToken / resolveDeviceSid 在 V1 下不会被调用。
 */
export interface WebRemoteControlDeviceTransportV1Auth {
  passHash: string;
  /** 已持久化的设备 SID；缺省时先 device_register_init 注册。 */
  deviceSid?: string;
  /** 新注册（或 AUTH_FAILED 后重注册）成功；调用方负责持久化 SID + pass_hash。 */
  onRegistered(deviceSid: string): void;
  /** 持久化的 SID 被中转拒绝（中转数据被清理等）；调用方清除旧身份。 */
  onInvalidPersistedAuth?(): void;
}

export interface WebRemoteControlDeviceTransportOptions {
  relayWsUrl: string;
  v1?: WebRemoteControlDeviceTransportV1Auth;
  deviceMid: string;
  meta: WebRemoteControlRelayV2Meta;
  getToken(signal: AbortSignal): Promise<string>;
  resolveDeviceSid(signal: AbortSignal, forceRegistration: boolean): Promise<string>;
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  onStateChange(state: WebRemoteControlDeviceTransportState): void;
  onPayload(payload: WebRemoteControlAppPayload): void;
  /** schema 不认识的 payload；由上层决定是否回 unsupported-action，transport 不理解业务语义。 */
  onUnrecognizedPayload?(payload: unknown): void;
  onRawTransportPayload?(payload: unknown): boolean;
  onRawTransportFault?(reasonCode: string): void;
  onError(error: Error): void;
  onSendReady?(event: { kind: "same-socket" | "reconnected-socket" }): void;
}
