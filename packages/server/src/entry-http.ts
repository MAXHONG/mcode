import { createLocalServices, createTopicResourcePeers, getAppConfigDir } from "@mcode/services/node";
import {
  materializeBundledMcodeBuiltinProviderConfig,
  readBundledMcodeBuiltinProviderConfig,
} from "./bundledMcodeBuiltinProviderConfig.js";
import { createHttpServer } from "./http.js";

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

  createHttpServer(services, port, {
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
