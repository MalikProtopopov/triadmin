/**
 * Префиксы путей, доступные роли accountant (синхронно с sidebar_sections на бэкенде).
 * Используется в authenticated layout для защиты от обхода меню.
 */
export const ACCOUNTANT_PATH_PREFIXES = [
  "/admin/payments",
  "/admin/arrears",
  "/admin/doctors",
  "/admin/protocol-history",
] as const;

export function isPathAllowedForAccountant(pathname: string): boolean {
  return ACCOUNTANT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
