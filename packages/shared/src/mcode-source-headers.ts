import { DEFAULT_MCODE_ENDPOINT_ORIGIN } from "./mcodeEndpoint.js";

export const MCODE_SOURCE_HEADERS = {
  "User-Agent": "ZCode/unknown",
  "HTTP-Referer": DEFAULT_MCODE_ENDPOINT_ORIGIN,
  "X-Title": "Z Code@electron",
} as const;

export interface BuildMcodeSourceHeadersFromContextOptions {
  appVersion?: string;
  arch?: string;
  clientLanguage?: string;
  clientTimezone?: string;
  deviceMid?: string;
  endpointOrigin?: string;
  osVersion?: string;
  platform?: string;
  releaseChannel?: string;
  sourceTitle?: string;
}

export function normalizeMcodeSourceHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\x20-\x7e]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function buildMcodeSourceHeadersFromContext(
  options: BuildMcodeSourceHeadersFromContextOptions = {},
): Record<string, string> {
  const appVersion = normalizeMcodeSourceHeaderValue(options.appVersion);
  const arch = normalizeMcodeSourceHeaderValue(options.arch);
  const clientLanguage = normalizeMcodeSourceHeaderValue(options.clientLanguage) ?? "unknown";
  const clientTimezone = normalizeMcodeSourceHeaderValue(options.clientTimezone) ?? "unknown";
  const deviceMid = normalizeMcodeSourceHeaderValue(options.deviceMid);
  const endpointOrigin =
    normalizeMcodeSourceHeaderValue(options.endpointOrigin) ?? DEFAULT_MCODE_ENDPOINT_ORIGIN;
  const osVersion = normalizeMcodeSourceHeaderValue(options.osVersion);
  const platform = normalizeMcodeSourceHeaderValue(options.platform);
  const releaseChannel = normalizeMcodeSourceHeaderValue(options.releaseChannel);
  const sourceTitle = normalizeMcodeSourceHeaderValue(options.sourceTitle) ?? "electron";

  return {
    ...MCODE_SOURCE_HEADERS,
    "HTTP-Referer": endpointOrigin,
    "User-Agent": `ZCode/${appVersion ?? "unknown"}`,
    ...(appVersion ? { "X-ZCode-App-Version": appVersion } : {}),
    "X-Title": `Z Code@${sourceTitle}`,
    ...(platform && arch ? { "X-Platform": `${platform}-${arch}` } : {}),
    ...(releaseChannel ? { "X-Release-Channel": releaseChannel } : {}),
    "X-Client-Language": clientLanguage,
    "X-Client-Timezone": clientTimezone,
    ...(platform ? { "X-Os-Category": normalizeOsCategory(platform) } : {}),
    ...(osVersion ? { "X-Os-Version": osVersion } : {}),
    ...(deviceMid ? { "X-Device-Mid": deviceMid } : {}),
  };
}

function normalizeOsCategory(platform: string): string {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}
