#!/usr/bin/env node
import { loadEndpointEnv } from "./load-endpoint-env.mjs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  copyRuntimeNodeModules,
  patchNodePtyPrebuilds,
  stageTuiRuntime,
} from "./mcode-distribution/assets.mjs";
import { installScriptSource } from "./mcode-distribution/installer.mjs";

const root = resolve(import.meta.dirname, "..");
const defaultOutDir = resolve(root, "dist", "mcode");
// 修复原因：旧脚本在未配置 MCODE_DIST_BASE_URL 时直接失败，导致 `pnpm build:mcode` 开箱即坏。
// Mcode 的发行包随每次发布同步到官网 https://mcode.hjh.im（R2 托管，匿名可下载），
// install.sh 默认从官网 `download/latest/` 下载；私有 GitHub 仓库的 Release 资产匿名访问会 404。
const MCODE_WEBSITE_LATEST_BASE_URL = "https://mcode.hjh.im/download/latest/";
const defaultBaseUrl =
  (await loadEndpointEnv()).MCODE_DIST_BASE_URL?.trim() || MCODE_WEBSITE_LATEST_BASE_URL;
const packageDirName = "mcode";
const usage = `Usage:
  pnpm build:mcode
  node scripts/build-mcode.mjs --skip-build
  node scripts/build-mcode.mjs --version 3.3.3-dev.1
  node scripts/build-mcode.mjs --out-dir dist/mcode
  node scripts/build-mcode.mjs --base-url http://host/mcode/deps/mcode/

Options:
  --skip-build        Reuse existing web/server/agent build outputs.
  --version <text>    Release version. Defaults to root package.json version.
  --out-dir <path>    Output directory. Defaults to dist/mcode.
  --base-url <url>    Default install.sh download base URL
                      (default: MCODE_DIST_BASE_URL or ${MCODE_WEBSITE_LATEST_BASE_URL}).
  --help, -h          Show this help.

Outputs (under --out-dir):
  releases/<version>/mcode-<version>.tar.gz, releases/<version>/sha256.txt,
  latest.json, install.sh                  self-hosted download layout
  github-release/                          flat assets for a GitHub Release
`;

