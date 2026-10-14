const MCODE_PROCESS_PREFIX = "mcode";
const MAX_PROCESS_NAME_SEGMENT_LENGTH = 24;

function sanitizeProcessNameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_PROCESS_NAME_SEGMENT_LENGTH);
}

function joinMcodeProcessName(...segments: Array<string | null | undefined>): string {
  const sanitizedSegments = segments
    .map((segment) => sanitizeProcessNameSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  return [MCODE_PROCESS_PREFIX, ...sanitizedSegments].join("-");
}

function pickWorkspaceTag(workspacePath: string | null | undefined): string | undefined {
  const trimmedPath = workspacePath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedPath;
}

export function formatMcodeMainProcessName(): string {
  return joinMcodeProcessName("main");
}

export function formatMcodeGpuProcessName(): string {
  return joinMcodeProcessName("gpu");
}

export function formatMcodeHostProcessName(label?: string): string {
  return joinMcodeProcessName("host", label);
}

export function formatMcodeRendererProcessName(windowTitle?: string): string {
  const normalizedTitle = windowTitle?.trim();
  if (!normalizedTitle || normalizedTitle === "Mcode") {
    return joinMcodeProcessName("renderer", "main");
  }

  if (normalizedTitle === "Resource Manager") {
    return joinMcodeProcessName("renderer", "resource-manager");
  }

  const remoteWindowPrefix = "Mcode - ";
  if (normalizedTitle.startsWith(remoteWindowPrefix)) {
    return joinMcodeProcessName(
      "renderer",
      "remote",
      normalizedTitle.slice(remoteWindowPrefix.length),
    );
  }

  return joinMcodeProcessName("renderer", normalizedTitle);
}

export function formatMcodeAgentProcessName(provider: string, workspacePath?: string): string {
  return joinMcodeProcessName("agent", provider, pickWorkspaceTag(workspacePath));
}

export function formatMcodeUtilityProcessName(name?: string, type = "utility"): string {
  return joinMcodeProcessName(type, name);
}
