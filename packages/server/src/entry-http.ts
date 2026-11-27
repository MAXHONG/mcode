import {
  createServerHostServices,
  createTopicResourcePeers,
  getAppConfigDir,
} from "@mcode/services/node";
import {
  materializeBundledMcodeBuiltinProviderConfig,
  readBundledMcodeBuiltinProviderConfig,
} from "./bundledMcodeBuiltinProviderConfig.js";
import { createHttpServer, resolveHttpServerId } from "./http.js";
import { createServerWebRemoteControl } from "./web-remote-control/serverWebRemoteControl.js";
import { WebPasswordAuth } from "./webPasswordAuth.js";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, open } from "node:fs/promises";
import { join } from "node:path";

/**
 * Mcode 无界面 Linux Web 模式兼容：上游 4.0.0 在无 OS Keyring 时要求提供 0600 权限的
 * credential-secret 文件。无桌面环境且未显式配置密钥时，自动在配置目录初始化并复用。
 */
async function ensureHeadlessLinuxCredentialSecret(configDir: string): Promise<void> {
  if (process.platform !== "linux") return;
  if (process.env["MCODE_CREDENTIAL_SECRET"] || process.env["MCODE_CREDENTIAL_SECRET_FILE"]) return;
  if (process.env["DISPLAY"] || process.env["WAYLAND_DISPLAY"]) return;
  const secretFile = join(configDir, "credential-secret");
  await mkdir(configDir, { recursive: true });
  try {
    const handle = await open(secretFile, "wx", 0o600);
    try {
      await handle.writeFile(randomBytes(32));
    } finally {
      await handle.close();
    }
    await chmod(secretFile, 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
  }
  process.env["MCODE_CREDENTIAL_SECRET_FILE"] = secretFile;
}

async function main(): Promise<void> {
  const configDir = getAppConfigDir();
  await ensureHeadlessLinuxCredentialSecret(configDir);
  const zcodeBuiltinProviderConfigFilePath = await materializeBundledMcodeBuiltinProviderConfig({
    environmentConfigRoot: configDir,
    content: readBundledMcodeBuiltinProviderConfig(),
  });
  const port = Number(process.env["PORT"]) || 3030;
  const host = process.env["MCODE_SERVER_HOST"]?.trim() || process.env["HOST"]?.trim() || undefined;
  const staticRoot = process.env["MCODE_WEB_STATIC_ROOT"]?.trim() || undefined;
  const authToken = process.env["MCODE_SERVER_AUTH_TOKEN"]?.trim() || undefined;
  const topicResourcePeers = createTopicResourcePeers();
  const serverId = resolveHttpServerId();
  const { services, workspaceIdentityMapper, migrationFailedPathCount } =
    await createServerHostServices({
      topicResourceRelayChannel: (request) => topicResourcePeers.getChannel(request),
      sourceServerId: serverId,
      zcodeBuiltinProviderConfigFilePath,
      providerProvisioningTargetEnabled: Boolean(authToken),
    });

  // 手机扫码远控：默认随 Web 版启用；MCODE_WEB_REMOTE_CONTROL=0 关闭。
  const webRemoteControlDisabled = ["0", "false", "off", "no"].includes(
    process.env["MCODE_WEB_REMOTE_CONTROL"]?.trim().toLowerCase() ?? "",
  );
  const webRemoteControl = webRemoteControlDisabled
    ? undefined
    : createServerWebRemoteControl({
        services,
        workspacePath: process.env["MCODE_SERVER_WORKSPACE"]?.trim() || process.cwd(),
        logger: {
          info: (...args: unknown[]) => console.log("[web-remote-control]", ...args),
          warn: (...args: unknown[]) => console.warn("[web-remote-control]", ...args),
          error: (...args: unknown[]) => console.error("[web-remote-control]", ...args),
        },
      });
  webRemoteControl?.catch((error: unknown) => {
    console.error("[web-remote-control] init failed", error);
  });

  // 账号密码登录：默认启用（未设置密码时仍按访问令牌鉴权，可在网页里创建账号密码）。
  // MCODE_WEB_PASSWORD_AUTH=0 关闭；MCODE_WEB_AUTH_FILE 自定义存储位置（默认 ~/.mcode/v2/web-auth.json）。
  const passwordAuthDisabled = ["0", "false", "off", "no"].includes(
    process.env["MCODE_WEB_PASSWORD_AUTH"]?.trim().toLowerCase() ?? "",
  );
  const passwordAuth = passwordAuthDisabled
    ? undefined
    : new WebPasswordAuth({
        filePath:
          process.env["MCODE_WEB_AUTH_FILE"]?.trim() || join(getAppConfigDir(), "web-auth.json"),
      });

  createHttpServer(services, port, {
    serverId,
    workspaceIdentityMapper,
    migrationFailedPathCount,
    virtualProjects: true,
    ...(passwordAuth ? { passwordAuth } : {}),
    ...(webRemoteControl ? { webRemoteControl } : {}),
    topicResourcePeers,
    ...(host ? { host } : {}),
    ...(staticRoot ? { staticRoot, spaFallback: true } : {}),
    ...(authToken ? { authToken, authRequired: true } : {}),
  });
}

void main().catch((error: unknown) => {
  console.error("[mcode-server:http] startup failed", error);
  process.exitCode = 1;
});
