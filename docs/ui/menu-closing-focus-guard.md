# 菜单关闭期间的焦点守卫

## 问题

Windows 桌面版在模型供应商卡片里点「… → 重命名」，名称输入框闪一下就消失，要重复三次左右才能进入编辑。macOS 不复现。

## 原因

1. 选中菜单项后，Radix Menu 立即把 Content 切到 `data-state="closed"`，但为了播放约 100ms 的关闭动画，节点仍留在 DOM 上并继续接收指针事件。
2. 业务在 `onSelect` 里切到编辑态，并在下一帧把焦点交给名称输入框。
3. Windows 上的 Chromium 在点击后会补发合成 `mousemove`（鼠标轻微抖动同样会产生）。事件落在关闭中的菜单项上，Radix Item 的 `onPointerMove` 执行 `item.focus()`，`onPointerLeave` 把焦点交还给 Content。
4. 名称输入框因此 blur，`handleNameBlur` 把编辑态收起。

macOS 点击后鼠标静止，不会补发 `mousemove`，所以不复现。

焦点轨迹（修复前，模拟点击后补发的 mousemove）：

```
focusin  菜单项（menu open）
focusin  名称输入框            ← 业务 rAF 聚焦
focusout 名称输入框 → 菜单项（menu closed）  ← 关闭动画期间的 pointermove 抢回焦点
focusout 菜单项 → null          ← 菜单卸载，编辑态已被 blur 收起
```

## 规则

- 处于关闭状态（`[role="menu"][data-state="closed"]`）的菜单不再响应指针移动，不得移动焦点或改变高亮。
- 打开状态的菜单保持 Radix 原有的 hover 高亮与焦点行为。
- 守卫放在共享组件 `packages/ui/src/components/ui/{dropdown-menu,context-menu}.tsx` 的所有可聚焦菜单项上（Item、CheckboxItem、RadioItem、SubTrigger），对所有「选中后打开输入框 / 对话框」的菜单统一生效，不在单个业务组件里打补丁。

## 实现

`packages/ui/src/components/ui/menu-closing-focus-guard.ts` 的 `guardClosingMenuPointer` 包装 `onPointerMove` / `onPointerLeave`：先执行调用方的处理器，再对关闭中菜单内的事件调用 `preventDefault()`。Radix 通过 `composeEventHandlers` 检查 `defaultPrevented`，会跳过 highlight 与 `focus()`。

## 验收

- Windows 桌面版：添加供应商后点「… → 重命名」，第一次点击即进入可输入状态。
- macOS / Linux / Web：行为不变。
- 菜单打开时鼠标悬停仍会高亮菜单项，键盘导航不受影响。
- 单测：`packages/ui/test/menuClosingFocusGuard.test.ts`（行为）、`packages/ui/test/menuClosingFocusGuardWiring.test.ts`（共享组件全部接入）。
