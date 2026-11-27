import { useCallback, useEffect, useState } from "react";
import { Activity, Eye, EyeOff } from "lucide-react";
import type { SystemEnvironmentLoad } from "@mcode/shared";
import { cn } from "@/components/lib/utils.js";
import { useServices } from "@/hooks/useServices.js";
import { useMcodeIntl } from "@/i18n/IntlProvider.js";

const ENV_LOAD_POLL_MS = 2_500;
const ENV_LOAD_PREF_KEY = "mcode:env-load-monitor-enabled";

function formatBytesCompact(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)}G`;
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))}M`;
}

function getLoadBarToneClass(percent: number): string {
  if (percent >= 85) return "bg-destructive";
  if (percent >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function readEnvLoadEnabledPreference(): boolean {
  try {
    return globalThis.localStorage?.getItem(ENV_LOAD_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function WorkspaceEnvironmentLoadBar({ isRemote }: { isRemote: boolean }) {
  const { locale } = useMcodeIntl();
  const isZh = locale.toLowerCase().startsWith("zh");
  const { systemService } = useServices();
  const [enabled, setEnabled] = useState<boolean>(readEnvLoadEnabledPreference);
  const [load, setLoad] = useState<SystemEnvironmentLoad | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        globalThis.localStorage?.setItem(ENV_LOAD_PREF_KEY, next ? "1" : "0");
      } catch {
        // 忽略存储受限环境
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled || unsupported || typeof systemService?.getEnvironmentLoad !== "function") {
      return;
    }
    let cancelled = false;
    let hasLoaded = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const sample = async () => {
      if (cancelled || (typeof document !== "undefined" && document.visibilityState === "hidden")) {
        return;
      }
      try {
        const next = await systemService.getEnvironmentLoad();
        if (!cancelled) {
          hasLoaded = true;
          setLoad(next);
        }
      } catch {
        if (!cancelled && !hasLoaded) setUnsupported(true);
      }
    };

    const startPolling = () => {
      if (timer) return;
      void sample();
      timer = setInterval(() => void sample(), ENV_LOAD_POLL_MS);
    };

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") stopPolling();
      else startPolling();
    };

    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      startPolling();
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      stopPolling();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [enabled, systemService, unsupported]);

  if (unsupported) return null;

  const envLabel = (() => {
    if (!load) return isZh ? "环境负载" : "Env Load";
    if (load.environmentKind === "docker") {
      return isRemote ? (isZh ? "远程 Docker" : "Remote Docker") : "Docker";
    }
    if (load.environmentKind === "sandbox") {
      return isRemote ? (isZh ? "远程沙盒" : "Remote Sandbox") : isZh ? "沙盒" : "Sandbox";
    }
    return isRemote ? (isZh ? "远程主机" : "Remote Host") : isZh ? "本机" : "Local";
  })();

  if (!enabled) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] text-foreground-subtle">
        <span className="flex items-center gap-1.5">
          <Activity className="size-3 opacity-70" aria-hidden="true" />
          {isZh ? "环境负载监控已暂停" : "Load monitor paused"}
        </span>
        <button
          type="button"
          onClick={toggleEnabled}
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-foreground-subtle hover:bg-hover hover:text-foreground"
          title={isZh ? "开启实时负载监控" : "Enable load monitor"}
        >
          <Eye className="size-3" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!load) return null;

  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-[11px]"
      data-testid="workspace-env-load-bar"
    >
      <div className="flex items-center justify-between gap-2 text-foreground-subtle">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-foreground/85">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="truncate">{envLabel}</span>
          <span className="truncate text-[10px] text-foreground-subtle">({load.cpuCores}C)</span>
        </span>
        <button
          type="button"
          onClick={toggleEnabled}
          className="inline-flex shrink-0 items-center rounded p-0.5 text-foreground-subtle hover:bg-hover hover:text-foreground"
          title={isZh ? "暂停实时负载监控" : "Pause load monitor"}
        >
          <EyeOff className="size-3" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-[10.5px]">
          <span className="text-foreground-subtle">CPU</span>
          <span className="font-mono tabular-nums text-foreground/90">
            {load.cpuPercent.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              getLoadBarToneClass(load.cpuPercent),
            )}
            style={{ width: `${Math.min(100, Math.max(2, load.cpuPercent))}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-[10.5px]">
          <span className="text-foreground-subtle">{isZh ? "内存" : "MEM"}</span>
          <span className="font-mono tabular-nums text-foreground/90">
            {load.memoryPercent.toFixed(0)}% ({formatBytesCompact(load.memoryUsedBytes)}/
            {formatBytesCompact(load.memoryTotalBytes)})
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              getLoadBarToneClass(load.memoryPercent),
            )}
            style={{ width: `${Math.min(100, Math.max(2, load.memoryPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
