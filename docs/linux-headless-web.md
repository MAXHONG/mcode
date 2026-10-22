# 在无界面 Linux 上运行 Mcode Web

适用于没有桌面环境的 Linux 服务器 / 虚拟机 / NAS：安装 `mcode` 命令行发行包，用 `mcode --web` 提供浏览器界面，同一内网的电脑或手机用浏览器访问。

验证记录：Ubuntu 24.04.5（x86_64，无显示服务器，2 vCPU / 2 GB）实测安装、Web、内网浏览器对话通过；常驻内存约 200 MB。ARM64 Linux 包含对应原生库，未实机测试。

## 1. 安装 Node.js 24

Mcode 需要 Node.js **24 或更高**（Ubuntu 24.04 自带的是 22，不满足）。任选一种方式：

```bash
# 官方二进制（无需 root），x86_64 用 linux-x64，ARM64 用 linux-arm64
curl -fsSLO https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt
NODE_TAR=$(grep -o 'node-v24[^ ]*-linux-x64.tar.xz' SHASUMS256.txt | head -1)
curl -fsSLO "https://nodejs.org/dist/latest-v24.x/$NODE_TAR"
grep " $NODE_TAR\$" SHASUMS256.txt | sha256sum -c -
mkdir -p ~/node24 && tar -xJf "$NODE_TAR" -C ~/node24 --strip-components=1
export PATH="$HOME/node24/bin:$PATH"   # 写入 ~/.bashrc 以便长期生效
node -v
```

## 2. 安装 Mcode

```bash
curl -fsSL https://mcode.hjh.im/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"   # 写入 ~/.bashrc
mcode --version
```

安装脚本会校验运行包的 SHA-256（来自同一 Release 的 `latest.json`），装到 `~/.mcode/runtime`，并创建 `~/.local/bin/mcode`。

> 安装脚本与发行包托管在官网 https://mcode.hjh.im，匿名可下载。无法访问外网时，先在其他机器下载 `install.sh` 与 `mcode-<版本>.tar.gz`（官网「全部下载」或 `gh release download -R MAXHONG/mcode -p 'mcode-*.tar.gz' -p install.sh`），再离线安装：
>
> ```bash
> MCODE_DIST_ARCHIVE=./mcode-<版本>.tar.gz sh install.sh
> ```

可选环境变量：`MCODE_DIST_HOME`（安装目录）、`MCODE_DIST_BIN_DIR`（命令目录）、`MCODE_DIST_BASE_URL`（自托管下载地址）、`MCODE_DIST_ARCHIVE` / `MCODE_DIST_SHA256`（离线包及其校验值）。

## 3. 配置模型

无头机器也可以登录 Z.ai / BigModel Coding Plan（二选一）：在 Web 设置 → 模型供应商 点击登录，授权页会在**你自己电脑的浏览器**里打开，服务器端轮询获取结果，不需要回调到服务器本机。也可以配置 API Key 类模型：

- **自定义 OpenAI 兼容 / Anthropic 兼容网关**：复制 [deploy/linux/provider_config.example.json](../deploy/linux/provider_config.example.json) 到 `~/.mcode/v2/provider_config.json`，修改 `baseUrl`、`apiKey`、模型 ID，然后 `chmod 600 ~/.mcode/v2/provider_config.json`。
- **Z.ai / BigModel API Key**：启动 Web 后在 设置 → 模型供应商 中填写。

只要存在可用模型，首次打开 Web 不会再停在“连接账号”登录页（3.15.3 起）。

快速验证（不启动 Web）：

```bash
mkdir -p ~/demo && cd ~/demo && echo 'print("hello")' > hello.py
mcode -p "Read hello.py and reply with only what it prints." --mode yolo
```

## 4. 启动 Web

```bash
mcode --web --host 0.0.0.0 --port 3030 --workspace ~/projects/myapp --no-open
```

终端会打印带令牌的地址，例如 `Network: http://192.168.1.20:3030/?token=...`。在同一内网的浏览器打开该地址即可；浏览器随后用 Cookie 保存令牌。

- 3.15.3 起 **始终启用访问令牌**（包括只监听 127.0.0.1）。`--token <值>` 或环境变量 `MCODE_WEB_TOKEN` 固定令牌；`--no-token` 关闭（仅限可信的单用户机器）。
- 脚本 / curl 调用 API 时使用 `Authorization: Bearer <token>`。

### 账号密码登录（推荐）

带令牌的链接会留在浏览器历史、终端输出和 systemd 日志里，谁拿到链接谁就能登录。建议设置账号密码：

