// Linux Web 发行版的账号密码登录。
//
// 背景：此前 Web 版只靠“带 ?token= 的链接”鉴权，链接会留在浏览器历史、终端输出与
// systemd journal 里，任何拿到链接的人都能以运行用户身份执行命令。这里增加一层账号密码：
// - 未设置密码时：仍需访问令牌；持有令牌的浏览器可以创建账号密码（防止局域网他人抢注）。
// - 设置密码后：URL 里的 ?token= 不再能登录，浏览器必须用账号密码换取会话 Cookie；
//   非浏览器客户端仍可用 Authorization: Bearer <token>。
// - 密码使用 scrypt（随机盐）存储；会话 Cookie 由文件中的 sessionSecret 做 HMAC 签名，
//   修改密码会轮换 sessionSecret，使所有旧会话失效。
// 存储格式与 scripts/mcode-distribution/runner.mjs 的 `mcode passwd` 保持一致。
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

export const WEB_AUTH_SESSION_COOKIE = "mcode_web_session";
export const WEB_AUTH_FILE_VERSION = 1;
export const WEB_AUTH_MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[A-Za-z0-9._@-]{1,64}$/;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 } as const;
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface WebAuthFile {
  version: number;
  username: string;
  /** scrypt$N$r$p$saltBase64$hashBase64 */
  passwordHash: string;
  sessionSecret: string;
  updatedAt: string;
}

export interface WebAuthSession {
  username: string;
  expiresAt: number;
}

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  N: number,
  r: number,
  p: number,
) {
  return new Promise<Buffer>((resolvePromise, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolvePromise(key)),
    );
  });
}

export async function hashWebAuthPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const { N, r, p, keyLength } = SCRYPT_PARAMS;
  const hash = await scrypt(password, salt, keyLength, N, r, p);
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyWebAuthPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (![N, r, p].every((value) => Number.isInteger(value) && value > 0))
    return false;
  const expected = Buffer.from(hashRaw!, "base64");
  if (expected.length === 0) return false;
  const actual = await scrypt(
    password,
    Buffer.from(saltRaw!, "base64"),
    expected.length,
    N,
    r,
    p,
  );
  return timingSafeEqual(actual, expected);
}

export function validateWebAuthUsername(username: unknown): string | null {
  if (typeof username !== "string") return "用户名不能为空";
  return USERNAME_PATTERN.test(username.trim())
    ? null
    : "用户名只能包含字母、数字和 . _ @ -，长度 1–64";
}

export function validateWebAuthPassword(password: unknown): string | null {
  if (
    typeof password !== "string" ||
    password.length < WEB_AUTH_MIN_PASSWORD_LENGTH
  ) {
    return `密码至少 ${WEB_AUTH_MIN_PASSWORD_LENGTH} 位`;
  }
  if (password.length > 256) return "密码过长";
  return null;
}

function isWebAuthFile(value: unknown): value is WebAuthFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.username === "string" &&
    typeof file.passwordHash === "string" &&
    typeof file.sessionSecret === "string" &&
    file.sessionSecret.length >= 32
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

export interface WebPasswordAuthOptions {
  filePath: string;
  now?: () => number;
}

/** 账号密码存储、会话签发与登录限速。文件每次读取，`mcode passwd` 修改后无需重启服务。 */
export class WebPasswordAuth {
  private readonly filePath: string;
  private readonly now: () => number;
  private readonly attempts = new Map<string, AttemptState>();
  private cache: { raw: string; file: WebAuthFile | null } | null = null;

  constructor(options: WebPasswordAuthOptions) {
    this.filePath = options.filePath;
    this.now = options.now ?? Date.now;
  }

