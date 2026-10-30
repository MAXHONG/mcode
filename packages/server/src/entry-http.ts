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
import { join } from "node:path";

async function main(): Promise<void> {
  const zcodeBuiltinProviderConfigFilePath = await materializeBundledMcodeBuiltinProviderConfig({
    environmentConfigRoot: getAppConfigDir(),
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
