import type { UiLocale, SupportedLocale } from "@mcode/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { McodeCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, McodeCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, McodeCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getMcodeCopy(locale?: UiLocale | string, detected?: string | null): McodeCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
