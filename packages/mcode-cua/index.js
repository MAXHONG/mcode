import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_EXEC_TIMEOUT_MS = 15_000;

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

function extractCoordinate(args) {
  const coord = args?.coordinate ?? args?.point ?? args?.position;
  if (Array.isArray(coord) && coord.length >= 2) {
    const x = Math.round(Number(coord[0]));
    const y = Math.round(Number(coord[1]));
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
  }
  if (typeof args?.x === "number" && typeof args?.y === "number") {
    return [Math.round(args.x), Math.round(args.y)];
  }
  return null;
}

// ─────────────────────────────── Linux (Ubuntu X11 / Wayland) ───────────────────────────────

async function linuxListApps() {
  if (await commandExists("wmctrl")) {
    const out = await runCmd("wmctrl", ["-lp"]);
    const apps = new Map();
    for (const line of out.split("\n")) {
      const match = line.match(/^0x[0-9a-f]+\s+\S+\s+(\d+)\s+\S+\s+(.*)$/iu);
      if (!match) continue;
      const pid = Number(match[1]);
      const title = match[2].trim();
      if (!apps.has(pid)) {
        apps.set(pid, { name: title || `pid-${pid}`, pid, running: true });
      }
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
  if (await commandExists("xdotool")) {
    await runCmd("xdotool", ["mousemove", "--sync", String(x), String(y), "click", "--repeat", String(clickCount), btnNum]);
    return;
  }
  throw new Error("xdotool is required for Linux mouse control (sudo apt install xdotool).");
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
  throw new Error("xdotool is required for Linux drag control.");
}

async function linuxScroll(x, y, direction, pages) {
  if (await commandExists("xdotool")) {
    const btn = direction === "up" ? "4" : direction === "down" ? "5" : direction === "left" ? "6" : "7";
    const steps = Math.max(1, Math.round((pages ?? 1) * 5));
    await runCmd("xdotool", ["mousemove", "--sync", String(x), String(y), "click", "--repeat", String(steps), btn]);
    return;
  }
  throw new Error("xdotool is required for Linux scroll control.");
}

async function linuxType(text) {
  if (await commandExists("xdotool")) {
    await runCmd("xdotool", ["type", "--clearmodifiers", "--delay", "12", "--", text]);
    return;
  }
  throw new Error("xdotool is required for Linux keyboard typing.");
}

async function linuxKey(key) {
  if (await commandExists("xdotool")) {
    const mapped = String(key)
      .replaceAll("cmd", "ctrl")
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

// ─────────────────────────────── macOS ───────────────────────────────

async function macListApps() {
  const out = await runCmd("osascript", [
    "-e",
    'tell application "System Events" to get {name, unix id} of every application process whose background only is false',
  ]);
  const parts = out.trim().split(", ");
  const half = Math.floor(parts.length / 2);
  const apps = [];
  for (let i = 0; i < half; i += 1) {
    apps.push({ name: parts[i], pid: Number(parts[half + i]), running: true });
  }
  return apps;
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

// ─────────────────────────────── Windows ───────────────────────────────

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

async function winClick(x, y, button) {
  const downFlag = button === "right" ? "0x0008" : "0x0002";
  const upFlag = button === "right" ? "0x0010" : "0x0004";
  const ps = `
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class McodeWinInput { [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo); }'
[McodeWinInput]::SetCursorPos(${x}, ${y}) | Out-Null
[McodeWinInput]::mouse_event(${downFlag}, 0, 0, 0, [UIntPtr]::Zero)
[McodeWinInput]::mouse_event(${upFlag}, 0, 0, 0, [UIntPtr]::Zero)
`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

async function winType(text) {
  const escaped = text.replaceAll("'", "''");
  const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

async function winPaste(text) {
  const escaped = text.replaceAll("'", "''");
  const ps = `Set-Clipboard -Value '${escaped}'; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`;
  await runCmd("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

// ─────────────────────────────── Unified Cross-Platform Runtime ───────────────────────────────

export function createComputerUseRuntime(_options = {}) {
  const sessions = new Map();

  async function captureScreenshot() {
    if (process.platform === "linux") return linuxScreenshot();
    if (process.platform === "darwin") return macScreenshot();
    if (process.platform === "win32") return winScreenshot();
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  return {
    async execute(input) {
      const toolName = String(input?.toolName ?? "");
      const args = (input?.arguments && typeof input.arguments === "object" ? input.arguments : {}) ?? {};
      const sessionId = input?.context?.sessionId ?? "default";
      if (!sessions.has(sessionId)) sessions.set(sessionId, { stateSeq: 0 });
      const session = sessions.get(sessionId);

      try {
        switch (toolName) {
          case "request_access": {
            const deps =
              process.platform === "linux"
                ? {
                    xdotool: await commandExists("xdotool"),
                    scrot: await commandExists("scrot"),
                    grim: await commandExists("grim"),
                    wmctrl: await commandExists("wmctrl"),
                  }
                : { native: true };
            return textResult({
              granted: true,
              platform: process.platform,
              backend: "mcode-open-cua",
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
            session.stateSeq += 1;
            const stateId = `mcode-state-${session.stateSeq}-${randomUUID().slice(0, 8)}`;
            const png = await captureScreenshot();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    state_id: stateId,
                    platform: process.platform,
                    backend: "mcode-open-cua",
                    elements: [],
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
            const coord = extractCoordinate(args);
            if (!coord) return errorResult("invalid_request", "left_click requires coordinate [x, y]");
            const button = normalizeButton(args.button ?? args.mouseButton);
            const clickCount = Math.max(1, Number(args.clickCount ?? args.click_count ?? 1));
            if (process.platform === "linux") await linuxClick(coord[0], coord[1], button, clickCount);
            else if (process.platform === "darwin") await macClick(coord[0], coord[1], button, clickCount);
            else if (process.platform === "win32") await winClick(coord[0], coord[1], button);
            return textResult({ ok: true, action: "left_click", coordinate: coord });
          }

          case "left_click_drag": {
            const from = Array.isArray(args.start_coordinate) ? args.start_coordinate : extractCoordinate(args.from);
            const to = Array.isArray(args.coordinate) ? args.coordinate : extractCoordinate(args.to);
            if (!from || !to) return errorResult("invalid_request", "left_click_drag requires start_coordinate and coordinate");
            if (process.platform === "linux") await linuxDrag(from, to);
            else return errorResult("unimplemented", `left_click_drag is currently supported on Linux (X11/xdotool)`);
            return textResult({ ok: true, action: "left_click_drag", from, to });
          }

          case "scroll": {
            const coord = extractCoordinate(args) ?? [0, 0];
            const direction = normalizeDirection(args.direction);
            const pages = Number(args.pages ?? args.amount ?? 1);
            if (process.platform === "linux") await linuxScroll(coord[0], coord[1], direction, pages);
            else return errorResult("unimplemented", `scroll is currently supported on Linux (X11/xdotool)`);
            return textResult({ ok: true, action: "scroll", direction, pages });
          }

          case "type": {
            const text = String(args.text ?? "");
            if (!text) return errorResult("invalid_request", "type requires non-empty text");
            if (process.platform === "linux") await linuxType(text);
            else if (process.platform === "darwin") await macType(text);
            else if (process.platform === "win32") await winType(text);
            return textResult({ ok: true, action: "type" });
          }

          case "paste": {
            const text = String(args.text ?? "");
            if (process.platform === "linux") await linuxPaste(text);
            else if (process.platform === "darwin") await macPaste(text);
            else if (process.platform === "win32") await winPaste(text);
            return textResult({ ok: true, action: "paste" });
          }

          case "key": {
            const key = String(args.key ?? args.text ?? "");
            if (!key) return errorResult("invalid_request", "key requires key name");
            if (process.platform === "linux") await linuxKey(key);
            else if (process.platform === "darwin") await macKey(key);
            else if (process.platform === "win32") await winType(key);
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
