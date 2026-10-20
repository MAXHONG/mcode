# Mcode

<div align="center">
  <img src="public/logo/icons/1024x1024.png" alt="Mcode" width="128" height="128" />
</div>
<p align="center">
  <a href="README.md">简体中文</a> | English ·
  <a href="https://github.com/MAXHONG/mcode/releases">Download</a>
</p>

> **Unofficial notice**: Mcode is an **unofficial community fork** of [ZCode](https://github.com/zai-org/ZCode) (Apache License 2.0). It is **not affiliated with, endorsed by, or authorized by** Z.ai / Zhipu AI or the official ZCode project. "ZCode", "Z.ai", "Zhipu" and "GLM" are trademarks of their respective owners and are mentioned only to describe compatibility. Signing in with a Z.ai account, Coding Plan subscriptions and related services are subject to Z.ai's terms of service; their availability is decided by Z.ai and is not guaranteed by this project. See [REBRAND.md](REBRAND.md) for the list of modifications and [LICENSE](LICENSE) for the original license.

Mcode is an AI coding workspace with desktop, browser, and terminal interfaces. This repository contains the clients, backend services, shared UI, and Agent CLI and runtime source code.

> Mcode is a renamed build of the open-source [zai-org/ZCode](https://github.com/zai-org/ZCode) project (Apache-2.0). Only the product
> name, branding assets and core identifiers were changed; features are unchanged and Z.ai / BigModel sign-in, Coding Plan and the
> official plugin marketplace keep working. See [REBRAND.md](REBRAND.md) for what was renamed and what was intentionally kept.

## Download

Get the latest installers from [Releases](https://github.com/MAXHONG/mcode/releases):

| Platform              | File                          |
| --------------------- | ----------------------------- |
| macOS (Apple Silicon) | `Mcode-<version>-mac-arm64.dmg` |
| macOS (Intel)         | `Mcode-<version>-mac-x64.dmg`   |
| Windows x64           | `Mcode-<version>-win-x64.exe`   |
| Windows ARM64         | `Mcode-<version>-win-arm64.exe` |
| Linux x64 / ARM64     | `.deb`, `.rpm`, `.AppImage`, `.pkg.tar.zst` |
| CLI / Web (headless)  | `mcode-<version>.tar.gz` + `install.sh` (Node.js 24+) |

The installers have no Apple Developer certificate (ad-hoc signed only). On macOS, if the first launch says the developer cannot be verified, go to System Settings → Privacy & Security and click "Open Anyway" (recent macOS no longer allows right-click → Open). If it says the app is damaged (DMGs up to 3.15.4), run `sudo xattr -rd com.apple.quarantine /Applications/Mcode.app`; on Windows choose "More info → Run anyway" in SmartScreen.

### Headless Linux server (Web mode)

```bash
# Requires Node.js 24+
curl -fsSL https://github.com/MAXHONG/mcode/releases/latest/download/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
mcode --web --host 0.0.0.0 --port 3030 --no-open --workspace ~/project
```

Open the token-bearing URL printed in the terminal from any browser on the same network. For machines without GitHub access, download `install.sh` and `mcode-<version>.tar.gz` first, then run `MCODE_DIST_ARCHIVE=./mcode-<version>.tar.gz sh install.sh` for an offline install. Model setup, systemd autostart and security notes: [docs/linux-headless-web.md](docs/linux-headless-web.md) (Chinese).

## Updates

- 2026-10-20: v3.15.5 — Mobile remote control now uses the Mcode self-hosted relay `remote.hjh.im` by default (Cloudflare Worker + Durable Object, wire-compatible with the official relay V1, also serving the Mcode-branded phone page), so it no longer depends on z.ai keeping its relay open. A "Relay server" switch in the remote control dialog (or `MCODE_WEB_REMOTE_CONTROL_RELAY=zai`) falls back to the Z.ai official relay; device identities for the two relays are stored separately. Applies to desktop and the Linux Web build. See `deploy/remote-relay/README.md`.
- 2026-10-16: Unreleased (main) — Username / password sign-in for the Linux Web build: create an account on first visit with the token URL; afterwards the token URL can no longer sign a browser in. Change password / sign out from the sidebar account menu, or manage it on the server with `mcode passwd` (scrypt hashes, lockout after failures, signed sessions). Fixed the incomplete macOS app signature (since 3.15.1, a downloaded DMG reported the app as damaged on first launch): the whole .app is now ad-hoc re-signed at the end of packaging and checked with `codesign --verify --deep --strict`, failing the build otherwise. Mobile QR remote control for the headless Linux Web build: pairing and z.ai relay moved server-side (`@mcode/server`), QR entry in the Web sidebar, disable with `MCODE_WEB_REMOTE_CONTROL=0`. Fixed the QR page 404 caused by an `app_version` z.ai does not serve (now uses the upstream version). Headless docs updated (OAuth works on headless machines, stale FAQ removed).
- 2026-10-16: v3.15.4 — Ported upstream ZCode 3.15.3 fixes (login identity validation, repeated onboarding, onboarding check stuck on slow networks, some requests failing with parallel agents / consecutive model calls). Privacy hardening: feedback, screenshots and diagnostic logs are no longer uploaded to z.ai / Aliyun OSS (GitHub Issues + local log export instead), marketing popups are off by default, and ARMS / event reporting / Agent OTLP are only compiled in with an explicit `MCODE_ALLOW_TELEMETRY=1`. Settings always shows both Z.ai and BigModel Coding Plan; sign in to either one. New GitHub Pages workflow for a Mcode-branded mobile remote page (opt in with `MCODE_WEB_REMOTE_CONTROL_URL=mcode`).
- 2026-10-16: v3.15.3 — New CLI / Web bundle (`mcode-<version>.tar.gz` + `install.sh`, published with each Release) so headless Linux machines can run `mcode --web` for LAN browser access, with a systemd example and deployment guide. The "connect your account" login screen no longer blocks startup when a personal model provider (e.g. an OpenAI-compatible gateway) is configured. Web mode now always enables an access token, accepts `Authorization: Bearer`, rejects cross-site WebSocket upgrades (CSWSH) and compares tokens in constant time. `install.sh` verifies SHA-256, checks Node.js ≥ 24, and supports GitHub Releases and offline installs. `pnpm build:mcode` builds out of the box. The release workflow is read-only by default and build jobs no longer hold a writable token.
- 2026-10-15: v3.15.2 — In-app auto-update from GitHub Releases; Windows ARM64 and Linux x64/ARM64 installers; Mcode logo everywhere.
- 2026-10-14: Renamed ZCode v3.15.1 to Mcode v3.15.1.

## Releasing (maintainers)

**Release rule:** every version that passes verification without serious issues must be merged into `main`, have README / docs / version updated, and be published as a GitHub Release. See [AGENTS.md](AGENTS.md) (section 版本发布铁律) for the full checklist: verify → bump `package.json` version → update both READMEs and docs → PR and merge to `main` → push tag `v<version>` → check the "Release Desktop" workflow and Release assets.

## Setup

Install Git, Node.js **24.14.0**, and pnpm **10.33.2**. [mise.toml](mise.toml) is the source of truth for tool versions. Run all development and packaging commands below from the repository root.

```bash
pnpm bootstrap
```

`pnpm bootstrap` installs workspace dependencies, prepares local desktop runtime assets, and runs `build:bootstrap`.

The Agent CLI and runtime source code lives in [apps/mcode-cli/](apps/mcode-cli/) as a regular directory included when you clone this repository. No separate checkout or Git submodule initialization is required.

Additional setup and build commands:

| Command                        | Purpose                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                 | Install dependencies                                                                                                                |
| `pnpm prepare:desktop-runtime` | Prepare desktop runtime assets, including remote assets by default                                                                  |
| `pnpm prepare:remote-assets`   | Prepare remote runtime assets separately                                                                                            |
| `pnpm bootstrap:with-remote`   | Set up dependencies and local and remote assets, then build the relevant packages sequentially; skip the desktop application bundle |
| `pnpm build`                   | Recursively run each workspace package's build script, including its asset preparation steps                                        |

The default `bootstrap` skips remote asset preparation and is suitable for local desktop development. Run the corresponding preparation command when working with remote workspaces or validating remote distribution assets.

## Development and Usage

### Desktop

```bash
pnpm dev:desktop

# Use the test environment
pnpm dev:desktop:test
```

`pnpm dev:desktop` defaults to `pnpm dev:desktop:prod` and uses production service configuration. The startup script prepares local runtime assets, builds the desktop Agent, then starts Electron and source watchers.

Set `MCODE_DATA_BASE_DIR` to use a separate development data directory. For example, on macOS / Linux:

```bash
MCODE_DATA_BASE_DIR="$HOME/.mcode-dev-home" pnpm dev:desktop:test
```

### Web Development

Use development mode when editing Web or backend source code:

```bash
pnpm dev:web

# Set the backend workspace (macOS / Linux)
MCODE_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

This starts both the Web development server (default: `http://localhost:5173`) and the backend (default: `http://localhost:3030`). Open the Web development server in your browser. `/ws` and general `/api` requests are proxied to the local backend; `/api/v1/oauth/token` is proxied separately to the configured product service.

After changing Agent source code, run `pnpm --filter @mcode/cli... build` and restart the service. To validate the complete distribution, extract and run it as described under Packaging → Mcode CLI distribution below.

### Mcode CLI distribution

The command-line distribution includes the TUI, Web client, and Agent behind one `mcode` command. With no arguments it starts the TUI; a leading `--web` starts Web mode; all other arguments go to the existing Agent CLI. Both modes run locally without Electron.

```bash
# Start the terminal UI by default
mcode

# Start the Web interface
mcode --web

# Set the project and port without opening a browser automatically
mcode --web --workspace /path/to/project --port 3030 --no-open

# Show CLI or Web options
mcode --help
mcode --web --help
```

In Web mode, it uses the current directory as the workspace, listens on `127.0.0.1`, selects an available port, and opens a browser. **Since v3.15.3 an access token is always enabled** (including localhost): open the `?token=` URL printed in the terminal and the browser keeps it in a cookie; press `Ctrl+C` to stop the service. For LAN access, use `--host 0.0.0.0`. Fix the token with `--token` or `MCODE_WEB_TOKEN`, or disable it with `--no-token` (trusted single-user machines only). Scripts can call the API with `Authorization: Bearer <token>`. Cross-site browser WebSocket upgrades are rejected; when a reverse proxy uses a different host name, allow it with `MCODE_SERVER_ALLOWED_ORIGINS`. Headless Linux deployment: [docs/linux-headless-web.md](docs/linux-headless-web.md).

When starting the general Web service's HTTP entry directly, configure API/WebSocket authentication with `MCODE_SERVER_AUTH_TOKEN`. When creating the service programmatically, use the `authToken` option (and `allowedOrigins` for extra WebSocket origins).

See Packaging below for build instructions. `pnpm build:mcode` only creates the distribution; it does not replace an existing `mcode` on `PATH`. If the command still points to an older installation or another checkout, check it with `command -v mcode` on macOS / Linux or `where.exe mcode` on Windows.

### CLI Source Development

Use the source entry when developing the TUI or Agent:

```bash
pnpm --filter @mcode/cli dev --help
pnpm --filter @mcode/cli dev

# Build the CLI and its workspace dependencies
pnpm --filter @mcode/cli... build
node apps/mcode-cli/packages/cli/dist/mcode.cjs --help
```

This entry runs the Agent CLI directly and does not handle the distribution's `--web` switch. Use `pnpm dev:web` for Web development, or the extracted `bin/mcode.mjs` shown below to test the unified command.

### UI Plugin development

See the [UI Plugin guide](UI_PLUGIN.en.md) for the Excalidraw workflow, supported APIs, plugin installation and updates, and host debugging.

**Plugin PRs in `mcode-plugins` must declare whether they affect a UI Plugin and list the plugin names in the PR template.** See the [required plugin-type declaration](UI_PLUGIN.en.md#declare-the-plugin-type-in-pull-requests).

## Configuration

The root [.env.example](.env.example) provides sample service URLs and build configuration. Copy it to `.env` as needed and place local overrides in `.env.local`. Select the Desktop development environment with `dev:desktop:test` or `dev:desktop:prod`.

| Setting                              | Purpose                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `MCODE_DATA_BASE_DIR`                | Base directory for application data, stored under its `.mcode/` subdirectory            |
| `MCODE_SERVER_WORKSPACE`             | Workspace path for the Web backend                                                      |
| `MCODE_BUILTIN_PROVIDER_CONFIG_FILE` | Path to a local provider configuration file; uses the built-in configuration when unset |
| `MCODE_DIST_BASE_URL`                | Download base URL used by the CLI distribution installer                                |
| `MCODE_WEB_TOKEN`                    | Fixed access token for `mcode --web`                                                    |
| `MCODE_SERVER_ALLOWED_ORIGINS`       | Extra browser origins allowed to open the Web server WebSocket (comma separated)        |

Runtime variables can be set explicitly in the environment of the startup command. See [config/README.md](config/README.md) for the default configuration shipped with the client.

## Packaging

See [third-party/README.md](third-party/README.md) for notice generation, distribution checks, and where the notices are included in each distribution.

### Desktop

```bash
pnpm bundle:desktop

# Set the target platform and CPU architecture
pnpm bundle:desktop -- --os win --arch x64

pnpm bundle:desktop -- --help
```

The default target is macOS arm64, and the default output directory is `packages/desktop/dist/`. `--os` accepts `mac`, `win`, or `linux`; `--arch` accepts `x64` or `arm64`. Packaging and signing require the tools and configuration for the target platform.

### Mcode CLI distribution

Run `pnpm build:mcode` to build the CLI/TUI, backend, and Web client, collect the TUI native libraries, workers, and runtime dependencies, then assemble the distribution. Running the distribution still requires Node.js; use the version specified in `mise.toml`.

By default `install.sh` downloads from this repository's latest GitHub Release (`https://github.com/MAXHONG/mcode/releases/latest/download/`). To self-host, set `MCODE_DIST_BASE_URL` in `.env`, `.env.local`, or the process environment, or pass `--base-url`:

```bash
pnpm build:mcode

# Self-hosted download URL (placeholder)
pnpm build:mcode --base-url https://downloads.example.com/mcode/

# Repackage existing Agent, backend, and Web build outputs
pnpm build:mcode --skip-build

# Show options for the version, output directory, and more
pnpm build:mcode --help
```

The version defaults to the root `package.json` version. Output is written to `dist/mcode/`:

- `releases/<version>/mcode-<version>.tar.gz`: runtime package.
- `releases/<version>/sha256.txt`: checksum file.
- `latest.json` and `install.sh`: version index and installer (self-hosted layout).
- `github-release/`: flat Release assets (runtime package, `latest.json`, `install.sh`) uploaded by the release workflow.

Upload the entire directory to the configured download base URL. The installer downloads the runtime package from that URL, verifies its SHA-256 against `latest.json`, requires Node.js ≥ 24, installs it to `~/.mcode/runtime` by default, and creates the `mcode` command in `~/.local/bin`. Override these directories with `MCODE_DIST_HOME` and `MCODE_DIST_BIN_DIR`, respectively; install offline with `MCODE_DIST_ARCHIVE=<path to tar.gz>` (optionally `MCODE_DIST_SHA256`).

Existing Lite users should switch to the new build command, environment variables, and installer. Installation does not remove old Lite directories or migrate/delete session data.

To test a packaged build locally, extract and run it directly without uploading or installing it:

```bash
mcode_version=$(node -p "require('./dist/mcode/latest.json').version")
mkdir -p dist/mcode/debug
tar -xzf "dist/mcode/releases/$mcode_version/mcode-$mcode_version.tar.gz" \
  -C dist/mcode/debug
# Start the TUI by default
node dist/mcode/debug/mcode/bin/mcode.mjs

# Start Web mode
node dist/mcode/debug/mcode/bin/mcode.mjs --web \
  --workspace "$PWD" --port 3030 --no-open

# Release smoke test (extracts outside the repo; checks TUI, Web, token and WebSocket)
node scripts/mcode-distribution-smoke.mjs "dist/mcode/releases/$mcode_version/mcode-$mcode_version.tar.gz"
```

Open the printed `http://127.0.0.1:3030/?token=...` URL to validate the complete flow, with one backend serving the Web pages and running the Agent. The port must be available; if `pnpm dev:web` is already running, choose another `--port`.

## Repository Structure

| Directory                                            | Responsibility                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/desktop`                                   | Electron Main, Host, Renderer, and desktop packaging                                    |
| `packages/web`                                       | Web client                                                                              |
| `packages/server`                                    | HTTP / WebSocket services and remote connections                                        |
| `packages/mcode-server-cli`                          | Standalone server startup and process management                                        |
| `packages/ui`                                        | Shared React components, hooks, and Zustand state                                       |
| `packages/services`                                  | Business services and persistence                                                       |
| `packages/shared`, `packages/rpc`, `packages/client` | Shared protocols and types, RPC framework, and Agent client SDK                         |
| `packages/provider`, `packages/provider-node`        | Common provider capabilities and Node implementations                                   |
| `apps/mcode-cli`                                     | Agent CLI, TUI, runtime, and tools                                                      |
| `scripts`, `config`, `third-party`                   | Build and maintenance scripts, built-in configuration, and third-party notice materials |
| `deploy/linux`                                       | Headless Linux deployment: systemd unit and configuration templates                     |

## Project Notice

See [NOTICE.md](NOTICE.md) for feature and promotion scope, maintenance policy, execution and data risks, licensing, and third-party copyright information.
