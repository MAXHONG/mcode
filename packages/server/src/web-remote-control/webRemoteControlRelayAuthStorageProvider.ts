import type { ICredentialService } from "@mcode/services";
import type { AppSettings } from "@mcode/shared";

export const WEB_REMOTE_CONTROL_EXTERNAL_RELAY_PASS_HASH_CREDENTIAL_KEY =
  "web-remote-control:external-relay:pass_hash";
/** Mcode 自建中转的认证材料；与 z.ai 官方 relay 分开保存，切换中转互不覆盖。 */
export const WEB_REMOTE_CONTROL_SELF_HOSTED_RELAY_PASS_HASH_CREDENTIAL_KEY =
  "web-remote-control:self-hosted-relay:pass_hash";

export type WebRemoteControlRelayAuthStorageScope = "zai" | "mcode";

export interface WebRemoteControlRelayStoredAuth {
  deviceSid: string;
  passHash: string;
}

export interface WebRemoteControlRelayAuthStorageProvider {
  load(): Promise<WebRemoteControlRelayStoredAuth | undefined>;
  save(auth: WebRemoteControlRelayStoredAuth): Promise<void>;
  clear(): Promise<void>;
  rotate(auth: WebRemoteControlRelayStoredAuth): Promise<void>;
}

interface WebRemoteControlRelayAuthStorageDependencies {
  /**
   * 身份所属中转。缺省为 z.ai 官方（历史字段）。也可传函数，每次读写时按当前设置解析，
   * 保证用户切换中转后，下一次启动远控使用对应中转上的设备身份。
   */
  scope?: WebRemoteControlRelayAuthStorageScope | (() => Promise<WebRemoteControlRelayAuthStorageScope>);
  credentialService: Pick<ICredentialService, "load" | "save" | "delete">;
  loadSettings(): Promise<AppSettings>;
  patchSettings(patch: Partial<AppSettings>): Promise<void>;
  logger?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
  };
}

function safeAuthLogFields(auth: Partial<WebRemoteControlRelayStoredAuth>) {
  const deviceSid = auth.deviceSid?.trim();
  return {
    hasDeviceSid: Boolean(deviceSid),
    deviceSidSuffix: deviceSid ? deviceSid.slice(-6) : undefined,
    hasPassHash: Boolean(auth.passHash?.trim()),
  };
}

export function createWebRemoteControlRelayAuthStorageProvider({
  scope = "zai",
  credentialService,
  loadSettings,
  patchSettings,
  logger,
}: WebRemoteControlRelayAuthStorageDependencies): WebRemoteControlRelayAuthStorageProvider {
  const resolveScope = async (): Promise<WebRemoteControlRelayAuthStorageScope> =>
    typeof scope === "function" ? await scope() : scope;
  const keysFor = (current: WebRemoteControlRelayAuthStorageScope) =>
    current === "mcode"
      ? {
          settingsKey: "webRemoteControlSelfHostedRelayDevice" as const,
          credentialKey: WEB_REMOTE_CONTROL_SELF_HOSTED_RELAY_PASS_HASH_CREDENTIAL_KEY,
        }
      : {
          settingsKey: "webRemoteControlExternalRelayDevice" as const,
          credentialKey: WEB_REMOTE_CONTROL_EXTERNAL_RELAY_PASS_HASH_CREDENTIAL_KEY,
        };

  const clear = async () => {
    const { settingsKey, credentialKey } = keysFor(await resolveScope());
    await patchSettings({ [settingsKey]: undefined });
    await credentialService.delete(credentialKey);
    logger?.info("[web-remote-control] external relay auth cleared", {
      hasDeviceSid: false,
      hasPassHash: false,
    });
  };

  return {
    async load(): Promise<WebRemoteControlRelayStoredAuth | undefined> {
      const { settingsKey, credentialKey } = keysFor(await resolveScope());
      const settings = await loadSettings();
      const deviceSid = settings[settingsKey]?.deviceSid.trim();
      const passHash = (await credentialService.load(credentialKey))?.trim();

      if (!deviceSid && !passHash) {
        return undefined;
      }

      if (!deviceSid || !passHash) {
        logger?.warn("[web-remote-control] external relay auth partial state cleared", {
          hasDeviceSid: Boolean(deviceSid),
          hasPassHash: Boolean(passHash),
        });
        await clear();
        return undefined;
      }

      logger?.info("[web-remote-control] external relay auth loaded", {
        ...safeAuthLogFields({ deviceSid, passHash }),
      });
      return { deviceSid, passHash };
    },

    async save(auth: WebRemoteControlRelayStoredAuth): Promise<void> {
      const { settingsKey, credentialKey } = keysFor(await resolveScope());
      await patchSettings({ [settingsKey]: { deviceSid: auth.deviceSid } });
      await credentialService.save(credentialKey, auth.passHash);
      logger?.info("[web-remote-control] external relay auth saved", {
        ...safeAuthLogFields(auth),
      });
    },

    clear,

    async rotate(auth: WebRemoteControlRelayStoredAuth): Promise<void> {
      await clear();
      await this.save(auth);
      logger?.info("[web-remote-control] external relay auth rotated", {
        ...safeAuthLogFields(auth),
      });
    },
  };
}
