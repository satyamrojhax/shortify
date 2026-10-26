import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/nav";
import { rotateCsrfToken, getDeviceId } from "@/lib/url-tracker";
import { checkUsernameAvailability } from "@/lib/db";

type LoginSearch = {
  type?: string;
  secret?: string;
  [key: string]: unknown;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      ...search,
      type: typeof search.type === "string" ? search.type : undefined,
      secret: typeof search.secret === "string" ? search.secret : undefined,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { ready, ageOk, username, pinOk, loginUser, signupUser, pinCode } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [userHandle, setUserHandle] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Synchronize URL with ?type=user&secret={deviceID}
  useEffect(() => {
    const devId = getDeviceId();
    if (!search.type || !search.secret) {
      navigate({
        search: ((prev: any) => ({
          ...prev,
          type: prev.type || "user",
          secret: prev.secret || devId,
        })) as any,
        replace: true,
      });
    }
  }, [search.type, search.secret, navigate]);

  useEffect(() => {
    if (ready) {
      if (!ageOk) {
        navigate({ to: "/age", replace: true });
      } else if (username) {
        if (pinOk) {
          navigate({ to: "/home", replace: true });
        } else {
          const hasPin =
            pinCode ||
            (typeof localStorage !== "undefined" &&
              (localStorage.getItem("ig.pin_code") || localStorage.getItem("ig.dob")));
          navigate({ to: hasPin ? "/pin" : "/pin-setup", replace: true });
        }
      }
    }
  }, [ready, ageOk, username, pinOk, pinCode, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const handle = userHandle.trim().toLowerCase();
    const trimmedEmail = `${handle}@shortify.cc.cd`;
    if (!handle || !password) return;
    if (mode === "signup" && !trimmedName) return;

    setLoading(true);
    setErrorMsg("");
    rotateCsrfToken("auth_submit");
    try {
      if (mode === "signup") {
        await signupUser(trimmedName, trimmedEmail, password);
      } else {
        await loginUser(trimmedEmail, password);
      }

      import("@/lib/storage").then(({ get, KEYS }) => {
        const pin =
          get(KEYS.pinCode, null) ||
          (typeof localStorage !== "undefined"
            ? localStorage.getItem("ig.pin_code") || localStorage.getItem("ig.dob")
            : null);
        navigate({ to: pin ? "/pin" : "/pin-setup" });
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  useEffect(() => {
    if (!isSignup || !userHandle.trim()) {
      setUsernameAvailable(null);
      return;
    }

    const handle = userHandle.trim().toLowerCase();
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(handle);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userHandle, isSignup]);

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
            ? "enter your name, username and password to continue."
            : "enter your username and password to continue."}
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
                display name
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
              username
            </span>
            <input
              type="text"
              value={userHandle}
              onChange={(e) => setUserHandle(e.target.value.toLowerCase())}
              placeholder="e.g. LFRDCA"
              className={`w-full rounded-lg border-[1.5px] bg-background px-4 py-3 text-lg text-foreground placeholder:text-foreground/40 outline-none transition focus:bg-muted disabled:opacity-50 ${
                isSignup && userHandle.trim() && usernameAvailable === false
                  ? "border-destructive focus:border-destructive"
                  : "border-foreground/30"
              }`}
              disabled={loading}
              autoFocus={!isSignup}
            />
            {isSignup && userHandle.trim() && (
              <div className="mt-1.5 text-xs font-medium">
                {checkingUsername ? (
                  <span className="text-foreground/50">checking availability...</span>
                ) : usernameAvailable === false ? (
                  <span className="text-destructive">username not available.</span>
                ) : usernameAvailable === true ? (
                  <span className="text-[#0095f6] dark:text-[#0095f6]">username is available!</span>
                ) : null}
              </div>
            )}
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
            disabled={
              loading ||
              !userHandle.trim() ||
              !password.trim() ||
              (isSignup && (!name.trim() || usernameAvailable === false))
            }
            className="btn-pill"
          >
            {loading ? "loading..." : "continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
