// Linux Web 发行版的账号密码页面：登录 / 首次创建账号 / 修改密码。
// 视觉沿用 WebLoginPage 的卡片布局与 @mcode/ui 的 Button 及设计 token。
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@mcode/ui";
import { getWebPasswordAuthCopy } from "./webPasswordAuthLocale.js";
import {
  loginWithPassword,
  setupPassword,
  type WebPasswordAuthStatus,
} from "./webPasswordAuthClient.js";

export type WebPasswordAuthPageMode = "login" | "setup" | "change";

interface WebPasswordAuthPageProps {
  mode: WebPasswordAuthPageMode;
  status: WebPasswordAuthStatus;
  onAuthenticated: () => void;
  onCancel?: () => void;
  onSkipSetup?: () => void;
}

const inputClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input-border bg-input px-3 text-ui-base text-foreground outline-none transition-colors placeholder:text-foreground-subtlest hover:border-input-border-hover focus-visible:border-input-border-focused focus-visible:bg-input-focused disabled:opacity-50";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ui-xs font-medium text-foreground-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

export function WebPasswordAuthPage({
  mode,
  status,
  onAuthenticated,
  onCancel,
  onSkipSetup,
}: WebPasswordAuthPageProps) {
  const copy = getWebPasswordAuthCopy();
  const [username, setUsername] = useState(
    mode === "change" ? (status.username ?? "") : "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(status.error ?? null);
  const [submitting, setSubmitting] = useState(false);

  const title =
    mode === "login"
      ? copy.loginTitle
      : mode === "setup"
        ? copy.setupTitle
        : copy.changeTitle;
  const description =
    mode === "login"
      ? copy.loginDescription
      : mode === "setup"
        ? copy.setupDescription
        : copy.changeDescription;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (mode !== "login") {
      if (password.length < 8) {
        setError(copy.passwordTooShort);
        return;
      }
      if (password !== confirm) {
        setError(copy.passwordMismatch);
        return;
      }
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithPassword({ username, password, remember });
      } else {
        await setupPassword({
          username,
          password,
          ...(mode === "change" ? { currentPassword } : {}),
        });
      }
      onAuthenticated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
      <section className="w-full max-w-sm rounded-lg border border-card-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-ui-xs font-semibold text-foreground">
            M
          </div>
          <div className="min-w-0">
            <div className="text-ui-xs font-medium text-foreground">
              {copy.brand}
            </div>
            <h1 className="text-ui-lg font-medium text-foreground">{title}</h1>
          </div>
        </div>
        <p className="mb-5 text-ui-xs leading-6 text-foreground-subtle">
          {description}
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <Field label={copy.username}>
            <input
              className={inputClassName}
              name="username"
              autoComplete="username"
              autoFocus={mode !== "change"}
              required
              value={username}
              disabled={submitting}
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>
          {mode === "change" ? (
            <Field label={copy.currentPassword}>
              <input
                className={inputClassName}
                type="password"
                name="current-password"
                autoComplete="current-password"
                autoFocus
                required
                value={currentPassword}
                disabled={submitting}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
          ) : null}
          <Field label={mode === "change" ? copy.newPassword : copy.password}>
            <input
              className={inputClassName}
              type="password"
              name="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              value={password}
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {mode !== "login" ? (
            <Field label={copy.confirmPassword}>
              <input
                className={inputClassName}
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                disabled={submitting}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>
          ) : (
            <label className="flex items-center gap-2 text-ui-xs text-foreground-subtle">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--color-primary,currentColor)]"
                checked={remember}
                disabled={submitting}
                onChange={(event) => setRemember(event.target.checked)}
              />
              {copy.remember}
            </label>
          )}
          {error ? (
            <p role="alert" className="text-ui-xs leading-5 text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            disabled={submitting}
          >
            {mode === "login" ? copy.loginAction : copy.saveAction}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={onCancel}
            >
              {copy.cancelAction}
            </Button>
          ) : null}
          {onSkipSetup ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              disabled={submitting}
              onClick={onSkipSetup}
            >
              {copy.skipAction}
            </Button>
          ) : null}
        </form>
        {mode === "login" ? (
          <p className="mt-4 text-ui-xs leading-5 text-foreground-subtlest">
            {copy.forgotHint}
          </p>
        ) : null}
      </section>
    </main>
  );
}
