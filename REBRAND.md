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
- **远控 relay 协议**字段（如 `zcode_type`），与官方手机/网页远控服务保持兼容。
- 第三方依赖补丁（`patches/`）与 `LICENSE`。

## 构建与发布差异

- 开源构建默认关闭自动更新与远端强制升级检查，避免 Mcode 被引导安装上游 ZCode 安装包。
- 安装包未签名、未公证。
- `.github/workflows/release-desktop.yml` 在 macOS（arm64 / x64）与 Windows（x64）Runner 上构建，推送 `v*` 标签或手动触发后发布到 GitHub Releases。

## 重新执行改名

`scripts/rebrand/rebrand-to-mcode.py` 是本次改名使用的脚本（包含完整的保留规则），`scripts/rebrand/rebrand-icons.py` 生成图标与 DMG 背景。合并上游新版本时，可在上游代码上重新执行这两个脚本。
