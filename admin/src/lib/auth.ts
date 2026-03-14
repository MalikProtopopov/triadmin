import api, { setAccessToken } from "@/lib/api";
import type { User } from "@/types";

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post("/auth/login", { email, password });
  setAccessToken(data.access_token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export async function refreshSession(): Promise<User | null> {
  try {
    const { data } = await api.post("/auth/refresh");
    setAccessToken(data.access_token);
    return data.user ?? null;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post("/auth/reset-password", { token, new_password: password });
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
