"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminAccess } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const user = await login(data.email, data.password);
      if (!hasAdminAccess(user)) {
        toast.error("Нет доступа к админпанели");
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      // error toast handled by api interceptor
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Вход в панель управления</CardTitle>
          <p className="text-sm text-muted-foreground">Ассоциация трихологов</p>
        </CardHeader>
        <CardContent>
          {process.env.NEXT_PUBLIC_USE_MOCK === "true" && (
            <p className="text-sm text-muted-foreground text-center mb-4 bg-muted/50 rounded-md p-2">
              Демо-режим: введите любой email и пароль для входа
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@trichology.ru" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Войти
            </Button>
            <div className="text-center">
              <Link href="/admin/forgot-password" className="text-sm text-muted-foreground hover:underline">
                Забыли пароль?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
