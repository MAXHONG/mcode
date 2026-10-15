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

The installers are unsigned. On macOS run `sudo xattr -rd com.apple.quarantine /Applications/Mcode.app` if Gatekeeper blocks the first launch; on Windows choose "More info → Run anyway" in SmartScreen.

## Updates

- 2026-10-14: Renamed ZCode v3.15.1 to Mcode v3.15.1.

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

In Web mode, it uses the current directory as the workspace, listens on `127.0.0.1` without token authentication by default, selects an available port, and opens a browser. Use the URL printed in the terminal and press `Ctrl+C` to stop the service. For LAN access, use `--host 0.0.0.0`; listening on a non-local address generates an access token by default. Use the token-bearing URL printed in the terminal. Set a token with `--token`, or disable token authentication with `--no-token`.

When starting the general Web service's HTTP entry directly, configure API/WebSocket authentication with `MCODE_SERVER_AUTH_TOKEN`. When creating the service programmatically, use the `authToken` option.

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

Before packaging, set the download base URL with `MCODE_DIST_BASE_URL` in `.env`, `.env.local`, or the process environment, or pass it through `--base-url`. The URL below is a placeholder; replace it with your hosting URL when publishing:

```bash
pnpm build:mcode --base-url https://downloads.example.com/mcode/

# When MCODE_DIST_BASE_URL is already configured
pnpm build:mcode

# Repackage existing Agent, backend, and Web build outputs
pnpm build:mcode --skip-build

# Show options for the version, output directory, and more
pnpm build:mcode --help
```

The version defaults to the root `package.json` version. Output is written to `dist/mcode/`:

- `releases/<version>/mcode-<version>.tar.gz`: runtime package.
- `releases/<version>/sha256.txt`: checksum file.
- `latest.json` and `install.sh`: version index and installer.

Upload the entire directory to the configured download base URL. The installer downloads the runtime package from that URL, installs it to `~/.mcode/runtime` by default, and creates the `mcode` command in `~/.local/bin`. Override these directories with `MCODE_DIST_HOME` and `MCODE_DIST_BIN_DIR`, respectively.

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
```

Open `http://127.0.0.1:3030` to validate the complete flow, with one backend serving the Web pages and running the Agent. The port must be available; if `pnpm dev:web` is already running, choose another `--port`.

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

## Project Notice

See [NOTICE.md](NOTICE.md) for feature and promotion scope, maintenance policy, execution and data risks, licensing, and third-party copyright information.
