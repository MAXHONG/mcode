import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_EXEC_TIMEOUT_MS = 15_000;
const MAX_AX_ELEMENTS = 180;

function textResult(data, isError = false) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

function errorResult(code, message) {
  return textResult({ error: { code, message } }, true);
}

async function runCmd(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    timeout: options.timeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    ...(options.input !== undefined ? { input: options.input } : {}),
  });
  return String(stdout ?? "");
}

async function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  try {
    await runCmd(checker, [command], { timeoutMs: 3_000 });
    return true;
  } catch {
    return false;
  }
}

function normalizeButton(button) {
  const value = String(button ?? "left").toLowerCase();
  if (value === "right" || value === "r") return "right";
  if (value === "middle" || value === "m") return "middle";
  return "left";
}

function normalizeDirection(direction) {
  const value = String(direction ?? "down").toLowerCase();
  if (value === "u" || value === "up") return "up";
  if (value === "l" || value === "left") return "left";
  if (value === "r" || value === "right") return "right";
  return "down";
}

function resolveTargetCoordinate(args, session) {
  const index =
    typeof args?.element_index === "number"
      ? args.element_index
      : typeof args?.elementIndex === "number"
        ? args.elementIndex
        : typeof args?.index === "number"
          ? args.index
          : typeof args?.ref === "number"
            ? args.ref
            : null;
  if (index !== null) {
    const el = session.elementsByIndex.get(index);
    if (!el?.bounds) return { error: `Element index ${index} not found; call get_app_state first.` };
    return {
      coord: [
        Math.round(el.bounds.x + el.bounds.width / 2),
        Math.round(el.bounds.y + el.bounds.height / 2),
      ],
      element: el,
    };
  }
  const coord = args?.coordinate ?? args?.point ?? args?.position;
  if (Array.isArray(coord) && coord.length >= 2) {
    const x = Math.round(Number(coord[0]));
    const y = Math.round(Number(coord[1]));
    if (Number.isFinite(x) && Number.isFinite(y)) return { coord: [x, y] };
  }
  if (typeof args?.x === "number" && typeof args?.y === "number") {
    return { coord: [Math.round(args.x), Math.round(args.y)] };
  }
  return { coord: null };
}

function formatAxTreeText(elements) {
  return elements
    .map((el) => {
      const b = el.bounds ? `@${el.bounds.x},${el.bounds.y},${el.bounds.width},${el.bounds.height}` : "";
      const title = el.title ? ` "${el.title}"` : "";
      const value = el.value ? ` value="${el.value}"` : "";
      return `[#${el.index}] ${el.kind}${title}${value} ${b}`.trim();
    })
    .join("\n");
}

// ─────────────────────────────── Linux (Ubuntu X11 + Wayland + AT-SPI2) ───────────────────────────────

async function linuxListApps() {
  if (await commandExists("wmctrl")) {
    const out = await runCmd("wmctrl", ["-lp"]);
    const apps = new Map();
    for (const line of out.split("\n")) {
      const match = line.match(/^0x[0-9a-f]+\s+\S+\s+(\d+)\s+\S+\s+(.*)$/iu);
      if (!match) continue;
      const pid = Number(match[1]);
      const title = match[2].trim();
      if (!apps.has(pid)) apps.set(pid, { name: title || `pid-${pid}`, pid, running: true });
    }
    return [...apps.values()];
  }
  return [];
}

async function linuxListWindows() {
  if (!(await commandExists("wmctrl"))) return [];
  const out = await runCmd("wmctrl", ["-lpG"]);
  const windows = [];
  for (const line of out.split("\n")) {
    const match = line.match(/^0x([0-9a-f]+)\s+\S+\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)\s+\S+\s+(.*)$/iu);
    if (!match) continue;
    windows.push({
      window_id: parseInt(match[1], 16),
      pid: Number(match[2]),
      bounds: { x: Number(match[3]), y: Number(match[4]), width: Number(match[5]), height: Number(match[6]) },
      title: match[7].trim(),
    });
  }
  return windows;
}

