import { buildRuntimeMcodeApiUrl, resolveZaiBusinessBaseUrl } from "@mcode/shared";

export const MCODE_CLIENT_SCENES_URL = buildRuntimeMcodeApiUrl(
  process.env,
  "/api/v1/client/scenes",
);

export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
