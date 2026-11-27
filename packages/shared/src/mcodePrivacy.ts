/**
 * Mcode 隐私/外发开关（编译期常量）。
 *
 * 背景：上游 ZCode 有多条会把用户数据发往 z.ai / 阿里云 OSS 的通道
 * （问题反馈+日志附件上传、手机推送通知事件上报、会话分享、Sites 发布、营销触达等）。
 * Mcode 只保留「z.ai / 智谱账号登录 + 模型调用」这一条必要外联，其余外发功能全部关闭，
 * UI 入口隐藏、服务层兜底短路，避免任何“上传代码/日志”的后门。
 *
 * 这些开关刻意做成常量而不是用户设置：防止被远端配置或误操作重新打开。
 */
export const MCODE_FEEDBACK_ENABLED = false as boolean;
export const MCODE_MOBILE_PUSH_ENABLED = false as boolean;
export const MCODE_CONVERSATION_SHARE_ENABLED = false as boolean;
export const MCODE_SITES_PUBLISH_ENABLED = false as boolean;
