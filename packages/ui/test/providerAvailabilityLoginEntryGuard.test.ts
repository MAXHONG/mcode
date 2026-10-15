// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  shouldOpenStartupLoginEntry,
  useProviderAvailabilityLoginEntryGuard,
} from "@/root/useProviderAvailabilityLoginEntryGuard.js";

const personalProviderView = {
  revision: 1,
  providers: [
    {
      providerId: "genspark-gsk",
      config: { kind: "api" as const },
      models: [{ modelId: "deep-seek-v4.1-flash", config: {} }],
    },
  ],
};

describe("shouldOpenStartupLoginEntry", () => {
  it.each([
    // [hasUser, hasUsableProvider, hasProviderFamilyDomain, expected]
    [false, true, false, false],
    [false, true, true, false],
    [true, true, false, false],
    [true, true, true, false],
    [false, false, false, true],
    [false, false, true, true],
    [true, false, false, true],
    [true, false, true, false],
  ])(
    "hasUser=%s hasUsableProvider=%s hasProviderFamilyDomain=%s → %s",
    (hasUser, hasUsableProvider, hasProviderFamilyDomain, expected) => {
      expect(
        shouldOpenStartupLoginEntry({ hasUser, hasUsableProvider, hasProviderFamilyDomain }),
      ).toBe(expected);
    },
  );
});

describe("useProviderAvailabilityLoginEntryGuard", () => {
  it("全新安装只有个人 Provider（未选择 Z.ai/BigModel 运行域）时不打开登录页", async () => {
    const setLoginEntryOpen = vi.fn();
    renderHook(() =>
      useProviderAvailabilityLoginEntryGuard({
        user: null,
        isRestoringOAuthSession: false,
        providerFamilyDomain: undefined,
        modelSelectionView: personalProviderView,
        refreshProviderState: vi.fn(async () => {}),
        readModelSelectionView: async () => personalProviderView,
        setLoginEntryOpen,
      }),
    );

    await waitFor(() => expect(setLoginEntryOpen).toHaveBeenCalledWith(false));
    expect(setLoginEntryOpen).not.toHaveBeenCalledWith(true);
  });

  it("全新安装且没有任何可用模型时仍然打开登录页", async () => {
    const setLoginEntryOpen = vi.fn();
    const emptyView = { revision: 1, providers: [] };
    renderHook(() =>
      useProviderAvailabilityLoginEntryGuard({
        user: null,
        isRestoringOAuthSession: false,
        providerFamilyDomain: undefined,
        modelSelectionView: emptyView,
        refreshProviderState: vi.fn(async () => {}),
        readModelSelectionView: async () => emptyView,
        setLoginEntryOpen,
      }),
    );

    await waitFor(() => expect(setLoginEntryOpen).toHaveBeenCalledWith(true));
  });

  it("首次 Selection 读取失败结束启动等待且不伪装成无 Provider", async () => {
    const setLoginEntryOpen = vi.fn();
    const { result } = renderHook(() =>
      useProviderAvailabilityLoginEntryGuard({
        user: null,
        isRestoringOAuthSession: false,
        providerFamilyDomain: "zai",
        modelSelectionView: null,
        modelSelectionError: new Error("registry unavailable"),
        refreshProviderState: vi.fn(async () => {}),
        readModelSelectionView: vi.fn(),
        setLoginEntryOpen,
      }),
    );

    await waitFor(() => expect(result.current.startupCheckCompleted).toBe(true));
    expect(setLoginEntryOpen).not.toHaveBeenCalled();
  });

  it("等待 Selection View 水合后再判断启动可用性", async () => {
    const setLoginEntryOpen = vi.fn();
    const refreshProviderState = vi.fn(async () => {});
    const view = {
      revision: 1,
      providers: [
        {
          providerId: "registry-provider",
          config: { kind: "api" as const },
          models: [{ modelId: "registry-model", config: {} }],
        },
      ],
    };
    const { rerender } = renderHook(
      (props: { hydrated: boolean }) =>
        useProviderAvailabilityLoginEntryGuard({
          user: null,
          isRestoringOAuthSession: false,
          providerFamilyDomain: "zai",
          modelSelectionView: props.hydrated ? view : null,
          refreshProviderState,
          readModelSelectionView: async () => view,
          setLoginEntryOpen,
        }),
      { initialProps: { hydrated: false } },
    );

    await Promise.resolve();
    expect(setLoginEntryOpen).not.toHaveBeenCalled();

    rerender({ hydrated: true });

    await waitFor(() => expect(setLoginEntryOpen).toHaveBeenCalledWith(false));
    expect(refreshProviderState).not.toHaveBeenCalled();
  });
});
