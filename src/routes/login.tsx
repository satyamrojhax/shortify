import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/nav";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { ready, ageOk, loginUser, signupUser, pinCode } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (ready && !ageOk) navigate({ to: "/age" });
  }, [ready, ageOk, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    if (mode === "signup" && !trimmedName) return;

    setLoading(true);
    setErrorMsg("");
    try {
      if (mode === "signup") {
        await signupUser(trimmedName, trimmedEmail, password);
      } else {
        await loginUser(trimmedEmail, password);
      }
      navigate({ to: pinCode ? "/pin" : "/pin-setup" });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between gap-2 text-foreground">
          <BrandMark size={32} />
          <button
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setErrorMsg("");
            }}
            className="text-sm font-medium uppercase tracking-widest text-foreground/60 hover:text-foreground"
          >
            {isSignup ? "Log In Instead" : "Sign Up Instead"}
          </button>
        </div>
        <p className="font-display text-destructive text-xl lowercase italic">
          {isSignup ? "hello there," : "welcome back,"}
        </p>
        <h1 className="mt-2 font-display text-[56px] leading-[1.05] lowercase text-foreground">
          {isSignup ? "create your " : "log into your "}
          <span className="marker-underline">account.</span>
        </h1>
        <p className="mt-4 text-[17px] text-foreground/80">
          {isSignup
            ? "enter your name, email and password to continue."
            : "enter your email and password to continue."}
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
          {isSignup && (
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
                your name
              </span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LFRDCA"
                className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted disabled:opacity-50"
                disabled={loading}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              email address
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted disabled:opacity-50"
              disabled={loading}
              autoFocus={!isSignup}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border-[1.5px] border-foreground/30 bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted disabled:opacity-50"
              disabled={loading}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim() || (isSignup && !name.trim())}
            className="btn-pill"
          >
            {loading ? "loading..." : "continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
