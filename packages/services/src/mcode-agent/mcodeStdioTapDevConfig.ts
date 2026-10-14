import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { McodeStdioTapDevState } from "@mcode/shared";
import { getAppConfigDir } from "#src/paths.js";
import { isEffectiveDevelopmentNodeEnv } from "#src/runtime-tools/nodeEnv.js";

interface McodeStdioTapStateFile {
  enabled?: boolean;
}

export function isMcodeStdioTapDevVisible(): boolean {
  return isEffectiveDevelopmentNodeEnv();
}

export function getMcodeStdioTapDevDir(): string {
  return join(getAppConfigDir(), "dev");
}

export function getMcodeStdioTapDevLogDir(): string {
  return join(getMcodeStdioTapDevDir(), "stdio-traffic");
}

export function getMcodeStdioTapDevStatePath(): string {
  return join(getMcodeStdioTapDevDir(), "mcode-stdio-tap.json");
}

function readStateFile(path: string): McodeStdioTapStateFile {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as McodeStdioTapStateFile) : {};
  } catch {
    return {};
  }
}

export function readMcodeStdioTapDevState(): McodeStdioTapDevState {
  const visible = isMcodeStdioTapDevVisible();
  const statePath = getMcodeStdioTapDevStatePath();
  const fileState = readStateFile(statePath);
  return {
    enabled: visible && fileState.enabled === true,
    visible,
    logDir: getMcodeStdioTapDevLogDir(),
    statePath,
  };
}

export function setMcodeStdioTapDevEnabled(enabled: boolean): McodeStdioTapDevState {
  const visible = isMcodeStdioTapDevVisible();
  const statePath = getMcodeStdioTapDevStatePath();
  mkdirSync(getMcodeStdioTapDevDir(), { recursive: true });
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        // 开发态 stdio 抓包是高频原始协议帧，只能通过显式开关写旁路文件，避免误进生产日志。
        enabled: visible && enabled,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  return readMcodeStdioTapDevState();
}
