// 平台能力面收敛：设置页「插件管理」的薄服务接口。
//
// 背景：pluginManagementStore / usePluginUninstall 过去直接注入 IMcodeAgentService，
// UI 层因此散布 13 个 plugins/* 旧协议词的消费点。收敛为独立薄 service 后，UI 只依赖
// 本接口；plugins/* 词表的 host 侧消费点收拢到 pluginManagementService 一处（插件的
// 事实源在 mcode-cli 进程，服务实现仍经 agent 协议往返——plugins 词表的收口归属
// 插件能力面自身的协议演进，不在会话 v4 词表范围内）。
// 注意与既有 IPluginsService（已 retired 的 marketplace pluginStore 通道）区分：
// 那套接口按 pluginName+marketplace 寻址且方法语义过时，不复用避免签名冲突。
import type { Event } from "@mcode/rpc";
import type {
  McodePluginOperationProgressNotification,
  McodePluginsConfigureResult,
  McodePluginsCancelOperationResult,
  McodePluginsDescribeResult,
  McodePluginsInstallResult,
  McodePluginsListResult,
  McodePluginsMarketplaceMutationResult,
  McodePluginsOverviewResult,
  McodePluginsReferenceCatalogResult,
  McodePluginsRestoreBuiltinResult,
  McodePluginsSetEnabledResult,
  McodePluginsUninstallResult,
  McodePluginsValidateResult,
} from "@mcode/shared";
import { ServiceChannels } from "@mcode/shared";
import { createServiceDescriptor } from "../descriptors.js";
import type {
  McodeAgentAddPluginMarketplaceParams,
  McodeAgentConfigurePluginParams,
  McodeAgentCancelPluginOperationParams,
  McodeAgentDescribePluginParams,
  McodeAgentInstallPluginParams,
  McodeAgentPluginReferenceCatalogParams,
  McodeAgentResolveSuggestedPluginReferenceParams,
  McodeAgentResetPluginConfigParams,
  McodeAgentPluginViewParams,
  McodeAgentRemovePluginMarketplaceParams,
  McodeAgentRestoreBuiltinPluginParams,
  McodeAgentSetPluginEnabledParams,
  McodeAgentUninstallPluginParams,
  McodeAgentUpdatePluginMarketplaceParams,
  McodeAgentUpdatePluginParams,
  McodeAgentValidatePluginParams,
} from "../mcode-agent/mcodeAgentPluginParams.js";

export interface IPluginManagementService {
  listPlugins(params: McodeAgentPluginViewParams): Promise<McodePluginsListResult>;
  /**
   * Plugin 对话引用 catalog：
   * 带 sessionId → session-owned 冻结 catalog；不带 → workspace 当前 catalog。
   * 实现路由到 workspace 级 agent client，不走插件管理独立进程。
   */
  getPluginReferenceCatalog(
    params: McodeAgentPluginReferenceCatalogParams,
  ): Promise<McodePluginsReferenceCatalogResult>;
  resolveSuggestedPluginReference(
    params: McodeAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@mcode/shared").McodePluginsResolveSuggestedReferenceResult>;
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<McodePluginOperationProgressNotification>;
  getPluginsOverview(params: McodeAgentPluginViewParams): Promise<McodePluginsOverviewResult>;
  addPluginMarketplace(
    params: McodeAgentAddPluginMarketplaceParams,
  ): Promise<McodePluginsMarketplaceMutationResult>;
  removePluginMarketplace(
    params: McodeAgentRemovePluginMarketplaceParams,
  ): Promise<McodePluginsMarketplaceMutationResult>;
  updatePluginMarketplace(
    params: McodeAgentUpdatePluginMarketplaceParams,
  ): Promise<McodePluginsMarketplaceMutationResult>;
  installPlugin(params: McodeAgentInstallPluginParams): Promise<McodePluginsInstallResult>;
  cancelPluginOperation(
    params: McodeAgentCancelPluginOperationParams,
  ): Promise<McodePluginsCancelOperationResult>;
  uninstallPlugin(params: McodeAgentUninstallPluginParams): Promise<McodePluginsUninstallResult>;
  updatePlugin(params: McodeAgentUpdatePluginParams): Promise<McodePluginsInstallResult>;
  restoreBuiltinPlugin(
    params: McodeAgentRestoreBuiltinPluginParams,
  ): Promise<McodePluginsRestoreBuiltinResult>;
  configurePlugin(params: McodeAgentConfigurePluginParams): Promise<McodePluginsConfigureResult>;
  resetPluginConfig(
    params: McodeAgentResetPluginConfigParams,
  ): Promise<McodePluginsConfigureResult>;
  validatePlugin(params: McodeAgentValidatePluginParams): Promise<McodePluginsValidateResult>;
  describePlugin(params: McodeAgentDescribePluginParams): Promise<McodePluginsDescribeResult>;
  setPluginEnabled(params: McodeAgentSetPluginEnabledParams): Promise<McodePluginsSetEnabledResult>;
}

export const IPluginManagementService = createServiceDescriptor<IPluginManagementService>(
  ServiceChannels.PluginManagement,
);
