const packageDirName = "mcode";

/**
 * 生成 `install.sh`。
 *
 * 下载布局（二选一，按 MCODE_DIST_BASE_URL 自动识别）：
 * - 自托管目录：`<base>/latest.json` + `<base>/releases/<version>/<tarball>`（pnpm build:mcode 的输出目录）
 * - GitHub Releases：base 为 `https://github.com/<owner>/<repo>/releases/latest/download/`
 *   时，`latest.json`、tarball 与 `sha256.txt` 都是同一个 Release 的扁平资产。
 * - Mcode 官网：base 为 `https://mcode.hjh.im/download/latest/`（默认）时同为扁平布局；
 *   官网也兼容自托管布局（`https://mcode.hjh.im/` + `releases/<version>/<tarball>`）。
 *
 * 修复原因：
 * - 旧脚本只支持自托管布局，拼出的 `releases/<version>/...` 在 GitHub Releases 上 404；
 * - 旧脚本完全不校验下载内容，`latest.json` 里的 sha256 从未使用；
 * - 旧脚本不检查 Node 版本，Node < 24 时安装成功、运行才以晦涩错误失败。
 */
export function installScriptSource(baseUrl) {
  return `#!/usr/bin/env sh
# Mcode installer: downloads the Node runtime bundle, verifies its SHA-256 and
# installs the \`mcode\` command. Requires Node.js >= 24, curl (or wget), tar.
#
#   curl -fsSL <base>/install.sh | sh
#   MCODE_DIST_ARCHIVE=./mcode-x.y.z.tar.gz sh install.sh   # offline install
set -eu

BASE_URL="\${MCODE_DIST_BASE_URL:-${baseUrl}}"
INSTALL_DIR="\${MCODE_DIST_HOME:-$HOME/.mcode/runtime}"
BIN_DIR="\${MCODE_DIST_BIN_DIR:-$HOME/.local/bin}"
ARCHIVE_OVERRIDE="\${MCODE_DIST_ARCHIVE:-}"
MIN_NODE_MAJOR=24

fail() {
  echo "mcode install: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "requires $1"
}

need_cmd node
need_cmd tar

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ] 2>/dev/null; then
  fail "Node.js >= $MIN_NODE_MAJOR is required (found $(node -v 2>/dev/null || echo none)). Install Node.js 24 from https://nodejs.org/"
fi

fetch() {
  # fetch <url> <output-file>
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$2" "$1"
  else
    fail "requires curl or wget"
  fi
}

sha256_of() {
  node -e 'const c=require("node:crypto"),f=require("node:fs");process.stdout.write(c.createHash("sha256").update(f.readFileSync(process.argv[1])).digest("hex"))' "$1"
}

json_field() {
  # json_field <file> <field>
  node -e 'const d=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));const v=d[process.argv[2]];if(v===undefined||v===null)process.exit(2);process.stdout.write(String(v))' "$1" "$2"
}

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

if [ -n "$ARCHIVE_OVERRIDE" ]; then
  [ -f "$ARCHIVE_OVERRIDE" ] || fail "archive not found: $ARCHIVE_OVERRIDE"
  ARCHIVE="$ARCHIVE_OVERRIDE"
  TARBALL="$(basename "$ARCHIVE")"
  VERSION="$(printf '%s' "$TARBALL" | sed -n 's/^mcode-\\(.*\\)\\.tar\\.gz$/\\1/p')"
  [ -n "$VERSION" ] || fail "cannot read version from archive name: $TARBALL (expected mcode-<version>.tar.gz)"
  EXPECTED_SHA="\${MCODE_DIST_SHA256:-}"
else
  BASE="\${BASE_URL%/}"
  fetch "$BASE/latest.json" "$TMP_DIR/latest.json" || fail "cannot download $BASE/latest.json"
  VERSION="$(json_field "$TMP_DIR/latest.json" version)" || fail "latest.json has no version"
  TARBALL="$(json_field "$TMP_DIR/latest.json" tarball)" || fail "latest.json has no tarball"
  EXPECTED_SHA="$(json_field "$TMP_DIR/latest.json" sha256 2>/dev/null || true)"
  case "$BASE" in
    */releases/download/*|*/releases/latest/download|*/download/latest)
      ARCHIVE_URL="$BASE/$TARBALL" ;;
    *)
      ARCHIVE_URL="$BASE/releases/$VERSION/$TARBALL" ;;
  esac
  ARCHIVE="$TMP_DIR/$TARBALL"
  echo "Downloading Mcode $VERSION ..."
  fetch "$ARCHIVE_URL" "$ARCHIVE" || fail "cannot download $ARCHIVE_URL"
fi

if [ -n "$EXPECTED_SHA" ]; then
  ACTUAL_SHA="$(sha256_of "$ARCHIVE")"
  [ "$ACTUAL_SHA" = "$EXPECTED_SHA" ] || fail "SHA-256 mismatch for $TARBALL (expected $EXPECTED_SHA, got $ACTUAL_SHA)"
  echo "SHA-256 verified: $ACTUAL_SHA"
else
  echo "Warning: no SHA-256 available; skipping integrity check." >&2
fi

mkdir -p "$INSTALL_DIR/releases" "$BIN_DIR"
TARGET="$INSTALL_DIR/releases/$VERSION"
rm -rf "$TARGET.new"
mkdir -p "$TARGET.new"
tar -xzf "$ARCHIVE" -C "$TARGET.new" 2>/dev/null || tar -xzf "$ARCHIVE" -C "$TARGET.new"
[ -f "$TARGET.new/${packageDirName}/bin/mcode.mjs" ] || fail "archive does not contain ${packageDirName}/bin/mcode.mjs"
rm -rf "$TARGET"
mv "$TARGET.new/${packageDirName}" "$TARGET"
rm -rf "$TARGET.new"
ln -sfn "$TARGET" "$INSTALL_DIR/current"

cat > "$BIN_DIR/mcode" <<SH
#!/usr/bin/env sh
exec node "$INSTALL_DIR/current/bin/mcode.mjs" "\\$@"
SH
chmod +x "$BIN_DIR/mcode"

echo "Mcode $VERSION installed to $TARGET"
echo "Run: mcode (TUI) or mcode --web (Web)"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "Note: $BIN_DIR is not in PATH. Add it with: export PATH=\\"$BIN_DIR:\\$PATH\\"" ;;
esac
`;
}
