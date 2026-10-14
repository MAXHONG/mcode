import {
  ChannelClient,
  MessagePortProtocol,
  ProxyChannel,
  type MessagePortLike,
  type MessagePortPayload,
} from "@mcode/rpc";
import {
  IMcodeTaskService,
  type IMcodeTaskService as IMcodeTaskServiceShape,
} from "#src/session/mcodeTaskService.js";
import {
  IMcodeAgentService,
  type IMcodeAgentService as IMcodeAgentServiceShape,
} from "#src/mcode-agent/mcodeAgent.js";
import {
  IMcodeSessionService,
  type IMcodeSessionService as IMcodeSessionServiceShape,
} from "#src/mcode-session/mcodeSession.js";
import {
  IModelSelectionService,
  type IModelSelectionService as IModelSelectionServiceShape,
} from "#src/model-provider/providerFacadeServices.js";

interface PortLike {
  on?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  off?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  addEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  removeEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  postMessage(message: MessagePortPayload): void;
  start?(): void;
  close?(): void;
}

function toMessagePortLike(port: PortLike): MessagePortLike {
  return {
    addEventListener(type, listener) {
      if (port.addEventListener) {
        port.addEventListener(type, listener);
        return;
      }
      port.on?.(type, listener);
    },
    removeEventListener(type, listener) {
      if (port.removeEventListener) {
        port.removeEventListener(type, listener);
        return;
      }
      port.off?.(type, listener);
    },
    postMessage(data) {
      port.postMessage(data);
    },
    start() {
      port.start?.();
    },
    close() {
      port.close?.();
    },
  };
}

export interface RemoteBotWorkspaceRuntimeServices {
  mcodeAgentService: IMcodeAgentServiceShape;
  mcodeTaskService: IMcodeTaskServiceShape;
  mcodeSessionService: IMcodeSessionServiceShape;
  modelSelectionService: IModelSelectionServiceShape;
}

export function createRemoteRuntimeServicesFromPort(
  port: unknown,
): RemoteBotWorkspaceRuntimeServices {
  const protocol = new MessagePortProtocol(toMessagePortLike(port as PortLike));
  const client = new ChannelClient(protocol);
  return {
    mcodeAgentService: ProxyChannel.toService<IMcodeAgentServiceShape>(
      client.getChannel(IMcodeAgentService.channelName),
    ),
    mcodeTaskService: ProxyChannel.toService<IMcodeTaskServiceShape>(
      client.getChannel(IMcodeTaskService.channelName),
    ),
    mcodeSessionService: ProxyChannel.toService<IMcodeSessionServiceShape>(
      client.getChannel(IMcodeSessionService.channelName),
    ),
    modelSelectionService: ProxyChannel.toService<IModelSelectionServiceShape>(
      client.getChannel(IModelSelectionService.channelName),
    ),
  };
}
