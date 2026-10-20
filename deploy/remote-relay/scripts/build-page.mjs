// 构建 Mcode 品牌手机远控页（packages/web，base=/remote/v4/），输出到 deploy/remote-relay/dist。
// 页面固定连接本中转：RELAY_WS_URL（默认 wss://remote.hjh.im/ws）。
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const relayRoot = resolve(here, "..");
const repoRoot = resolve(relayRoot, "../..");
const outDir = resolve(relayRoot, "dist/remote/v4");
const relayWsUrl = process.env.RELAY_WS_URL?.trim() || "wss://remote.hjh.im/ws";

rmSync(resolve(relayRoot, "dist"), { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
execFileSync(
  "pnpm",
  ["--filter", "@mcode/web", "exec", "vite", "build", "--base=/remote/v4/", "--outDir", outDir, "--emptyOutDir"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      MCODE_ENV: "production",
      VITE_WEB_REMOTE_CONTROL_ROUTE_PATH: "/remote/v4",
      VITE_MCODE_WEB_REMOTE_CONTROL_RELAY_WS_URL: relayWsUrl,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=6144",
    },
  },
);
cpSync(resolve(outDir, "index.html"), resolve(outDir, "404.html"));

// Source map 不发布（不暴露源码，且单文件超过 Workers 静态资源 25 MiB 上限）。
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".map")) rmSync(path);
    else if (statSync(path).size > 25 * 1024 * 1024) throw new Error(`asset too large for Workers: ${path}`);
  }
}
walk(resolve(relayRoot, "dist"));
console.log(`[remote-relay] page built → ${outDir} (relay ${relayWsUrl})`);
