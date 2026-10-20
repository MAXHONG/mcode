// 协议回归测试：按真实桌面 device / 手机 terminal 的 V1 流程驱动中转。
// 默认连本地 `wrangler dev`（ws://127.0.0.1:8787/ws）；RELAY_WS_URL 可指向线上 wss://remote.hjh.im/ws。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

const RELAY = process.env.RELAY_WS_URL ?? "ws://127.0.0.1:8787/ws";

function proof(passHash, nonce, role, sid) {
  return createHmac("sha256", passHash).update(`${nonce}|${role}|${sid}`).digest("base64url");
}

function open(mid) {
  const url = new URL(RELAY);
  url.searchParams.set("mid", mid);
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const index = waiters.findIndex((w) => w.match(message));
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
    else inbox.push(message);
  });
  const closed = new Promise((resolve) => ws.addEventListener("close", (e) => resolve(e.code)));
  return {
    ws,
    closed,
    ready: new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    }),
    send: (message) => ws.send(JSON.stringify({ ...message, client_ts: Date.now() })),
    next(match, timeoutMs = 5000) {
      const matcher = typeof match === "string" ? (m) => m.type === match : match;
      const index = inbox.findIndex(matcher);
      if (index >= 0) return Promise.resolve(inbox.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout waiting ${String(match)}`)), timeoutMs);
        waiters.push({ match: matcher, resolve: (m) => (clearTimeout(timer), resolve(m)) });
      });
    },
  };
}

async function auth(client, role, sid, passHash) {
  client.send({ type: "auth_init", role, device_sid: sid, meta: { platform: "test", version: "1", name: role } });
  const challenge = await client.next("auth_challenge");
  client.send({ type: "auth_response", device_sid: sid, proof: proof(passHash, challenge.nonce, role, sid) });
  return client.next((m) => m.type === "auth_ack" || m.type === "error");
}

async function registerDevice(mid) {
  const passHash = createHash("sha256").update(randomBytes(24).toString("base64url")).digest("base64");
  const device = open(mid);
  await device.ready;
  device.send({ type: "device_register_init", device_mid: mid, pass_hash: passHash, meta: { platform: "test", version: "1", name: "pc" } });
  const ack = await device.next("device_register_ack");
  assert.match(ack.device_sid, /^mc_/);
  return { device, sid: ack.device_sid, passHash };
}

test("device register + auth, terminal pairs, data relays both ways", async () => {
  const mid = randomUUID();
  const { device, sid, passHash } = await registerDevice(mid);
  const deviceAck = await auth(device, "device", sid, passHash);
  assert.equal(deviceAck.type, "auth_ack");
  assert.equal(deviceAck.pair_status, "waiting");

  const terminal = open(mid);
  await terminal.ready;
  const terminalAck = await auth(terminal, "terminal", sid, passHash);
  assert.equal(terminalAck.pair_status, "matched");
  const pushed = await device.next("pair_status_ack");
  assert.equal(pushed.pair_status, "matched");

  terminal.send({ type: "pair_status_query", device_sid: sid });
  assert.equal((await terminal.next("pair_status_ack")).pair_status, "matched");

  terminal.send({ type: "data", payload: { zcode_type: "bootstrap-request", requestId: "r1" } });
  const atDevice = await device.next("data");
  assert.deepEqual(atDevice.payload, { zcode_type: "bootstrap-request", requestId: "r1" });
  device.send({ type: "data", payload: { zcode_type: "bootstrap-response", requestId: "r1" } });
  assert.equal((await terminal.next("data")).payload.requestId, "r1");

  terminal.ws.close();
  assert.equal((await device.next("pair_status_ack")).pair_status, "waiting");
  device.ws.close();
});

test("wrong proof is rejected with AUTH_FAILED", async () => {
  const mid = randomUUID();
  const { device, sid, passHash } = await registerDevice(mid);
  await auth(device, "device", sid, passHash);
  const attacker = open(mid);
  await attacker.ready;
  const result = await auth(attacker, "terminal", sid, "wrong-pass-hash-value");
  assert.equal(result.type, "error");
  assert.equal(result.code, "AUTH_FAILED");
  device.ws.close();
});

test("unknown sid is rejected; persisted sid re-auths after reconnect", async () => {
  const mid = randomUUID();
  const ghost = open(mid);
  await ghost.ready;
  ghost.send({ type: "auth_init", role: "terminal", device_sid: "mc_nope", meta: {} });
  const err = await ghost.next("error");
  assert.equal(err.code, "AUTH_FAILED");

  const { device, sid, passHash } = await registerDevice(mid);
  await auth(device, "device", sid, passHash);
  device.ws.close();
  const again = open(mid);
  await again.ready;
  assert.equal((await auth(again, "device", sid, passHash)).type, "auth_ack");
  again.ws.close();
});

test("second terminal kicks the first one", async () => {
  const mid = randomUUID();
  const { device, sid, passHash } = await registerDevice(mid);
  await auth(device, "device", sid, passHash);
  const first = open(mid);
  await first.ready;
  await auth(first, "terminal", sid, passHash);
  const second = open(mid);
  await second.ready;
  assert.equal((await auth(second, "terminal", sid, passHash)).pair_status, "matched");
  const kicked = await first.next("error");
  assert.equal(kicked.code, "KICKED");
  // 旧手机被踢不应让桌面看到 waiting（新手机仍在线）。
  device.send({ type: "pair_status_query", device_sid: sid });
  assert.equal((await device.next("pair_status_ack")).pair_status, "matched");
  second.ws.close();
  device.ws.close();
});

test("data without peer returns INTERNAL and keeps socket open", async () => {
  const mid = randomUUID();
  const { device, sid, passHash } = await registerDevice(mid);
  await auth(device, "device", sid, passHash);
  device.send({ type: "data", payload: { zcode_type: "app-error" } });
  assert.equal((await device.next("error")).code, "INTERNAL");
  device.send({ type: "pair_status_query", device_sid: sid });
  assert.equal((await device.next("pair_status_ack")).pair_status, "waiting");
  device.ws.close();
});

test("unauthenticated data is refused", async () => {
  const client = open(randomUUID());
  await client.ready;
  client.send({ type: "data", payload: {} });
  assert.equal((await client.next("error")).code, "WRONG_PARAM");
  client.ws.close();
});
