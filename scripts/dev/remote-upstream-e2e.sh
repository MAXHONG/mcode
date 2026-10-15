#!/usr/bin/env bash
# 用 z.ai CDN 上游 linux-x64 远端组件在本机模拟「远端」，验证 Mcode 桌面侧握手与 RPC 契约。
# 用法: bash scripts/dev/remote-upstream-e2e.sh [版本，默认读 package.json]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VER="${1:-$(node -p "require('$ROOT/package.json').version")}"
WORK="${REMOTE_E2E_WORK:-$ROOT/.local-logs/remote-e2e}"
BASE="https://cdn-zcode.z.ai/zcode/electron/releases"
mkdir -p "$WORK/dl"
curl -fsSL "$BASE/$VER/manifest-linux-x64.json" -o "$WORK/dl/manifest.json"
FAKE="$WORK/home"; S="$FAKE/.zcode/server"
rm -rf "$FAKE"; mkdir -p "$S/agents/glm" "$FAKE/ws"
node -e '
const m=require(process.argv[1]);
for (const c of m.components) console.log([c.id,c.artifactPath,c.sha256,c.mount].join("\t"));
' "$WORK/dl/manifest.json" | while IFS=$'\t' read -r id art sha mount; do
  f="$WORK/dl/$id.tar.gz"
  curl -fsSL "$BASE/${art//+/%2B}" -o "$f"
  echo "$sha  $f" | sha256sum -c - >/dev/null
  case "$id" in
    server-bundle) tar xzf "$f" -C "$S" ;;
    node-runtime) tar xzf "$f" -C "$S" ;;
    glm) tar xzf "$f" -C "$S/agents/glm" ;;
  esac
done
( cd "$ROOT/packages/server" && npx tsx -e '
import { buildRemoteAgentBundleWrapper } from "./src/remote/mcodeAgentBundleWrapper.ts";
process.stdout.write(buildRemoteAgentBundleWrapper("glm"));' ) > "$S/agents/glm/zcode-agent"
chmod +x "$S/agents/glm/zcode-agent" "$S/node"
cd "$ROOT/packages/server"
UPSTREAM_FAKE_HOME="$FAKE" npx tsx test-e2e-local/upstreamRemote.e2e.ts
