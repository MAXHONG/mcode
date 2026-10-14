import type { ModelSwitchStage } from "@/store/mcodeSessionStoreTypes.js";

export function shouldBlockTaskSelectionDuringModelRestart(
  modelSwitchPending: boolean,
  modelSwitchStage: ModelSwitchStage,
): boolean {
  return modelSwitchPending && modelSwitchStage === "restartingRuntime";
}
