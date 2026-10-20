/**
 * Mcode 自建远控中转（Cloudflare Worker + Durable Object）。
 *
 * 线协议与 z.ai 官方 relay V1（wss://zcode.z.ai/ws）保持一致，现有桌面 device transport
 * 与手机 terminal transport 无需改协议即可接入：
 *
 *   device:   device_register_init → device_register_ack → auth_init → auth_challenge
 *             → auth_response(proof) → auth_ack
 *   terminal: auth_init → auth_challenge → auth_response(proof) → auth_ack
 *   双方:     pair_status_query ↔ pair_status_ack；data.payload 原样转发给同 SID 的对端
 *
 * proof = base64url(HMAC-SHA256(key = pass_hash, `${nonce}|${role}|${device_sid}`))。
 * relay 只做鉴权、配对、心跳应答与透传，不解析、不记录 data.payload。
 *
 * 路由：每个 `mid`（桌面 deviceMid，二维码同样携带）对应一个 Durable Object，
 * 桌面与手机按同一 `mid` 落到同一实例；缺失 `mid` 时落到全局实例。
 * 同时托管 Mcode 品牌手机远控页面（静态资源，/remote/v4）。
 */

export interface Env {
  RELAY: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

type Role = "device" | "terminal";

interface SocketState {
  id: string;
  connectedAt: number;
  authed: boolean;
  role?: Role;
  sid?: string;
  nonce?: string;
  pendingRole?: Role;
  pendingSid?: string;
  kicked?: boolean;
}

interface DeviceRecord {
  passHash: string;
  mid: string;
  createdAt: number;
  lastSeenAt: number;
}

const MAX_MESSAGE_BYTES = 1024 * 1024 + 64 * 1024;
const MAX_ID_LENGTH = 128;
const MAX_DEVICES_PER_INSTANCE = 32;
const CLOSE_KICKED = 4009;
const CLOSE_AUTH_FAILED = 4001;
const CLOSE_WRONG_PARAM = 4000;
const RELAY_PATHS = new Set(["/ws", "/api/v1/remote/ws"]);
const REMOTE_PAGE_PREFIX = "/remote/v4";

const encoder = new TextEncoder();

function randomId(bytes = 18): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function calculateProof(
  passHash: string,
  nonce: string,
  role: Role,
  deviceSid: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passHash),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${nonce}|${role}|${deviceSid}`),
  );
  return base64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_ID_LENGTH;
}

function isRole(value: unknown): value is Role {
  return value === "device" || value === "terminal";
}

function messageByteLength(message: string | ArrayBuffer): number {
  return typeof message === "string" ? encoder.encode(message).byteLength : message.byteLength;
}

function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Strict-Transport-Security", "max-age=31536000");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (RELAY_PATHS.has(url.pathname)) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const mid = url.searchParams.get("mid")?.trim() || request.headers.get("X-Device-ID")?.trim();
      const shard = mid && mid.length <= MAX_ID_LENGTH ? `mid:${mid}` : "global";
      const stub = env.RELAY.get(env.RELAY.idFromName(shard));
      return stub.fetch(request);
    }

    if (url.pathname === "/healthz") {
      return new Response("ok", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
    }

    if (url.pathname === "/" || url.pathname === "/remote" || url.pathname === "/remote/") {
      return Response.redirect(`${url.origin}${REMOTE_PAGE_PREFIX}${url.search}`, 302);
    }

    if (!env.ASSETS) {
      return new Response("Not found", { status: 404 });
    }

    // 手机远控页（Vite SPA，base=/remote/v4/）：静态资源按原路径返回；
    // 只有无扩展名的页面路由回退到 index.html，资源 404 不能被伪装成 200。
    // 二维码地址是 /remote/v4?sid=...，直接返回页面，省掉一次 307 跳转。
    if (url.pathname === REMOTE_PAGE_PREFIX || url.pathname === `${REMOTE_PAGE_PREFIX}/`) {
      const indexUrl = new URL(`${REMOTE_PAGE_PREFIX}/index.html`, url.origin);
      const page = await env.ASSETS.fetch(new Request(indexUrl, request));
      return securityHeaders(page.status === 307 || page.status === 308
        ? await env.ASSETS.fetch(new Request(new URL(`${REMOTE_PAGE_PREFIX}/`, url.origin), request))
        : page);
    }

    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && url.pathname.startsWith(REMOTE_PAGE_PREFIX)) {
      const lastSegment = url.pathname.split("/").pop() ?? "";
      if (!lastSegment.includes(".")) {
        const indexUrl = new URL(`${REMOTE_PAGE_PREFIX}/index.html`, url.origin);
        response = await env.ASSETS.fetch(new Request(indexUrl, request));
      }
    }
    return securityHeaders(response);
  },
};

export class RelayHub implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    const state: SocketState = { id: randomId(12), connectedAt: Date.now(), authed: false };
    server.serializeAttachment(state);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (messageByteLength(raw) > MAX_MESSAGE_BYTES) {
      this.sendError(ws, "WRONG_PARAM", "message too large");
      return;
    }
    let message: Record<string, unknown>;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad");
      message = parsed as Record<string, unknown>;
    } catch {
      this.sendError(ws, "WRONG_PARAM", "invalid json");
      return;
    }

    const state = this.readState(ws);
    if (!state) return;

    switch (message.type) {
      case "device_register_init":
        await this.handleRegister(ws, state, message);
        return;
      case "auth_init":
        await this.handleAuthInit(ws, state, message);
        return;
      case "auth_response":
        await this.handleAuthResponse(ws, state, message);
        return;
      case "pair_status_query":
        this.handlePairStatusQuery(ws, state);
        return;
      case "data":
        this.handleData(ws, state, message);
        return;
      default:
        this.sendError(ws, "WRONG_PARAM", "unknown message type");
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.onSocketGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.onSocketGone(ws);
  }

  private onSocketGone(ws: WebSocket): void {
    const state = this.readState(ws);
    if (!state?.authed || !state.sid || !state.role || state.kicked) return;
    // 同 SID 同角色已有新连接接管时，旧连接关闭不代表对端离线。
    const replacement = this.findAuthed(state.sid, state.role, state.id);
    if (replacement) return;
    const peer = this.findPeer(state);
    if (peer) {
      this.send(peer.ws, {
        type: "pair_status_ack",
        terminal_sid: "",
        pair_status: "waiting",
        server_ts: Date.now(),
      });
    }
    if (state.role === "device") void this.touchDevice(state.sid);
  }

  private async handleRegister(
    ws: WebSocket,
    state: SocketState,
    message: Record<string, unknown>,
  ): Promise<void> {
    if (state.authed) {
      this.sendError(ws, "WRONG_PARAM", "already authenticated");
      return;
    }
    const passHash = message.pass_hash;
    const deviceMid = message.device_mid;
    if (typeof passHash !== "string" || passHash.length < 16 || passHash.length > 256 || !isValidId(deviceMid)) {
      this.sendError(ws, "WRONG_PARAM", "invalid register params", CLOSE_WRONG_PARAM);
      return;
    }
    const sid = `mc_${randomId(18)}`;
    const now = Date.now();
    const record: DeviceRecord = { passHash, mid: deviceMid, createdAt: now, lastSeenAt: now };
    await this.ctx.storage.put(`dev:${sid}`, record);
    await this.pruneDevices();
    this.send(ws, { type: "device_register_ack", device_sid: sid, server_ts: now });
  }

  private async handleAuthInit(
    ws: WebSocket,
    state: SocketState,
    message: Record<string, unknown>,
  ): Promise<void> {
    if (state.authed) {
      this.sendError(ws, "WRONG_PARAM", "already authenticated");
      return;
    }
    if (!isRole(message.role) || !isValidId(message.device_sid)) {
      this.sendError(ws, "WRONG_PARAM", "invalid auth_init", CLOSE_WRONG_PARAM);
      return;
    }
    const record = await this.ctx.storage.get<DeviceRecord>(`dev:${message.device_sid}`);
    if (!record) {
      this.sendError(ws, "AUTH_FAILED", "unknown device", CLOSE_AUTH_FAILED);
      return;
    }
    state.nonce = randomId(24);
    state.pendingRole = message.role;
    state.pendingSid = message.device_sid;
    ws.serializeAttachment(state);
    this.send(ws, { type: "auth_challenge", nonce: state.nonce, server_ts: Date.now() });
  }

  private async handleAuthResponse(
    ws: WebSocket,
    state: SocketState,
    message: Record<string, unknown>,
  ): Promise<void> {
    if (state.authed || !state.nonce || !state.pendingRole || !state.pendingSid) {
      this.sendError(ws, "WRONG_PARAM", "unexpected auth_response", CLOSE_WRONG_PARAM);
      return;
    }
    const sid = state.pendingSid;
    const role = state.pendingRole;
    const nonce = state.nonce;
    // nonce 只能用一次，失败也不能重试同一个 challenge。
    state.nonce = undefined;
    ws.serializeAttachment(state);

    const record = await this.ctx.storage.get<DeviceRecord>(`dev:${sid}`);
    if (!record || message.device_sid !== sid || typeof message.proof !== "string") {
      this.sendError(ws, "AUTH_FAILED", "auth failed", CLOSE_AUTH_FAILED);
      return;
    }
    const expected = await calculateProof(record.passHash, nonce, role, sid);
    if (!timingSafeEqual(expected, message.proof)) {
      this.sendError(ws, "AUTH_FAILED", "auth failed", CLOSE_AUTH_FAILED);
      return;
    }

    // 同一 SID 同一角色只保留最新连接（与官方一致：另一台手机接管时旧手机收到 KICKED）。
    for (const other of this.authedSockets()) {
      if (other.state.id === state.id) continue;
      if (other.state.sid === sid && other.state.role === role) {
        other.state.kicked = true;
        other.ws.serializeAttachment(other.state);
        this.sendError(other.ws, "KICKED", "replaced by a newer connection", CLOSE_KICKED);
      }
    }

    state.authed = true;
    state.role = role;
    state.sid = sid;
    state.pendingRole = undefined;
    state.pendingSid = undefined;
    ws.serializeAttachment(state);
    if (role === "device") await this.touchDevice(sid);

    const peer = this.findPeer(state);
    const terminalSid = role === "terminal" ? state.id : (peer?.state.id ?? "");
    const now = Date.now();
    this.send(ws, {
      type: "auth_ack",
      device_sid: sid,
      terminal_sid: terminalSid,
      pair_status: peer ? "matched" : "waiting",
      server_ts: now,
    });
    if (peer) {
      this.send(peer.ws, {
        type: "pair_status_ack",
        terminal_sid: role === "terminal" ? state.id : peer.state.id,
        pair_status: "matched",
        server_ts: now,
      });
    }
  }

  private handlePairStatusQuery(ws: WebSocket, state: SocketState): void {
    if (!state.authed) {
      this.sendError(ws, "WRONG_PARAM", "not authenticated");
      return;
    }
    const peer = this.findPeer(state);
    this.send(ws, {
      type: "pair_status_ack",
      terminal_sid: state.role === "terminal" ? state.id : (peer?.state.id ?? ""),
      pair_status: peer ? "matched" : "waiting",
      server_ts: Date.now(),
    });
  }

  private handleData(ws: WebSocket, state: SocketState, message: Record<string, unknown>): void {
    if (!state.authed) {
      this.sendError(ws, "WRONG_PARAM", "not authenticated");
      return;
    }
    if (!("payload" in message)) {
      this.sendError(ws, "WRONG_PARAM", "missing payload");
      return;
    }
    const peer = this.findPeer(state);
    if (!peer) {
      // 与官方 hub 一致：对端不在线时回 INTERNAL，客户端保持连接并降级为 waiting。
      this.sendError(ws, "INTERNAL", "peer offline");
      return;
    }
    this.send(peer.ws, { type: "data", payload: message.payload, server_ts: Date.now() });
  }

  private readState(ws: WebSocket): SocketState | undefined {
    const state = ws.deserializeAttachment() as SocketState | null;
    return state ?? undefined;
  }

  private authedSockets(): Array<{ ws: WebSocket; state: SocketState }> {
    const result: Array<{ ws: WebSocket; state: SocketState }> = [];
    for (const socket of this.ctx.getWebSockets()) {
      const state = this.readState(socket);
      if (state?.authed && !state.kicked) result.push({ ws: socket, state });
    }
    return result;
  }

  private findAuthed(sid: string, role: Role, excludeId: string) {
    return this.authedSockets().find(
      (entry) => entry.state.sid === sid && entry.state.role === role && entry.state.id !== excludeId,
    );
  }

  private findPeer(state: SocketState) {
    if (!state.sid || !state.role) return undefined;
    const peerRole: Role = state.role === "device" ? "terminal" : "device";
    // 多个同角色连接理论上不会同时存在（新连接会踢掉旧连接），取最新的一条兜底。
    return this.authedSockets()
      .filter((entry) => entry.state.sid === state.sid && entry.state.role === peerRole)
      .sort((a, b) => b.state.connectedAt - a.state.connectedAt)[0];
  }

  private async touchDevice(sid: string): Promise<void> {
    const key = `dev:${sid}`;
    const record = await this.ctx.storage.get<DeviceRecord>(key);
    if (record) {
      record.lastSeenAt = Date.now();
      await this.ctx.storage.put(key, record);
    }
  }

  private async pruneDevices(): Promise<void> {
    const devices = await this.ctx.storage.list<DeviceRecord>({ prefix: "dev:" });
    if (devices.size <= MAX_DEVICES_PER_INSTANCE) return;
    const online = new Set(this.authedSockets().map((entry) => `dev:${entry.state.sid}`));
    const candidates = [...devices.entries()]
      .filter(([key]) => !online.has(key))
      .sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
    const excess = devices.size - MAX_DEVICES_PER_INSTANCE;
    await this.ctx.storage.delete(candidates.slice(0, excess).map(([key]) => key));
  }

  private send(ws: WebSocket, message: Record<string, unknown>): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // 连接已关闭，忽略。
    }
  }

  private sendError(ws: WebSocket, code: string, message: string, closeCode?: number): void {
    this.send(ws, { type: "error", code, message, server_ts: Date.now() });
    if (closeCode !== undefined) {
      try {
        ws.close(closeCode, code);
      } catch {
        // 已关闭。
      }
    }
  }
}
