// Bootstrap public API surface.

export * from "./app/create-app.js";
export type {
  ListMcodeSessionsOptions,
  PromptInput,
  ResolveLatestSessionOptions,
  ResumeOptions,
  RunMcodeProtocolAgentOptions,
  SendInputOptions,
  SendInputResult,
  SetLocaleResult,
  SteerTurnOptions,
  SubmitPromptOptions,
  UserPromptInput,
  McodeApp,
  McodeAppOptions,
  McodeModelOption,
} from "./app/types.js";
export * from "./auth-login.js";
export {
  inspectMcodeCustomCommand,
  listMcodeCustomCommands,
  loadMcodeCustomCommand,
} from "./custom-commands.js";
export type {
  InspectMcodeCustomCommandOptions,
  ListMcodeCustomCommandsOptions,
  McodeCustomCommandInspection,
} from "./custom-commands.js";
export { createModelAdapter } from "./model-factory.js";
export type { CreateModelAdapterOptions } from "./model-factory.js";
export {
  createDefaultProviderEndpointRoutingPort,
  resolveProcessProviderEndpointRoutingPort,
} from "./provider-endpoint-routing.js";
export type {
  CreateDefaultProviderEndpointRoutingPortOptions,
  ResolveProcessProviderEndpointRoutingPortOptions,
} from "./provider-endpoint-routing.js";
export { startProcessProviderRegistryRuntime } from "./app/process-provider-registry-runtime.js";
export type { ProcessProviderRegistryRuntimeOptions } from "./app/process-provider-registry-runtime.js";
export {
  addMcodePluginMarketplace,
  getMcodePluginsOverview,
  installMcodeMarketplacePlugin,
  listMcodePlugins,
  removeMcodePluginMarketplace,
  resolveMcodePlugins,
  setMcodePluginEnabled,
  uninstallMcodeMarketplacePlugin,
  updateMcodeMarketplacePlugin,
  updateMcodePluginMarketplace,
  validateMcodePluginPath,
} from "./plugins.js";
export type {
  AddMcodeMarketplaceOptions,
  InstallMcodeMarketplacePluginOptions,
  ListMcodePluginsOptions,
  RemoveMcodeMarketplaceOptions,
  ResolveMcodePluginsOptions,
  SetMcodePluginEnabledOptions,
  SetMcodePluginEnabledResult,
  UninstallMcodeMarketplacePluginOptions,
  UpdateMcodeMarketplaceOptions,
  UpdateMcodeMarketplacePluginOptions,
  ValidateMcodePluginPathOptions,
  McodeAvailablePluginData,
  McodeInstalledPluginData,
  McodeMarketplaceSummaryData,
  McodeMarketplaceUpdateData,
  McodePluginInstallData,
  McodePluginUpdateData,
  McodePluginsOverviewData,
} from "./plugins.js";
export { runMcodeProtocolAgent } from "./mcode-protocol-entrypoint.js";
// Exposed for the CLI's --output-format stream-json: it needs the same event
// shape the protocol server emits, rather than inventing a second one.
export { mapSessionEvent } from "./mcode-protocol/session-mapper.js";
export { prepareMcodeTelemetryEnv, shutdownMcodeTelemetry } from "./telemetry-bootstrap.js";
export type { SessionTranscriptMessage, SessionTranscriptPart } from "./session-transcript.js";
export { listMcodeSessions, resolveLatestSession } from "./sessions.js";
export { inspectMcodeSkill, listMcodeSkills } from "./skills.js";
export type {
  InspectMcodeSkillOptions,
  ListMcodeSkillsOptions,
  McodeSkillInspection,
} from "./skills.js";
// Exposed for the CLI's headless slash routing: it must decide "is this a real
// custom command?" with the *same* reserved-name gate the app facade's
// customCommandPromptResolver applies, or the two disagree and a reserved name
// reaches the model as literal prompt text. See prompt-command.ts.
export { isReservedMcodeSlashCommandName } from "./slash-command-surface.js";
export {
  grantWorkspaceHookTrust,
  inspectWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
} from "./workspace-hook-trust-cli.js";
export type {
  WorkspaceHookTrustCliItem,
  WorkspaceHookTrustCliStatus,
  WorkspaceHookTrustCliTarget,
} from "./workspace-hook-trust-cli.js";
