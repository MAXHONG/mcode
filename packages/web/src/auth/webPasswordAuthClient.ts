// 调用服务端 /api/web-auth/*（Linux Web 发行版的账号密码登录）。
export interface WebPasswordAuthStatus {
  passwordConfigured: boolean;
  authenticated: boolean;
  canSetup: boolean;
  username?: string;
  error?: string;
}

const SETUP_SKIPPED_KEY = "mcode.webPasswordAuth.setupSkipped";

/** 服务端未启用账号密码（旧版本 / MCODE_WEB_PASSWORD_AUTH=0）时返回 null。 */
export async function fetchWebPasswordAuthStatus(): Promise<WebPasswordAuthStatus | null> {
  try {
    const response = await fetch(
      `/api/web-auth/status${window.location.search}`,
      {
        cache: "no-store",
        credentials: "same-origin",
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Partial<WebPasswordAuthStatus>;
    if (typeof payload.passwordConfigured !== "boolean") return null;
    return {
      passwordConfigured: payload.passwordConfigured,
      authenticated: payload.authenticated === true,
      canSetup: payload.canSetup === true,
      ...(payload.username ? { username: payload.username } : {}),
      ...(payload.error ? { error: payload.error } : {}),
    };
  } catch {
    return null;
  }
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(
    `/api/web-auth/${path}${window.location.search}`,
    {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export async function loginWithPassword(input: {
  username: string;
  password: string;
  remember: boolean;
}): Promise<void> {
  await postJson("login", input);
}

export async function setupPassword(input: {
  username: string;
  password: string;
  currentPassword?: string;
}): Promise<void> {
  await postJson("setup", input);
}

export async function logoutWebPasswordAuth(): Promise<void> {
  await postJson("logout", {});
}

export function isWebPasswordSetupSkipped(): boolean {
  try {
    return window.sessionStorage.getItem(SETUP_SKIPPED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWebPasswordSetupSkipped(): void {
  try {
    window.sessionStorage.setItem(SETUP_SKIPPED_KEY, "1");
  } catch {
    // 隐私模式等场景无法写入时只影响本次提示，忽略。
  }
}

/** 登录或设置成功后去掉地址栏里的 ?token=，避免令牌留在历史记录 / 截图里。 */
export function stripTokenFromLocation(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token")) return;
  url.searchParams.delete("token");
  window.history.replaceState(window.history.state, "", url.toString());
}
