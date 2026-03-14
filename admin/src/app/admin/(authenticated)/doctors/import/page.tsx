import { redirect } from "next/navigation";

export default function DoctorsImportRedirect() {
  redirect("/admin/portal-users/import");
}
