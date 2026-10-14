import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMcodeBuiltinProviderConfigFilePath } from "../src/main/desktopProviderConfig.js";

// 实现用 node:path join 产出本机分隔符（运行时语义正确），Windows 单测下需按
// POSIX 口径归一后再比较，期望值才能跨平台成立。
function toPosixPath(value: string) {
  return value.replaceAll("\\", "/");
}

describe("resolveMcodeBuiltinProviderConfigFilePath", () => {
  it("正式包读取 resources，开发态读取仓库 config", () => {
    expect(
      toPosixPath(
        resolveMcodeBuiltinProviderConfigFilePath({
          isPackaged: true,
          resourcesPath: "/Applications/Mcode.app/Contents/Resources",
          appPath: "/Applications/Mcode.app/Contents/Resources/app.asar",
          // 隔离宿主环境变量：Mcode 开发运行时会注入 MCODE_BUILTIN_PROVIDER_CONFIG_FILE，
          // 不显式清空会让本机跑单测时短路进 explicitPath 分支（CI 无此变量所以一直是绿的）。
          env: {},
        }),
      ),
    ).toBe("/Applications/Mcode.app/Contents/Resources/config/provider/mcode-builtin.json");

    expect(
      toPosixPath(
        resolveMcodeBuiltinProviderConfigFilePath({
          isPackaged: false,
          appPath: "/repo/packages/desktop",
          env: {},
        }),
      ),
    ).toBe("/repo/config/provider/mcode-builtin.test.json");
  });

  it("显式 Mcode Built-in Config Source 优先于安装布局", () => {
    expect(
      resolveMcodeBuiltinProviderConfigFilePath({
        env: { MCODE_BUILTIN_PROVIDER_CONFIG_FILE: "/fixtures/mcode-builtin.json" },
        isPackaged: true,
        resourcesPath: "/Applications/Mcode.app/Contents/Resources",
      }),
    ).toBe("/fixtures/mcode-builtin.json");
  });
});

describe("开发态按编译环境选取配置", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  it.each(["test", "production"])("%s 不受启动时的环境变量反向覆盖", async (environment) => {
    vi.resetModules();
    vi.stubGlobal("__MCODE_ENV__", environment);
    const { resolveMcodeBuiltinProviderConfigFilePath: resolvePath } =
      await import("../src/main/desktopProviderConfig.js");
    expect(
      toPosixPath(
        resolvePath({
          isPackaged: false,
          appPath: "/repo/packages/desktop",
          env: { MCODE_ENV: environment === "test" ? "production" : "test" },
        }),
      ),
    ).toBe(
      `/repo/config/provider/${environment === "production" ? "mcode-builtin.json" : "mcode-builtin.test.json"}`,
    );
  });
});
