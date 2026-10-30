// 由各 bundler 通过 define 注入，避免运行时 JSON import 的跨 bundler 兼容问题。
// 非构建环境（如 e2e 测试的 mocha）下 define 不存在，
// 用 typeof 检查 + fallback 避免 ReferenceError。
declare const __MCODE_VERSION__: string;
declare const __MCODE_COMMIT__: string;
declare const __MCODE_BUILD_TIME__: string;

export const MCODE_VERSION: string =
  typeof __MCODE_VERSION__ !== "undefined" ? __MCODE_VERSION__ : "0.0.0-dev";
export const MCODE_COMMIT: string =
  typeof __MCODE_COMMIT__ !== "undefined" ? __MCODE_COMMIT__ : "unknown";
export const MCODE_BUILD_TIME: string =
  typeof __MCODE_BUILD_TIME__ !== "undefined" ? __MCODE_BUILD_TIME__ : "unknown";

/**
 * 当前同步的上游 ZCode 版本（package.json 的 `mcodeUpstreamVersion`）。
 * 只用于 z.ai 官方手机远控页的 `app_version`（官方页面按上游版本发布）。
 * 远程开发组件自 v3.17.1 起由 Mcode 自建发布，按 MCODE_VERSION 校验，不再使用该值。
 */
declare const __MCODE_UPSTREAM_VERSION__: string;
export const MCODE_REMOTE_UPSTREAM_VERSION: string =
  typeof __MCODE_UPSTREAM_VERSION__ !== "undefined" && __MCODE_UPSTREAM_VERSION__
    ? __MCODE_UPSTREAM_VERSION__
    : MCODE_VERSION;
