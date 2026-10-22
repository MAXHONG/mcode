#!/usr/bin/env node
/**
 * 按目录里的实际文件重算 electron-builder 更新清单（latest*.yml）中的 sha512 / size。
 *
 *   node scripts/ci/fix-update-manifests.mjs <release-dir>
 *
 * 修复原因：electron-builder 生成 latest-mac.yml 之后，发版工作流还会给 dmg staple 公证票据，
 * 文件变大约 2KB，清单里的 dmg 校验值随之过期（v3.15.5 即如此）。客户端按清单校验下载内容，
 * 过期的值会导致校验失败。官网发布前统一按最终文件重算。
 *
 * 只改写已有的 `sha512:` / `size:` 行（files 列表与顶层 path 对应的条目），不改变其他内容；
 * 清单引用的文件不存在时直接失败，避免发布指向缺失文件的清单。只使用 Node 内置模块。
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: fix-update-manifests.mjs <release-dir>");
  process.exit(2);
}

async function digest(name) {
  const path = join(dir, name);
  const [buffer, info] = await Promise.all([readFile(path), stat(path)]);
  return { sha512: createHash("sha512").update(buffer).digest("base64"), size: info.size };
}

const cache = new Map();
async function digestCached(name) {
  if (!cache.has(name)) cache.set(name, digest(name));
  return cache.get(name);
}

const manifests = (await readdir(dir)).filter((name) => /^latest.*\.ya?ml$/.test(name)).sort();
let changed = 0;

for (const manifest of manifests) {
  const lines = (await readFile(join(dir, manifest), "utf8")).split("\n");
  let current = null; // 当前 files 条目引用的文件名
  let topPath = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const entry = line.match(/^\s*-\s+url:\s*(\S+)\s*$/);
    if (entry) {
      current = entry[1];
      continue;
    }
    const top = line.match(/^path:\s*(\S+)\s*$/);
    if (top) {
      topPath = top[1];
      current = null;
      continue;
    }
    const field = line.match(/^(\s*)(sha512|size):\s*(\S+)\s*$/);
    // 顶层 sha512 紧跟在 path 之后、没有缩进；files 条目里的字段带缩进。
    const target = field ? (field[1].length > 0 ? current : topPath) : null;
    if (!field || !target) continue;
    let actual;
    try {
      actual = await digestCached(target);
    } catch {
      throw new Error(`${manifest}: referenced file not found: ${target}`);
    }
    const value = field[2] === "sha512" ? actual.sha512 : String(actual.size);
    if (field[3] !== value) {
      console.log(`~ ${manifest}: ${target} ${field[2]} updated`);
      lines[i] = `${field[1]}${field[2]}: ${value}`;
      changed += 1;
    }
  }
  await writeFile(join(dir, manifest), lines.join("\n"));
}

console.log(`checked ${manifests.length} manifests, ${changed} field(s) corrected`);
