import { useMcodeStoreWithDefault } from "@/store/StoreProvider.js";

export function useIsOfficeMode(): boolean {
  return useMcodeStoreWithDefault((state) => state.interfaceMode === "office", false);
}
