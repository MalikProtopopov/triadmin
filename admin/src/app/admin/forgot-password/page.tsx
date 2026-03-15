"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { forgotPassword } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    setIsSubmitting(true);
    try {
      await forgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch {
      // handled by interceptor
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Сброс пароля</CardTitle>
          <p className="text-sm text-muted-foreground">
            {sent ? "" : "Введите email, на который зарегистрирован аккаунт"}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm">
                Если ваш email зарегистрирован, вы получите письмо с инструкцией
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/login">Вернуться ко входу</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отправить инструкцию
              </Button>
              <div className="text-center">
                <Link href="/admin/login" className="text-sm text-muted-foreground hover:underline">
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
