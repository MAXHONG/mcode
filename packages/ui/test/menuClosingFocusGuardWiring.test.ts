import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dropdownMenuSource = readFileSync(
  new URL("../src/components/ui/dropdown-menu.tsx", import.meta.url),
  "utf8",
);
const contextMenuSource = readFileSync(
  new URL("../src/components/ui/context-menu.tsx", import.meta.url),
  "utf8",
);

// Bug：Windows 桌面菜单关闭动画期间的 pointermove 会让 Radix 把焦点抢回菜单项，
// 「重命名」等打开输入框的菜单项要点三次才生效。所有可聚焦菜单项都必须经过关闭守卫。
describe("shared menu components apply the closing focus guard", () => {
  it.each([
    ["dropdown-menu.tsx", dropdownMenuSource, 4],
    ["context-menu.tsx", contextMenuSource, 2],
  ] as const)("%s 的可聚焦菜单项都包装了 pointermove / pointerleave", (_file, source, count) => {
    expect(
      source.match(/onPointerMove=\{guardClosingMenuPointer\(onPointerMove\)\}/g),
    ).toHaveLength(count);
    expect(
      source.match(/onPointerLeave=\{guardClosingMenuPointer\(onPointerLeave\)\}/g),
    ).toHaveLength(count);
  });
});
