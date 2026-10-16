interface WebPasswordAuthCopy {
  brand: string;
  loginTitle: string;
  loginDescription: string;
  setupTitle: string;
  setupDescription: string;
  changeTitle: string;
  changeDescription: string;
  username: string;
  password: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  remember: string;
  loginAction: string;
  saveAction: string;
  cancelAction: string;
  skipAction: string;
  passwordTooShort: string;
  passwordMismatch: string;
  forgotHint: string;
  unauthorizedTitle: string;
  unauthorizedDescription: string;
}

const COPY: Record<"zh-CN" | "en-US", WebPasswordAuthCopy> = {
  "zh-CN": {
    brand: "Mcode",
    loginTitle: "登录 Mcode",
    loginDescription: "这台服务器已启用账号密码访问，请输入账号和密码。",
    setupTitle: "创建访问账号",
    setupDescription:
      "建议为这台服务器设置账号密码。设置后，带 token 的链接不能再直接登录，只能用账号密码访问。",
    changeTitle: "修改账号密码",
    changeDescription: "修改后，其他已登录的浏览器都需要重新登录。",
    username: "用户名",
    password: "密码",
    currentPassword: "当前密码",
    newPassword: "新密码",
    confirmPassword: "确认密码",
    remember: "30 天内保持登录",
    loginAction: "登录",
    saveAction: "保存",
    cancelAction: "取消",
    skipAction: "暂不设置，继续使用访问令牌",
    passwordTooShort: "密码至少 8 位",
    passwordMismatch: "两次输入的密码不一致",
    forgotHint:
      "忘记密码：在服务器上执行 mcode passwd 重新设置，或 mcode passwd --reset 清除后用访问令牌登录。",
    unauthorizedTitle: "需要访问令牌",
    unauthorizedDescription:
      "请使用服务器终端打印的带 ?token= 的完整地址打开，然后按提示创建账号密码。",
  },
  "en-US": {
    brand: "Mcode",
    loginTitle: "Sign in to Mcode",
    loginDescription: "This server requires a username and password.",
    setupTitle: "Create an account",
    setupDescription:
      "Set a username and password for this server. Afterwards, links with a token can no longer sign in; only the password can.",
    changeTitle: "Change password",
    changeDescription: "Other signed-in browsers will need to sign in again.",
    username: "Username",
    password: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    remember: "Keep me signed in for 30 days",
    loginAction: "Sign in",
    saveAction: "Save",
    cancelAction: "Cancel",
    skipAction: "Not now, keep using the access token",
    passwordTooShort: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    forgotHint:
      "Forgot it? Run `mcode passwd` on the server to set a new one, or `mcode passwd --reset` and sign in with the access token.",
    unauthorizedTitle: "Access token required",
    unauthorizedDescription:
      "Open the full URL with ?token= printed in the server terminal, then create a username and password.",
  },
};

export function getWebPasswordAuthCopy(): WebPasswordAuthCopy {
  const language =
    typeof navigator === "undefined" ? "zh-CN" : navigator.language;
  return language.toLowerCase().startsWith("zh")
    ? COPY["zh-CN"]
    : COPY["en-US"];
}
