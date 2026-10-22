#!/usr/bin/env node
/**
 * 把一个版本的发布产物上传到官网 R2 桶（mcode-releases），再切换 stable 指针。
 * 官网（读取这个桶的 Cloudflare Pages 站点）源码在私有仓库 MAXHONG/mcode-web；
 * 两边只通过 R2 布局对接：releases/<version>/<file> 与 channels/stable.json。
 *
 *   node scripts/ci/publish-website-release.mjs --version 3.15.5 --dir dist-release [--no-promote] [--skip-existing]
 *
 * 环境变量：
 *   CLOUDFLARE_ACCOUNT_ID  Cloudflare 账户 ID
 *   R2_ACCESS_KEY_ID       仅限 mcode-releases 桶读写的 R2 令牌 ID
 *   R2_SECRET_ACCESS_KEY   该令牌 Token value 的 SHA-256（hex），即 R2 的 S3 Secret Access Key
 *   MCODE_R2_BUCKET        可选，默认 mcode-releases
 *
 * 为什么用 S3 兼容接口：只有 S3 接口能使用“桶级”权限的令牌（泄露也只能动这一个桶）；
 * Cloudflare REST 对象接口要求账户级 R2 权限，范围太大。这里只用 Node 内置模块手写
 * SigV4 签名，不引入任何 npm 依赖，避免在持有令牌的 CI 步骤里执行第三方代码。
 * 单次 PUT 上限 5 GiB，Mcode 安装包约 120–200 MB。
 *
 * 顺序保证：先上传安装包 → 再上传 latest*.yml / latest.json → 逐个校验远端大小
 * → 最后写 channels/stable.json（切换只有这一次单对象写入）。
 */
import { createHash, createHmac } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    dir: { type: "string" },
    "no-promote": { type: "boolean", default: false },
    "skip-existing": { type: "boolean", default: false },
    concurrency: { type: "string", default: "3" },
  },
});

const version = values.version?.replace(/^v/, "");
const dir = values.dir;
if (!version || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version) || !dir) {
  console.error(
    "Usage: publish-website-release.mjs --version <x.y.z> --dir <directory> [--no-promote] [--skip-existing]",
  );
  process.exit(2);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucket = process.env.MCODE_R2_BUCKET?.trim() || "mcode-releases";
if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required");
  process.exit(2);
}

const host = `${accountId}.r2.cloudflarestorage.com`;
const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

function encodeKey(key) {
  return key
    .split("/")
    .map((part) =>
      encodeURIComponent(part).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}

/** AWS SigV4（region=auto, service=s3）。 */
async function s3(method, key, { body, contentType, query = "" } = {}) {
  const path = key === null ? `/${bucket}` : `/${bucket}/${encodeKey(key)}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const payloadHash = body === undefined ? sha256Hex("") : sha256Hex(body);
  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(contentType ? { "content-type": contentType } : {}),
  };
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalRequest = [
    method,
    path,
    query,
    signedHeaderNames.map((name) => `${name}:${headers[name]}\n`).join(""),
    signedHeaderNames.join(";"),
    payloadHash,
  ].join("\n");
  const scope = `${day}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), "auto"), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const { host: _host, ...sendHeaders } = headers;
  return fetch(`https://${host}${path}${query ? `?${query}` : ""}`, {
    method,
    ...(body === undefined ? {} : { body }),
    headers: {
      ...sendHeaders,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`,
    },
  });
}

async function withRetry(label, fn) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fn();
      if (response.ok || response.status === 404 || response.status === 403 || attempt >= 4) {
        return response;
      }
      console.warn(`  ${label} -> ${response.status}, retry ${attempt}`);
    } catch (error) {
      if (attempt >= 4) throw error;
      console.warn(`  ${label} failed (${error.message}), retry ${attempt}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
  }
}

/**
 * 读取远端对象大小。Node fetch 不会把 HEAD 响应的 content-length 暴露出来，
 * 因此用 ListObjectsV2（prefix=key）读 <Size>。
 */
async function remoteSize(key) {
  const query = `list-type=2&max-keys=5&prefix=${encodeURIComponent(key)}`;
  const response = await withRetry(`LIST ${key}`, () => s3("GET", null, { query }));
  if (!response.ok) return null;
  const xml = await response.text();
  for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const entry = match[1];
    const entryKey = entry.match(/<Key>([\s\S]*?)<\/Key>/)?.[1]?.replace(/&amp;/g, "&");
    if (entryKey === key) return Number(entry.match(/<Size>(\d+)<\/Size>/)?.[1]);
  }
  return null;
}

function contentType(name) {
  if (/\.ya?ml$/i.test(name)) return "text/yaml";
  if (/\.json$/i.test(name)) return "application/json";
  if (/\.(sh|txt|sha256)$/i.test(name)) return "text/plain";
  return "application/octet-stream";
}

async function upload(name) {
  const path = join(dir, name);
  const { size } = await stat(path);
  const key = `releases/${version}/${name}`;
  if (values["skip-existing"] && (await remoteSize(key)) === size) {
    console.log(`= ${key} (${size} bytes, already uploaded)`);
    return;
  }
  const body = await readFile(path);
  const response = await withRetry(`PUT ${key}`, () =>
    s3("PUT", key, { body, contentType: contentType(name) }),
  );
  if (!response.ok) {
    throw new Error(`upload ${key} failed: ${response.status} ${await response.text()}`);
  }
  console.log(`+ ${key} (${size} bytes)`);
}

const files = (await readdir(dir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /^[0-9A-Za-z][0-9A-Za-z._+-]*$/.test(name));

for (const required of ["latest.yml", "latest-mac.yml", "latest-linux.yml"]) {
  if (!files.includes(required)) console.warn(`warning: ${required} is missing in ${dir}`);
}

const isManifest = (name) => /^latest.*\.(ya?ml|json)$/i.test(name);
const payloads = files.filter((name) => !isManifest(name));
const manifests = files.filter(isManifest);

const limit = Math.max(1, Number.parseInt(values.concurrency, 10) || 3);
const queue = [...payloads];
await Promise.all(
  Array.from({ length: limit }, async () => {
    while (queue.length > 0) await upload(queue.shift());
  }),
);
for (const name of manifests) await upload(name);

for (const name of files) {
  const { size } = await stat(join(dir, name));
  const actual = await remoteSize(`releases/${version}/${name}`);
  if (actual !== size) throw new Error(`verify ${name}: remote size ${actual} != local ${size}`);
}
console.log(`verified ${files.length} files under releases/${version}/`);

if (values["no-promote"]) {
  console.log("skip promoting stable channel (--no-promote)");
} else {
  const pointer = JSON.stringify({ version, publishedAt: new Date().toISOString() }, null, 2);
  const response = await withRetry("PUT channels/stable.json", () =>
    s3("PUT", "channels/stable.json", { body: pointer, contentType: "application/json" }),
  );
  if (!response.ok) {
    throw new Error(`promote stable failed: ${response.status} ${await response.text()}`);
  }
  console.log(`stable channel -> ${version}`);
}
