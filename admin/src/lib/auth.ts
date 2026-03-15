import api, { setAccessToken } from "@/lib/api";
import type { AuthMeResponse, Role, User } from "@/types";
import { getSidebarSectionsForRole } from "@/lib/sidebarSections";

function parseJwtPayload(token: string): { sub: string; role: string } {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

function userFromToken(token: string, email = "", sidebar_sections?: string[]): User {
  const { sub, role } = parseJwtPayload(token);
  return {
    id: sub,
    email,
    roles: [role as Role],
    email_verified: true,
    has_chosen_role: true,
    onboarding_completed: true,
    moderation_status: null,
    last_login_at: null,
    sidebar_sections,
    is_staff: ["admin", "manager", "accountant"].includes(role),
  };
}

function userFromAuthMe(me: AuthMeResponse): User {
  return {
    id: me.id,
    email: me.email,
    roles: [me.role as Role],
    email_verified: true,
    has_chosen_role: true,
    onboarding_completed: true,
    moderation_status: null,
    last_login_at: null,
    sidebar_sections: me.sidebar_sections,
    is_staff: me.is_staff,
  };
}

export async function fetchAuthMe(): Promise<AuthMeResponse | null> {
  try {
    const { data } = await api.get<AuthMeResponse>("/auth/me");
    return data;
  } catch {
    return null;
  }
}

export function setSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "admin_auth=1; path=/; max-age=604800; SameSite=Lax";
  }
}

export function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "admin_auth=; path=/; max-age=0";
  }
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post("/auth/login", { email, password });
  setAccessToken(data.access_token);
  setSessionCookie();
  const me = await fetchAuthMe();
  if (me) return userFromAuthMe(me);
  const { role } = parseJwtPayload(data.access_token);
  return userFromToken(data.access_token, email, getSidebarSectionsForRole(role));
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
    clearSessionCookie();
  }
}

export async function refreshSession(): Promise<User | null> {
  try {
    const { data } = await api.post("/auth/refresh");
    setAccessToken(data.access_token);
    setSessionCookie();
    const me = await fetchAuthMe();
    if (me) return userFromAuthMe(me);
    const { role } = parseJwtPayload(data.access_token);
    return userFromToken(data.access_token, "", getSidebarSectionsForRole(role));
  } catch {
    setAccessToken(null);
    clearSessionCookie();
    return null;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post("/auth/reset-password", { token, new_password: password }, {
    skipErrorToast: true,
  } as Parameters<typeof api.post>[2]);
}

const ADMIN_ROLES = ["admin", "manager", "accountant"];

export function hasAdminAccess(user: User | null): boolean {
  if (!user) return false;
  return user.roles.some((r) => ADMIN_ROLES.includes(r));
}

export function hasRole(user: User | null, role: string): boolean {
  if (!user) return false;
  return user.roles.includes(role as User["roles"][number]);
}

export function hasAnyRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r as User["roles"][number]));
}
