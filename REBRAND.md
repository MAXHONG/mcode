# ZCode → Mcode 改名说明

Mcode 基于 [zai-org/ZCode](https://github.com/zai-org/ZCode) v3.15.1（Apache-2.0）改名构建。改名只涉及产品名称、品牌资源与核心标识，功能与上游一致。

## 已改名

| 项目 | ZCode | Mcode |
| --- | --- | --- |
| 产品名 / 窗口标题 / 安装包名 | ZCode、Z Code | Mcode |
| 桌面 appId | `dev.zcode.app` | `dev.mcode.app` |
| 安装包文件 | `ZCode-<ver>-mac-arm64.dmg` 等 | `Mcode-<ver>-mac-arm64.dmg` 等 |
| npm workspace 包 | `@zcode/*` | `@mcode/*` |
| 目录与源码文件 | `apps/zcode-cli`、`packages/zcode-*`、`zcodeAgent.ts` … | `apps/mcode-cli`、`packages/mcode-*`、`mcodeAgent.ts` … |
| 代码标识符 | `ZCodeApp`、`IZCodeAgentService`、`ZCODE_VERSION` … | `McodeApp`、`IMcodeAgentService`、`MCODE_VERSION` … |
| 环境变量 | `ZCODE_ENV`、`ZCODE_DATA_BASE_DIR` … | `MCODE_ENV`、`MCODE_DATA_BASE_DIR` … |
| 本地数据目录 | `~/.zcode`、工作区 `.zcode/` | `~/.mcode`、工作区 `.mcode/` |
| 命令行 | `zcode` | `mcode` |
| 图标 / DMG 背景 / 应用内 Logo | Z 字形、`ZCODE` | M 字形、`MCODE` |

> 数据目录改为 `~/.mcode`，Mcode 不会读取或改动已安装 ZCode 的 `~/.zcode` 数据，两者可以并存。

## 刻意保留（保证登录与云端能力可用）

这些标识由 Z.ai 服务端或官方插件生态识别，改名会导致登录、套餐或插件不可用，因此保持原值：

- **服务端地址**：`https://zcode.z.ai`、`https://cdn-zcode.z.ai`、`chat.z.ai`、`api.z.ai`、`bigmodel.cn` 等全部 URL 与 API 路径（如 `/api/v1/zcode-plan/...`）。
- **OAuth 回调协议** `zcode://`：Z.ai 官网登录中转页只会回跳 `zcode://oauth/callback`。Mcode 注册该协议用于接收登录回调；若同一台电脑同时安装了 ZCode，最后启动/安装的应用会成为该协议的默认处理程序。
- **服务端识别字段**：BigModel `appId: "zcode"`、`salesChannel`、`clientType`、请求头 `User-Agent: ZCode/<ver>`、`X-ZCode-*`、`X-Title: Z Code@...`，以及 `zcode-api-key` 等 API Key 名称。
- **官网内嵌页桥接**：`window.zcodeBridge`、`zcodejwttoken`、`__zcodeLang__` 等（Coding Plan 购买页、奖励页依赖）。
- **插件协议**：`.zcode-plugin/plugin.json` 清单目录、`zcode-plugins-official` 市场 id、`ZCODE_PLUGIN_ROOT` 等插件环境变量、插件页面 API `window.zcode`、MCP `_meta` 中的 `zcode/*` 键。
- **远控 relay 协议**字段（如 `zcode_type`），与官方手机/网页远控服务保持兼容。v3.15.5 起手机远控默认走 Mcode 自建中转 `wss://remote.hjh.im/ws`（`deploy/remote-relay`，协议兼容官方 V1），z.ai 官方 relay 作为备用。
- **官网托管页 wire 标识**：`zcode-artifact://`、`.zcode-share`、`zcode-file-citation`、`zcode:coding-plan:*`、`zcode-theme`，以及 RPC 通道名 `zcode-task` / `mcode-agent` / `zcode-session`（手机/网页远控页、分享页、Coding Plan 内嵌页依赖）。
- **远程开发（SSH / WSL / Docker）**：自 v3.17.1 起远端组件由 Mcode 发布流程自行构建（`pnpm --filter @mcode/server-cli stage:remote-assets`），产物 `mcode-server-<平台>.tar.gz` 与 `source-server-release.json` 随版本上传到官网 `https://mcode.hjh.im/releases/<版本>/`，不再使用 z.ai CDN。远端目录 `~/.mcode/server`、`mcode-server.cjs`、`glm/<平台>/mcode.cjs`、`mcode-agent`、插件目录 `mcode-*-plugin`、握手 `mcode-hello`、环境变量 `MCODE_*` 全部为 Mcode 命名；远端运行的是 Mcode 自己的 agent，隐私加固（遥测默认关闭）在远端同样生效。旧版本留在远端 `~/.zcode/server` 的文件不会被使用，可手动删除。
- **RPC 服务成员与数据字段名**（约 90 个，如 `zcodeTaskService`、`zcodeAgentService`、`zcodeJwtToken`、`zcodeBuiltin*`、`addZCodeAgentMcpServer`）：远端上游 server 与官方远控页按名字调用，属于协议的一部分，用户不可见。完整清单见 `scripts/rebrand/rebrand-to-mcode.py` 的保护规则。
- 第三方依赖补丁（`patches/`）与 `LICENSE`。

## 构建与发布差异

- 自动更新改为读取 Mcode 官网 `https://mcode.hjh.im/download/latest/` 的 `latest*.yml`（`packages/desktop/src/main/manifestUpdateProvider.ts` 中的 `GitHubReleasesUpdateProvider`，沿用 GitHub Releases 的扁平布局；官网源码在私有仓库 `MAXHONG/mcode-web`，产物托管在 Cloudflare R2），不再请求 z.ai 的更新 manifest 服务；z.ai 下发的远端强制升级检查始终跳过，避免 Mcode 被引导安装上游 ZCode 安装包。
- 产品主页（Linux 包元数据 homepage、分享文案下载链接）改为 `https://mcode.hjh.im`；登录、套餐等服务端地址仍是 `zcode.z.ai`。
- 安装包未签名、未公证时，macOS 上的更新提示改为打开官网版本下载页（设置 `MCODE_MAC_SIGNED_UPDATES=1` 的签名构建可恢复原地安装）。
- `.github/workflows/release-desktop.yml` 在 macOS（arm64 / x64）、Windows（x64 / ARM64）、Linux（x64 / ARM64）Runner 上构建，推送 `v*` 标签或手动触发后发布到 GitHub Releases，整理各平台更新清单（`scripts/ci/merge-update-manifests.mjs`），再修正更新清单并同步到官网 R2（`scripts/ci/fix-update-manifests.mjs`、`scripts/ci/publish-website-release.mjs`）。
- Mcode 版本号（`package.json` 的 `version`）可独立于上游递增；`mcodeUpstreamVersion` 只记录当前同步的上游 ZCode 版本，并用于 z.ai 官方手机远控页的 `app_version`（`MCODE_REMOTE_UPSTREAM_VERSION`）。远程开发组件按 Mcode 自身版本发布与校验。
- v3.15.3 起，发布工作流同时构建命令行 / Web 发行包（`mcode-<版本>.tar.gz`、`latest.json`、`install.sh`），`install.sh` 默认从官网 `https://mcode.hjh.im/download/latest/` 下载并校验 SHA-256；无界面 Linux 部署见 `docs/linux-headless-web.md` 与 `deploy/linux/`。
- 与上游的行为差异（v3.15.3）：已有可用模型（含个人 Provider）时启动不再强制打开登录页；`mcode --web` 默认总是启用访问令牌，Web 服务拒绝跨站 WebSocket 升级。

## 重新执行改名

`scripts/rebrand/rebrand-to-mcode.py` 是本次改名使用的脚本（包含完整的保留规则），`scripts/rebrand/rebrand-icons.py` 生成图标与 DMG 背景。合并上游新版本时，可在上游代码上重新执行这两个脚本。
