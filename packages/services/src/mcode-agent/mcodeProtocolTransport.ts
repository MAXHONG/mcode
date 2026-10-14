import type { Event, IDisposable } from "@mcode/rpc";
import type { McodeProtocolMessage } from "@mcode/shared";

export type McodeProtocolTransportKind = "stdio" | "websocket" | "memory";

export interface McodeProtocolTransportClosedEvent {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  reason?: string;
}

export interface McodeProtocolTransport extends IDisposable {
  readonly kind: McodeProtocolTransportKind;
  readonly onMessage: Event<McodeProtocolMessage>;
  readonly onClose: Event<McodeProtocolTransportClosedEvent>;
  send(message: McodeProtocolMessage): Promise<void>;
  disposeAndWait?(): Promise<void>;
}
