# Mcode

<div align="center">
  <img src="public/logo/icons/1024x1024.png" alt="Mcode" width="128" height="128" />
</div>
<p align="center">
  简体中文 | <a href="README.en.md">English</a> ·
  <a href="https://github.com/MAXHONG/mcode/releases">下载安装包</a>
</p>

> **非官方声明**：Mcode 是基于 [ZCode](https://github.com/zai-org/ZCode)（Apache License 2.0）修改的**非官方社区版本**，与 Z.ai / 智谱（Zhipu AI）及 ZCode 官方**没有任何关联**，也未获其认可或授权。"ZCode"、"Z.ai"、"智谱"、"GLM" 等名称和标识归其各自权利人所有，本项目仅为说明兼容性而提及。使用 Z.ai 账号登录、Coding Plan 订阅及相关服务时，须遵守 Z.ai 的用户协议与服务条款；相关服务能否使用由 Z.ai 决定，本项目不作任何保证。修改内容见 [REBRAND.md](REBRAND.md)，原始许可证见 [LICENSE](LICENSE)。

Mcode 是 AI 编程工作台，提供桌面应用、浏览器界面和终端 Agent。本仓库包含客户端、后端服务、共享 UI，以及 Agent CLI 与运行时源码。

> Mcode 基于开源项目 [zai-org/ZCode](https://github.com/zai-org/ZCode)（Apache-2.0）改名构建，仅更换产品名称、品牌资源与核心标识，
> 功能保持一致，并继续使用 Z.ai / BigModel 账号登录、Coding Plan 与官方插件市场。改名范围与保留项见 [REBRAND.md](REBRAND.md)。

## 下载

在 [Releases](https://github.com/MAXHONG/mcode/releases) 页面下载最新安装包：

| 平台                  | 文件                                                       |
| --------------------- | ---------------------------------------------------------- |
| macOS（Apple 芯片）    | `Mcode-<版本>-mac-arm64.dmg`                                 |
| macOS（Intel 芯片）    | `Mcode-<版本>-mac-x64.dmg`                                   |
| Windows x64           | `Mcode-<版本>-win-x64.exe`                                   |
| Windows ARM64         | `Mcode-<版本>-win-arm64.exe`                                 |
| Linux x64             | `.deb`（Debian/Ubuntu）、`.rpm`（Fedora/RHEL）、`.AppImage`、`.pkg.tar.zst`（Arch） |
| Linux ARM64           | 同上，文件名含 `arm64` / `aarch64`                             |
| 命令行 / Web（无界面服务器） | `mcode-<版本>.tar.gz` + `install.sh`（需要 Node.js 24+，见下文）    |

安装包没有苹果开发者证书（仅 ad-hoc 签名）：macOS 首次打开提示“无法验证开发者”时，到 系统设置 → 隐私与安全性 点「仍要打开」（新版 macOS 已不能用右键“打开”跳过）；若仍提示“已损坏”（3.15.4 及更早的 DMG），执行 `sudo xattr -rd com.apple.quarantine /Applications/Mcode.app`；Windows SmartScreen 提示时选择「更多信息 → 仍要运行」。

### 无界面 Linux 服务器（Web 模式）

```bash
# 需要 Node.js 24+
curl -fsSL https://github.com/MAXHONG/mcode/releases/latest/download/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
mcode --web --host 0.0.0.0 --port 3030 --no-open --workspace ~/project
```

用同一内网的浏览器打开终端打印的带 `?token=` 地址即可。仓库私有时需先下载 `install.sh` 与 `mcode-<版本>.tar.gz`，再执行 `MCODE_DIST_ARCHIVE=./mcode-<版本>.tar.gz sh install.sh`。模型配置、systemd 开机自启与安全须知见 [docs/linux-headless-web.md](docs/linux-headless-web.md)。

### 自动更新

v3.15.2 起，Mcode 启动后会定期检查 [GitHub Releases](https://github.com/MAXHONG/mcode/releases/latest) 是否有新版本：

- **Windows / Linux**：提示新版本后可在应用内下载，重启时自动安装。
- **macOS**：安装包未签名，系统不允许自动安装，提示新版本后会打开发布页，下载新 DMG 覆盖安装即可。

v3.15.1 及更早版本没有该功能，需要手动下载一次 v3.15.2 或更高版本。命令行 / Web 版重新执行 `install.sh` 即可升级。

## 更新

- 2026-10-16：未发版（main）— 修复 macOS 安装包签名不完整（自 3.15.1 起，浏览器下载后首次打开会提示“已损坏”）：打包最后对整个 .app 重新 ad-hoc 签名并 `codesign --verify --deep --strict` 校验，失败即构建失败；Linux 无界面 Web 版支持手机扫码远控：配对与 z.ai relay 中转迁到服务端（`@mcode/server`），Web 侧栏新增二维码入口，`MCODE_WEB_REMOTE_CONTROL=0` 可关闭；修复二维码页 `app_version` 用了 z.ai 未提供的版本号导致手机页 404（改用上游版本号）；更新无头部署文档（OAuth 可在无头机器完成、移除过时 FAQ）。
- 2026-10-16：v3.15.4 — 移植官方 ZCode 3.15.3 修复（登录身份验证失败、重复弹出新手引导、弱网卡住引导判断、多 Agent / 连续调用部分请求失败）；隐私加固：反馈 / 截图 / 诊断日志不再上传 z.ai 与阿里云 OSS（改为 GitHub Issues + 本地导出日志），营销弹窗默认关闭，ARMS / 事件上报 / Agent OTLP 须显式 `MCODE_ALLOW_TELEMETRY=1` 才会编入；设置页同时显示 Z.ai 与 BigModel Coding Plan，二选一登录；新增 Mcode 品牌手机远控页面的 GitHub Pages 自托管工作流（`MCODE_WEB_REMOTE_CONTROL_URL=mcode` 启用）。
- 2026-10-16：v3.15.3 — 新增命令行 / Web 发行包（`mcode-<版本>.tar.gz` + `install.sh`，随 Release 发布），可在无界面 Linux 上 `mcode --web` 提供内网浏览器访问，附 systemd 开机自启示例与部署文档；已配置个人模型（如 OpenAI 兼容网关）时不再强制弹出“连接账号”登录页；Web 模式默认始终启用访问令牌、支持 `Authorization: Bearer`、拒绝跨站 WebSocket（CSWSH），令牌比较改为常量时间；`install.sh` 校验 SHA-256、检查 Node.js ≥ 24、支持 GitHub Releases 与离线安装；`pnpm build:mcode` 修复开箱构建失败；发布工作流默认只读权限、构建任务不再持有可写令牌。
- 2026-10-15：v3.15.2 — 应用内自动更新（GitHub Releases）；新增 Windows ARM64、Linux x64/ARM64 安装包；界面 logo 全部改为 Mcode。
- 2026-10-14：基于 ZCode v3.15.1 改名为 Mcode v3.15.1。

## 发布新版本（维护者）

**发布铁律**：每个验证没有严重问题的版本，都必须合并到 `main`、更新 README / 文档 / 版本号，并发布 GitHub Release。完整清单见 [AGENTS.md](AGENTS.md#版本发布铁律maxhongmcode必须遵守)。

1. 完成验证：`pnpm typecheck`、`pnpm lint`、受影响单测、`node --test scripts/mcode-distribution.test.mjs`。
2. 修改根目录 `package.json` 的 `version`，并更新 `README.md` / `README.en.md` 的「更新」章节与相关文档。
3. 提交到分支 → PR → 合并到 `main`。
4. 在 `main` 上推送同名标签：`git tag v<版本> && git push origin v<版本>`。
5. GitHub Actions「Release Desktop」会编译全部平台桌面安装包与命令行 / Web 发行包，并发布为最新 Release；已安装的桌面客户端随后会收到更新提醒。
6. 检查工作流成功、Release 资产齐全。

`mcodeUpstreamVersion` 表示远程开发（SSH/WSL/Docker）复用的上游 ZCode 组件版本，只有同步上游代码时才需要修改。

## 初始化

准备 Git、Node.js **24.14.0** 和 pnpm **10.33.2**，版本以 [mise.toml](mise.toml) 为准。以下开发和打包命令均在仓库根目录执行。

```bash
pnpm bootstrap
```

`pnpm bootstrap` 安装 workspace 依赖、准备桌面本地运行资源，再执行 `build:bootstrap`。

Agent CLI 与运行时源码位于 [apps/mcode-cli/](apps/mcode-cli/)，作为普通目录随本仓库一起克隆，无需单独拉取或初始化 Git submodule。

根据需要选择其他初始化或构建入口：

| 命令                           | 用途                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `pnpm install`                 | 安装依赖                                                          |
| `pnpm prepare:desktop-runtime` | 准备桌面运行资源，默认包含远程资源准备                            |
| `pnpm prepare:remote-assets`   | 单独准备远程运行资源                                              |
| `pnpm bootstrap:with-remote`   | 初始化依赖、本地与远程资源，并串行构建相关包；跳过桌面应用 bundle |
| `pnpm build`                   | 递归执行各 workspace 包的构建脚本，包括包内的资源准备步骤         |

默认 `bootstrap` 跳过远程资源准备，适合本地桌面开发。使用远程工作区或验证远程发行资源时，再运行对应准备命令。

## 开发与运行

### 桌面版

```bash
pnpm dev:desktop

# 使用测试环境
pnpm dev:desktop:test
```

`pnpm dev:desktop` 默认等同于 `pnpm dev:desktop:prod`，使用生产服务配置。启动脚本会准备本地运行资源、构建桌面 Agent，再启动 Electron 和源码监听。

需要独立开发数据目录时，可设置 `MCODE_DATA_BASE_DIR`。例如在 macOS / Linux 中：

```bash
MCODE_DATA_BASE_DIR="$HOME/.mcode-dev-home" pnpm dev:desktop:test
```

### 远程功能（SSH/WSL）

先执行 `pnpm bootstrap:with-remote` 准备远程资源（mock-cdn），再 `pnpm dev:desktop`；连接远程项目时资源选择「本地下载后上传」。开发态资源取自本地 `packages/desktop/mock-cdn` 和本地构建产物，经 SFTP 上传到远程，不访问 CDN。

### Web 开发

修改 Web 或后端源码时，使用开发模式：

```bash
pnpm dev:web

# 指定后端工作区（macOS / Linux）
MCODE_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

该命令同时启动 Web 开发服务器（默认 `http://localhost:5173`）和后端（默认 `http://localhost:3030`）；浏览器访问前者。`/ws` 和一般 `/api` 请求代理到本地后端，`/api/v1/oauth/token` 单独代理到当前配置的产品服务。

Agent 源码修改后，执行 `pnpm --filter @mcode/cli... build` 并重启服务。需要验证完整发行包时，按下方“Mcode 命令行版”打包章节解压运行。

### Mcode 命令行版

命令行发行包包含 TUI、Web 和 Agent，统一使用 `mcode` 启动：无参数进入 TUI；第一个参数为 `--web` 时启动 Web；其他参数交给现有 Agent CLI 处理。两种模式都在本机运行，无需 Electron。

```bash
# 默认进入终端交互界面
mcode

# 启动 Web 界面
mcode --web

# 指定项目和端口，不自动打开浏览器
mcode --web --workspace /path/to/project --port 3030 --no-open

# 查看 CLI 或 Web 参数
mcode --help
mcode --web --help
```

Web 模式默认工作目录为当前目录，监听 `127.0.0.1`，自动选择空闲端口并打开浏览器。**v3.15.3 起始终启用访问令牌**（包括本机监听），访问终端输出的带 `?token=` 链接，浏览器随后用 Cookie 保存令牌；按 `Ctrl+C` 停止服务。局域网访问可使用 `--host 0.0.0.0`。可通过 `--token` 或环境变量 `MCODE_WEB_TOKEN` 固定令牌，`--no-token` 关闭令牌认证（仅限可信的单用户机器）。脚本调用 API 时使用 `Authorization: Bearer <token>`。浏览器发起的跨站 WebSocket 会被拒绝；反向代理域名与服务 Host 不一致时，用 `MCODE_SERVER_ALLOWED_ORIGINS` 放行。无界面 Linux 部署见 [docs/linux-headless-web.md](docs/linux-headless-web.md)。

直接启动通用 Web 服务的 HTTP 入口时，通过 `MCODE_SERVER_AUTH_TOKEN` 配置 API／WebSocket 认证；通过程序接口创建服务时，使用 `authToken` 选项（额外允许的 WebSocket Origin 用 `allowedOrigins`）。

构建方式见下方打包章节。`pnpm build:mcode` 只生成发行包，不会替换 `PATH` 中已有的 `mcode`。如果命令仍指向旧安装或其他源码目录，macOS / Linux 可用 `command -v mcode` 检查，Windows 可用 `where.exe mcode` 检查。

### CLI 源码开发

直接开发 TUI 或 Agent 时，运行源码入口：

```bash
pnpm --filter @mcode/cli dev --help
pnpm --filter @mcode/cli dev

# 构建 CLI 及其 workspace 依赖
pnpm --filter @mcode/cli... build
node apps/mcode-cli/packages/cli/dist/mcode.cjs --help
```

这个入口直接运行 Agent CLI，不经过发行包的 `--web` 分流。开发 Web 用 `pnpm dev:web`；验证统一的 `mcode` 命令，用下方解压后的 `bin/mcode.mjs`。

### UI Plugin 开发

参见 [UI Plugin：能力、API 与调试](UI_PLUGIN.md)，从 Excalidraw 的画布协作示例开始，了解插件安装更新、页面 API 和宿主联调入口。

**向 `mcode-plugins` 提交插件 PR 时，必须在 PR 模板中声明是否为 UI Plugin，并填写插件名称。** 判断标准见[提交 PR 时声明插件类型](UI_PLUGIN.md#提交-pr-时声明插件类型)。

## 配置

根目录 [.env.example](.env.example) 提供服务地址与构建配置示例，可按需复制到 `.env`，本地覆盖放入 `.env.local`。Desktop 的开发环境通过 `dev:desktop:test` / `dev:desktop:prod` 选择。

| 配置                                 | 用途                                             |
| ------------------------------------ | ------------------------------------------------ |
| `MCODE_DATA_BASE_DIR`                | 应用数据基目录，数据写入其下的 `.mcode/`         |
| `MCODE_SERVER_WORKSPACE`             | Web 后端的工作区路径                             |
| `MCODE_BUILTIN_PROVIDER_CONFIG_FILE` | 本地 Provider 配置文件路径；未设置时使用内置配置 |
| `MCODE_DIST_BASE_URL`                | 命令行安装脚本使用的下载根地址                   |
| `MCODE_WEB_TOKEN`                    | `mcode --web` 固定访问令牌                       |
| `MCODE_SERVER_ALLOWED_ORIGINS`       | Web 服务额外允许的浏览器 WebSocket Origin（逗号分隔） |

运行时变量可在启动命令的环境中显式设置。随客户端发布的默认配置见 [config/README.md](config/README.md)。

## 打包

第三方声明生成、发行校验流程及声明在发行物中的位置见 [third-party/README.md](third-party/README.md)。

### 桌面版

```bash
pnpm bundle:desktop

# 指定目标平台与 CPU 架构
pnpm bundle:desktop -- --os win --arch x64

pnpm bundle:desktop -- --help
```

默认目标为 macOS arm64，默认输出目录为 `packages/desktop/dist/`。`--os` 支持 `mac`、`win`、`linux`，`--arch` 支持 `x64`、`arm64`；实际打包与签名需要目标平台对应的工具和配置。

安装：双击打开产物 DMG，将 Mcode 拖入"应用程序"。本地构建未签名，首次打开若被 macOS 拦截，执行：

```bash
sudo xattr -rd com.apple.quarantine /Applications/Mcode.app
```

### Mcode 命令行版

构建入口为 `pnpm build:mcode`。脚本会依次构建 CLI/TUI、后端和 Web，收集 TUI 的原生库、worker 与运行时依赖，再组装发行包；运行发行包仍需要 Node.js，版本以 `mise.toml` 为准。

`install.sh` 默认从本仓库最新 GitHub Release 下载（`https://github.com/MAXHONG/mcode/releases/latest/download/`）。自托管时设置 `MCODE_DIST_BASE_URL`（可放在 `.env`、`.env.local` 或环境变量中）或传入 `--base-url`：

```bash
pnpm build:mcode

# 自托管下载地址（占位示例）
pnpm build:mcode --base-url https://downloads.example.com/mcode/

# 仅重新组包，复用已有的 Agent、后端和 Web 构建产物
pnpm build:mcode --skip-build

# 查看版本、输出目录等可选参数
pnpm build:mcode --help
```

默认版本取根目录 `package.json`，输出目录为 `dist/mcode/`：

- `releases/<version>/mcode-<version>.tar.gz`：运行包。
- `releases/<version>/sha256.txt`：校验摘要。
- `latest.json`、`install.sh`：版本索引和安装脚本（自托管布局）。
- `github-release/`：扁平的 Release 资产（运行包、`latest.json`、`install.sh`），发布工作流直接上传。

完整目录可上传到配置的下载根地址。安装脚本从该地址下载运行包并按 `latest.json` 校验 SHA-256，要求 Node.js ≥ 24，默认安装到 `~/.mcode/runtime`，并在 `~/.local/bin` 创建 `mcode` 命令。安装目录可通过 `MCODE_DIST_HOME` 修改，命令目录可通过 `MCODE_DIST_BIN_DIR` 修改；离线安装用 `MCODE_DIST_ARCHIVE=<tar.gz 路径>`（可配合 `MCODE_DIST_SHA256`）。

旧 Lite 用户需要改用上述构建命令、环境变量和新的安装脚本。新安装不会删除旧 Lite 目录，也不会迁移或删除已有会话数据。

本地调试打包产物时，可直接解压运行，无需上传或安装：

```bash
mcode_version=$(node -p "require('./dist/mcode/latest.json').version")
mkdir -p dist/mcode/debug
tar -xzf "dist/mcode/releases/$mcode_version/mcode-$mcode_version.tar.gz" \
  -C dist/mcode/debug
# 默认启动 TUI
node dist/mcode/debug/mcode/bin/mcode.mjs

# 启动 Web
node dist/mcode/debug/mcode/bin/mcode.mjs --web \
  --workspace "$PWD" --port 3030 --no-open

# 发行包冒烟测试（仓库外解压，验证 TUI、Web、令牌与 WebSocket）
node scripts/mcode-distribution-smoke.mjs "dist/mcode/releases/$mcode_version/mcode-$mcode_version.tar.gz"
```

浏览器打开终端打印的 `http://127.0.0.1:3030/?token=...`，即可验证同一后端服务托管 Web 页面和 Agent 的完整链路。该端口需要空闲；如正在运行 `pnpm dev:web`，可改用其他 `--port`。

## 仓库结构

| 目录                                                 | 职责                                       |
| ---------------------------------------------------- | ------------------------------------------ |
| `packages/desktop`                                   | Electron Main、Host、Renderer 与桌面打包   |
| `packages/web`                                       | Web 客户端                                 |
| `packages/server`                                    | HTTP / WebSocket 服务与远程连接            |
| `packages/mcode-server-cli`                          | 独立 Server 启动与进程管理                 |
| `packages/ui`                                        | 共享 React 组件、hooks 与 Zustand 状态     |
| `packages/services`                                  | 业务服务与持久化                           |
| `packages/shared`、`packages/rpc`、`packages/client` | 共享协议和类型、RPC 框架、Agent 客户端 SDK |
| `packages/provider`、`packages/provider-node`        | Provider 公共能力与 Node 实现              |
| `apps/mcode-cli`                                     | Agent CLI、TUI、运行时与工具               |
| `scripts`、`config`、`third-party`                   | 构建维护脚本、内置配置与第三方声明材料     |
| `deploy/linux`                                       | 无界面 Linux 部署：systemd 服务、配置模板  |

## 项目声明

功能与优惠范围、维护规则、执行与数据风险，以及许可和第三方版权说明，详见 [NOTICE.md](NOTICE.md)。
