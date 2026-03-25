import type { Role, User } from "@/types";

export function userHasRole(user: User | null, ...roles: Role[]): boolean {
  if (!user?.roles?.length) return false;
  return roles.some((r) => user.roles.includes(r));
}

/** Долги, ручные платежи, оверрайды оплаты у врача (admin, accountant) */
export function canManageFinance(user: User | null): boolean {
  return userHasRole(user, "admin", "accountant");
}
