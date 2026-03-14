"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

const schema = z.object({
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(128, "Максимум 128 символов")
    .regex(/^(?=.*[0-9])(?=.*[a-zA-Z]).+$/, "Минимум 1 цифра и 1 буква"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-destructive">Ссылка недействительна или устарела</p>
        <Button asChild variant="outline">
          <Link href="/admin/forgot-password">Запросить новую ссылку</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(data: z.infer<typeof schema>) {
    setIsSubmitting(true);
    try {
      await resetPassword(token!, data.password);
      toast.success("Пароль успешно изменён");
      router.replace("/admin/login");
    } catch {
      // handled by interceptor
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Новый пароль</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Повторите пароль</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Сохранить пароль
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Новый пароль</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