function readArgValue(argv, arg, index) {
  if (arg.includes("=")) {
    return {
      nextIndex: index,
      value: arg.slice(arg.indexOf("=") + 1),
    };
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${arg}`);
  }
  return {
    nextIndex: index + 1,
    value,
  };
}

function parseArgs(argv) {
  const options = {
    baseUrl: defaultBaseUrl,
    help: false,
    outDir: defaultOutDir,
    skipBuild: false,
    version: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }
    if (arg === "--version" || arg.startsWith("--version=")) {
      const { nextIndex, value } = readArgValue(argv, arg, index);
      options.version = value;
      index = nextIndex;
      continue;
    }
    if (arg === "--out-dir" || arg.startsWith("--out-dir=")) {
      const { nextIndex, value } = readArgValue(argv, arg, index);
      options.outDir = resolve(root, value);
      index = nextIndex;
      continue;
    }
    if (arg === "--base-url" || arg.startsWith("--base-url=")) {
      const { nextIndex, value } = readArgValue(argv, arg, index);
      options.baseUrl = value.endsWith("/") ? value : `${value}/`;
      index = nextIndex;
      continue;
    }
    throw new Error(`Unknown option "${arg}". Run with --help for usage.`);
  }

  return options;
}

function commandText(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, options = {}) {
  console.log(`[mcode] ${commandText(command, args)}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    throw new Error(`${commandText(command, args)} failed: ${result.error.message}`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new Error(`${commandText(command, args)} failed`);
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function sha256File(file) {
  const hash = createHash("sha256");
  hash.update(await readFile(file));
  return hash.digest("hex");
}

async function assertFile(file, label) {
  const fileStat = await stat(file).catch(() => null);
  if (!fileStat?.isFile()) {
    throw new Error(`Missing ${label}: ${file}`);
  }
}

async function assertDirectory(directory, label) {
  const directoryStat = await stat(directory).catch(() => null);
  if (!directoryStat?.isDirectory()) {
    throw new Error(`Missing ${label}: ${directory}`);
  }
}

async function buildOutputs(skipBuild) {
  if (skipBuild) {
    console.log("[mcode] skipping build; reusing existing outputs");
    return;
  }

  // 修复原因：@mcode/shared 没有 build 脚本，它的 dist/ 只由根 `tsc -b` 产出；
  // TUI 运行时收集器要求 dist/index.js 存在，否则报
  // “Missing @mcode/shared dist files”。这里只编译 shared 本身（不触碰 server dist，
  // 避免 tsc 输出覆盖 tsup 打包的 entry-http.js，见 specs/mcode-unified-distribution.md）。
  // dist/ 被删除但 tsconfig.tsbuildinfo 仍在时，增量构建会误判为最新而不输出，
  // 所以 dist 缺失时用 --force 重新编译。
  const sharedDistEntry = resolve(root, "packages", "shared", "dist", "index.js");
  const sharedDistExists = Boolean(await stat(sharedDistEntry).catch(() => null));
  run("pnpm", ["exec", "tsc", "-b", "packages/shared", ...(sharedDistExists ? [] : ["--force"])]);
  await assertFile(sharedDistEntry, "@mcode/shared dist entry");
  run("pnpm", ["--filter", "@mcode/cli...", "build"]);
  await rm(resolve(root, "packages", "server", "dist"), {
    force: true,
    recursive: true,
  });
  run("pnpm", ["--filter", "@mcode/server", "build"]);
  run("pnpm", ["--filter", "@mcode/web", "build"]);
}

async function stageMcodePackage({ packageRoot, version }) {
  const webDist = resolve(root, "packages", "web", "dist");
  const serverDist = resolve(root, "packages", "server", "dist");
  const agentBundle = resolve(root, "apps", "mcode-cli", "packages", "cli", "dist", "mcode.cjs");
  const agentProvider = resolve(root, "apps/mcode-cli/packages/cli/dist/provider");

  await assertDirectory(webDist, "web dist");
  await assertDirectory(serverDist, "server dist");
  await assertFile(resolve(serverDist, "entry-http.js"), "server HTTP entry");
  await assertFile(agentBundle, "agent app-server bundle");
  await assertFile(resolve(agentProvider, "mcode-builtin.json"), "Agent provider config");

  await rm(packageRoot, {
    force: true,
    recursive: true,
  });
  await mkdir(packageRoot, {
    recursive: true,
  });

  await cp(webDist, resolve(packageRoot, "web"), {
    recursive: true,
  });
  await cp(serverDist, resolve(packageRoot, "server"), {
    recursive: true,
  });
  await mkdir(resolve(packageRoot, "agent"), {
    recursive: true,
  });
  await cp(agentBundle, resolve(packageRoot, "agent", "mcode.cjs"));
  // TUI 入口通过真正的 CLI 路径定位伴随配置；只复制 JS 会在仓库外启动失败。
  await cp(agentProvider, resolve(packageRoot, "agent/provider"), { recursive: true });
  await cp(
    resolve(root, "apps/mcode-cli/packages/cli/dist/THIRD-PARTY-NOTICES.md"),
    resolve(packageRoot, "agent/THIRD-PARTY-NOTICES.md"),
  );
  await chmod(resolve(packageRoot, "agent", "mcode.cjs"), 0o755);

  await stageTuiRuntime(packageRoot);
  await copyRuntimeNodeModules(packageRoot);
  await patchNodePtyPrebuilds(packageRoot);

  await mkdir(resolve(packageRoot, "bin"), {
    recursive: true,
  });
  const runner = resolve(packageRoot, "bin", "mcode.mjs");
  await cp(resolve(root, "scripts/mcode-distribution/runner.mjs"), runner);
  await chmod(runner, 0o755);

  await writeFile(
    resolve(packageRoot, "package.json"),
    JSON.stringify(
      {
        name: "mcode-runtime",
        private: true,
        type: "module",
        version,
      },
      null,
      2,
    ),
  );
}

async function createTarball({ packageParent, releaseDir, tarballName }) {
  await mkdir(releaseDir, {
    recursive: true,
  });
  const tarball = resolve(releaseDir, tarballName);
  await rm(tarball, {
    force: true,
  });
  // 修复原因：macOS 的 bsdtar 默认把扩展属性（com.apple.provenance 等）写成 pax 头，
  // GNU tar 解压时会刷出上百行 “Ignoring unknown extended header keyword”。
  // COPYFILE_DISABLE 关闭 ._ AppleDouble 文件，--no-xattrs/--no-mac-metadata 关闭扩展属性。
  const tarArgs =
    process.platform === "darwin"
      ? ["--no-xattrs", "--no-mac-metadata", "-czf", tarball, "-C", packageParent, packageDirName]
      : ["-czf", tarball, "-C", packageParent, packageDirName];
  run("tar", tarArgs, { env: { ...process.env, COPYFILE_DISABLE: "1" } });
  return tarball;
}

async function writeGithubReleaseAssets({ outDir, tarball, tarballName, sha256, version }) {
  // GitHub Release 资产是扁平的：install.sh 在 base URL 含 `/releases/.../download` 时
  // 直接按 `<base>/<tarball>` 下载，因此这里输出同名的扁平副本供 CI 上传。
  const assetsDir = resolve(outDir, "github-release");
  await rm(assetsDir, { force: true, recursive: true });
  await mkdir(assetsDir, { recursive: true });
  await cp(tarball, resolve(assetsDir, tarballName));
  await writeFile(resolve(assetsDir, `${tarballName}.sha256`), `${sha256}  ${tarballName}\n`);
  await writeFile(
    resolve(assetsDir, "latest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        name: "mcode",
        sha256,
        tarball: tarballName,
        version,
      },
      null,
      2,
    ),
  );
  const installer = resolve(assetsDir, "install.sh");
  await writeFile(installer, installScriptSource(MCODE_WEBSITE_LATEST_BASE_URL));
  await chmod(installer, 0o755);
  return assetsDir;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const rootPackageJson = await readJson(resolve(root, "package.json"));
  const version = options.version ?? rootPackageJson.version;
  if (!version || typeof version !== "string") {
    throw new Error("Unable to resolve Mcode version.");
  }

  await buildOutputs(options.skipBuild);

  const outDir = options.outDir;
  const workDir = resolve(outDir, ".work");
  const packageParent = workDir;
  const packageRoot = resolve(packageParent, packageDirName);
  const releaseDir = resolve(outDir, "releases", version);
  const tarballName = `${packageDirName}-${version}.tar.gz`;

  await rm(workDir, {
    force: true,
    recursive: true,
  });
  await stageMcodePackage({
    packageRoot,
    version,
  });
  const tarball = await createTarball({
    packageParent,
    releaseDir,
    tarballName,
  });
  const sha256 = await sha256File(tarball);
  await writeFile(resolve(releaseDir, "sha256.txt"), `${sha256}  ${tarballName}\n`);

  await writeFile(
    resolve(outDir, "latest.json"),
    JSON.stringify(
      {
        baseUrl: options.baseUrl,
        createdAt: new Date().toISOString(),
        name: "mcode",
        sha256,
        tarball: tarballName,
        version,
      },
      null,
      2,
    ),
  );
  const installScript = resolve(outDir, "install.sh");
  await writeFile(installScript, installScriptSource(options.baseUrl));
  await chmod(installScript, 0o755);
  const githubAssetsDir = await writeGithubReleaseAssets({
    outDir,
    tarball,
    tarballName,
    sha256,
    version,
  });
  await rm(workDir, {
    force: true,
    recursive: true,
  });

  console.log(`[mcode] release directory: ${outDir}`);
  console.log(`[mcode] tarball: ${tarball}`);
  console.log(`[mcode] sha256: ${sha256}`);
  console.log(`[mcode] GitHub Release assets: ${githubAssetsDir}`);
}

await main();
