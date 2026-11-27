import { describe, expect, it } from "vitest";
import { createSystemService } from "../src/system/systemService.js";

describe("systemService.getEnvironmentLoad", () => {
  it("返回当前环境的 CPU 与内存负载，并在 1 秒缓存窗口内复用采样结果", async () => {
    let clock = 10_000;
    const service = createSystemService({ now: () => clock });

    const first = await service.getEnvironmentLoad();
    expect(["host", "docker", "sandbox"]).toContain(first.environmentKind);
    expect(first.cpuCores).toBeGreaterThan(0);
    expect(first.cpuPercent).toBeGreaterThanOrEqual(0);
    expect(first.cpuPercent).toBeLessThanOrEqual(100);
    expect(first.memoryTotalBytes).toBeGreaterThan(0);
    expect(first.memoryPercent).toBeGreaterThanOrEqual(0);
    expect(first.memoryPercent).toBeLessThanOrEqual(100);
    expect(first.sampledAt).toBe(10_000);

    // 500ms 内重复请求命中缓存，保证多窗口/高频调用零额外开销
    clock = 10_500;
    const cached = await service.getEnvironmentLoad();
    expect(cached).toBe(first);

    // 超过 1 秒后重新采样
    clock = 12_000;
    const second = await service.getEnvironmentLoad();
    expect(second.sampledAt).toBe(12_000);
  });
});
