import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import {
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
  AUTH0_ENABLED,
  AUTH0_SCOPE,
} from "@/lib/auth-config";
import { setAccessTokenGetter } from "@/lib/api";
import {
  clearLocalToken,
  decodeLocalToken,
  getLocalToken,
  setLocalToken,
  type LocalUser,
} from "@/lib/local-auth";

// ── Local auth context ────────────────────────────────────────────────────────

type LocalAuthContextValue = {
  localUser: LocalUser | null;
  localLogin: (token: string) => void;
  localLogout: () => void;
};

const LocalAuthContext = createContext<LocalAuthContextValue>({
  localUser: null,
  localLogin: () => {},
  localLogout: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalAuth() {
  return useContext(LocalAuthContext);
}

// ── Root provider ─────────────────────────────────────────────────────────────

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  if (!AUTH0_ENABLED || typeof window === "undefined") {
    return <LocalAuthBridge>{children}</LocalAuthBridge>;
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: AUTH0_AUDIENCE,
        scope: AUTH0_SCOPE,
        redirect_uri: window.location.origin,
        connection: "google-oauth2",
      }}
      onRedirectCallback={(appState) => {
        navigate({ to: appState?.returnTo ?? "/dashboard" });
      }}
    >
      <AuthTokenBridge>{children}</AuthTokenBridge>
    </Auth0Provider>
  );
}

// ── Local-only bridge (when Auth0 is disabled) ────────────────────────────────

function LocalAuthBridge({ children }: { children: React.ReactNode }) {
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
    <LocalAuthContext.Provider value={{ localUser, localLogin, localLogout }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

// ── Auth0 + local bridge ──────────────────────────────────────────────────────

function AuthTokenBridge({ children }: { children: React.ReactNode }) {
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
    <LocalAuthContext.Provider value={{ localUser, localLogin, localLogout }}>
      {children}
    </LocalAuthContext.Provider>
  );
}