  async load(): Promise<WebAuthFile | null> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    if (this.cache?.raw === raw) return this.cache.file;
    let file: WebAuthFile | null = null;
    try {
      const parsed: unknown = JSON.parse(raw);
      file = isWebAuthFile(parsed) ? parsed : null;
    } catch {
      file = null;
    }
    if (!file) {
      // 文件损坏时不能退化为“未设置密码”（那会重新开放令牌注册），直接拒绝所有会话。
      throw new Error(`Invalid web auth file: ${this.filePath}`);
    }
    this.cache = { raw, file };
    return file;
  }

  async isConfigured(): Promise<boolean> {
    return (await this.load()) !== null;
  }

  async setCredentials(
    username: string,
    password: string,
  ): Promise<WebAuthFile> {
    const file: WebAuthFile = {
      version: WEB_AUTH_FILE_VERSION,
      username: username.trim(),
      passwordHash: await hashWebAuthPassword(password),
      sessionSecret: randomBytes(32).toString("base64url"),
      updatedAt: new Date(this.now()).toISOString(),
    };
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(file, null, 2)}\n`, {
      mode: 0o600,
    });
    await chmod(tempPath, 0o600);
    await rename(tempPath, this.filePath);
    this.cache = null;
    return file;
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
    this.cache = null;
  }

  /** 返回剩余锁定毫秒数；0 表示可以尝试。 */
  lockRemainingMs(key: string): number {
    const state = this.attempts.get(key);
    if (!state) return 0;
    return Math.max(0, state.lockedUntil - this.now());
  }

  private recordFailure(key: string): void {
    const state = this.attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
    state.failures += 1;
    // 连续 5 次失败后锁定，之后每次失败锁定时间翻倍（30s 起，上限 15 分钟）。
    if (state.failures >= 5) {
      const lockMs = Math.min(30_000 * 2 ** (state.failures - 5), 15 * 60_000);
      state.lockedUntil = this.now() + lockMs;
    }
    this.attempts.set(key, state);
    if (this.attempts.size > 10_000) {
      const oldest = this.attempts.keys().next().value;
      if (oldest !== undefined) this.attempts.delete(oldest);
    }
  }

  async verifyLogin(
    key: string,
    username: string,
    password: string,
  ): Promise<
    | { ok: true; file: WebAuthFile }
    | {
        ok: false;
        reason: "locked" | "invalid" | "unconfigured";
        retryAfterMs?: number;
      }
  > {
    const locked = this.lockRemainingMs(key);
    if (locked > 0)
      return { ok: false, reason: "locked", retryAfterMs: locked };
    const file = await this.load();
    if (!file) return { ok: false, reason: "unconfigured" };
    // 用户名比较也走常量时间，并且无论用户名是否正确都执行一次 scrypt，避免计时区分。
    const left = Buffer.from(username.trim(), "utf8");
    const right = Buffer.from(file.username, "utf8");
    const usernameOk =
      left.length === right.length && timingSafeEqual(left, right);
    const passwordOk = await verifyWebAuthPassword(password, file.passwordHash);
    if (usernameOk && passwordOk) {
      this.attempts.delete(key);
      return { ok: true, file };
    }
    this.recordFailure(key);
    const retryAfterMs = this.lockRemainingMs(key);
    return retryAfterMs > 0
      ? { ok: false, reason: "locked", retryAfterMs }
      : { ok: false, reason: "invalid" };
  }

  issueSessionCookieValue(
    file: WebAuthFile,
    remember: boolean,
  ): { value: string; maxAgeSeconds: number } {
    const ttl = remember ? REMEMBER_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS;
    const payload = base64url(
      JSON.stringify({
        u: file.username,
        e: this.now() + ttl,
        n: randomBytes(8).toString("base64url"),
      }),
    );
    return {
      value: `${payload}.${sign(file.sessionSecret, payload)}`,
      maxAgeSeconds: Math.floor(ttl / 1000),
    };
  }

  async readSession(
    cookieValue: string | undefined,
  ): Promise<WebAuthSession | null> {
    if (!cookieValue) return null;
    const dot = cookieValue.indexOf(".");
    if (dot <= 0) return null;
    const payload = cookieValue.slice(0, dot);
    const signature = cookieValue.slice(dot + 1);
    let file: WebAuthFile | null;
    try {
      file = await this.load();
    } catch {
      return null;
    }
    if (!file) return null;
    const expected = Buffer.from(sign(file.sessionSecret, payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return null;
    try {
      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as {
        u?: unknown;
        e?: unknown;
      };
      if (decoded.u !== file.username || typeof decoded.e !== "number")
        return null;
      if (decoded.e <= this.now()) return null;
      return { username: file.username, expiresAt: decoded.e };
    } catch {
      return null;
    }
  }
}
