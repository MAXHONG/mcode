import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = resolve(import.meta.dirname, "../dist/mcode.cjs");

test("sets the visible process name before running commands", async () => {
  const { stdout } = await execFileAsync(process.execPath, [cli, "doctor", "--json"]);
  const payload = JSON.parse(stdout);

  assert.equal(payload.cli.name, "mcode");
  assert.equal(payload.cli.processName, "mcode-cli");
  assert.equal(payload.runtime.processTitle, "mcode-cli");
});
