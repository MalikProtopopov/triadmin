"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { FaqAdminItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const schema = z.object({
  question_title: z.string().min(3, "Минимум 3 символа").max(500, "Максимум 500 символов"),
  question_text: z.string().min(3, "Минимум 3 символа"),
  author_name: z.string().max(255).optional().or(z.literal("")),
  is_active: z.boolean(),
  original_date: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface FaqFormProps {
  faq?: FaqAdminItem;
}

export function FaqForm({ faq }: FaqFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!faq;

  const [answerText, setAnswerText] = useState(faq?.answer_text || "");

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: faq
      ? {
          question_title: faq.question_title,
          question_text: faq.question_text,
          author_name: faq.author_name || "",
          is_active: faq.is_active,
          original_date: faq.original_date ? faq.original_date.slice(0, 16) : "",
        }
      : {
          is_active: true,
        },
  });

  const isFormDirty = isDirty || answerText !== (faq?.answer_text || "");
  useUnsavedChangesGuard(isFormDirty);

  const formRef = useRef<HTMLFormElement>(null);
  useKeyboardShortcuts({
    onSave: () => formRef.current?.requestSubmit(),
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        question_title: data.question_title,
        question_text: data.question_text,
        answer_text: answerText || null,
        author_name: data.author_name || null,
        is_active: data.is_active,
        original_date: data.original_date || null,
      };

      if (isEditing) {
        return api.patch(`/admin/faq/${faq.id}`, payload);
      }
      return api.post("/admin/faq", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ["faq", faq.id] });
        toast.success("FAQ обновлён");
      } else {
        toast.success("FAQ создан");
      }
      router.push("/admin/faq");
    },
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Вопрос</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Заголовок вопроса *</Label>
            <Input {...register("question_title")} placeholder="Краткий заголовок вопроса" />
            {errors.question_title && <p className="text-xs text-destructive">{errors.question_title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Текст вопроса *</Label>
            <Textarea {...register("question_text")} rows={4} placeholder="Полный текст вопроса пользователя" />
            {errors.question_text && <p className="text-xs text-destructive">{errors.question_text.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Имя автора</Label>
              <Input {...register("author_name")} placeholder="Имя автора вопроса" />
            </div>
            <div className="space-y-2">
              <Label>Дата оригинала</Label>
              <Input type="datetime-local" {...register("original_date")} />
              <p className="text-xs text-muted-foreground">Дата из старого сайта (если есть)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ответ эксперта</CardTitle></CardHeader>
        <CardContent>
          <RichTextEditor content={answerText} onChange={setAnswerText} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={watch("is_active")}
              onCheckedChange={(v) => setValue("is_active", v, { shouldDirty: true })}
            />
            <Label>Показывать на сайте</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Сохранить" : "Создать"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isFormDirty && !window.confirm("У вас есть несохранённые изменения. Покинуть страницу?")) return;
            router.back();
          }}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
