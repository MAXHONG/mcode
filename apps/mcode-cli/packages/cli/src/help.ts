import { getMcodeCopy, type SupportedLocale, type UiLocale } from "@mcode/i18n";

export function formatCliHelp(
  version: string,
  locale?: UiLocale,
  detectedLocale?: SupportedLocale,
): string {
  return getMcodeCopy(locale, detectedLocale).cli.help(version);
}
