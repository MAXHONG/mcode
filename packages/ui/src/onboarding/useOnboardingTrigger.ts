import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "@mcode/shared";
import type { useOnboardingRecordService } from "@/hooks/useOnboardingRecordService.js";
import { logger } from "@/logger.js";

/**
 * 引导触发判定：当前用户在本地记录里没有条目时
 * needsOnboarding=true。settings 回填（换号恢复偏好）只在 userId 运行时变化后发生；
 * 手动修改由各入口回写 record（updateRecordPreferences），record 始终等于该用户最新偏好。
 *
 * 返回 [needsOnboarding, markOnboarded]：null 表示异步判定中；markOnboarded 在引导
 * 保存成功后把判定置 false（记录已落盘，本次会话不再触发）。
 */
export function useOnboardingTrigger(options: {
  onboardingRecord: ReturnType<typeof useOnboardingRecordService>;
  userId: string | null;
  hasStoredOccupation: boolean;
  /** settings 是否已加载；未加载前不能用 hasStoredOccupation 兜底，否则老用户会被误判为新用户。 */
  settingsLoaded?: boolean;
  loadDeviceMid: () => string;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}): [boolean | null, () => void] {
  const { onboardingRecord, userId, hasStoredOccupation, loadDeviceMid, update } = options;
  const settingsLoaded = options.settingsLoaded ?? true;
  // null 表示异步判定中（触发判定改为按本地记录，docs/onboarding-record-spec.md）。
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  // 记录上一次判定时的 userId，回填只在身份实际变化后发生（见下方回填条件）。
  const lastSyncedUserIdRef = useRef<string | null | undefined>(undefined);
  // 用 ref 读取最新值，避免把它们放进依赖导致保存成功后重新判定（上游 3.15.3 同步修复）。
  const hasStoredOccupationRef = useRef(hasStoredOccupation);
  hasStoredOccupationRef.current = hasStoredOccupation;
  const needsOnboardingRef = useRef<boolean | null>(null);
  needsOnboardingRef.current = needsOnboarding;
  // 判定截止时间跨 effect 重跑保持不变：userId / settings 加载触发重跑时不重新计时，
  // 弱网下最多等 3 秒就进入主界面，而不是每次重跑再等 3 秒。
  const deadlineRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    // 服务不可用（旧测试 double / 未注册的 host）时退回旧 settings 判定，行为不回退。
    if (!onboardingRecord) {
      if (settingsLoaded) setNeedsOnboarding(!hasStoredOccupationRef.current);
      return;
    }
    if (needsOnboardingRef.current === null) {
      deadlineRef.current ??= Date.now() + 3000;
    }
    const deadline = deadlineRef.current;
    // 超时保守判定为「不引导」：网络慢或 RPC 挂起时，宁可不弹引导，也不能把已完成/跳过引导的
    // 用户再次拦进引导，或让主界面一直卡在判定中（修复上游 3.15.1 的重复引导与弱网卡住问题）。
    const timeout =
      deadline === null
        ? null
        : setTimeout(
            () => {
              if (cancelled || needsOnboardingRef.current !== null) return;
              deadlineRef.current = null;
              logger.warn("[occupation-onboarding] shouldOnboard 超时，保守判定为不引导");
              setNeedsOnboarding(false);
            },
            Math.max(0, deadline - Date.now()),
          );
    // 登录认领先行：未登录时答的引导（null 条目）移交给当前登录用户，同一人不重复引导。
    // 必须 await 完成后再判定，否则 shouldOnboard 读到认领前的文件会误判需要引导。
    onboardingRecord
      .claimAnonymousRecord()
      .catch((cause: unknown) => {
        logger.warn("[occupation-onboarding] 认领匿名引导记录失败", { error: String(cause) });
      })
      .then(() => onboardingRecord.shouldOnboard(loadDeviceMid()))
      .then(
        (result) => {
          if (!cancelled) {
            deadlineRef.current = null;
            setNeedsOnboarding(result);
          }
          // 换账号恢复该用户偏好：settings 不分用户，A 答完后 B 触发引导会把 settings 顶成
          // B 的答案；再切回 A 时按 record 最近作答回填。同步失败只留日志。
          // 仅"上次是非空的另一身份"时回填（A→B 直切、B→登出）。null→id 不回填：启动 OAuth
          // 恢复与运行中登录共用该序列且无法区分，宁可少回填——手动修改已由各入口回写
          // record（record=最新偏好），缺失回填只影响"apikey 态后登录旧账号"这类边缘场景。
          const previousUserId = lastSyncedUserIdRef.current;
          lastSyncedUserIdRef.current = userId;
          if (!cancelled && !result && previousUserId != null && previousUserId !== userId) {
            void onboardingRecord
              .syncSettingsFromRecord()
              .then((patch) => {
                if (cancelled || !patch) return;
                return update(patch);
              })
              .catch((cause: unknown) => {
                logger.warn("[occupation-onboarding] 按记录同步偏好失败", {
                  error: String(cause),
                });
              });
          }
        },
        (cause) => {
          logger.warn("[occupation-onboarding] shouldOnboard 检查失败", { error: String(cause) });
          // 只有 settings 已加载时才能按 settings 兜底；否则等 settings 加载后的重跑再判定。
          if (!cancelled && settingsLoaded) {
            deadlineRef.current = null;
            setNeedsOnboarding(!hasStoredOccupationRef.current);
          }
        },
      )
      .finally(() => {
        if (timeout !== null) clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      if (timeout !== null) clearTimeout(timeout);
    };
    // 不依赖 hasStoredOccupation（对应 settings?.onboardingOccupation）：保存成功会改写该字段，
    // 若记录写入失败会在当场重开引导；记录缺失导致的再次触发按约定留给下次启动。
  }, [onboardingRecord, userId, loadDeviceMid, settingsLoaded]);
  return [
    needsOnboarding,
    () => {
      deadlineRef.current = null;
      setNeedsOnboarding(false);
    },
  ];
}
