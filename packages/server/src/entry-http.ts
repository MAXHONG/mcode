import { createLocalServices, createTopicResourcePeers, getAppConfigDir } from "@mcode/services/node";
import {
  materializeBundledMcodeBuiltinProviderConfig,
  readBundledMcodeBuiltinProviderConfig,
} from "./bundledMcodeBuiltinProviderConfig.js";
import { createHttpServer } from "./http.js";
import { createServerWebRemoteControl } from "./web-remote-control/serverWebRemoteControl.js";

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
  const services = createLocalServices({
    topicResourceRelayChannel: (request) => topicResourcePeers.getChannel(request),
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

  createHttpServer(services, port, {
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
