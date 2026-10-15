#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const serverEntry = join(root, "server", "entry-http.js");
const webRoot = join(root, "web");
const agentEntry = join(root, "agent", "mcode.cjs");

const MIN_NODE_MAJOR = 24;

function usage() {
  return `Usage:
  mcode --web [--host <host>] [--port <port>] [--workspace <path>] [--open|--no-open] [--token <token>|--no-token]
  mcode --version

Web options:
  --host <host>       Listen address (default 127.0.0.1; use 0.0.0.0 for LAN access)
  --port <port>       Listen port (default: a free port)
  --workspace <path>  Project directory (default: current directory)
  --open / --no-open  Open a browser (default: only when listening on localhost)
  --token <token>     Use a fixed access token (env MCODE_WEB_TOKEN also works)
  --no-token          Disable the access token (only safe on a trusted single-user machine)

An access token is always generated unless --no-token is given. Open the printed
URL that contains ?token=...; the browser keeps it in a cookie afterwards.
`;
}

// 修复原因：Mcode 依赖 Node 24 的内置能力（node:sqlite 等），Ubuntu 24.04 默认的 Node 22
// 会在启动深处以晦涩的模块错误失败。这里在入口给出明确提示。
function assertNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isInteger(major) || major < MIN_NODE_MAJOR) {
    throw new Error(
      `Mcode requires Node.js >= ${MIN_NODE_MAJOR} (current: ${process.versions.node}). ` +
        "Install Node.js 24 from https://nodejs.org/ and try again.",
    );
  }
}

function readArgValue(argv, arg, index) {
  if (arg.includes("=")) {
    return { nextIndex: index, value: arg.slice(arg.indexOf("=") + 1) };
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${arg}`);
  }
  return { nextIndex: index + 1, value };
}

function parseArgs(argv) {
  const options = {
    command: "serve",
    host: "127.0.0.1",
    open: undefined,
    port: undefined,
    token: undefined,
    tokenEnabled: undefined,
    workspace: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.command = "help";
      continue;
    }
    if (arg === "--version" || arg === "-v") {
      options.command = "version";
      continue;
    }
    if (arg === "--host" || arg.startsWith("--host=")) {
      const parsed = readArgValue(argv, arg, index);
      options.host = parsed.value;
      index = parsed.nextIndex;
      continue;
    }
    if (arg === "--port" || arg.startsWith("--port=")) {
      const parsed = readArgValue(argv, arg, index);
      options.port = Number(parsed.value);
      if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
        throw new Error("--port must be an integer between 0 and 65535");
      }
      index = parsed.nextIndex;
      continue;
    }
    if (arg === "--workspace" || arg.startsWith("--workspace=")) {
      const parsed = readArgValue(argv, arg, index);
      options.workspace = resolve(parsed.value);
      index = parsed.nextIndex;
      continue;
    }
    if (arg === "--open") {
      options.open = true;
      continue;
    }
    if (arg === "--no-open") {
      options.open = false;
      continue;
    }
    if (arg === "--token" || arg.startsWith("--token=")) {
      const parsed = readArgValue(argv, arg, index);
      options.token = parsed.value;
      options.tokenEnabled = true;
      index = parsed.nextIndex;
      continue;
    }
    if (arg === "--no-token") {
      options.tokenEnabled = false;
      continue;
    }
    throw new Error(`Unknown option "${arg}".\n${usage()}`);
  }

  return options;
}

function isLocalHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

// 修复原因：旧行为只在监听非回环地址时生成令牌。本机 127.0.0.1 无令牌时，任何本机进程
// （以及在浏览器里运行的恶意网页，借助 DNS rebinding 等手段）都能直接调用 /api 与 /ws，
// 而这些接口可以执行终端命令、读写文件。因此默认总是启用令牌，`--no-token` 显式关闭。
function shouldProtectHost() {
  return true;
}

function createToken() {
  return randomBytes(24).toString("base64url");
}

function pickPort(host) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePort(port);
      });
    });
  });
}

function formatUrl(host, port, token) {
  const displayHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
  const base = `http://${displayHost}:${port}/`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

function networkUrls(port, token) {
  const urls = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== "IPv4") {
        continue;
      }
      const base = `http://${entry.address}:${port}/`;
      urls.push(token ? `${base}?token=${encodeURIComponent(token)}` : base);
    }
  }
  return urls;
}

function openBrowser(url) {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function assertRuntimeFiles() {
  for (const file of [serverEntry, agentEntry, webRoot]) {
    await access(file).catch((cause) => {
      throw new Error(`Missing runtime file: ${file}`, { cause });
    });
  }
}

async function serve(options) {
  await assertRuntimeFiles();
  const port = options.port && options.port > 0 ? options.port : await pickPort(options.host);
  const protect = options.tokenEnabled ?? shouldProtectHost(options.host);
  const envToken = process.env.MCODE_WEB_TOKEN?.trim() || undefined;
  const token = protect ? (options.token ?? envToken ?? createToken()) : "";
  if (!protect && !isLocalHost(options.host)) {
    console.warn(
      `Warning: --no-token with --host ${options.host} lets anyone on the network run commands as this user.`,
    );
  }
  const open = options.open ?? isLocalHost(options.host);
  const localUrl = formatUrl(options.host, port, token);

  const child = spawn(process.execPath, [serverEntry], {
    cwd: options.workspace,
    env: {
      ...process.env,
      PORT: String(port),
      MCODE_AGENT_SERVER_ARGS_JSON: JSON.stringify([agentEntry, "app-server", "--stdio"]),
      MCODE_AGENT_SERVER_COMMAND: process.execPath,
      MCODE_SERVER_HOST: options.host,
      MCODE_SERVER_WORKSPACE: options.workspace,
      MCODE_WEB_STATIC_ROOT: webRoot,
      // 显式关闭 token 时必须清空继承值，否则 --no-token 仍会开启后端鉴权。
      MCODE_SERVER_AUTH_TOKEN: token,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let shuttingDown = false;
  child.on("error", (error) => {
    console.error(`Unable to start Web server: ${error.message}`);
    process.exit(1);
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      process.exit(0);
    }
    if (signal) {
      process.exit(1);
    }
    process.exit(code ?? 0);
  });

  console.log("");
  console.log("Mcode Web is running");
  console.log(`Local:   ${localUrl}`);
  if (options.host === "0.0.0.0" || options.host === "::") {
    for (const url of networkUrls(port, token)) {
      console.log(`Network: ${url}`);
    }
  }
  console.log("Press Ctrl+C to stop.");
  console.log("");

  if (open) {
    setTimeout(() => openBrowser(localUrl), 500);
  }

  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    child.kill("SIGTERM");
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.on("data", (chunk) => {
      if (chunk.includes(3)) {
        shutdown();
      }
    });
    process.stdin.on("error", () => {
      if (!shuttingDown) {
        shutdown();
      }
    });
  }
}

try {
  const argv = process.argv.slice(2);
  assertNodeVersion();
  if (argv.length === 1 && ["--version", "-v"].includes(argv[0])) {
    console.log(version);
  } else if (argv[0] === "--web") {
    const options = parseArgs(argv.slice(1));
    if (options.command === "help") console.log(usage());
    else if (options.command === "version") console.log(version);
    else await serve(options);
  } else {
    if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
      console.log("Web mode: mcode --web [options] (mcode --web --help for details)\n");
    }
    // CLI 自启动子进程依赖 argv[1]；统一指向真正的 Agent 入口，保留 TTY 与所有原始参数。
    process.argv[1] = agentEntry;
    await import(pathToFileURL(agentEntry).href);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
