import { Providers } from "@/app/admin/providers";

export const metadata = {
  title: "Админпанель — Ассоциация трихологов",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
