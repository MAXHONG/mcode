#!/usr/bin/env python3
"""
ZCode -> Mcode 品牌与核心标识重命名脚本（一次性迁移工具，可重复执行，幂等）。

改名范围：
  - 产品名 / 显示名：ZCode、Z Code、Zcode -> Mcode
  - 代码标识符、包名、目录、文件名：zcode / ZCode / ZCODE -> mcode / Mcode / MCODE
  - 数据目录 ~/.zcode -> ~/.mcode，CLI 命令 zcode -> mcode，appId dev.zcode.app -> dev.mcode.app

保留（不改名）以确保 Z.ai / BigModel 登录、Coding Plan、官方插件生态继续可用：
  - z.ai 相关域名与 URL（zcode.z.ai、cdn-zcode.z.ai、api.z.ai、chat.z.ai ...）
  - 服务端 API 路径（/api/v1/zcode-plan/...）、请求头（X-ZCode-*、User-Agent: ZCode/...）
  - OAuth deep link scheme `zcode://`（官网中转页只接受 zcode://oauth/callback）
  - BigModel appId / salesChannel / clientType 等服务端识别字段
  - 官网内嵌页桥接（zcodeBridge、zcodejwttoken、__zcodeLang__ ...）
  - 官方插件协议（.zcode-plugin 清单目录、zcode-plugins-official 市场 id、
    ZCODE_PLUGIN_ROOT 等插件环境变量、window.zcode 插件页面 API、zcode/* MCP meta key）
  - 手机/网页远控 relay 协议字段（zcode_type、__zcodeRpcControl ...）
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# 不处理的路径（本脚本自身、上游许可证文本）
SKIP_FILES = {
    "scripts/rebrand/rebrand-to-mcode.py",
    "LICENSE",
}
# pnpm patchedDependencies 的哈希依赖补丁内容，改动会破坏 lockfile
SKIP_PREFIXES = ("patches/",)

URL_STOP = r"\s\"'`<>()\[\]{}\\,;|"

PROTECT_PATTERNS = [
    # --- z.ai 相关 URL 与域名 ---
    rf"(?:https?|wss?)://[^{URL_STOP}]*(?:z\.ai|zcode-ai\.com|zcode\.ai|codegeex\.cn|bigmodel\.cn)[^{URL_STOP}]*",
    r"cdn-zcode\.z\.ai",
    r"zcode\.z\.ai",
    # 正则 / JSON 中转义写法：zcode\.z\.ai、zcode\\.z\\.ai
    r"zcode(?:\\+\.)z(?:\\+\.)ai",
    r"(?:cdn\.)?zcode-ai\.com",
    r"zcode\.ai/schema[^\s\"'`]*",
    r"zcode/electron/releases",
    r"zcode/official-plugin",
    # 官方 CDN 上内置插件图标目录仍为 zcode-guide / zcode-cua
    r"OFFICIAL_PLUGIN_ASSETS_BASE_URL\}/zcode-(?:guide|cua)/",
    # 上游仓库引用
    r"zai-org/[\w.-]+",
    # --- OAuth deep link ---
    rf"zcode://[^{URL_STOP}]*",
    r"zcode:/(?=[^/])",
    r"zcode:(?=(?:oauth|payment|share|workspace)/)",
    r"zcode(?=%(?:25)?3A%(?:25)?2F)",
    r"DEEP_LINK_SCHEME = \"zcode\"",
    r"\\bzcode:",
    r"const scheme = \"zcode\"",
    r"schemes: \[\"zcode\"\]",
    r"PROTOCOL_SCHEME = \"zcode\"",
    r"x-scheme-handler/zcode",
    # --- 服务端识别字段 / API ---
    r"zcode-plan",
    r"zcode-v3-start-plan",
    r"claim_zcode_plan",
    r"\bzcode_plan\b",
    r"(?i:\bx-zcode\b[\w-]*)",
    r"ZCode/\$\{",
    r"\"ZCode/unknown\"",
    r"Z Code@",
    r"appId: \"zcode\"",
    r"BIGMODEL_APP_ID = \"zcode\"",
    r"salesChannel \?\? \"zcode\"",
    r"clientType: \"zcode\"",
    r"VITE_BIGMODEL_OAUTH_APP_ID\?\.trim\(\) \|\| \"zcode\"",
    r"\bzcode-team-api-key\b",
    r"\bzcode-api-key\b",
    r"\bZCODE_RUNTIME_MODEL_UNAVAILABLE\b",
    r"\bZCODE_BIGMODEL_TEAM_PLAN_MEMBER_REQUIRED\b",
    r"\bzcode_official\b",
    # --- 官网内嵌页桥接 ---
    r"\bzcodejwttoken\b",
    r"\bzcodeBridge\b",
    r"__zcodeLang__",
    r"__zcodeReportContext__",
    r"zcode-coding-plan-lang-change",
    r"zcode-rewards-context",
    # --- 远控 relay 协议 ---
    r"\bzcode_type\b",
    r"__zcodeRpcControl",
    r"__zcode_rpc_nested_uint8array_v1",
    # --- 官方插件协议 ---
    r"zcode-plugins-official",
    r"zcode-plugins-local",
    r"\.zcode-plugin(?![\w-])",
    r"\bZCODE_(?:PLUGIN_ROOT|PLUGIN_DATA|PROJECT_DIR|SKILL_DIR|SESSION_ID|WORKSPACE_ROOT)\b",
    r"window\.zcode(?![\w$])",
    # `(window as X).zcode` 形式访问 preload 桥
    r"(?<=\(window as )[^)]*\)\??\.zcode(?![\w$])",
    r"\)\.zcode(?=[;.])",
    r"globalThis\.zcode(?![\w$])",
    r"exposeInMainWorld\(\"zcode\"",
    r"defineProperty\(window, \"zcode\"",
    r"\"zcode\" in window",
    r"zcode:set_globals",
    r"(?<![@\w/.-])zcode/(?:csp|widgetState|resourceSubscribe|surface|truncated|toolSurface|browserUse|"
    r"browserTurnScreenshot|nodeRepl\w*|gen-ui|genUi\w*|isSkill|skillName|session|errorPresentation|"
    r"browserScreenshotContentIndices|officialMcp\w*)\b",
    r"com\.zcode/",
    r"zcode\.cua/",
    # ---- 远程链路契约：Mcode 方案 B（2026-10-30）起远端组件由 Mcode 自建发布到 mcode.hjh.im，
    # ~/.mcode/server、mcode-server.cjs、mcode-hello、MCODE_* 等一律随常规规则改名，不再保护。----
    # 上游 server / 移动端远程页使用的 RPC 成员与数据字段名
    r"(?<![\w$/])(?:ResetZCodeEndpoint|SetZCodeEndpointCustom|SetZCodeEndpointProduction|SetZCodeEndpointTest|ToggleZCodeStdioTapDevProxy|ZCodeAgent|ZCodeSession|ZCodeTask|addZCodeAgentMcpServer|baseZCodeService|basedOnZCodeBuiltinRevision|buildZCodeSourceHeaders|buildZCodeToolEnvPassthroughEnv|capturedZCodeAgentTelemetryEnv|continueInZCode|copyClaudeAgentsFileToZcodeAgentsFile|deleteZCodeAgentMcpServer|downloadZCode|exchangeZcodeJwtToken|fromUserZCodeSource|getEnabledMcpServersForZCode|getZCodeTaskService|isZcodeJwtRequest|localZCodeAgentService|onDidCheckZCodeBuiltin|onZCodeBuiltinRefreshError|onZCodeInteractionBehaviorChange|onZcodeJwtInvalid|refreshZCodeBuiltin|remoteZCodeAgentService|renderZCodeFileCitations|resolveZCodeApiOrigin|resolveZCodeBuiltinActiveFilePath|resolveZCodeEndpointOrigin|sanitizeZCodeRuntimeEnv|toZCodeBuiltinJSON|updateZCodeAgentMcpServer|workspaceShellZCodeState|workspaceZCodeService|zcodeAgent|zcodeAgentCommandResolver|zcodeAgentService|zcodeAgentSpawnFallbackCwd|zcodeAttachments|zcodeAuthorization|zcodeBotOpenId|zcodeBotRemoved|zcodeBuiltin|zcodeBuiltinActiveFilePath|zcodeBuiltinEnvironment|zcodeBuiltinFilePath|zcodeBuiltinModelRules|zcodeBuiltinProviderConfigFilePath|zcodeBuiltinProviderTemplates|zcodeBuiltinProviders|zcodeBuiltinRemote|zcodeBuiltinRevision|zcodeBuiltinSource|zcodeCallbackPrepareError|zcodeCandidates|zcodeCardText|zcodeChatType|zcodeEndpointOrigin|zcodeEnv|zcodeFeishuCardResponseState|zcodeFeishuSynchronousCardAction|zcodeIgnoreInteractionMessage|zcodeInteractionBehavior|zcodeJwt|zcodeJwtToken|zcodeMcpProcessTelemetryBaseShape|zcodeMcpUiAppToolInstanceShape|zcodeMcpUiPluginScopeShape|zcodeMobilePage|zcodeNativeCardContent|zcodePlanAnthropicBaseUrl|zcodePlanBillingBalanceUrl|zcodePlanBillingCurrentUrl|zcodePlanOpenAiBaseUrl|zcodeProfileMigrationRetryAfter|zcodeProfileSchemaVersion|zcodeProvider|zcodeReferencedAttachment|zcodeReferencedInlineImages|zcodeReferencedMessage|zcodeSessionService|zcodeSessionStore|zcodeSnapshot|zcodeTaskService|zcodeTimeline|zcodeTopicHasAcceptedInput|zcodeTopicRootIsCurrentBot|zcodeagentmcp)(?![\w$]|\.(?:js|ts|tsx|mjs|cjs)\b)",
    # ---- 与 z.ai 官网托管页 / 分享页共享的 wire 标识（cb9a1912 手工恢复，补进脚本防止合并上游时再次误改）----
    r"zcode-artifact(?![\w-])",
    r"zcode-file-citation[\w-]*",
    r"\.zcode-share(?![\w-])",
    r"zcode-share-context",
    r"zcode-cloud-hero-v\d+",
    r"zcode:coding-plan:[\w-]+",
    r"zcode-coding-plan-auth-ready",
    r"raw-zcode-meta",
    r"__zcode_artifact_image__",
    r"\"ZCode/[\d.]+\"",
    # zCode→mCode 规则曾把 bizCode 误改为 bimCode
    r"\bbizCode\b",
]

# 仅在特定文件内保护的 window 类型声明（与 window.zcode 保持一致）
FILE_SPECIFIC_PROTECT = {
    "packages/client/src/globals.d.ts": [r"(?m)^(\s+)zcode: \{"],
    "packages/ui/src/logger.ts": [r"(?m)^(\s+)zcode\?: \{"],
    # RPC 通道名：官网托管的手机远控页 / 分享页按原名调用
    "packages/shared/src/channels.ts": [r"\"zcode-(?:task|agent|session)\""],
    # Coding Plan 内嵌官网页读取的主题 key；应用自身主题 key 仍是 mcode-theme
    "packages/ui/src/settings/model-provider-section/codingPlanEmbeddedWebview.ts": [r"\"zcode-theme\""],
    "packages/ui/test/codingPlanEmbeddedWebview.test.ts": [r"\"zcode-theme\""],
}

TEXT_SOURCE_SUFFIXES = (
    ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
    ".json", ".md", ".yaml", ".yml", ".css", ".html", ".sh", ".py", ".toml",
)

PROTECT_RE = re.compile("|".join(f"(?:{p})" for p in PROTECT_PATTERNS))

REPLACEMENTS = [
    (re.compile(r"Z Code"), "Mcode"),
    (re.compile(r"z-code"), "mcode"),
    (re.compile(r"ZCODE"), "MCODE"),
    (re.compile(r"ZCode"), "Mcode"),
    (re.compile(r"Zcode"), "Mcode"),
    (re.compile(r"zCode"), "mCode"),
    (re.compile(r"zcode"), "mcode"),
]

PH_OPEN = "\uE000"
PH_CLOSE = "\uE001"


def transform_text(text: str, rel: str) -> str:
    saved: list[str] = []

    def stash(m: re.Match[str]) -> str:
        saved.append(m.group(0))
        return f"{PH_OPEN}{len(saved) - 1}{PH_CLOSE}"

    for pattern in FILE_SPECIFIC_PROTECT.get(rel, []):
        text = re.sub(pattern, stash, text)
    text = PROTECT_RE.sub(stash, text)
    for regex, repl in REPLACEMENTS:
        text = regex.sub(repl, text)
    return re.sub(
        f"{PH_OPEN}(\\d+){PH_CLOSE}", lambda m: saved[int(m.group(1))], text
    )


def rename_path(rel: str) -> str:
    # 与内容替换共用保护规则：例如 `.zcode-plugin/`、`zcode-plugins-official/` 目录名保持不变
    return transform_text(rel, "")


def tracked_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [p for p in out.decode("utf-8").split("\0") if p]


def main() -> int:
    files = tracked_files()
    changed = 0
    for rel in files:
        if rel in SKIP_FILES or rel.startswith(SKIP_PREFIXES):
            continue
        path = ROOT / rel
        if path.is_symlink() or not path.is_file():
            continue
        raw = path.read_bytes()
        # 含 NUL 一般是二进制文件；但源码里也可能出现字面 NUL（如模板字符串里的 \x00 分隔符，
        # 上游 useWorkflowRunNodeResult.ts 即是如此）。按扩展名放行文本源码，否则其中的
        # @zcode/* import 不会被改名，构建时找不到模块。
        if b"\0" in raw and not rel.endswith(TEXT_SOURCE_SUFFIXES):
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            continue
        new = transform_text(text, rel)
        if new != text:
            path.write_bytes(new.encode("utf-8"))
            changed += 1
    print(f"[rebrand] content updated in {changed} files")

    moved = 0
    for rel in files:
        if rel in SKIP_FILES:
            continue
        new_rel = rename_path(rel)
        if new_rel == rel:
            continue
        src = ROOT / rel
        dst = ROOT / new_rel
        if not src.exists() and not src.is_symlink():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        os.replace(src, dst)
        moved += 1
    print(f"[rebrand] renamed {moved} paths")

    # 清理因移动产生的空目录（只清理曾含 zcode 的目录）
    for dirpath, dirnames, filenames in os.walk(ROOT, topdown=False):
        p = Path(dirpath)
        if ".git" in p.parts or "node_modules" in p.parts:
            continue
        if re.search(r"zcode|ZCode|ZCODE|Zcode|z-code", p.name) and not any(p.iterdir()):
            p.rmdir()
    return 0


if __name__ == "__main__":
    sys.exit(main())
