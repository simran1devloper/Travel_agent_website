import { useAuth0 } from "@auth0/auth0-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { useLocalAuth } from "@/components/auth-provider";
import { api, API_BASE_URL } from "@/lib/api";

type SigninSearch = {
  mode: "login" | "signup";
  token?: string;
  name?: string;
  role?: string;
  google_error?: string;
};

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>): SigninSearch => ({
    mode: (search.mode as string) === "signup" ? "signup" : "login",
    token: (search.token as string) || undefined,
    name: (search.name as string) || undefined,
    role: (search.role as string) || undefined,
    google_error: (search.google_error as string) || undefined,
  }),
  head: () => ({
    meta: [{ title: "Sign In — JourneyMakers" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup";

function AuthPage() {
  const { mode } = Route.useSearch();
  return <AuthCard initialMode={mode as Mode} />;
}

function AuthCard({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const { localUser, localLogin, localLogout, auth0Enabled, googleAvailable } = useLocalAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [googleError, setGoogleError] = useState<string | null>(null);

  // useAuth0 is safe to call even outside Auth0Provider — returns stub context
  // (isAuthenticated: false, user: undefined). We gate all auth0 calls on auth0Enabled.
  const auth0 = useAuth0Hook();
  const isAuth0Authed = auth0Enabled && auth0.isAuthenticated;

  const isLoggedIn = !!localUser || isAuth0Authed;
  const displayName = localUser?.name ?? auth0.user?.name ?? auth0.user?.email ?? "";

  const handleLogout = () => {
    localLogout();
    if (isAuth0Authed) auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  };

  // Handle Google OAuth callback: ?token=<jwt>&name=<name>&role=<role>
  useEffect(() => {
    if (search.token) {
      localLogin(search.token);
      const dest = search.role === "admin" || search.role === "superadmin" ? "/admin" : "/dashboard";
      void navigate({ to: dest });
    }
    if (search.google_error) {
      const msgs: Record<string, string> = {
        not_configured: "Google sign-in is not configured. Ask the admin to add credentials in Settings.",
        token_exchange_failed: "Google sign-in failed. Please try again.",
        no_email: "Google did not return an email address. Check your Google account settings.",
        db_error: "A server error occurred. Please try again.",
      };
      setGoogleError(msgs[search.google_error] ?? "Google sign-in failed.");
    }
  }, []);

  useEffect(() => {
    if (isAuth0Authed) navigate({ to: "/dashboard" });
  }, [isAuth0Authed, navigate]);

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#f6f1ea]">
        <section className="section-shell grid min-h-[82vh] place-items-center py-20">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-[#fbf8f3] p-7 shadow-[var(--shadow-soft)] md:p-10">
            <span className="eyebrow mb-4">Traveler access</span>

            {isLoggedIn ? (
              <LoggedInState
                name={displayName}
                role={localUser?.role ?? "user"}
                onLogout={handleLogout}
              />
            ) : (
              <>
                <h1 className="display-title mb-2 text-4xl md:text-5xl">
                  {mode === "login" ? "Welcome back." : "Start your journey."}
                </h1>
                <p className="mb-7 text-base leading-8 text-muted-foreground">
                  {mode === "login"
                    ? "Sign in to access your dashboard, saved memories and itineraries."
                    : "Create an account to save trips, write reviews and share memories."}
                </p>

                {/* Mode toggle */}
                <div className="mb-7 flex rounded-xl border border-border bg-white/50 p-1">
                  <ModeButton active={mode === "login"} onClick={() => setMode("login")}>
                    <LogIn className="size-3.5" /> Sign In
                  </ModeButton>
                  <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
                    <UserPlus className="size-3.5" /> Create Account
                  </ModeButton>
                </div>

                {mode === "login" ? (
                  <LoginForm
                    onSuccess={(token) => {
                      localLogin(token);
                      navigate({ to: "/dashboard" });
                    }}
                  />
                ) : (
                  <SignupForm
                    onSuccess={(token, role) => {
                      localLogin(token);
                      navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
                    }}
                  />
                )}

                {/* Auth0 Google button */}
                {auth0Enabled && (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <GoogleButton auth0={auth0} />
                  </>
                )}

                {/* Local Google OAuth button (when superadmin has configured credentials) */}
                {!auth0Enabled && googleAvailable && (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <a
                      href={`${API_BASE_URL}/auth/google`}
                      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </a>
                  </>
                )}

                {googleError && (
                  <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {googleError}
                  </p>
                )}

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === "login" ? (
                    <>
                      No account?{" "}
                      <button
                        onClick={() => setMode("signup")}
                        className="font-bold text-foreground underline-offset-2 hover:underline"
                      >
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => setMode("login")}
                        className="font-bold text-foreground underline-offset-2 hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-all ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      onSuccess(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && <ErrorBox message={error} />}

      <FieldGroup label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="you@example.com"
        />
      </FieldGroup>

      <FieldGroup label="Password">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </FieldGroup>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-extrabold text-background transition-all hover:-translate-y-0.5 hover:bg-accent disabled:opacity-60"
      >
        {loading ? (
          "Signing in…"
        ) : (
          <>
            Sign In <ArrowRight className="size-4" />
          </>
        )}
      </button>
    </form>
  );
}

function SignupForm({ onSuccess }: { onSuccess: (token: string, role: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.signup({ name, email, password });
      onSuccess(res.token, res.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && <ErrorBox message={error} />}

      <FieldGroup label="Full name">
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="Your name"
        />
      </FieldGroup>

      <FieldGroup label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="you@example.com"
        />
      </FieldGroup>

      <FieldGroup label="Password">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="Min. 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </FieldGroup>

      <FieldGroup label="Confirm password">
        <input
          type={showPw ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="Repeat password"
        />
      </FieldGroup>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-extrabold text-background transition-all hover:-translate-y-0.5 hover:bg-accent disabled:opacity-60"
      >
        {loading ? (
          "Creating account…"
        ) : (
          <>
            Create Account <ArrowRight className="size-4" />
          </>
        )}
      </button>
    </form>
  );
}

function GoogleButton({ auth0 }: { auth0: ReturnType<typeof useAuth0Hook> }) {
  const [attempted, setAttempted] = useState(false);

  return (
    <>
      {attempted && auth0.error && <ErrorBox message="Google sign-in failed. Please try again." />}
      <button
        disabled={auth0.isLoading}
        onClick={() => {
          setAttempted(true);
          auth0.loginWithRedirect({
            appState: { returnTo: "/dashboard" },
            authorizationParams: { connection: "google-oauth2" },
          });
        }}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-6 py-3.5 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
      >
        <GoogleIcon />
        {auth0.isLoading ? "Redirecting…" : "Continue with Google"}
      </button>
    </>
  );
}

function LoggedInState({
  name,
  role,
  onLogout,
}: {
  name: string;
  role: string;
  onLogout: () => void;
}) {
  return (
    <>
      <h1 className="display-title mb-6 text-4xl md:text-5xl">You're signed in.</h1>
      <div className="mb-6 rounded-2xl border border-border bg-white/60 p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Signed in as
        </div>
        <div className="mt-1 text-lg font-black">{name}</div>
        <div className="mt-0.5 text-xs font-semibold capitalize text-muted-foreground">{role}</div>
      </div>
      <div className="grid gap-3">
        <Link
          to={role === "admin" ? "/admin" : "/dashboard"}
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-extrabold text-background hover:bg-accent"
        >
          Open {role === "admin" ? "admin" : "dashboard"} <ArrowRight className="size-4" />
        </Link>
        <button
          onClick={onLogout}
          className="min-h-12 rounded-full border border-border px-6 text-sm font-bold hover:bg-white/70"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Conditional hook wrapper — always called, but only used when AUTH0_ENABLED
function useAuth0Hook() {
  return useAuth0();
}
