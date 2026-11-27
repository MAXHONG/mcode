export interface HelloMessage {
  type: "mcode-hello";
  version: string;
  platform: string;
  arch: string;
  pid: number;
}

export interface HelloAckMessage {
  type: "mcode-hello-ack";
  version: string;
  clientId: string;
}
