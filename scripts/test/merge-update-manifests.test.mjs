import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = new URL("../ci/merge-update-manifests.mjs", import.meta.url).pathname;
const yml = (version, files, path) =>
  `version: ${version}\nfiles:\n${files.map((f) => `  - url: ${f}\n    sha512: h-${f}\n    size: 1`).join("\n")}\npath: ${path}\nsha512: h-${path}\nreleaseDate: '2026-10-20T00:00:00.000Z'\n`;

test("back-fill keeps existing mac arm64 entries and adds x64", () => {
  const dir = mkdtempSync(join(tmpdir(), "mum-"));
  writeFileSync(join(dir, "latest-mac.yml"), yml("3.15.5", ["Mcode-3.15.5-mac-arm64.zip", "Mcode-3.15.5-mac-arm64.dmg"], "Mcode-3.15.5-mac-arm64.zip"));
  writeFileSync(join(dir, "update-mac-x64--latest-mac.yml"), yml("3.15.5", ["Mcode-3.15.5-mac-x64.zip", "Mcode-3.15.5-mac-x64.dmg"], "Mcode-3.15.5-mac-x64.zip"));
  execFileSync("node", [script, dir]);
  const out = readFileSync(join(dir, "latest-mac.yml"), "utf8");
  for (const f of ["mac-arm64.zip", "mac-arm64.dmg", "mac-x64.zip", "mac-x64.dmg"]) assert.match(out, new RegExp(f));
  assert.match(out, /^path: Mcode-3\.15\.5-mac-x64\.zip$/m);
});

test("an existing manifest of another version is replaced, not merged", () => {
  const dir = mkdtempSync(join(tmpdir(), "mum-"));
  writeFileSync(join(dir, "latest.yml"), yml("3.15.4", ["Mcode-3.15.4-win-x64.exe"], "Mcode-3.15.4-win-x64.exe"));
  writeFileSync(join(dir, "update-win-x64--latest.yml"), yml("3.15.5", ["Mcode-3.15.5-win-x64.exe"], "Mcode-3.15.5-win-x64.exe"));
  execFileSync("node", [script, dir]);
  const out = readFileSync(join(dir, "latest.yml"), "utf8");
  assert.doesNotMatch(out, /3\.15\.4/);
  assert.match(out, /Mcode-3\.15\.5-win-x64\.exe/);
});

test("rebuilding the same file replaces its entry instead of duplicating", () => {
  const dir = mkdtempSync(join(tmpdir(), "mum-"));
  writeFileSync(join(dir, "latest-mac.yml"), yml("3.15.5", ["Mcode-3.15.5-mac-arm64.zip"], "Mcode-3.15.5-mac-arm64.zip"));
  writeFileSync(join(dir, "update-mac-arm64--latest-mac.yml"), yml("3.15.5", ["Mcode-3.15.5-mac-arm64.zip"], "Mcode-3.15.5-mac-arm64.zip"));
  execFileSync("node", [script, dir]);
  const out = readFileSync(join(dir, "latest-mac.yml"), "utf8");
  assert.equal(out.match(/url: Mcode-3\.15\.5-mac-arm64\.zip/g).length, 1);
});
