import { describe, expect, it } from "vitest";
import {
  MCODE_TOOL_ENV_PASSTHROUGH_ENV_KEY,
  MCODE_REMOTE_HTTP_PROXY_ENV_KEY,
  MCODE_REMOTE_NO_PROXY_ENV_KEY,
  MCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY,
  buildZCodeToolEnvPassthroughEnv,
  getCapturedMcodeCuaBrokerCredentials,
  isCuaDevModeRequested,
  isMcodeCuaInternalFeatureEnabled,
  readMcodeAgentTelemetryEnv,
  readMcodeToolEnvPassthroughEnv,
  resetCapturedMcodeCuaBrokerCredentialsForTest,
  sanitizeZCodeRuntimeEnv,
  getCapturedMcodeAgentTelemetryEnv,
  resetCapturedMcodeAgentTelemetryEnvForTest,
} from "../src/runtimeEnv.js";

describe("runtimeEnv", () => {
  it("enables internal CUA by default while honoring explicit false values", () => {
    expect(isMcodeCuaInternalFeatureEnabled({})).toBe(true);
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_PRODUCT_HELPER: "0" })).toBe(false);
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_PRODUCT_HELPER: "false" })).toBe(false);
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_PRODUCT_HELPER: "1" })).toBe(true);
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_PRODUCT_HELPER: " TRUE " })).toBe(true);
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_PRODUCT_HELPER: "on" })).toBe(true);
  });

  it("MCODE_CUA_DEV_MODE is the one-knob dev bundle and implies the internal feature flag", () => {
    // isCuaDevModeRequested: only explicit truthy values (case-insensitive, trimmed).
    expect(isCuaDevModeRequested({})).toBe(false);
    expect(isCuaDevModeRequested({ MCODE_CUA_DEV_MODE: "0" })).toBe(false);
    expect(isCuaDevModeRequested({ MCODE_CUA_DEV_MODE: "false" })).toBe(false);
    expect(isCuaDevModeRequested({ MCODE_CUA_DEV_MODE: "1" })).toBe(true);
    expect(isCuaDevModeRequested({ MCODE_CUA_DEV_MODE: " ON " })).toBe(true);
    expect(isCuaDevModeRequested({ MCODE_CUA_DEV_MODE: "true" })).toBe(true);

    // DEV_MODE implies the internal feature flag without needing MCODE_CUA_PRODUCT_HELPER,
    // collapsing the historical multi-var dev incantation to one knob.
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_DEV_MODE: "1" })).toBe(true);
    expect(isMcodeCuaInternalFeatureEnabled({ MCODE_CUA_PRODUCT_HELPER: "1" })).toBe(true);
    expect(isMcodeCuaInternalFeatureEnabled({})).toBe(true);
  });

  it("sanitizes runtime env while sealing user network env for tools", () => {
    const sourceEnv = {
      HTTP_PROXY: "http://proxy.example:8080",
      NODE_ENV: "development",
      NODE_EXTRA_CA_CERTS: "/tmp/root-ca.pem",
      PATH: "/usr/bin:/bin",
      npm_config_proxy: "http://npm-proxy.example:8080",
    };

    const sanitized = sanitizeZCodeRuntimeEnv(sourceEnv);
    const passthroughEnv = buildZCodeToolEnvPassthroughEnv(sourceEnv);
    const captured = readMcodeToolEnvPassthroughEnv(passthroughEnv);

    expect(sanitized).toEqual({ PATH: "/usr/bin:/bin" });
    expect(passthroughEnv[MCODE_TOOL_ENV_PASSTHROUGH_ENV_KEY]).toBeDefined();
    expect(captured).toEqual({
      HTTP_PROXY: "http://proxy.example:8080",
      NODE_EXTRA_CA_CERTS: "/tmp/root-ca.pem",
      npm_config_proxy: "http://npm-proxy.example:8080",
    });
  });

  it("ignores invalid passthrough JSON and non-network keys", () => {
    const captured = readMcodeToolEnvPassthroughEnv({
      [MCODE_TOOL_ENV_PASSTHROUGH_ENV_KEY]: JSON.stringify({
        HTTP_PROXY: "http://proxy.example:8080",
        NODE_ENV: "production",
        PATH: "/tmp/bin",
      }),
    });

    expect(captured).toEqual({
      HTTP_PROXY: "http://proxy.example:8080",
    });
    expect(
      readMcodeToolEnvPassthroughEnv({
        [MCODE_TOOL_ENV_PASSTHROUGH_ENV_KEY]: "not-json",
      }),
    ).toEqual({});
  });

  it("strips the CUA broker socket/authority/refresh marker from child env and tool passthrough", () => {
    // Confused-deputy 防护：broker bearer 凭据只该定向注入目标 mcode-cua server，绝不能随全局 env
    // 泄漏给其它 MCP / Bash / tool 子进程，也不能经 tool-env-passthrough 恢复。
    const sourceEnv = {
      PATH: "/usr/bin:/bin",
      MCODE_CUA_PERMISSION_BROKER_SOCKET: "/tmp/mcode-cua-me/broker-abc.sock",
      MCODE_CUA_PERMISSION_BROKER_REFRESH_MARKER:
        "/tmp/mcode-cua-me/broker-abc.sock.permission-refresh.json",
    };
    const sanitized = sanitizeZCodeRuntimeEnv(sourceEnv);
    expect(sanitized).toEqual({ PATH: "/usr/bin:/bin" });

    const captured = readMcodeToolEnvPassthroughEnv(buildZCodeToolEnvPassthroughEnv(sourceEnv));
    expect(captured).not.toHaveProperty("MCODE_CUA_PERMISSION_BROKER_SOCKET");
    expect(captured).not.toHaveProperty("MCODE_CUA_PERMISSION_BROKER_SOCKET");
    expect(captured).not.toHaveProperty("MCODE_CUA_PERMISSION_BROKER_REFRESH_MARKER");
  });

  it("strips desktop-to-remote network handoff values after stdio bootstrap", () => {
    const sourceEnv = {
      PATH: "/usr/bin:/bin",
      [MCODE_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY]: "1",
      [MCODE_REMOTE_HTTP_PROXY_ENV_KEY]: "http://172.21.240.1:7890",
      [MCODE_REMOTE_NO_PROXY_ENV_KEY]: "localhost,127.0.0.1",
    };

    expect(sanitizeZCodeRuntimeEnv(sourceEnv)).toEqual({ PATH: "/usr/bin:/bin" });
    expect(readMcodeToolEnvPassthroughEnv(buildZCodeToolEnvPassthroughEnv(sourceEnv))).toEqual({});
  });

  it("captures broker credentials as one atomic pair and clears stale state on partial rotation", () => {
    resetCapturedMcodeCuaBrokerCredentialsForTest();
    try {
      sanitizeZCodeRuntimeEnv({
        MCODE_CUA_PERMISSION_BROKER_SOCKET: "/tmp/broker-a.sock",
        MCODE_CUA_PLUGIN_AUTHORITY: "authority-a",
      });
      expect(getCapturedMcodeCuaBrokerCredentials()).toEqual({
        socket: "/tmp/broker-a.sock",
        pluginAuthority: "authority-a",
      });

      sanitizeZCodeRuntimeEnv({
        MCODE_CUA_PERMISSION_BROKER_SOCKET: "/tmp/broker-b.sock",
      });
      expect(getCapturedMcodeCuaBrokerCredentials()).toEqual({
        socket: undefined,
        pluginAuthority: undefined,
      });

      sanitizeZCodeRuntimeEnv({
        MCODE_CUA_PERMISSION_BROKER_SOCKET: "/tmp/broker-b.sock",
        MCODE_CUA_PLUGIN_AUTHORITY: "authority-b",
      });
      expect(getCapturedMcodeCuaBrokerCredentials()).toEqual({
        socket: "/tmp/broker-b.sock",
        pluginAuthority: "authority-b",
      });
    } finally {
      resetCapturedMcodeCuaBrokerCredentialsForTest();
    }
  });

  it("captures Agent OTLP config privately and never passes auth or identity through to tools", () => {
    resetCapturedMcodeAgentTelemetryEnvForTest();
    const sourceEnv = {
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://arms.example.com/v1/traces",
      OTEL_EXPORTER_OTLP_TRACES_HEADERS: "Authorization=secret",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://arms.example.com/v1/metrics",
      OTEL_EXPORTER_OTLP_METRICS_HEADERS: "Authorization=metric-secret",
      PATH: "/usr/bin:/bin",
      MCODE_TELEMETRY_USER_SUBJECT_ID: "opaque-user",
    };
    expect(sanitizeZCodeRuntimeEnv(sourceEnv)).toEqual({ PATH: "/usr/bin:/bin" });
    expect(getCapturedMcodeAgentTelemetryEnv()).toMatchObject({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://arms.example.com/v1/traces",
      OTEL_EXPORTER_OTLP_TRACES_HEADERS: "Authorization=secret",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://arms.example.com/v1/metrics",
      OTEL_EXPORTER_OTLP_METRICS_HEADERS: "Authorization=metric-secret",
      MCODE_TELEMETRY_USER_SUBJECT_ID: "opaque-user",
    });
    const toolEnv = readMcodeToolEnvPassthroughEnv(buildZCodeToolEnvPassthroughEnv(sourceEnv));
    expect(toolEnv).not.toHaveProperty("OTEL_EXPORTER_OTLP_TRACES_HEADERS");
    expect(toolEnv).not.toHaveProperty("OTEL_EXPORTER_OTLP_METRICS_HEADERS");
    expect(toolEnv).not.toHaveProperty("MCODE_TELEMETRY_USER_SUBJECT_ID");
  });

  it("extracts only the allowlisted Agent telemetry env", () => {
    expect(
      readMcodeAgentTelemetryEnv({
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: " https://arms.example.com/v1/traces ",
        OTEL_UNKNOWN_SECRET: "must-not-pass",
        PATH: "/bin",
        MCODE_MODEL_TELEMETRY_ENABLED: "1",
        MCODE_TELEMETRY_RUNTIME_DISTRIBUTION: " packaged ",
      }),
    ).toEqual({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://arms.example.com/v1/traces",
      MCODE_MODEL_TELEMETRY_ENABLED: "1",
      MCODE_TELEMETRY_RUNTIME_DISTRIBUTION: "packaged",
    });
  });
});
