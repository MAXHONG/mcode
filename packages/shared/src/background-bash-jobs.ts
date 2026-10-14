import {
  collectVisibleMcodeBackgroundTaskControlItems,
  getMcodeBackgroundTaskControlItemElapsedMs,
  isActiveMcodeBackgroundTaskControlItem,
  parseMcodeBackgroundTaskControlItems,
  type McodeBackgroundTaskControlItem,
  type McodeBackgroundTaskControlStatus,
} from "./background-task-controls.js";

export type McodeBackgroundBashJobStatus = McodeBackgroundTaskControlStatus;
export type McodeBackgroundBashJob = McodeBackgroundTaskControlItem & {
  taskKind: "bash";
};

export function parseMcodeBackgroundBashJobs(value: unknown): McodeBackgroundBashJob[] {
  return parseMcodeBackgroundTaskControlItems(value).filter(isBackgroundBashJob);
}

export function isActiveMcodeBackgroundBashJob(job: McodeBackgroundBashJob): boolean {
  return isActiveMcodeBackgroundTaskControlItem(job);
}

export function getMcodeBackgroundBashJobElapsedMs(
  job: McodeBackgroundBashJob,
  now = Date.now(),
): number {
  return getMcodeBackgroundTaskControlItemElapsedMs(job, now);
}

export function collectVisibleMcodeBackgroundBashJobs(
  jobs: readonly McodeBackgroundBashJob[],
  now = Date.now(),
  thresholdMs = 30_000,
): Array<McodeBackgroundBashJob & { elapsedMs: number }> {
  return collectVisibleMcodeBackgroundTaskControlItems(jobs, now, thresholdMs) as Array<
    McodeBackgroundBashJob & { elapsedMs: number }
  >;
}

function isBackgroundBashJob(job: McodeBackgroundTaskControlItem): job is McodeBackgroundBashJob {
  return job.taskKind === "bash";
}
