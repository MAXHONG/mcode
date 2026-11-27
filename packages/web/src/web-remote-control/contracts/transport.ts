import type { WebRemoteControlAppPayload, WebRemoteControlFailure } from "@mcode/shared";

export type WebRemoteControlTerminalTransportState =
  | "idle"
  | "connecting"
  | "authenticating"
  | "waiting"
  | "paired"
  | "reconnecting"
  | "suspended"
  | "kicked"
  | "error";

export type WebRemoteControlTerminalTransportDiagnostic =
  | {
      type: "state-transition";
      previousState: WebRemoteControlTerminalTransportState;
      state: WebRemoteControlTerminalTransportState;
      timestamp: number;
      visibilityState: string;
      online: boolean;
      hiddenDurationMs?: number;
    }
  | {
      type: "socket-close";
      code: number;
      reason: string;
      wasClean: boolean;
      wasPaired: boolean;
      state: WebRemoteControlTerminalTransportState;
      timestamp: number;
      visibilityState: string;
      online: boolean;
      hiddenDurationMs?: number;
    }
  | {
      type: "socket-error" | "recover-start" | "recover-scheduled";
      state: WebRemoteControlTerminalTransportState;
      timestamp: number;
      visibilityState: string;
      online: boolean;
      hiddenDurationMs?: number;
    }
  | {
      type: "pair-status";
      pairStatus: "waiting" | "matched";
      state: WebRemoteControlTerminalTransportState;
      timestamp: number;
      visibilityState: string;
      online: boolean;
      hiddenDurationMs?: number;
    }
  | {
      type: "socket-extensions";
      state: WebRemoteControlTerminalTransportState;
      perMessageDeflate: boolean;
      extensions?: string;
      timestamp: number;
      visibilityState: string;
      online: boolean;
      hiddenDurationMs?: number;
    };

export type WebRemoteControlTerminalTransportDiagnosticInput = {
  type: WebRemoteControlTerminalTransportDiagnostic["type"];
  previousState?: WebRemoteControlTerminalTransportState;
  state: WebRemoteControlTerminalTransportState;
  code?: number;
  reason?: string;
  wasClean?: boolean;
  wasPaired?: boolean;
  pairStatus?: "waiting" | "matched";
  perMessageDeflate?: boolean;
  extensions?: string;
};

export interface WebRemoteControlTerminalTransportOptions {
  relayWsUrl: string;
  deviceSid: string;
  /**
   * Mcode 方案 A：自建中转 relay V1 的 pass_hash（来自二维码 hash 参数）。提供时走
   * auth_init(role=terminal) → auth_challenge → auth_response 挑战应答，getToken 不会被调用。
   */
  passHash?: string;
  getToken(signal: AbortSignal): Promise<string>;
  deviceMid?: string;
  appVersion?: string;
  WebSocketCtor?: typeof globalThis.WebSocket;
  heartbeatIntervalMs?: number;
  heartbeatJitterMs?: number;
  heartbeatAckTimeoutMs?: number;
  reconnectJitterMs?: number;
  healthCheckTimeoutMs?: number;
  desktopOfflineGraceMs?: number;
  staleWaitingRecoveryMs?: number;
  waitingTimeoutMs?: number;
  onPayload(payload: WebRemoteControlAppPayload): void;
  onRawTransportPayload?(payload: unknown): boolean;
  onRawTransportFault?(reasonCode: string): void;
  onStateChange(state: WebRemoteControlTerminalTransportState): void;
  onFailure(failure: WebRemoteControlFailure): void;
  onError(error: Error): void;
  onDiagnostic?(diagnostic: WebRemoteControlTerminalTransportDiagnostic): void;
  onSendReady?(event: { kind: "same-socket" | "reconnected-socket" }): void;
  reloadPage(): void;
}