async function linuxActivateApp(appRef) {
  if (!appRef) return;
  if (typeof appRef.name === "string" && (await commandExists("wmctrl"))) {
    try {
      await runCmd("wmctrl", ["-a", appRef.name]);
    } catch {
      // 忽略激活失败，继续采集当前前台状态
    }
  }
}

async function linuxCollectAxElements() {
  const script = `
import json
try:
    import gi
    gi.require_version("Atspi", "2.0")
    from gi.repository import Atspi
except Exception:
    print("[]")
    raise SystemExit(0)

desktop = Atspi.get_desktop(0)
elements = []
MAX = ${MAX_AX_ELEMENTS}

def walk(node, depth=0):
    if len(elements) >= MAX or depth > 14 or node is None:
        return
    try:
        role = node.get_role_name() or ""
        name = (node.get_name() or "").strip()
        comp = node.get_component_iface()
        bounds = None
        if comp:
            ext = comp.get_extents(Atspi.CoordType.SCREEN)
            if ext.width > 0 and ext.height > 0:
                bounds = {"x": int(ext.x), "y": int(ext.y), "width": int(ext.width), "height": int(ext.height)}
        if bounds and (name or role in ("push button", "text", "entry", "menu item", "check box", "radio button", "link", "page tab", "combo box")):
            val = None
            try:
                ti = node.get_text_iface()
                if ti:
                    val = (ti.get_text(0, min(120, ti.get_character_count())) or "").strip() or None
            except Exception:
                pass
            elements.append({
                "index": len(elements) + 1,
                "kind": role,
                "title": name or None,
                "value": val,
                "actions": ["press"],
                "bounds": bounds,
            })
        count = node.get_child_count()
        for i in range(min(count, 60)):
            walk(node.get_child_at_index(i), depth + 1)
    except Exception:
        pass

for i in range(desktop.get_child_count()):
    app = desktop.get_child_at_index(i)
    if app is None:
        continue
    for j in range(app.get_child_count()):
        win = app.get_child_at_index(j)
        try:
            if win and win.get_state_set().contains(Atspi.StateType.ACTIVE):
                walk(win, 0)
                break
        except Exception:
            pass
    if elements:
        break

print(json.dumps(elements, ensure_ascii=False))
`;
  try {
    const out = await runCmd("python3", ["-c", script], { timeoutMs: 8_000 });
    const parsed = JSON.parse(out.trim() || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function linuxScreenshot() {
  const dir = await mkdtemp(join(tmpdir(), "mcode-cua-"));
  const file = join(dir, "screen.png");
  try {
    if (process.env.WAYLAND_DISPLAY && (await commandExists("grim"))) {
      await runCmd("grim", [file]);
    } else if (await commandExists("scrot")) {
      await runCmd("scrot", [file]);
    } else if (await commandExists("gnome-screenshot")) {
      await runCmd("gnome-screenshot", ["-f", file]);
    } else if (await commandExists("import")) {
      await runCmd("import", ["-window", "root", file]);
    } else {
      throw new Error("No Linux screenshot tool found. Install scrot, grim, or gnome-screenshot.");
    }
    return await readFile(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function linuxClick(x, y, button, clickCount) {
  const btnNum = button === "right" ? "3" : button === "middle" ? "2" : "1";
  if (process.env.WAYLAND_DISPLAY && (await commandExists("ydotool"))) {
    const code = button === "right" ? "0xC1" : button === "middle" ? "0xC2" : "0xC0";
    await runCmd("ydotool", ["mousemove", "--absolute", "-x", String(x), "-y", String(y)]);
    for (let i = 0; i < clickCount; i += 1) await runCmd("ydotool", ["click", code]);
    return;
  }
  if (await commandExists("xdotool")) {
    await runCmd("xdotool", ["mousemove", "--sync", String(x), String(y), "click", "--repeat", String(clickCount), btnNum]);
    return;
  }
  throw new Error("xdotool (X11) or ydotool (Wayland) is required for Linux mouse control.");
}

async function linuxDrag(from, to) {
  if (await commandExists("xdotool")) {
    await runCmd("xdotool", [
      "mousemove", "--sync", String(from[0]), String(from[1]),
      "mousedown", "1",
      "mousemove", "--sync", String(to[0]), String(to[1]),
      "mouseup", "1",
    ]);
    return;
  }
  if (process.env.WAYLAND_DISPLAY && (await commandExists("ydotool"))) {
    await runCmd("ydotool", ["mousemove", "--absolute", "-x", String(from[0]), "-y", String(from[1])]);
    await runCmd("ydotool", ["click", "0x40"]);
    await runCmd("ydotool", ["mousemove", "--absolute", "-x", String(to[0]), "-y", String(to[1])]);
    await runCmd("ydotool", ["click", "0x80"]);
    return;
  }
  throw new Error("xdotool or ydotool is required for Linux drag control.");
}

async function linuxScroll(x, y, direction, pages) {
  const steps = Math.max(1, Math.round((pages ?? 1) * 5));
  if (await commandExists("xdotool")) {
    const btn = direction === "up" ? "4" : direction === "down" ? "5" : direction === "left" ? "6" : "7";
    await runCmd("xdotool", ["mousemove", "--sync", String(x), String(y), "click", "--repeat", String(steps), btn]);
    return;
  }
  if (process.env.WAYLAND_DISPLAY && (await commandExists("ydotool"))) {
    const dy = direction === "up" ? steps : direction === "down" ? -steps : 0;
    const dx = direction === "right" ? steps : direction === "left" ? -steps : 0;
    await runCmd("ydotool", ["mousemove", "--absolute", "-x", String(x), "-y", String(y)]);
    await runCmd("ydotool", ["mousemove", "--wheel", "-x", String(dx), "-y", String(dy)]);
    return;
  }
  throw new Error("xdotool or ydotool is required for Linux scroll control.");
}

async function linuxType(text) {
  if (process.env.WAYLAND_DISPLAY && (await commandExists("ydotool"))) {
    await runCmd("ydotool", ["type", "--", text]);
    return;
  }
  if (await commandExists("xdotool")) {
    await runCmd("xdotool", ["type", "--clearmodifiers", "--delay", "12", "--", text]);
    return;
  }
  throw new Error("xdotool or ydotool is required for Linux keyboard typing.");
}

async function linuxKey(key) {
  if (await commandExists("xdotool")) {
    const mapped = String(key)
      .replaceAll("cmd", "ctrl")
      .replaceAll("command", "ctrl")
      .replaceAll("return", "Return")
      .replaceAll("enter", "Return")
      .replaceAll("escape", "Escape")
      .replaceAll("esc", "Escape")
      .replaceAll("tab", "Tab")
      .replaceAll("space", "space")
      .replaceAll("backspace", "BackSpace");
    await runCmd("xdotool", ["key", "--clearmodifiers", mapped]);
    return;
  }
  throw new Error("xdotool is required for Linux key events.");
}

async function linuxPaste(text) {
  if (process.env.WAYLAND_DISPLAY && (await commandExists("wl-copy"))) {
    await runCmd("wl-copy", [], { input: text });
  } else if (await commandExists("xclip")) {
    await runCmd("xclip", ["-selection", "clipboard"], { input: text });
  } else {
    await linuxType(text);
    return;
  }
  await linuxKey("ctrl+v");
}

// ─────────────────────────────── macOS (JXA AX + Quartz CGEvent) ───────────────────────────────

async function macListApps() {
  const jxa = `
const se = Application("System Events");
const procs = se.applicationProcesses.whose({ backgroundOnly: false })();
const apps = procs.map((p) => {
  try {
    return { name: String(p.name()), pid: Number(p.unixId()), running: true };
  } catch {
    return null;
  }
}).filter(Boolean);
JSON.stringify(apps);
`;
  const out = await runCmd("osascript", ["-l", "JavaScript", "-e", jxa]);
  const parsed = JSON.parse(out.trim() || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

async function macActivateApp(appRef) {
  if (typeof appRef?.name === "string" && appRef.name.trim()) {
    try {
      const escaped = appRef.name.replaceAll('"', '\\"');
      await runCmd("osascript", ["-e", `tell application "${escaped}" to activate`], { timeoutMs: 5_000 });
    } catch {
      // 忽略
    }
  }
}

async function macCollectAxElements() {
  const jxa = `
const se = Application("System Events");
const procs = se.applicationProcesses.whose({ frontmost: true });
const out = [];
if (procs.length > 0) {
  const win = procs[0].windows[0];
  try {
    const items = win.entireContents();
    for (let i = 0; i < items.length && out.length < ${MAX_AX_ELEMENTS}; i++) {
      const el = items[i];
      try {
        const role = String(el.role() || "");
        const title = String(el.name() || el.title() || el.description() || "").trim();
        const pos = el.position();
        const sz = el.size();
        if (!pos || !sz || sz[0] <= 0 || sz[1] <= 0) continue;
        if (!title && !["AXButton","AXTextField","AXTextArea","AXCheckBox","AXLink","AXMenuItem","AXPopUpButton"].includes(role)) continue;
        let value = null;
        try { const v = el.value(); if (v !== null && v !== undefined && String(v).length <= 120) value = String(v); } catch {}
        out.push({
          index: out.length + 1,
          kind: role.replace(/^AX/, ""),
          title: title || null,
          value,
          actions: ["press"],
          bounds: { x: Math.round(pos[0]), y: Math.round(pos[1]), width: Math.round(sz[0]), height: Math.round(sz[1]) },
        });
      } catch {}
    }
  } catch {}
}
JSON.stringify(out);
`;
  try {
    const out = await runCmd("osascript", ["-l", "JavaScript", "-e", jxa], { timeoutMs: 8_000 });
    const parsed = JSON.parse(out.trim() || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function macScreenshot() {
  const dir = await mkdtemp(join(tmpdir(), "mcode-cua-"));
  const file = join(dir, "screen.png");
  try {
    await runCmd("screencapture", ["-x", file]);
    return await readFile(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function macType(text) {
  const escaped = text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await runCmd("osascript", ["-e", `tell application "System Events" to keystroke "${escaped}"`]);
}

async function macPaste(text) {
  await runCmd("pbcopy", [], { input: text });
  await runCmd("osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down']);
}

async function macKey(key) {
  const lower = String(key).toLowerCase();
  const keyCodes = { return: 36, enter: 36, tab: 48, space: 49, backspace: 51, delete: 51, escape: 53, esc: 53, left: 123, right: 124, down: 125, up: 126 };
  if (lower in keyCodes) {
    await runCmd("osascript", ["-e", `tell application "System Events" to key code ${keyCodes[lower]}`]);
    return;
  }
  const parts = lower.split("+");
  const mainKey = parts.pop() ?? "";
  const mods = parts
    .map((m) => (m === "cmd" || m === "command" ? "command down" : m === "ctrl" ? "control down" : m === "alt" || m === "option" ? "option down" : m === "shift" ? "shift down" : ""))
    .filter(Boolean);
  const usingClause = mods.length > 0 ? ` using {${mods.join(", ")}}` : "";
  await runCmd("osascript", ["-e", `tell application "System Events" to keystroke "${mainKey.replaceAll('"', '\\"')}"${usingClause}`]);
}

async function macClick(x, y, button, clickCount) {
  const script = `
import Quartz
pt = (${x}, ${y})
down = Quartz.kCGEventRightMouseDown if "${button}" == "right" else Quartz.kCGEventLeftMouseDown
up = Quartz.kCGEventRightMouseUp if "${button}" == "right" else Quartz.kCGEventLeftMouseUp
btn = Quartz.kCGMouseButtonRight if "${button}" == "right" else Quartz.kCGMouseButtonLeft
for i in range(1, ${clickCount} + 1):
    ev_d = Quartz.CGEventCreateMouseEvent(None, down, pt, btn)
    Quartz.CGEventSetIntegerValueField(ev_d, Quartz.kCGMouseEventClickState, i)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev_d)
    ev_u = Quartz.CGEventCreateMouseEvent(None, up, pt, btn)
    Quartz.CGEventSetIntegerValueField(ev_u, Quartz.kCGMouseEventClickState, i)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev_u)
`;
  await runCmd("python3", ["-c", script]);
}

async function macDrag(from, to) {
  const script = `
import time, Quartz
p0, p1 = (${from[0]}, ${from[1]}), (${to[0]}, ${to[1]})
Quartz.CGEventPost(Quartz.kCGHIDEventTap, Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDown, p0, Quartz.kCGMouseButtonLeft))
time.sleep(0.05)
for step in range(1, 11):
    pt = (p0[0] + (p1[0] - p0[0]) * step / 10.0, p0[1] + (p1[1] - p0[1]) * step / 10.0)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDragged, pt, Quartz.kCGMouseButtonLeft))
    time.sleep(0.015)
Quartz.CGEventPost(Quartz.kCGHIDEventTap, Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseUp, p1, Quartz.kCGMouseButtonLeft))
`;
  await runCmd("python3", ["-c", script]);
}

async function macScroll(x, y, direction, pages) {
  const amount = Math.max(1, Math.round((pages ?? 1) * 5));
  const dy = direction === "up" ? amount : direction === "down" ? -amount : 0;
  const dx = direction === "left" ? amount : direction === "right" ? -amount : 0;
  const script = `
import Quartz
Quartz.CGEventPost(Quartz.kCGHIDEventTap, Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventMouseMoved, (${x}, ${y}), Quartz.kCGMouseButtonLeft))
ev = Quartz.CGEventCreateScrollWheelEvent(None, Quartz.kCGScrollEventUnitLine, 2, ${dy}, ${dx})
Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev)
`;
  await runCmd("python3", ["-c", script]);
}

// ─────────────────────────────── Windows (.NET UI Automation + Win32) ───────────────────────────────

async function winListApps() {
  const out = await runCmd("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-Command",
    "Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object ProcessName, Id, MainWindowTitle | ConvertTo-Json -Compress",
  ]);
  if (!out.trim()) return [];
  const parsed = JSON.parse(out);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map((row) => ({ name: row.ProcessName, pid: row.Id, title: row.MainWindowTitle, running: true }));
}

async function winCollectAxElements() {
  const ps = `
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::FocusedElement
if ($null -eq $root) { '[]'; exit }
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$win = $root
while ($null -ne $win) {
  $parent = $walker.GetParent($win)
  if ($null -eq $parent -or $parent -eq [System.Windows.Automation.AutomationElement]::RootElement) { break }
  $win = $parent
}
$cond = [System.Windows.Automation.Condition]::TrueCondition
$nodes = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
$list = New-Object System.Collections.Generic.List[object]
foreach ($n in $nodes) {
  if ($list.Count -ge ${MAX_AX_ELEMENTS}) { break }
  try {
    $rect = $n.Current.BoundingRectangle
    if ([double]::IsInfinity($rect.Width) -or $rect.Width -le 0 -or $rect.Height -le 0) { continue }
    $role = $n.Current.ControlType.ProgrammaticName -replace '^ControlType\\.', ''
    $name = $n.Current.Name
    if ([string]::IsNullOrWhiteSpace($name) -and @('Button','Edit','Hyperlink','MenuItem','CheckBox','RadioButton','TabItem','ComboBox') -notcontains $role) { continue }
    $list.Add([pscustomobject]@{
      index = $list.Count + 1
      kind = $role
      title = if ([string]::IsNullOrWhiteSpace($name)) { $null } else { $name }
      value = $null
      actions = @('press')
      bounds = @{ x = [int]$rect.X; y = [int]$rect.Y; width = [int]$rect.Width; height = [int]$rect.Height }
    })
  } catch {}
}
$list | ConvertTo-Json -Depth 4 -Compress
`;
  try {
    const out = await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { timeoutMs: 8_000 });
    const parsed = JSON.parse(out.trim() || "[]");
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function winScreenshot() {
  const dir = await mkdtemp(join(tmpdir(), "mcode-cua-"));
  const file = join(dir, "screen.png");
  try {
    const ps = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('${file.replaceAll("'", "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
`;
    await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
    return await readFile(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const WIN32_MOUSE_DEF =
  `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class McodeWinInput { [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, int dwData, UIntPtr dwExtraInfo); }'`;

async function winClick(x, y, button, clickCount) {
  const downFlag = button === "right" ? "0x0008" : button === "middle" ? "0x0020" : "0x0002";
  const upFlag = button === "right" ? "0x0010" : button === "middle" ? "0x0040" : "0x0004";
  const ps = `${WIN32_MOUSE_DEF}; [McodeWinInput]::SetCursorPos(${x}, ${y}) | Out-Null; for ($i=0; $i -lt ${clickCount}; $i++) { [McodeWinInput]::mouse_event(${downFlag}, 0, 0, 0, [UIntPtr]::Zero); [McodeWinInput]::mouse_event(${upFlag}, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 30 }`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

async function winDrag(from, to) {
  const ps = `${WIN32_MOUSE_DEF}; [McodeWinInput]::SetCursorPos(${from[0]}, ${from[1]}) | Out-Null; [McodeWinInput]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 50; [McodeWinInput]::SetCursorPos(${to[0]}, ${to[1]}) | Out-Null; Start-Sleep -Milliseconds 50; [McodeWinInput]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

async function winScroll(x, y, direction, pages) {
  const delta = Math.max(1, Math.round((pages ?? 1) * 3)) * 120 * (direction === "up" ? 1 : -1);
  const ps = `${WIN32_MOUSE_DEF}; [McodeWinInput]::SetCursorPos(${x}, ${y}) | Out-Null; [McodeWinInput]::mouse_event(0x0800, 0, 0, ${delta}, [UIntPtr]::Zero)`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

async function winType(text) {
  const escaped = text.replaceAll("'", "''");
  const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

async function winKey(key) {
  const map = { return: "{ENTER}", enter: "{ENTER}", escape: "{ESC}", esc: "{ESC}", tab: "{TAB}", backspace: "{BACKSPACE}", delete: "{DELETE}", up: "{UP}", down: "{DOWN}", left: "{LEFT}", right: "{RIGHT}", space: " " };
  const lower = String(key).toLowerCase();
  if (lower in map) {
    await winType(map[lower]);
    return;
  }
  const parts = lower.split("+");
  const main = parts.pop() ?? "";
  const prefix = parts.map((m) => (m === "ctrl" || m === "cmd" ? "^" : m === "alt" ? "%" : m === "shift" ? "+" : "")).join("");
  await winType(`${prefix}${map[main] ?? main}`);
}

async function winPaste(text) {
  const escaped = text.replaceAll("'", "''");
  const ps = `Set-Clipboard -Value '${escaped}'; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

// ─────────────────────────────── Unified Cross-Platform Runtime ───────────────────────────────

export function createComputerUseRuntime(_options = {}) {
  const sessions = new Map();

  function getSession(sessionId) {
    let session = sessions.get(sessionId);
    if (!session) {
      session = { stateSeq: 0, elementsByIndex: new Map() };
      sessions.set(sessionId, session);
    }
    return session;
  }

  async function captureScreenshot() {
    if (process.platform === "linux") return linuxScreenshot();
    if (process.platform === "darwin") return macScreenshot();
    if (process.platform === "win32") return winScreenshot();
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  async function collectAxElements() {
    if (process.platform === "linux") return linuxCollectAxElements();
    if (process.platform === "darwin") return macCollectAxElements();
    if (process.platform === "win32") return winCollectAxElements();
    return [];
  }

  async function clickAt(x, y, button = "left", clickCount = 1) {
    if (process.platform === "linux") await linuxClick(x, y, button, clickCount);
    else if (process.platform === "darwin") await macClick(x, y, button, clickCount);
    else if (process.platform === "win32") await winClick(x, y, button, clickCount);
  }

  async function pressKey(key) {
    if (process.platform === "linux") await linuxKey(key);
    else if (process.platform === "darwin") await macKey(key);
    else if (process.platform === "win32") await winKey(key);
  }

  async function pasteText(text) {
    if (process.platform === "linux") await linuxPaste(text);
    else if (process.platform === "darwin") await macPaste(text);
    else if (process.platform === "win32") await winPaste(text);
  }

  return {
    async execute(input) {
      const toolName = String(input?.toolName ?? "");
      const args = (input?.arguments && typeof input.arguments === "object" ? input.arguments : {}) ?? {};
      const sessionId = input?.context?.sessionId ?? "default";
      const session = getSession(sessionId);

      try {
        switch (toolName) {
          case "request_access": {
            const deps =
              process.platform === "linux"
                ? {
                    displayServer: process.env.WAYLAND_DISPLAY ? "wayland" : "x11",
                    xdotool: await commandExists("xdotool"),
                    ydotool: await commandExists("ydotool"),
                    scrot: await commandExists("scrot"),
                    grim: await commandExists("grim"),
                    wmctrl: await commandExists("wmctrl"),
                    xclip: await commandExists("xclip"),
                    wlCopy: await commandExists("wl-copy"),
                  }
                : { native: true };
            return textResult({
              granted: true,
              platform: process.platform,
              backend: "mcode-open-cua",
              capabilities: ["ax_tree", "screenshot", "click", "drag", "scroll", "type", "key", "paste", "set_value"],
              dependencies: deps,
            });
          }

          case "list_apps": {
            const apps =
              process.platform === "linux"
                ? await linuxListApps()
                : process.platform === "darwin"
                  ? await macListApps()
                  : process.platform === "win32"
                    ? await winListApps()
                    : [];
            return textResult(apps);
          }

          case "list_windows": {
            const windows =
              process.platform === "linux"
                ? await linuxListWindows()
                : process.platform === "win32"
                  ? await winListApps()
                  : await macListApps();
            return textResult(windows);
          }

          case "get_app_state": {
            if (process.platform === "linux") await linuxActivateApp(args.app ?? args);
            else if (process.platform === "darwin") await macActivateApp(args.app ?? args);

            session.stateSeq += 1;
            const stateId = `mcode-state-${session.stateSeq}-${randomUUID().slice(0, 8)}`;
            const [elements, png] = await Promise.all([collectAxElements(), captureScreenshot()]);
            session.elementsByIndex = new Map(elements.map((el) => [el.index, el]));

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    state_id: stateId,
                    platform: process.platform,
                    backend: "mcode-open-cua",
                    tree: formatAxTreeText(elements),
                    elements,
                  }),
                },
                {
                  type: "image",
                  data: png.toString("base64"),
                  mimeType: "image/png",
                },
              ],
            };
          }

          case "left_click": {
            const resolved = resolveTargetCoordinate(args, session);
            if (resolved.error) return errorResult("element_unavailable", resolved.error);
            if (!resolved.coord) return errorResult("invalid_request", "left_click requires coordinate [x, y] or element_index");
            const button = normalizeButton(args.button ?? args.mouseButton);
            const clickCount = Math.max(1, Number(args.clickCount ?? args.click_count ?? 1));
            await clickAt(resolved.coord[0], resolved.coord[1], button, clickCount);
            return textResult({ ok: true, action: "left_click", coordinate: resolved.coord });
          }

          case "left_click_drag": {
            const fromRes = Array.isArray(args.start_coordinate)
              ? { coord: args.start_coordinate.map((n) => Math.round(Number(n))) }
              : resolveTargetCoordinate(args.from ?? { element_index: args.from_index }, session);
            const toRes = Array.isArray(args.coordinate)
              ? { coord: args.coordinate.map((n) => Math.round(Number(n))) }
              : resolveTargetCoordinate(args.to ?? { element_index: args.to_index }, session);
            if (!fromRes.coord || !toRes.coord) {
              return errorResult("invalid_request", "left_click_drag requires start_coordinate and coordinate");
            }
            if (process.platform === "linux") await linuxDrag(fromRes.coord, toRes.coord);
            else if (process.platform === "darwin") await macDrag(fromRes.coord, toRes.coord);
            else if (process.platform === "win32") await winDrag(fromRes.coord, toRes.coord);
            return textResult({ ok: true, action: "left_click_drag", from: fromRes.coord, to: toRes.coord });
          }

          case "scroll": {
            const resolved = resolveTargetCoordinate(args, session);
            const coord = resolved.coord ?? [0, 0];
            const direction = normalizeDirection(args.direction);
            const pages = Number(args.pages ?? args.amount ?? 1);
            if (process.platform === "linux") await linuxScroll(coord[0], coord[1], direction, pages);
            else if (process.platform === "darwin") await macScroll(coord[0], coord[1], direction, pages);
            else if (process.platform === "win32") await winScroll(coord[0], coord[1], direction, pages);
            return textResult({ ok: true, action: "scroll", coordinate: coord, direction, pages });
          }

          case "type": {
            const text = String(args.text ?? "");
            if (!text) return errorResult("invalid_request", "type requires non-empty text");
            if (process.platform === "linux") await linuxType(text);
            else if (process.platform === "darwin") await macType(text);
            else if (process.platform === "win32") await winType(text);
            return textResult({ ok: true, action: "type" });
          }

          case "set_value": {
            const resolved = resolveTargetCoordinate(args, session);
            if (resolved.error) return errorResult("element_unavailable", resolved.error);
            if (resolved.coord) await clickAt(resolved.coord[0], resolved.coord[1], "left", 1);
            await pressKey(process.platform === "darwin" ? "cmd+a" : "ctrl+a");
            await pasteText(String(args.value ?? ""));
            return textResult({ ok: true, action: "set_value" });
          }

          case "select_text": {
            const resolved = resolveTargetCoordinate(args, session);
            if (resolved.error) return errorResult("element_unavailable", resolved.error);
            if (resolved.coord) await clickAt(resolved.coord[0], resolved.coord[1], "left", 1);
            await pressKey(process.platform === "darwin" ? "cmd+a" : "ctrl+a");
            return textResult({ ok: true, action: "select_text" });
          }

          case "perform_action": {
            const resolved = resolveTargetCoordinate(args, session);
            if (resolved.error) return errorResult("element_unavailable", resolved.error);
            if (!resolved.coord) return errorResult("invalid_request", "perform_action requires element_index or coordinate");
            const action = String(args.action ?? "press").toLowerCase();
            await clickAt(resolved.coord[0], resolved.coord[1], action.includes("menu") || action.includes("right") ? "right" : "left", 1);
            return textResult({ ok: true, action: "perform_action", performed: action });
          }

          case "paste": {
            await pasteText(String(args.text ?? ""));
            return textResult({ ok: true, action: "paste" });
          }

          case "key": {
            const key = String(args.key ?? args.text ?? "");
            if (!key) return errorResult("invalid_request", "key requires key name");
            await pressKey(key);
            return textResult({ ok: true, action: "key", key });
          }

          case "stop_computer_control": {
            sessions.delete(sessionId);
            return textResult({ ok: true, stopped: true });
          }

          default:
            return errorResult("method_not_found", `Unknown Computer Use tool: ${toolName}`);
        }
      } catch (error) {
        return errorResult("internal", error instanceof Error ? error.message : String(error));
      }
    },

    async closeSession(context) {
      if (context?.sessionId) sessions.delete(context.sessionId);
    },

    async dispose() {
      sessions.clear();
    },
  };
}
