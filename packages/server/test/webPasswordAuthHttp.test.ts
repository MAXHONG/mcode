import { afterEach, describe, expect, it } from "vitest";
import { AddressInfo } from "node:net";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ServiceCollection } from "@mcode/services";
import { createHttpServer } from "../src/http.js";
import {
  WebPasswordAuth,
  verifyWebAuthPassword,
} from "../src/webPasswordAuth.js";

const TOKEN = "test-token-123";

describe("web password auth", () => {
  const servers: Array<{ close(callback?: (err?: Error) => void): void }> = [];
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      servers
        .splice(0)
        .map(
          (server) =>
            new Promise<void>((resolve) => server.close(() => resolve())),
        ),
    );
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function start(now?: () => number) {
    const dir = await mkdtemp(join(tmpdir(), "mcode-web-auth-"));
    dirs.push(dir);
    const filePath = join(dir, "web-auth.json");
    const passwordAuth = new WebPasswordAuth({
      filePath,
      ...(now ? { now } : {}),
    });
    const server = createHttpServer(new ServiceCollection(), 0, {
      authToken: TOKEN,
      authRequired: true,
      passwordAuth,
    });
    servers.push(server);
    await new Promise<void>((resolve) => {
      if ((server as unknown as { listening?: boolean }).listening) resolve();
      else
        (server as unknown as { once(e: string, cb: () => void): void }).once(
          "listening",
          resolve,
        );
    });
    const port = (server.address() as AddressInfo).port;
    return { base: `http://127.0.0.1:${port}`, filePath };
  }

  const json = (body: unknown, cookie?: string) => ({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  function sessionCookie(response: Response): string {
    const header = response.headers
      .getSetCookie()
      .find((c) => c.startsWith("mcode_web_session="));
    expect(header).toBeTruthy();
    return header!.split(";")[0]!;
  }

  it("keeps token auth until a password is set, then requires the password", async () => {
    const { base, filePath } = await start();

    // 未设置密码：没有令牌拿不到状态授权，也不能创建账号
    const anonymous = await (await fetch(`${base}/api/web-auth/status`)).json();
    expect(anonymous).toMatchObject({
      passwordConfigured: false,
      authenticated: false,
      canSetup: false,
    });
    expect(
      (
        await fetch(
          `${base}/api/web-auth/setup`,
          json({ username: "admin", password: "password123" }),
        )
      ).status,
    ).toBe(401);

    // 持有令牌：可以访问 API、可以创建账号
    expect((await fetch(`${base}/api/server-info?token=${TOKEN}`)).status).toBe(
      200,
    );
    const withToken = await (
      await fetch(`${base}/api/web-auth/status?token=${TOKEN}`)
    ).json();
    expect(withToken).toMatchObject({ authenticated: true, canSetup: true });
    expect(
      (
        await fetch(
          `${base}/api/web-auth/setup?token=${TOKEN}`,
          json({ username: "admin", password: "short" }),
        )
      ).status,
    ).toBe(400);
    const setup = await fetch(
      `${base}/api/web-auth/setup?token=${TOKEN}`,
      json({ username: "admin", password: "password123" }),
    );
    expect(setup.status).toBe(200);
    const setupCookie = sessionCookie(setup);

    // 存储：scrypt 哈希、0600 权限、不含明文
    const raw = await readFile(filePath, "utf8");
    expect(raw).not.toContain("password123");
    expect(
      await verifyWebAuthPassword("password123", JSON.parse(raw).passwordHash),
    ).toBe(true);
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);

    // 设置密码后：?token= 与令牌 Cookie 都不能再登录浏览器；Bearer 仍可给脚本用
    expect((await fetch(`${base}/api/server-info?token=${TOKEN}`)).status).toBe(
      401,
    );
    expect(
      (
        await fetch(`${base}/api/server-info`, {
          headers: { cookie: `mcode_lite_token=${TOKEN}` },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${base}/api/server-info`, {
          headers: { authorization: `Bearer ${TOKEN}` },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${base}/api/server-info`, {
          headers: { cookie: setupCookie },
        })
      ).status,
    ).toBe(200);
    // 不能再用令牌重新“创建”账号覆盖密码
    expect(
      (
        await fetch(
          `${base}/api/web-auth/setup?token=${TOKEN}`,
          json({ username: "evil", password: "password999" }),
        )
      ).status,
    ).toBe(401);

    // 登录
    expect(
      (
        await fetch(
          `${base}/api/web-auth/login`,
          json({ username: "admin", password: "wrong-pass" }),
        )
      ).status,
    ).toBe(401);
    const login = await fetch(
      `${base}/api/web-auth/login`,
      json({ username: "admin", password: "password123", remember: true }),
    );
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);
    const status = await (
      await fetch(`${base}/api/web-auth/status`, { headers: { cookie } })
    ).json();
    expect(status).toMatchObject({
      passwordConfigured: true,
      authenticated: true,
      username: "admin",
    });

    // 修改密码需要旧密码，修改后旧会话全部失效
    expect(
      (
        await fetch(
          `${base}/api/web-auth/setup`,
          json(
            {
              username: "admin",
              password: "newpassword1",
              currentPassword: "nope",
            },
            cookie,
          ),
        )
      ).status,
    ).toBe(401);
    const changed = await fetch(
      `${base}/api/web-auth/setup`,
      json(
        {
          username: "admin",
          password: "newpassword1",
          currentPassword: "password123",
        },
        cookie,
      ),
    );
    expect(changed.status).toBe(200);
    expect(
      (await fetch(`${base}/api/server-info`, { headers: { cookie } })).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${base}/api/server-info`, {
          headers: { cookie: sessionCookie(changed) },
        })
      ).status,
    ).toBe(200);
  });

  it("rejects cross-site and non-JSON auth requests", async () => {
    const { base } = await start();
    const crossSite = await fetch(`${base}/api/web-auth/setup?token=${TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    expect(crossSite.status).toBe(403);
    const form = await fetch(`${base}/api/web-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "username=admin&password=password123",
    });
    expect(form.status).toBe(403);
  });

  it("locks out after repeated failures and rejects forged or expired sessions", async () => {
    let now = Date.now();
    const { base, filePath } = await start(() => now);
    await fetch(
      `${base}/api/web-auth/setup?token=${TOKEN}`,
      json({ username: "admin", password: "password123" }),
    );
    for (let i = 0; i < 4; i += 1) {
      expect(
        (
          await fetch(
            `${base}/api/web-auth/login`,
            json({ username: "admin", password: "bad" }),
          )
        ).status,
      ).toBe(401);
    }
    expect(
      (
        await fetch(
          `${base}/api/web-auth/login`,
          json({ username: "admin", password: "bad" }),
        )
      ).status,
    ).toBe(429);
    // 锁定期间即使密码正确也拒绝
    expect(
      (
        await fetch(
          `${base}/api/web-auth/login`,
          json({ username: "admin", password: "password123" }),
        )
      ).status,
    ).toBe(429);
    now += 31_000;
    const login = await fetch(
      `${base}/api/web-auth/login`,
      json({ username: "admin", password: "password123" }),
    );
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);

    const [payload, signature] = cookie.split("=")[1]!.split(".");
    const forged = `mcode_web_session=${payload}.${signature!.slice(0, -2)}xx`;
    expect(
      (await fetch(`${base}/api/server-info`, { headers: { cookie: forged } }))
        .status,
    ).toBe(401);

    now += 8 * 24 * 60 * 60 * 1000;
    expect(
      (await fetch(`${base}/api/server-info`, { headers: { cookie } })).status,
    ).toBe(401);

    // 文件损坏不能退化为“未设置密码”
    await writeFile(filePath, "{broken");
    expect((await fetch(`${base}/api/server-info?token=${TOKEN}`)).status).toBe(
      401,
    );
    const status = await (await fetch(`${base}/api/web-auth/status`)).json();
    expect(status.passwordConfigured).toBe(true);
  });
});
