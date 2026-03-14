import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

const TEMPLATE_HEADERS = [
  "Фамилия",
  "Имя",
  "Отчество",
  "Email",
  "Телефон",
  "Город",
  "Специализация",
  "Клиника",
  "Должность",
  "Учёная степень",
];

export async function GET() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Врачи");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Disposition": 'attachment; filename="doctors-import-template.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
