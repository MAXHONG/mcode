import type * as React from "react";

/**
 * Bug 原因（Windows 桌面「重命名」要点三次才生效）：
 * Radix Menu 在选中菜单项后立刻把 Content 切到 `data-state="closed"`，但为了播放约 100ms 的
 * 关闭动画，节点仍挂在 DOM 上、仍能接收指针事件。Radix 的 Item / SubTrigger 在 `pointermove`
 * 时会执行 `item.focus()`，`pointerleave` 时会把焦点交还给 Content。
 * Windows 上的 Chromium 在点击后会补发合成 mousemove（鼠标轻微抖动也会产生），于是：
 *   选中「重命名」→ 业务把焦点交给名称输入框 → 关闭动画期间的 pointermove 把焦点抢回菜单项
 *   → 输入框 blur → 编辑状态被当作“提交/取消”收起。
 * macOS 点击后鼠标静止不补发 mousemove，所以只在 Windows 上复现。
 *
 * 修复依据：关闭中的菜单已经不可交互，不应再移动焦点。这里在 Radix 处理前对关闭中菜单内的
 * 指针移动调用 `preventDefault()`；Radix 通过 composeEventHandlers 检查 defaultPrevented，
 * 会跳过 highlight 与 focus。打开状态的菜单行为保持不变。
 */
export function isInsideClosingMenu(element: Element | null | undefined): boolean {
  const menu = element?.closest('[role="menu"]');
  return menu?.getAttribute("data-state") === "closed";
}

export function guardClosingMenuPointer<E extends Element>(
  handler: React.PointerEventHandler<E> | undefined,
): React.PointerEventHandler<E> {
  return (event) => {
    handler?.(event);
    if (!event.defaultPrevented && isInsideClosingMenu(event.currentTarget)) {
      event.preventDefault();
    }
  };
}
