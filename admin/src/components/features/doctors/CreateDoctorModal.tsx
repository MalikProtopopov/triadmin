"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Loader2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { City } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  first_name: z.string().min(1, "Обязательное поле").max(100),
  last_name: z.string().min(1, "Обязательное поле").max(100),
  phone: z
    .string()
    .min(1, "Обязательное поле")
    .regex(/^\+?\d{7,20}$/, "Введите корректный телефон"),
  middle_name: z.string().optional(),
  city_id: z.string().optional(),
  clinic_name: z.string().optional(),
  position: z.string().optional(),
  academic_degree: z.string().optional(),
  bio: z.string().optional(),
  public_email: z.string().email("Некорректный email").optional().or(z.literal("")),
  public_phone: z.string().optional(),
  specialization_ids: z.array(z.string()).optional(),
  status: z.enum(["approved", "pending_review"]),
  send_invite: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CreateDoctorResponse {
  user_id: string;
  profile_id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  temp_password: string | null;
}

interface Specialization {
  id: string;
  name: string;
}

interface Props {
  onCreated: (profileId: string) => void;
}

export function CreateDoctorModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "approved",
      send_invite: true,
      specialization_ids: [],
    },
  });

  const sendInvite = watch("send_invite");
  const selectedSpecs = watch("specialization_ids") || [];
  const selectedCity = watch("city_id");
  const selectedStatus = watch("status");

  const { data: citiesData } = useQuery<{ data: City[] }>({
    queryKey: ["cities"],
    queryFn: () => api.get("/cities").then((r) => r.data),
    enabled: open,
  });

  const { data: specsData } = useQuery<{ data: Specialization[] }>({
    queryKey: ["specializations"],
    queryFn: () => api.get("/specializations").then((r) => r.data),
    enabled: open,
  });

  const createDoctor = useMutation({
    mutationFn: (body: FormData) => {
      const payload: Record<string, unknown> = { ...body };
      if (!payload.middle_name) delete payload.middle_name;
      if (!payload.city_id) delete payload.city_id;
      if (!payload.clinic_name) delete payload.clinic_name;
      if (!payload.position) delete payload.position;
      if (!payload.academic_degree) delete payload.academic_degree;
      if (!payload.bio) delete payload.bio;
      if (!payload.public_email) delete payload.public_email;
      if (!payload.public_phone) delete payload.public_phone;
      if (
        !payload.specialization_ids ||
        (payload.specialization_ids as string[]).length === 0
      )
        delete payload.specialization_ids;
      return api.post<CreateDoctorResponse>("/admin/doctors", payload);
    },
    onSuccess: (response) => {
      const data = response.data;
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Врач создан");

      if (!sendInvite && data.temp_password) {
        setTempPasswordResult({
          email: data.email,
          password: data.temp_password,
        });
      } else {
        setOpen(false);
        reset();
        setShowOptional(false);
        onCreated(data.profile_id);
      }
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { status?: number; data?: { error?: { code?: string } } };
      };
      if (
        error.response?.status === 409 ||
        error.response?.data?.error?.code === "CONFLICT"
      ) {
        setError("email", {
          message: "Пользователь с таким email уже зарегистрирован",
        });
      }
    },
  });

  function onSubmit(data: FormData) {
    createDoctor.mutate(data);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset();
      setShowOptional(false);
      setTempPasswordResult(null);
    }
    setOpen(isOpen);
  }

  function handleTempPasswordClose() {
    const profileId = createDoctor.data?.data.profile_id;
    setTempPasswordResult(null);
    setOpen(false);
    reset();
    setShowOptional(false);
    if (profileId) onCreated(profileId);
  }

  function toggleSpec(id: string) {
    const current = selectedSpecs;
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    setValue("specialization_ids", next);
  }

  if (tempPasswordResult) {
    return (
      <Dialog open onOpenChange={() => handleTempPasswordClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Временный пароль</DialogTitle>
            <DialogDescription>
              Приглашение не было отправлено. Передайте данные врачу вручную.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{tempPasswordResult.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Пароль</Label>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-3 py-2 rounded text-sm font-mono flex-1">
                  {tempPasswordResult.password}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPasswordResult.password);
                    toast.success("Скопировано");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleTempPasswordClose}>Готово</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Добавить врача
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Новый врач</DialogTitle>
          <DialogDescription>
            Заполните данные для создания аккаунта врача
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <form
            id="create-doctor-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pb-4"
          >
            {/* Required fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cd-email">Email *</Label>
                <Input
                  id="cd-email"
                  type="email"
                  placeholder="doctor@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-phone">Телефон *</Label>
                <Input
                  id="cd-phone"
                  placeholder="+79001234567"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-last_name">Фамилия *</Label>
                <Input id="cd-last_name" {...register("last_name")} />
                {errors.last_name && (
                  <p className="text-xs text-destructive">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-first_name">Имя *</Label>
                <Input id="cd-first_name" {...register("first_name")} />
                {errors.first_name && (
                  <p className="text-xs text-destructive">
                    {errors.first_name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Toggle optional fields */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setShowOptional(!showOptional)}
            >
              {showOptional ? (
                <ChevronUp className="mr-1 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-1 h-4 w-4" />
              )}
              Дополнительные поля
            </Button>

            {showOptional && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-middle_name">Отчество</Label>
                    <Input
                      id="cd-middle_name"
                      {...register("middle_name")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Город</Label>
                    <Select
                      value={selectedCity || ""}
                      onValueChange={(v) =>
                        setValue("city_id", v === "__none" ? undefined : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите город" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Не выбран</SelectItem>
                        {citiesData?.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-clinic">Клиника</Label>
                    <Input
                      id="cd-clinic"
                      {...register("clinic_name")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-position">Должность</Label>
                    <Input
                      id="cd-position"
                      {...register("position")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-degree">Учёная степень</Label>
                    <Input
                      id="cd-degree"
                      {...register("academic_degree")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-pub-email">Публичный email</Label>
                    <Input
                      id="cd-pub-email"
                      type="email"
                      {...register("public_email")}
                    />
                    {errors.public_email && (
                      <p className="text-xs text-destructive">
                        {errors.public_email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-pub-phone">Публичный телефон</Label>
                    <Input
                      id="cd-pub-phone"
                      {...register("public_phone")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cd-bio">Биография</Label>
                  <Textarea
                    id="cd-bio"
                    rows={3}
                    {...register("bio")}
                  />
                </div>

                {specsData?.data && specsData.data.length > 0 && (
                  <div className="space-y-2">
                    <Label>Специализации</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {specsData.data.map((spec) => (
                        <label
                          key={spec.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedSpecs.includes(spec.id)}
                            onCheckedChange={() => toggleSpec(spec.id)}
                          />
                          {spec.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t">
              <div className="space-y-1.5">
                <Label>Статус профиля</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) =>
                    setValue("status", v as "approved" | "pending_review")
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Одобрен</SelectItem>
                    <SelectItem value="pending_review">
                      На модерации
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer pt-5">
                <Checkbox
                  checked={sendInvite}
                  onCheckedChange={(c) => setValue("send_invite", !!c)}
                />
                Отправить приглашение на email
              </label>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => handleClose(false)}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            form="create-doctor-form"
            disabled={createDoctor.isPending}
          >
            {createDoctor.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
