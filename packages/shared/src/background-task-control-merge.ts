import type { McodeBackgroundTaskControlItem } from "./background-task-controls.js";

export function mergeMcodeBackgroundTaskControlItems(
  current: readonly McodeBackgroundTaskControlItem[],
  updates: readonly McodeBackgroundTaskControlItem[],
): McodeBackgroundTaskControlItem[] {
  const jobsById = new Map(current.map((job) => [job.jobId, job] as const));
  for (const job of updates) {
    jobsById.set(job.jobId, job);
  }
  return Array.from(jobsById.values());
}
