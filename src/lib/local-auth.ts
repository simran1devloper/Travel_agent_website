const TOKEN_KEY = "jm_local_token";

export type LocalUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

export function getLocalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setLocalToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearLocalToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeLocalToken(token: string): LocalUser | null {
  try {
    const segment = token.split(".")[1];
    const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    if (payload.iss !== "journeymakers-local") return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      clearLocalToken();
      return null;
    }
    return {
      id: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role === "admin" ? "admin" : "user") as "user" | "admin",
    };
  } catch {
    return null;
  }
}

export function getLocalUser(): LocalUser | null {
  const token = getLocalToken();
  if (!token) return null;
  return decodeLocalToken(token);
}
