import { MCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID } from "./plugin-marketplaces.js";

/** Mcode：不隐藏内置插件，保证商店插件列表完整展示。 */
export function isPluginStoreVisible(_pluginId: string): boolean {
  return true;
}
const NODE_REPL_HOST_PLUGIN_ID = `node-repl-host@${MCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID}`;
export function isUserFacingPlugin(pluginId: string): boolean {
  return pluginId !== NODE_REPL_HOST_PLUGIN_ID;
}
export function isDiscoverableOfficialPlugin(pluginId: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._-]*@zcode-plugins-official$/u.test(pluginId) &&
    isUserFacingPlugin(pluginId) &&
    isPluginStoreVisible(pluginId)
  );
}
