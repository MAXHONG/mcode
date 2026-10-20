# macOS 签名与公证

用户从浏览器下载 dmg 后，macOS Gatekeeper 会检查两件事：

1. app 和 dmg 是否用 **Developer ID Application** 证书签名（并开启 Hardened Runtime）；
2. 是否经过苹果**公证**（notarization），并把公证票据 staple 进安装包。

缺任何一项，用户都会看到“已损坏，无法打开”或“无法验证开发者”。

`release-desktop.yml` 会在 macOS 构建中自动完成：导入证书 → 签名 glm/tools 下的原生二进制 →
electron-builder 签名并公证 `.app` → 生成并签名 dmg → 公证 + staple dmg → `spctl` 校验。

## 所需仓库 Secrets

| Secret | 内容 |
| --- | --- |
| `MAC_CERT_P12_BASE64` | Developer ID Application 证书 + 私钥导出的 `.p12`，再 `base64` 编码 |
| `MAC_CERT_PASSWORD` | `.p12` 的密码 |
| `APPLE_API_KEY_P8_BASE64` | App Store Connect API Key（`AuthKey_XXXX.p8`）的 `base64` 编码 |
| `APPLE_API_KEY_ID` | API Key 的 Key ID |
| `APPLE_API_ISSUER` | API Key 的 Issuer ID |

未配置 `MAC_CERT_P12_BASE64` 时退回 ad-hoc 签名（构建不失败，但用户会被拦截）。

## 创建 Developer ID Application 证书

苹果规定只有**账号持有人（Account Holder）**能创建 Developer ID 证书，API Key 无权创建。

1. 用账号持有人的 Apple ID 登录 <https://developer.apple.com/account/resources/certificates/add>
2. 选择 **Developer ID Application**（G2 Sub-CA），上传 CSR 文件，下载得到 `developerID_application.cer`
3. 用生成 CSR 时的私钥合成 p12：

```bash
openssl x509 -inform DER -in developerID_application.cer -out devid.pem
openssl pkcs12 -export -legacy -inkey devid.key -in devid.pem -name "Developer ID Application" \
  -out devid.p12 -passout pass:<密码>
base64 -w0 devid.p12   # 填入 MAC_CERT_P12_BASE64
```

## 本地验证

```bash
spctl -a -vvv -t install Mcode.dmg     # accepted, source=Notarized Developer ID
xcrun stapler validate Mcode.dmg
```

## 公证耗时与补发

- 苹果公证通常 1~15 分钟；新开发者账号的前几次提交可能排队数小时。工作流给 dmg 公证留 150 分钟，整个构建任务上限 6 小时。
- 某个平台失败（例如公证超时 `Timeout of 9000 second(s)`）**不会阻塞发布**：`Publish GitHub Release` 仍会用已成功的平台创建 Release，并在说明里注明有平台暂缺。
- 补发缺失平台：Actions → Release Desktop → Run workflow，`Use workflow from` 选对应标签（如 `v3.15.5`），`tag` 填同一标签，`platforms` 填 `mac-x64`（可多个，逗号分隔：`mac-arm64, mac-x64, win-x64, win-arm64, linux-x64, linux-arm64`）。工作流只构建这些平台，取回已有 Release 的 `latest*.yml` 与 `SHA256SUMS.txt` 合并后追加上传，不改动其他平台的资产。
- 苹果那边的提交记录：`xcrun notarytool history --key AuthKey_XXXX.p8 --key-id <Key ID> --issuer <Issuer ID>`；被拒时 `xcrun notarytool log <提交 ID> ...` 查看原因。
