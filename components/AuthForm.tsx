"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import Brand from "./Brand";
import { useAuth } from "./AuthProvider";

export default function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const signup = mode === "signup",
    router = useRouter(),
    auth = useAuth();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [first, setFirst] = useState(""),
    [last, setLast] = useState("");
  const [visible, setVisible] = useState(false),
    [remember, setRemember] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [passwordStep, setPasswordStep] = useState(false);
  function destination() {
    const next = new URLSearchParams(location.search).get("next");
    return next && /^\/meeting\/\d{11}(?:\?|$)/.test(next) ? next : "/workplace";
  }
  useEffect(() => {
    if (auth.user) router.replace(destination());
  }, [auth.user, router]);
  const rules = [
    ["At least 8 characters", password.length >= 8],
    [
      "At least one uppercase and one lowercase letter",
      /[A-Z]/.test(password) && /[a-z]/.test(password),
    ],
    ["At least one number", /\d/.test(password)],
  ] as const;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!signup && !passwordStep) {
      setPasswordStep(true);
      return;
    }
    setBusy(true);
    try {
      if (signup)
        await auth.signup(
          `${first.trim()} ${last.trim()}`.trim(),
          email,
          password,
        );
      else await auth.login(email, password, remember);
      router.replace(destination());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className={`auth-page ${signup ? "signup-page" : "signin-page"}`}>
      <header className="auth-header">
        <Link href="/" aria-label="Zoom Workplace home">
          <Brand />
        </Link>
        <div>
          <span>
            {signup ? "Already have an account?" : "New to Zoom?"}{" "}
            <Link href={signup ? "/signin" : "/signup"}>
              {signup ? "Sign In" : "Sign Up Free"}
            </Link>
          </span>
          <a
            className="auth-support"
            href="https://support.zoom.com/"
            target="_blank"
            rel="noreferrer"
          >
            Support
          </a>
          <span className="auth-language">
            English <ChevronDown size={12} />
          </span>
        </div>
      </header>
      <main className="auth-main">
        <aside className="auth-side">
          <div>
            <Image
              className="signup-illustration"
              src="/zoom-signup-illustration.png"
              alt="People connecting in a Zoom meeting"
              width={382}
              height={281}
              priority
            />
            <div className="auth-benefits">
              <h2>Create your free Basic account</h2>
              <ul>
                {[
                  "Start and join video meetings",
                  "Schedule your upcoming meetings",
                  "Share your screen",
                  "Chat with everyone in a meeting",
                  "Connect from your browser",
                ].map((item) => (
                  <li key={item}>
                    <span>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
        <div className="auth-form-column">
          <form className="auth-form" onSubmit={submit}>
            <h1>{signup ? "Get started with Zoom" : "Sign in"}</h1>
            {signup && (
              <p className="auth-intro">Get started with your free account.</p>
            )}
            {signup && (
              <div className="form-row auth-name-fields">
                <label>
                  First name
                  <input
                    autoComplete="given-name"
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    required
                    maxLength={30}
                  />
                </label>
                <label>
                  Last name
                  <input
                    autoComplete="family-name"
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    required
                    maxLength={29}
                  />
                </label>
              </div>
            )}
            <label className={!signup ? "email-first-field" : undefined}>
              Email Address
              <input
                type="email"
                autoComplete="email"
                placeholder="Email Address"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!signup && passwordStep}
                autoFocus={!signup && !passwordStep}
              />
            </label>
            {!signup && passwordStep && (
              <button
                className="text-button change-email"
                type="button"
                onClick={() => {
                  setPasswordStep(false);
                  setPassword("");
                  setError("");
                }}
              >
                Use a different email
              </button>
            )}
            {(signup || passwordStep) && (
              <label>
                Password
                <span className="password-field">
                  <input
                    type={visible ? "text" : "password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    placeholder="Password"
                    required
                    minLength={signup ? 8 : 1}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={!signup && passwordStep}
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    onClick={() => setVisible((v) => !v)}
                  >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </span>
              </label>
            )}
            {signup && (
              <ul className="password-rules">
                {rules.map(([label, valid]) => (
                  <li key={label} className={valid ? "valid" : ""}>
                    <Check size={14} />
                    {label}
                  </li>
                ))}
              </ul>
            )}
            {!signup && passwordStep && (
              <label className="check-label keep-signed-in">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Stay signed in
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary auth-submit"
              disabled={busy || (signup && !rules.every(([, valid]) => valid))}
            >
              {busy ? <Loader2 size={18} className="spin" /> : null}
              {busy
                ? signup
                  ? "Creating account…"
                  : "Signing in…"
                : signup
                  ? "Sign Up"
                  : passwordStep
                    ? "Sign In"
                    : "Next"}
            </button>
            <p className="auth-demo-notice">
              Independent assignment demo. Create an account here; Zoom
              credentials will not work.
            </p>
            {!signup && (
              <div className="demo-account">
                <span>Explore with the sample account</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEmail("ankit.sharma@example.com");
                    setPassword("ZoomDemo123!");
                    setError("");
                    setPasswordStep(true);
                  }}
                >
                  Use demo account
                </button>
              </div>
            )}
            <Link href="/" className="auth-back">
              Back to Zoom Workplace
            </Link>
          </form>
        </div>
      </main>
    </div>
  );
}
