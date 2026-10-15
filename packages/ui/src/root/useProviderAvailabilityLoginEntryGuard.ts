import { useCallback, useEffect, useRef, useState } from "react";
import type { UserInfo } from "@mcode/shared";
import type { ModelSelectionView } from "@mcode/services";
import { resolveProviderAvailabilityState } from "@/lib/modelProviderAvailability.js";
import { logger } from "@/logger.js";

export interface ProviderAvailabilityLoginEntryGuardResult {
  hasUsableProvider: boolean;
  providerCount: number;
  shouldOpenLoginEntry: boolean;
}

/**
 * 启动登录入口判定：已有可执行模型时永不打开；没有可执行模型时，未登录或尚未选定
 * Z.ai / BigModel 运行域才打开。
 *
 * 修复原因：旧条件 `!providerFamilyDomain || (!user && !hasUsableProvider)` 在
 * `providerFamilyDomain` 缺失时无条件打开登录页。全新安装（尤其是无头 Linux 上的
 * `mcode --web`）只预置个人 Provider（例如 OpenAI 兼容网关）时，用户已经有可用模型，
 * 却仍被强制停在 Z.ai / BigModel 账号门，必须点击“使用 API key → 跳过”才能进入工作区。
 * `providerFamilyDomain` 只决定内置 family 的可见域（见 docs/model-provider-family-merge.md），
 * 不代表模型是否可用；因此只在“没有可用模型”时才用它要求用户选择运行域，
 * 其余组合（未登录 / 已登录且无模型）保持原有行为。
 */
export function shouldOpenStartupLoginEntry(params: {
  hasUser: boolean;
  hasUsableProvider: boolean;
  hasProviderFamilyDomain: boolean;
}): boolean {
  if (params.hasUsableProvider) return false;
  return !params.hasUser || !params.hasProviderFamilyDomain;
}

export function useProviderAvailabilityLoginEntryGuard({
  enabled = true,
  user,
  isRestoringOAuthSession,
  providerFamilyDomain,
  modelSelectionView,
  modelSelectionError,
  refreshProviderState,
  readModelSelectionView,
  setLoginEntryOpen,
}: {
  enabled?: boolean;
  user: UserInfo | null;
  isRestoringOAuthSession: boolean;
  providerFamilyDomain: string | null | undefined;
  modelSelectionView: ModelSelectionView | null;
  modelSelectionError?: Error;
  refreshProviderState: () => Promise<void>;
  readModelSelectionView: () => Promise<ModelSelectionView>;
  setLoginEntryOpen: (open: boolean) => void;
}) {
  const [startupCheckCompleted, setStartupCheckCompleted] = useState(!enabled);
  const startupCheckCompletedRef = useRef(false);
  const providerAvailabilityHydrated = modelSelectionView !== null;

  const syncLoginEntryWithProviderAvailability = useCallback(
    async (options: { forceRefresh?: boolean; reason: string }) => {
      if (!enabled) {
        return {
          hasUsableProvider: true,
          providerCount: modelSelectionView?.providers.length ?? 0,
          shouldOpenLoginEntry: false,
        } satisfies ProviderAvailabilityLoginEntryGuardResult;
      }

      if (options.forceRefresh) {
        await refreshProviderState();
      }

      const refreshedView = options.forceRefresh
        ? await readModelSelectionView()
        : modelSelectionView;
      const availability = resolveProviderAvailabilityState({ modelSelectionView: refreshedView });
      const { hasUsableProvider, providerCount } = availability;
      const shouldOpenLoginEntry = shouldOpenStartupLoginEntry({
        hasUser: Boolean(user),
        hasUsableProvider,
        hasProviderFamilyDomain: Boolean(providerFamilyDomain),
      });

      // 未登录且没有可用模型配置时必须引导用户连接账号或填写 API Key。
      // 启动检查、API Key 设置回流等入口统一走这里，避免各处复制判断后语义分叉。
      logger.info("[Root] provider 可用性登录入口守卫完成检查", {
        reason: options.reason,
        source: availability.source,
        providerCount,
        hasUsableProvider,
        hasUser: Boolean(user),
        hasProviderFamilyDomain: Boolean(providerFamilyDomain),
        shouldOpenLoginEntry,
      });
      setLoginEntryOpen(shouldOpenLoginEntry);
      return {
        hasUsableProvider,
        providerCount,
        shouldOpenLoginEntry,
      } satisfies ProviderAvailabilityLoginEntryGuardResult;
    },
    [
      enabled,
      modelSelectionView,
      providerFamilyDomain,
      refreshProviderState,
      readModelSelectionView,
      setLoginEntryOpen,
      user,
    ],
  );

  useEffect(() => {
    if (!enabled) {
      startupCheckCompletedRef.current = true;
      setStartupCheckCompleted(true);
      return;
    }

    if (modelSelectionError) {
      // 首次读取失败不能伪装成“没有 Provider”，也不能让启动门禁永久停在 loading。
      logger.error("[Root] provider 可用性读取失败，结束启动门禁等待", modelSelectionError);
      startupCheckCompletedRef.current = true;
      setStartupCheckCompleted(true);
      return;
    }

    if (
      startupCheckCompletedRef.current ||
      isRestoringOAuthSession ||
      !providerAvailabilityHydrated
    ) {
      return;
    }

    startupCheckCompletedRef.current = true;
    void syncLoginEntryWithProviderAvailability({
      reason: "startup",
    }).finally(() => {
      setStartupCheckCompleted(true);
    });
  }, [
    enabled,
    isRestoringOAuthSession,
    modelSelectionError,
    providerAvailabilityHydrated,
    syncLoginEntryWithProviderAvailability,
  ]);

  return {
    startupCheckCompleted,
    syncLoginEntryWithProviderAvailability,
  };
}
