import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, MailCheck, RotateCw } from "lucide-react";
import { ApiError } from "../../lib/api-client";
import { EmptyState, useToast } from "../../components/common/ui";
import {
  isUnauthenticated,
  useCurrentUser,
  useLogout,
  useResendVerification,
  useVerifyEmail,
} from "./auth-hooks";

type VerificationState = {
  from?: string;
  codeJustSent?: boolean;
  [key: string]: unknown;
};

const RESEND_SECONDS = 60;

function destinationFor(role: "customer" | "admin", from?: string) {
  const fallback = role === "admin" ? "/admin/overview" : "/account";
  if (!from?.startsWith("/") || from === "/verify-email") return fallback;
  if (role === "admin" && !from.startsWith("/admin")) return fallback;
  if (role === "customer" && from.startsWith("/admin")) return fallback;
  return from;
}

export function VerifyEmailPage() {
  const {
    data: user,
    isPending,
    error: userError,
    refetch: refetchUser,
  } = useCurrentUser();
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const state = (location.state ?? {}) as VerificationState;
  const [secondsLeft, setSecondsLeft] = useState(
    state.codeJustSent ? RESEND_SECONDS : 0,
  );
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  if (isPending) return null;
  if (!user) {
    if (userError && !isUnauthenticated(userError))
      return (
        <div className="shell page">
          <EmptyState
            title="Unable to check your session"
            description="Please check your connection and try again."
            action={
              <button className="button" onClick={() => void refetchUser()}>
                Try again
              </button>
            }
          />
        </div>
      );
    return <Navigate to="/login" state={state} replace />;
  }
  if (user.emailVerifiedAt)
    return (
      <Navigate
        to={destinationFor(user.role, state.from)}
        state={state}
        replace
      />
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit code from your email.");
      return;
    }
    setMessage(null);
    try {
      const verifiedUser = await verify.mutateAsync(code);
      toast("Email verified. You’re all set!");
      navigate(destinationFor(verifiedUser.role, state.from), {
        replace: true,
        state,
      });
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "We couldn’t verify that code. Please try again.",
      );
    }
  };

  const resendCode = async () => {
    setMessage(null);
    try {
      await resend.mutateAsync();
      setSecondsLeft(RESEND_SECONDS);
      toast("A new verification code is on its way.");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "We couldn’t send a new code. Please try again.",
      );
    }
  };

  return (
    <div className="shell page verification-page">
      <section className="verification-card" aria-labelledby="verify-title">
        <span className="verification-icon" aria-hidden="true">
          <MailCheck size={32} />
        </span>
        <p className="eyebrow">ONE QUICK CHECK</p>
        <h1 id="verify-title">Verify your email.</h1>
        <p className="muted verification-copy">
          Enter the six-digit code sent to <strong>{user.email}</strong>. You’ll
          need to verify your email before ordering, booking, or managing your
          account.
        </p>
        <div className="verification-note">
          <strong>Can’t find it?</strong>
          <span>
            Delivery can take a minute. Please check your spam or junk folder
            too.
          </span>
        </div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="verification-code">Verification code</label>
          <input
            id="verification-code"
            className="verification-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setMessage(null);
            }}
            aria-invalid={message ? "true" : undefined}
            aria-describedby={
              message ? "verification-error" : "verification-help"
            }
            placeholder="000000"
          />
          <span id="verification-help" className="small-text muted">
            The code expires 10 minutes after it is sent.
          </span>
          {message && (
            <p id="verification-error" className="field-error" role="alert">
              {message}
            </p>
          )}
          <button
            className="button full"
            disabled={verify.isPending || code.length !== 6}
          >
            {verify.isPending ? "Checking code…" : "Verify email"}
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="verification-actions">
          <button
            type="button"
            className="text-link"
            disabled={secondsLeft > 0 || resend.isPending}
            onClick={resendCode}
          >
            <RotateCw size={15} />
            {resend.isPending
              ? "Sending…"
              : secondsLeft > 0
                ? `Send another code in ${secondsLeft}s`
                : "Send another code"}
          </button>
          <button
            type="button"
            className="text-link muted"
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, {
                onSuccess: () => navigate("/login", { replace: true }),
              })
            }
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </section>
    </div>
  );
}
