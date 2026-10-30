import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";
import { test } from "node:test";
import { patchNodePtyPrebuilds } from "./mcode-distribution/assets.mjs";
import { installScriptSource } from "./mcode-distribution/installer.mjs";

const exec = promisify(execFile);
const runnerSource = new URL("./mcode-distribution/runner.mjs", import.meta.url);

async function fixture(t) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "mcode-distribution-")));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "mcode");
  for (const name of ["bin", "agent", "web", "server"]) {
    await mkdir(join(root, name), { recursive: true });
  }
  await cp(runnerSource, join(root, "bin/mcode.mjs"));
  await writeFile(join(root, "package.json"), JSON.stringify({ type: "module", version: "1.2.3" }));
  await writeFile(
    join(root, "agent/mcode.cjs"),
    `
process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), entry: process.argv[1], cwd: process.cwd() }));
process.exitCode = Number(process.env.FIXTURE_EXIT_CODE || 0);
`,
  );
  await writeFile(
    join(root, "server/entry-http.js"),
    `
import { writeFile } from 'node:fs/promises';
await writeFile(process.env.FIXTURE_WEB_RESULT, JSON.stringify({
  cwd: process.cwd(), port: process.env.PORT, host: process.env.MCODE_SERVER_HOST,
  workspace: process.env.MCODE_SERVER_WORKSPACE, staticRoot: process.env.MCODE_WEB_STATIC_ROOT,
  command: process.env.MCODE_AGENT_SERVER_COMMAND, args: JSON.parse(process.env.MCODE_AGENT_SERVER_ARGS_JSON),
  token: process.env.MCODE_SERVER_AUTH_TOKEN,
}));
process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 1000);
`,
  );
  return { directory, root, runner: join(root, "bin/mcode.mjs") };
}

test("default launch and CLI arguments reuse the Agent entry without starting Web", async (t) => {
  const { runner, root, directory } = await fixture(t);
  for (const args of [[], ["tui"], ["--prompt", "--web"], ["app-server", "--stdio"]]) {
    const result = await exec(process.execPath, [runner, ...args], { cwd: directory });
    assert.deepEqual(JSON.parse(result.stdout), {
      argv: args,
      entry: join(root, "agent/mcode.cjs"),
      cwd: directory,
    });
  }
  await assert.rejects(
    exec(process.execPath, [runner], { env: { ...process.env, FIXTURE_EXIT_CODE: "17" } }),
    (error) => error.code === 17,
  );
});

test("help exposes Web mode and preserves CLI help; version uses the distribution", async (t) => {
  const { runner } = await fixture(t);
  assert.equal((await exec(process.execPath, [runner, "--version"])).stdout.trim(), "1.2.3");
  const help = (await exec(process.execPath, [runner, "--help"])).stdout;
  assert.match(help, /mcode --web/);
  assert.match(help, /"argv":\["--help"\]/);
  const webHelp = (await exec(process.execPath, [runner, "--web", "--help"])).stdout;
  assert.match(webHelp, /--workspace/);
  assert.doesNotMatch(webHelp, /"argv"/);
  await assert.rejects(exec(process.execPath, [runner, "--web", "--unknown"]), /Unknown option/);
  await assert.rejects(
    exec(process.execPath, [runner, "--web", "--port", "NaN"]),
    /--port must be an integer/,
  );
});

test("Web startup errors preserve a failing exit code", async (t) => {
  const { runner, directory, root } = await fixture(t);
  await assert.rejects(
    exec(process.execPath, [
      runner,
      "--web",
      "--workspace",
      join(directory, "missing"),
      "--no-open",
    ]),
    /Unable to start Web server/,
  );
  await rm(join(root, "server/entry-http.js"));
  await assert.rejects(
    exec(process.execPath, [runner, "--web", "--no-open"]),
    /Missing runtime file/,
  );
});

