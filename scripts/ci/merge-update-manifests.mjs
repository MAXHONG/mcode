#!/usr/bin/env node
// 把各构建任务产出的 electron-builder 更新清单整理成客户端期望的文件名：
//   windows x64  -> latest.yml        windows arm64 -> latest-arm64.yml
//   mac x64+arm64 -> latest-mac.yml（合并 files，MacUpdater 会按 arm64 关键字挑选）
//   linux        -> latest-linux.yml / latest-linux-arm64.yml（构建产物已区分，原样保留）
// 客户端读取规则见 packages/desktop/src/main/manifestUpdateProvider.ts#resolveGitHubReleaseChannelFile。
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// 发布任务只 checkout 不安装依赖，这里内置一个只覆盖 electron-builder 清单形态的 YAML 读写。
function parse(text) {
  const doc = {};
  let list = null;
  let item = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const top = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (top) {
      const [, key, value] = top;
      if (value === "") { list = doc[key] = []; item = null; } else { doc[key] = scalar(value); list = null; }
      continue;
    }
    const start = raw.match(/^\s*-\s+([A-Za-z0-9_]+):\s*(.*)$/);
    if (start && list) { item = { [start[1]]: scalar(start[2]) }; list.push(item); continue; }
    const cont = raw.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
    if (cont && item) { item[cont[1]] = scalar(cont[2]); continue; }
    throw new Error(`unsupported yaml line: ${raw}`);
  }
  return doc;
}
function scalar(v) {
  const t = v.trim();
  if (/^'.*'$/.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  if (/^".*"$/.test(t)) return JSON.parse(t);
  if (/^-?\d+$/.test(t)) return Number(t);
  return t;
}
function emit(v) {
  if (typeof v === "number") return String(v);
  const s = String(v);
  // 版本号、文件名、base64 哈希可原样输出；日期（含 ":"）等其余值用单引号，避免被解析成非字符串。
  const plain = /^[A-Za-z0-9._+/=-]+$/.test(s) && !/^\d+(\.\d+)?$/.test(s);
  return plain ? s : `'${s.replace(/'/g, "''")}'`;
}
function stringify(doc) {
  const lines = [];
  for (const [k, v] of Object.entries(doc)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const it of v) Object.entries(it).forEach(([ik, iv], i) => lines.push(`${i ? "    " : "  - "}${ik}: ${emit(iv)}`));
    } else lines.push(`${k}: ${emit(v)}`);
  }
  return lines.join("\n") + "\n";
}

const dir = process.argv[2] ?? ".";
const staged = readdirSync(dir).filter((name) => /^update-[a-z]+-[a-z0-9]+--latest.*\.yml$/.test(name));
const read = (name) => parse(readFileSync(join(dir, name), "utf8"));
const out = new Map();

for (const name of staged) {
  const [, os, arch, file] = name.match(/^update-([a-z]+)-([a-z0-9]+)--(.+)$/);
  const doc = read(name);
  if (os === "win") {
    out.set(arch === "x64" ? "latest.yml" : `latest-${arch}.yml`, doc);
  } else if (os === "mac") {
    const prev = out.get("latest-mac.yml");
    if (!prev) {
      out.set("latest-mac.yml", doc);
    } else {
      if (prev.version !== doc.version) throw new Error(`mac version mismatch ${prev.version} vs ${doc.version}`);
      prev.files = [...(prev.files ?? []), ...(doc.files ?? [])];
      // path/sha512 是旧版字段，保留 x64 的值作为兜底（arm64 机器按 files 里的 arm64 匹配）。
      if (arch === "x64") Object.assign(prev, { path: doc.path, sha512: doc.sha512 });
    }
  } else {
    out.set(file, doc);
  }
}

if (out.size === 0) throw new Error("no update manifests found");
for (const [file, doc] of out) {
  writeFileSync(join(dir, file), stringify(doc));
  console.log(`[merge-update-manifests] ${file}: version=${doc.version} files=${(doc.files ?? []).map((f) => f.url).join(", ")}`);
}
