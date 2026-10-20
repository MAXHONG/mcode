# Mcode 自建远控中转（remote.hjh.im）

Cloudflare Worker + Durable Object 实现的手机远控中转，**线协议兼容 z.ai 官方 relay V1**
（`device_register_init / auth_init / auth_challenge / auth_response / auth_ack / pair_status_* / data`），
桌面版与 Linux Web 版现有 transport 无需改协议即可接入。同一个 Worker 托管 Mcode 品牌手机页 `/remote/v4`。

- 中转：`wss://remote.hjh.im/ws`（按 `mid` 路由到同一 Durable Object 实例）
- 手机页：`https://remote.hjh.im/remote/v4`
- 健康检查：`https://remote.hjh.im/healthz`
- 鉴权：二维码携带 `pass_hash`，双方用 `HMAC-SHA256(pass_hash, nonce|role|sid)` 证明，nonce 一次性；
  同 SID 同角色新连接会踢掉旧连接（`KICKED`）。中转只透传 `data.payload`，不解析、不记录。

客户端默认使用本中转；设置 `webRemoteControlRelayProvider=zai`、远控弹窗里的「中转服务器」开关，
或环境变量 `MCODE_WEB_REMOTE_CONTROL_RELAY=zai` 可切回 z.ai 官方（备用）。两条中转的设备身份分开保存。

## 部署

```bash
pnpm install --frozen-lockfile
node deploy/remote-relay/scripts/build-page.mjs        # 构建手机页到 deploy/remote-relay/dist
cd deploy/remote-relay
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... wrangler deploy
```

## 测试

```bash
cd deploy/remote-relay && wrangler dev --local --port 8787 &
node --test test/relay.test.mjs                                     # 协议回归
RELAY_WS_URL=wss://remote.hjh.im/ws node --test test/relay.test.mjs # 线上
MCODE_RELAY_IT_URL=wss://remote.hjh.im/ws npx vitest run packages/server/test/selfHostedRelayIntegration.test.ts
```

## CI 自动部署（可选）

把 `github-workflow-remote-relay.yml` 复制到 `.github/workflows/remote-relay.yml`，并在仓库 Secrets 配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`，即可在 Actions 手动触发部署。
