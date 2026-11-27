import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MCODE_CONVERSATION_SHARE_ENABLED,
  MCODE_FEEDBACK_ENABLED,
  MCODE_MOBILE_PUSH_ENABLED,
  MCODE_SITES_PUBLISH_ENABLED,
} from "@mcode/shared";
import { isRemoteFeedbackEnabled } from "../src/feedback/feedbackService.js";
// @ts-expect-error -- 构建脚本是 .mjs，无类型声明
import { resolveBuildTimeConfig } from "../../../scripts/build-time-config.mjs";

/**
 * Mcode 隐私守卫：只允许 z.ai / 智谱账号登录 + 模型调用外联。
 * 这些用例防止上游合并或误改把反馈上传、手机推送、分享、Sites、遥测重新打开。
 */
describe("Mcode privacy guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("所有外发功能开关在发行版中保持关闭", () => {
    expect(MCODE_FEEDBACK_ENABLED).toBe(false);
    expect(MCODE_MOBILE_PUSH_ENABLED).toBe(false);
    expect(MCODE_CONVERSATION_SHARE_ENABLED).toBe(false);
    expect(MCODE_SITES_PUBLISH_ENABLED).toBe(false);
  });

  it("即使设置了 MCODE_FEEDBACK_API_BASE 或显式地址，也不会启用远端反馈上传", () => {
    vi.stubEnv("MCODE_FEEDBACK_API_BASE", "https://example.invalid/feedback");
    expect(isRemoteFeedbackEnabled()).toBe(false);
    expect(isRemoteFeedbackEnabled("https://example.invalid/api")).toBe(false);
  });

  it("未显式允许遥测时，构建期不会编入任何上报地址", async () => {
    const config = await resolveBuildTimeConfig(
      {
        MCODE_ARMS_RUM_ENDPOINT: "https://arms.example.invalid",
        MCODE_TELEMETRY_REPORT_ENDPOINT: "https://report.example.invalid",
      },
      { defaultsPath: "/nonexistent/private-build-defaults.json" },
    );
    expect(config.armsRumEndpoint).toBe("");
    expect(config.telemetryReportEndpoint).toBe("");
  });
});