test("Web mode passes its runtime configuration and terminates its child on shutdown", async (t) => {
  const { directory, runner, root } = await fixture(t);
  const resultPath = join(directory, "web-result.json");
  const child = spawn(
    process.execPath,
    [
      runner,
      "--web",
      "--workspace",
      directory,
      "--host",
      "127.0.0.1",
      "--port",
      "3041",
      "--no-open",
      "--no-token",
    ],
    {
      env: {
        ...process.env,
        FIXTURE_WEB_RESULT: resultPath,
        MCODE_SERVER_AUTH_TOKEN: "stale-token",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => {
    if (child.exitCode === null) child.kill();
  });
  let result;
  for (let attempt = 0; attempt < 100; attempt++) {
    result = await readFile(resultPath, "utf8")
      .then(JSON.parse)
      .catch(() => undefined);
    if (result) break;
    await setTimeout(20);
  }
  assert.deepEqual(result, {
    cwd: directory,
    port: "3041",
    host: "127.0.0.1",
    workspace: directory,
    staticRoot: join(root, "web"),
    command: process.execPath,
    args: [join(root, "agent/mcode.cjs"), "app-server", "--stdio"],
    token: "",
  });
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  assert.deepEqual(await exited, [0, null]);
});

async function startWebAndReadConfig(t, extraArgs, extraEnv = {}) {
  const { directory, runner } = await fixture(t);
  const resultPath = join(directory, "web-result.json");
  const child = spawn(
    process.execPath,
    [runner, "--web", "--workspace", directory, "--port", "3042", "--no-open", ...extraArgs],
    {
      env: { ...process.env, FIXTURE_WEB_RESULT: resultPath, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  t.after(() => {
    if (child.exitCode === null) child.kill();
  });
  let result;
  for (let attempt = 0; attempt < 100; attempt++) {
    result = await readFile(resultPath, "utf8")
      .then(JSON.parse)
      .catch(() => undefined);
    if (result) break;
    await setTimeout(20);
  }
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
  return { result, stdout };
}

test("Web mode generates an access token by default even on localhost", async (t) => {
  const { result, stdout } = await startWebAndReadConfig(t, ["--host", "127.0.0.1"]);
  assert.match(result.token, /^[A-Za-z0-9_-]{24,}$/);
  assert.ok(stdout.includes(`?token=${encodeURIComponent(result.token)}`), stdout);
});

test("Web mode accepts a fixed token from MCODE_WEB_TOKEN", async (t) => {
  const { result } = await startWebAndReadConfig(t, [], { MCODE_WEB_TOKEN: "fixed-token-123" });
  assert.equal(result.token, "fixed-token-123");
});

async function makeInstallerFixture(t, { layout }) {
  const { directory, root } = await fixture(t);
  const downloads = join(directory, "downloads");
  const tarballName = "mcode-1.2.3.tar.gz";
  const releaseDir = layout === "github" ? downloads : join(downloads, "releases/1.2.3");
  await mkdir(releaseDir, { recursive: true });
  const tarball = join(releaseDir, tarballName);
  await exec("tar", ["-czf", tarball, "-C", directory, "mcode"]);
  const sha256 = createHash("sha256")
    .update(await readFile(tarball))
    .digest("hex");
  const baseUrl =
    layout === "github" ? `file://${downloads}/releases/latest/download/` : `file://${downloads}/`;
  if (layout === "github") {
    // 模拟 GitHub 的扁平资产路径 <repo>/releases/latest/download/<asset>
    const flat = join(downloads, "releases/latest/download");
    await mkdir(flat, { recursive: true });
    await cp(tarball, join(flat, tarballName));
  }
  const latestDir = layout === "github" ? join(downloads, "releases/latest/download") : downloads;
  await writeFile(
    join(latestDir, "latest.json"),
    JSON.stringify({ version: "1.2.3", tarball: tarballName, sha256 }),
  );
  return { directory, root, downloads, baseUrl, tarball, sha256, latestDir };
}

async function runInstaller(directory, baseUrl, env = {}) {
  const installer = join(directory, "install.sh");
  await writeFile(installer, installScriptSource(baseUrl));
  const installRoot = join(directory, "installed");
  const bin = join(directory, "bin");
  const result = await exec("sh", [installer], {
    env: {
      ...process.env,
      MCODE_DIST_BASE_URL: baseUrl,
      MCODE_DIST_HOME: installRoot,
      MCODE_DIST_BIN_DIR: bin,
      ...env,
    },
  });
  return { ...result, bin, installRoot };
}

test("installer verifies SHA-256 and supports the GitHub Releases flat layout", async (t) => {
  const { directory, root, baseUrl } = await makeInstallerFixture(t, { layout: "github" });
  const { stdout, bin } = await runInstaller(directory, baseUrl);
  assert.match(stdout, /SHA-256 verified/);
  await rm(root, { recursive: true });
  const result = await exec(join(bin, "mcode"), [], { cwd: directory });
  assert.deepEqual(JSON.parse(result.stdout).argv, []);
});

test("installer supports the Mcode website download/latest flat layout", async (t) => {
  const { directory, root, downloads, tarball, sha256 } = await makeInstallerFixture(t, {
    layout: "selfhosted",
  });
  // 模拟官网 https://mcode.hjh.im/download/latest/<asset>
  const flat = join(downloads, "download/latest");
  await mkdir(flat, { recursive: true });
  await cp(tarball, join(flat, "mcode-1.2.3.tar.gz"));
  await writeFile(
    join(flat, "latest.json"),
    JSON.stringify({ version: "1.2.3", tarball: "mcode-1.2.3.tar.gz", sha256 }),
  );
  const { stdout, bin } = await runInstaller(directory, `file://${downloads}/download/latest/`);
  assert.match(stdout, /SHA-256 verified/);
  await rm(root, { recursive: true });
  const result = await exec(join(bin, "mcode"), [], { cwd: directory });
  assert.deepEqual(JSON.parse(result.stdout).argv, []);
});

test("installer rejects an archive whose SHA-256 does not match latest.json", async (t) => {
  const { directory, baseUrl, latestDir } = await makeInstallerFixture(t, { layout: "github" });
  await writeFile(
    join(latestDir, "latest.json"),
    JSON.stringify({ version: "1.2.3", tarball: "mcode-1.2.3.tar.gz", sha256: "0".repeat(64) }),
  );
  await assert.rejects(runInstaller(directory, baseUrl), /SHA-256 mismatch/);
});

test("installer installs an offline archive via MCODE_DIST_ARCHIVE", async (t) => {
  const { directory, root, tarball, sha256 } = await makeInstallerFixture(t, {
    layout: "selfhosted",
  });
  const { stdout, bin } = await runInstaller(directory, "file:///nonexistent/", {
    MCODE_DIST_ARCHIVE: tarball,
    MCODE_DIST_SHA256: sha256,
  });
  assert.match(stdout, /Mcode 1\.2\.3 installed/);
  assert.match(stdout, /SHA-256 verified/);
  await rm(root, { recursive: true });
  const result = await exec(join(bin, "mcode"), ["--web", "--help"]);
  assert.match(result.stdout, /mcode --web/);
});

test("installer refuses Node.js older than 24", async (t) => {
  const { directory, baseUrl } = await makeInstallerFixture(t, { layout: "github" });
  const fakeBin = join(directory, "fake-node-bin");
  await mkdir(fakeBin, { recursive: true });
  await writeFile(
    join(fakeBin, "node"),
    `#!/bin/sh\nif [ "$1" = "-p" ]; then echo 22; exit 0; fi\nif [ "$1" = "-v" ]; then echo v22.0.0; exit 0; fi\nexec "${process.execPath}" "$@"\n`,
  );
  await chmod(join(fakeBin, "node"), 0o755);
  await assert.rejects(
    runInstaller(directory, baseUrl, { PATH: `${fakeBin}:${process.env.PATH}` }),
    /Node\.js >= 24 is required/,
  );
});

test("installer creates mcode and the installed command defaults to CLI", async (t) => {
  const { directory, root } = await fixture(t);
  const downloads = join(directory, "downloads");
  const releaseDir = join(downloads, "releases/1.2.3");
  await mkdir(releaseDir, { recursive: true });
  await exec("tar", ["-czf", join(releaseDir, "mcode-1.2.3.tar.gz"), "-C", directory, "mcode"]);
  await writeFile(
    join(downloads, "latest.json"),
    JSON.stringify({ version: "1.2.3", tarball: "mcode-1.2.3.tar.gz" }),
  );
  const installer = join(directory, "install.sh");
  await writeFile(installer, installScriptSource(`file://${downloads}/`));
  const installRoot = join(directory, "installed");
  const bin = join(directory, "bin");
  await exec("sh", [installer], {
    env: {
      ...process.env,
      MCODE_DIST_BASE_URL: `file://${downloads}/`,
      MCODE_DIST_HOME: installRoot,
      MCODE_DIST_BIN_DIR: bin,
    },
  });
  await rm(root, { recursive: true });
  const result = await exec(join(bin, "mcode"), [], { cwd: directory });
  assert.deepEqual(JSON.parse(result.stdout).argv, []);
  const webHelp = await exec(join(bin, "mcode"), ["--web", "--help"]);
  assert.match(webHelp.stdout, /mcode --web/);
});

test("node-pty prebuild patch keeps the official native that matches the official JS", async (t) => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "mcode-distribution-pty-")));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const prebuilds = join(directory, "node_modules/node-pty/prebuilds");
  await mkdir(join(prebuilds, "darwin-arm64"), { recursive: true });
  await writeFile(join(prebuilds, "darwin-arm64/pty.node"), "official-1.1.0");
  await patchNodePtyPrebuilds(directory);
  // Bug 回归：旧补丁用平台包 1.2.0-beta.10 的 darwin native 覆盖官方 1.1.0 native，
  // 官方 JS 只传 3 个 resize 参数，新 native 要 5 个，macOS 终端 resize 必然失败。
  assert.equal(await readFile(join(prebuilds, "darwin-arm64/pty.node"), "utf8"), "official-1.1.0");
  // 官方包缺失的平台仍由平台包补齐。
  assert.ok((await readFile(join(prebuilds, "linux-x64/pty.node"))).length > 0);
});
