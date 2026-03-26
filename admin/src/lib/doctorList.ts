import type { DoctorListItem } from "@/types";

/** Подпись врача для списков и автодополнения (как на странице «Врачи»). */
export function doctorListItemLabel(d: DoctorListItem): string {
  const fio = `${d.last_name} ${d.first_name} ${d.middle_name || ""}`.trim();
  return `${fio} — ${d.email}`;
}
