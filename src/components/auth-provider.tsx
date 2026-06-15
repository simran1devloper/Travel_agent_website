import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import {
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
  AUTH0_SCOPE,
} from "@/lib/auth-config";
import { API_BASE_URL, setAccessTokenGetter } from "@/lib/api";
import {
  clearLocalToken,
  decodeLocalToken,
  getLocalToken,
  setLocalToken,
  type LocalUser,
} from "@/lib/local-auth";

// ── Runtime app config (fetched from backend) ─────────────────────────────────

type AppConfig = {
  auth0_enabled: boolean;
  auth0_domain: string;
  auth0_client_id: string;
  auth0_audience: string;
  google_available: boolean;
};

// ── Local auth context ────────────────────────────────────────────────────────

type LocalAuthContextValue = {
  localUser: LocalUser | null;
  localLogin: (token: string) => void;
  localLogout: () => void;
  auth0Enabled: boolean;
  googleAvailable: boolean;
};

const LocalAuthContext = createContext<LocalAuthContextValue>({
  localUser: null,
  localLogin: () => {},
  localLogout: () => {},
  auth0Enabled: false,
  googleAvailable: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalAuth() {
  return useContext(LocalAuthContext);
}

// ── Root provider ─────────────────────────────────────────────────────────────

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  // Seed initial config from build-time env vars (no delay if those are set).
  // The fetch below overwrites with runtime values from system settings.
  const [config, setConfig] = useState<AppConfig>({
    auth0_enabled: Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID),
    auth0_domain: AUTH0_DOMAIN || "",
    auth0_client_id: AUTH0_CLIENT_ID || "",
    auth0_audience: AUTH0_AUDIENCE || "",
    google_available: false,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/config`)
      .then((r) => r.json() as Promise<AppConfig>)
      .then(setConfig)
      .catch(() => {}); // keep build-time values on error
  }, []);

  const auth0Ready =
    config.auth0_enabled &&
    Boolean(config.auth0_domain) &&
    Boolean(config.auth0_client_id) &&
    typeof window !== "undefined";

  if (!auth0Ready) {
    return (
      <LocalAuthBridge googleAvailable={config.google_available}>
        {children}
      </LocalAuthBridge>
    );
  }

  return (
    <Auth0Provider
      key={config.auth0_domain}
      domain={config.auth0_domain}
      clientId={config.auth0_client_id}
      authorizationParams={{
        ...(config.auth0_audience ? { audience: config.auth0_audience } : {}),
        scope: AUTH0_SCOPE,
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={(appState) => {
        navigate({ to: appState?.returnTo ?? "/dashboard" });
      }}
    >
      <AuthTokenBridge googleAvailable={config.google_available}>
        {children}
      </AuthTokenBridge>
    </Auth0Provider>
  );
}

// ── Local-only bridge (when Auth0 is disabled) ────────────────────────────────

function LocalAuthBridge({
  children,
  googleAvailable,
}: {
  children: React.ReactNode;
  googleAvailable: boolean;
}) {
  const [localUser, setLocalUser] = useState<LocalUser | null>(() => {
    const token = getLocalToken();
    return token ? decodeLocalToken(token) : null;
  });

  useEffect(() => {
    const token = getLocalToken();
    if (token && localUser) {
      setAccessTokenGetter(async () => token);
    } else {
      setAccessTokenGetter(undefined);
    }
    return () => setAccessTokenGetter(undefined);
  }, [localUser]);

  const localLogin = (token: string) => {
    setLocalToken(token);
    setLocalUser(decodeLocalToken(token));
  };

  const localLogout = () => {
    clearLocalToken();
    setLocalUser(null);
    setAccessTokenGetter(undefined);
  };

  return (
    <LocalAuthContext.Provider
      value={{ localUser, localLogin, localLogout, auth0Enabled: false, googleAvailable }}
    >
      {children}
    </LocalAuthContext.Provider>
  );
}

// ── Auth0 + local bridge ──────────────────────────────────────────────────────

function AuthTokenBridge({
  children,
  googleAvailable,
}: {
  children: React.ReactNode;
  googleAvailable: boolean;
}) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [localUser, setLocalUser] = useState<LocalUser | null>(() => {
    const token = getLocalToken();
    return token ? decodeLocalToken(token) : null;
  });

  useEffect(() => {
    if (isAuthenticated) {
      // Auth0 takes priority — clear any local session
      clearLocalToken();
      setLocalUser(null);
      setAccessTokenGetter(async () => {
        try {
          return await getAccessTokenSilently();
        } catch {
          return undefined;
        }
      });
    } else {
      const token = getLocalToken();
      const user = token ? decodeLocalToken(token) : null;
      setLocalUser(user);
      if (token && user) {
        setAccessTokenGetter(async () => token);
      } else {
        setAccessTokenGetter(undefined);
      }
    }
    return () => setAccessTokenGetter(undefined);
  }, [isAuthenticated, getAccessTokenSilently]);

  const localLogin = (token: string) => {
    setLocalToken(token);
    setLocalUser(decodeLocalToken(token));
    setAccessTokenGetter(async () => token);
  };

  const localLogout = () => {
    clearLocalToken();
    setLocalUser(null);
    setAccessTokenGetter(undefined);
  };

  return (
    <LocalAuthContext.Provider
      value={{ localUser, localLogin, localLogout, auth0Enabled: true, googleAvailable }}
    >
      {children}
    </LocalAuthContext.Provider>
  );
}
