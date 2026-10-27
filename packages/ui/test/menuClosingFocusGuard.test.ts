// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  guardClosingMenuPointer,
  isInsideClosingMenu,
} from "@/components/ui/menu-closing-focus-guard.js";

function createMenuItem(state: "open" | "closed"): HTMLElement {
  const menu = document.createElement("div");
  menu.setAttribute("role", "menu");
  menu.setAttribute("data-state", state);
  const item = document.createElement("div");
  item.setAttribute("role", "menuitem");
  menu.appendChild(item);
  document.body.appendChild(menu);
  return item;
}

function createPointerEvent(currentTarget: Element) {
  const event = {
    currentTarget,
    defaultPrevented: false,
    preventDefault: vi.fn(() => {
      event.defaultPrevented = true;
    }),
  };
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("menu closing focus guard", () => {
  // Bug：Windows 桌面点击「重命名」后，Chromium 补发的 mousemove 落在关闭动画中的菜单项上，
  // Radix 会 item.focus() 把焦点从名称输入框抢回菜单，导致要点三次才能进入编辑。
  it("关闭动画中的菜单项拦截指针移动，阻止 Radix 抢焦点", () => {
    const item = createMenuItem("closed");
    const userHandler = vi.fn();
    const event = createPointerEvent(item);

    guardClosingMenuPointer(userHandler)(event as never);

    expect(userHandler).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("打开状态的菜单保持原有 hover 高亮与焦点行为", () => {
    const item = createMenuItem("open");
    const event = createPointerEvent(item);

    guardClosingMenuPointer(undefined)(event as never);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(isInsideClosingMenu(item)).toBe(false);
  });

  it("调用方已 preventDefault 时不重复处理", () => {
    const item = createMenuItem("closed");
    const event = createPointerEvent(item);
    const userHandler = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());

    guardClosingMenuPointer(userHandler as never)(event as never);

    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("不在菜单内的元素不受影响", () => {
    const element = document.createElement("button");
    document.body.appendChild(element);
    expect(isInsideClosingMenu(element)).toBe(false);
    expect(isInsideClosingMenu(null)).toBe(false);
  });
});
