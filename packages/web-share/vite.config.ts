import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  resolveBigModelApiOrigin,
  resolveRuntimeMcodeEndpointOrigin,
  resolveZaiOAuthClientId,
  resolveZaiOAuthOrigin,
} from "../shared/src/mcodeEndpoint.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const { version } = JSON.parse(
  readFileSync(resolve(REPO_ROOT, "package.json"), "utf8"),
);

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, REPO_ROOT, ""), ...process.env };
  const zcodeEnv =
    env.MCODE_ENV?.trim().toLowerCase() === "production"
      ? "production"
      : "test";
  const endpointEnv = { ...env, MCODE_ENV: zcodeEnv };
  const endpointOrigin = resolveRuntimeMcodeEndpointOrigin(endpointEnv);
  const oauthOrigin = resolveZaiOAuthOrigin(endpointEnv);
  const oauthClientId = resolveZaiOAuthClientId(endpointEnv);
  // BigModel 授权入口必须跟随 MCODE_ENV，否则测试环境会把测试账号带到生产授权页。
  const bigmodelOAuthOrigin = resolveBigModelApiOrigin(endpointEnv);

  return {
    root: resolve(HERE),
    base: "/cn/share/",
    // Share 复用 Web 的 material-icons 素材，但不复制完整 Web 源码/依赖。
    // 这样 dev:web-share 与 Docker 生产构建都从同一份 public 资源读取图标。
    publicDir: resolve(REPO_ROOT, "packages/web/public"),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: "@", replacement: resolve(REPO_ROOT, "packages/ui/src") },
        // 只精确匹配包根；子路径（@mcode/shared/mcp-apps 等）走 package.json exports，
        // 否则前缀别名会拼成 index.ts/mcp-apps 导致构建失败。
        {
          find: /^@mcode\/shared$/u,
          replacement: resolve(REPO_ROOT, "packages/shared/src/index.ts"),
        },
        {
          find: "@mcode/ui/useTheme",
          replacement: resolve(REPO_ROOT, "packages/ui/src/useTheme.ts"),
        },
        {
          find: "@mcode/ui/conversation-share-readonly",
          replacement: resolve(REPO_ROOT, "packages/share-ui/src/index.ts"),
        },
        {
          find: "@mcode/ui/oauth-provider-icon",
          replacement: resolve(
            REPO_ROOT,
            "packages/ui/src/lib/oauthProviderIcon.tsx",
          ),
        },
      ],
    },
    define: {
      __MCODE_VERSION__: JSON.stringify(version),
      __MCODE_COMMIT__: JSON.stringify(env.MCODE_COMMIT || "unknown"),
      __MCODE_ENV__: JSON.stringify(zcodeEnv),
      "import.meta.env.VITE_MCODE_BASE_URL": JSON.stringify(endpointOrigin),
      "import.meta.env.VITE_MCODE_ENDPOINT_ORIGIN":
        JSON.stringify(endpointOrigin),
      "import.meta.env.VITE_ZAI_OAUTH_CLIENT_ID": JSON.stringify(oauthClientId),
      "import.meta.env.VITE_ZAI_OAUTH_ORIGIN": JSON.stringify(oauthOrigin),
      "import.meta.env.VITE_BIGMODEL_OAUTH_ORIGIN":
        JSON.stringify(bigmodelOAuthOrigin),
    },
    build: {
      outDir: resolve(REPO_ROOT, "packages/web-share/dist"),
      emptyOutDir: true,
      sourcemap: mode === "production" ? "hidden" : true,
    },
  };
});
