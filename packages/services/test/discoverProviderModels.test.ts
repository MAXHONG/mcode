import { describe, expect, it, vi } from "vitest";
import type { ModelConfigResolution } from "@mcode/provider";
import {
  buildDiscoverModelsUrls,
  fetchAndMatchProviderModels,
  parseDiscoveredModelsPayload,
} from "../src/model-provider/providerFacadeServices.js";

describe("discoverProviderModels", () => {
  it("从多种格式的 Base URL 正确推导候选 /models 地址", () => {
    expect(buildDiscoverModelsUrls("https://api.openai.com/v1")).toEqual([
      "https://api.openai.com/v1/models",
    ]);
    expect(buildDiscoverModelsUrls("https://api.openai.com/")).toEqual([
      "https://api.openai.com/v1/models",
      "https://api.openai.com/models",
    ]);
    expect(buildDiscoverModelsUrls("https://proxy.example.com/v1/chat/completions")).toEqual([
      "https://proxy.example.com/v1/models",
    ]);
  });

  it("兼容 OpenAI data、models 数组与字符串数组格式并去重排序", () => {
    expect(
      parseDiscoveredModelsPayload({
        data: [
          { id: "gpt-4o", owned_by: "openai" },
          { id: "claude-sonnet-4", display_name: "Claude Sonnet 4" },
          { id: "gpt-4o" },
        ],
      }),
    ).toEqual([
      { modelId: "claude-sonnet-4", displayName: "Claude Sonnet 4" },
      { modelId: "gpt-4o", ownedBy: "openai" },
    ]);
    expect(
      parseDiscoveredModelsPayload({
        models: [{ name: "models/gemini-2.5-pro" }],
      }),
    ).toEqual([{ modelId: "gemini-2.5-pro" }]);
  });

  it("拉取模型并调用内置 resolveModelConfig 自动匹配参数框架", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.example.com/v1/models");
      expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-test");
      return new Response(
        JSON.stringify({
          data: [{ id: "gpt-4o" }, { id: "my-private-model" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const resolveModelConfig = vi.fn(async (modelId: string): Promise<ModelConfigResolution> => ({
      providerId: "custom-1",
      modelId,
      inheritedConfig:
        modelId === "gpt-4o"
          ? { properties: { contextWindow: 128_000, inputFormat: { supportsText: true, supportsImage: true } } }
          : {},
      config:
        modelId === "gpt-4o"
          ? { properties: { contextWindow: 128_000, inputFormat: { supportsText: true, supportsImage: true } } }
          : {},
      issues: [],
    }));

    const result = await fetchAndMatchProviderModels({
      providerId: "custom-1",
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      apiType: "openai-chat-completions",
      resolveModelConfig,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.endpointUrl).toBe("https://api.example.com/v1/models");
    expect(result.models).toHaveLength(2);
    expect(result.models[0]).toMatchObject({ modelId: "gpt-4o", matchedBuiltinRule: true });
    expect(result.models[1]).toMatchObject({ modelId: "my-private-model", matchedBuiltinRule: false });
  });

  it("Anthropic 协议遇到 401 时自动回退 Bearer 鉴权重试以兼容各类中转站", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      calls += 1;
      const headers = init?.headers as Record<string, string>;
      if (calls === 1) {
        expect(headers["x-api-key"]).toBe("sk-relay");
        return new Response("unauthorized", { status: 401, statusText: "Unauthorized" });
      }
      expect(headers["Authorization"]).toBe("Bearer sk-relay");
      return new Response(JSON.stringify({ data: [{ id: "claude-sonnet-4" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await fetchAndMatchProviderModels({
      providerId: "custom-anthropic",
      baseUrl: "https://relay.example.com/v1",
      apiKey: "sk-relay",
      apiType: "anthropic-messages",
      resolveModelConfig: async (modelId) => ({
        providerId: "custom-anthropic",
        modelId,
        inheritedConfig: { properties: { contextWindow: 200_000 } },
        config: { properties: { contextWindow: 200_000 } },
        issues: [],
      }),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(calls).toBe(2);
    expect(result.models).toHaveLength(1);
    expect(result.models[0]).toMatchObject({ modelId: "claude-sonnet-4", matchedBuiltinRule: true });
  });
});