1. 第一次用带 `?token=` 的地址打开时，页面会提示 **创建访问账号**（用户名 + 至少 8 位密码）。也可以点“暂不设置”继续只用令牌。
2. 设置后，**带令牌的链接不能再让浏览器登录**，打开网页只会看到登录页；脚本仍可用 `Authorization: Bearer <token>`。
3. 之后在侧栏左下角账户菜单里可以 **修改 Web 访问密码** 或 **退出 Web 登录**。修改密码后，所有已登录的浏览器都要重新登录。

在服务器终端里管理（无需重启服务）：

```bash
mcode passwd            # 设置 / 修改用户名和密码（忘记密码时用）
mcode passwd --reset    # 删除密码，恢复为只用访问令牌
```

- 密码用 scrypt 加盐哈希保存在 `~/.mcode/v2/web-auth.json`（权限 600），不存明文；`MCODE_WEB_AUTH_FILE` 可改位置。
- 连续输错 5 次会临时锁定（30 秒起，逐次翻倍，最长 15 分钟）。
- 登录会话 Cookie 为 HttpOnly + SameSite=Strict，默认 7 天，勾选“30 天内保持登录”为 30 天；经 HTTPS 反向代理访问时自动加 `Secure`。
- `MCODE_WEB_PASSWORD_AUTH=0` 完全关闭账号密码功能（只用令牌）。
- 内网是明文 HTTP，密码同样会被同网段的人嗅探到；跨网络访问仍应走 Tailscale / WireGuard 或 HTTPS 反向代理。
- 浏览器发起的跨站 WebSocket 会被拒绝（403）。如果在前面加了反向代理且域名与 Mcode 的 Host 不一致，用 `MCODE_SERVER_ALLOWED_ORIGINS=https://mcode.example.com` 放行。

## 5. 开机自启（systemd 用户服务）

```bash
mkdir -p ~/.config/systemd/user ~/.config/mcode
curl -fsSL -o ~/.config/systemd/user/mcode-web.service \
  https://raw.githubusercontent.com/MAXHONG/mcode/main/deploy/linux/mcode-web.service
cp deploy/linux/mcode-web.env.example ~/.config/mcode/web.env
chmod 600 ~/.config/mcode/web.env          # 修改其中的工作区、端口和 MCODE_WEB_TOKEN
systemctl --user daemon-reload
systemctl --user enable --now mcode-web
sudo loginctl enable-linger "$USER"         # 退出登录后继续运行、开机自动启动
journalctl --user -u mcode-web -f           # 查看日志
```

服务文件见 [deploy/linux/mcode-web.service](../deploy/linux/mcode-web.service)，配置模板见 [deploy/linux/mcode-web.env.example](../deploy/linux/mcode-web.env.example)。如果 Node 不在 `~/node24/bin`，修改服务文件里的 `Environment=PATH=...`。

## 6. 安全须知

- 拿到带令牌链接的人可以 **以运行 Mcode 的 Linux 用户身份执行任意命令、读写文件**。用专门的系统用户运行，不要用 root。
- 内网访问是明文 HTTP。只在可信网络使用；跨网络访问请用 Tailscale / WireGuard，或在前面加 HTTPS 反向代理（Caddy、Nginx），不要把端口直接暴露到公网。
- `~/.mcode/v2/provider_config.json` 与 `~/.config/mcode/web.env` 含密钥，保持 `600` 权限，不要提交到仓库。
- 手机扫码远程控制（默认经 Mcode 自建中转 `remote.hjh.im`，`MCODE_WEB_REMOTE_CONTROL_RELAY=zai` 切回 Z.ai 官方 relay 备用，见 `deploy/remote-relay/README.md`）：Web 界面左侧栏底部的手机图标 → 显示二维码，手机扫码即可远程操作当前工作区（仅本机工作区）。配对与中转逻辑在服务器端运行，关闭浏览器后仍保持；拿到二维码的人等同拿到控制权。不需要时设置 `MCODE_WEB_REMOTE_CONTROL=0` 完全关闭。

## 常见问题

| 现象                                        | 处理                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `Mcode requires Node.js >= 24`              | 按第 1 步安装 Node 24，并确认 `node -v`                                |
| `mcode: command not found`                  | `export PATH="$HOME/.local/bin:$PATH"`                                 |
| 浏览器 401 / 页面空白                       | 用终端打印的带 `?token=` 的完整地址打开                                |
| 忘记 Web 访问密码                           | 服务器上执行 `mcode passwd` 重新设置，或 `mcode passwd --reset`        |
| WebSocket 403                               | 反向代理域名与 Host 不一致，设置 `MCODE_SERVER_ALLOWED_ORIGINS`        |
| 页面提示未配置模型                          | 检查 `~/.mcode/v2/provider_config.json` 格式与权限，或在设置页添加模型 |
