export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE;
export const AUTH0_SCOPE =
  import.meta.env.VITE_AUTH0_SCOPE ??
  "openid profile email read:dashboard manage:admin manage:packages manage:destinations";

// Audience is optional — only needed if you have a backend API registered in Auth0
export const AUTH0_ENABLED = Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID);

/** Returns true only when Auth0 explicitly says the API audience isn't registered.
 *  "unauthorized_client" is intentionally excluded — it covers many unrelated errors
 *  (e.g. wrong grant type) and must not be treated as a missing-audience problem. */
export function isAuth0ConfigError(error: Error | undefined): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("service not found");
}
