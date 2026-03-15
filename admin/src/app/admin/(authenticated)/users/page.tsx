"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import type { AdminUser, PaginatedResponse } from "@/types";
import { totalPages } from "@/lib/pagination";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

const ROLE_LABELS: Record<string, string> = { admin: "Администратор", manager: "Менеджер", accountant: "Бухгалтер" };
const ADMIN_ROLES = ["admin", "manager", "accountant"] as const;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<string>("manager");

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);

  const params = new URLSearchParams();
  params.set("limit", String(perPage));
  params.set("offset", String((page - 1) * perPage));
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (roleFilter !== "all") params.set("role", roleFilter);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<AdminUser>>({
    queryKey: ["admin-users", params.toString()],
    queryFn: () => api.get(`/admin/users?${params}`).then((r) => r.data),
  });

  const addUser = useMutation({
    mutationFn: () => api.post("/admin/users", { email: addEmail, password: addPassword, role: addRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Сотрудник добавлен");
      setAddOpen(false);
      setAddEmail("");
      setAddPassword("");
      setAddRole("manager");
    },
  });

  const updateUser = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}`, { role: editRole, is_active: editActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Сотрудник обновлён");
      setEditOpen(false);
      setEditTarget(null);
    },
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Сотрудник удалён");
      setRemoveTarget(null);
    },
  });

  function openEdit(user: AdminUser) {
    setEditTarget(user);
    setEditRole(user.role);
    setEditActive(user.is_active);
    setEditOpen(true);
  }

  const columns = useMemo<ColumnDef<AdminUser>[]>(() => [
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Роль",
      cell: ({ row }) => <StatusBadge status={row.original.role} label={row.original.role_display || ROLE_LABELS[row.original.role] || row.original.role} />,
    },
    {
      accessorKey: "is_active",
      header: "Статус",
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? "active" : "deactivated"} label={row.original.is_active ? "Активен" : "Деактивирован"} />,
    },
    {
      accessorKey: "created_at",
      header: "Создан",
      cell: ({ row }) => row.original.created_at ? format(new Date(row.original.created_at), "dd.MM.yyyy") : "—",
    },
    {
      accessorKey: "last_login_at",
      header: "Последний вход",
      cell: ({ row }) => row.original.last_login_at ? format(new Date(row.original.last_login_at), "dd.MM.yyyy HH:mm") : "Никогда",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Редактировать">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRemoveTarget(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = debouncedSearch.length > 0 || roleFilter !== "all";

  if (error) return <ErrorState message="Не удалось загрузить администраторов" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Администраторы" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Администраторы</h1>
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Добавить</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          placeholder="Поиск по email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            {ADMIN_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setRoleFilter("all"); setPage(1); }}>
            <X className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        page={page}
        perPage={perPage}
        total={data?.total}
        totalPages={totalPages(data?.total ?? 0, perPage)}
        onPageChange={setPage}
        onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }}
        isLoading={isLoading}
        emptyTitle="Нет администраторов"
      />

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddEmail(""); setAddPassword(""); setAddRole("manager"); } setAddOpen(o); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить сотрудника</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@trichology.ru" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Пароль *</Label>
              <Input value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="Минимум 8 символов" type="password" />
            </div>
            <div className="space-y-2">
              <Label>Роль *</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button disabled={!addEmail || addPassword.length < 8 || !addRole || addUser.isPending} onClick={() => addUser.mutate()}>
              {addUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditTarget(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать сотрудника</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editTarget.email}</p>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADMIN_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="edit-active" checked={editActive} onCheckedChange={setEditActive} />
                <Label htmlFor="edit-active" className="cursor-pointer">Активен</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null); }}>Отмена</Button>
            <Button
              disabled={!editTarget || updateUser.isPending}
              onClick={() => editTarget && updateUser.mutate(editTarget.id)}
            >
              {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Удалить сотрудника?"
        description={`Сотрудник ${removeTarget?.email} будет деактивирован.`}
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={removeUser.isPending}
        onConfirm={() => removeTarget && removeUser.mutate(removeTarget.id)}
      />
    </div>
  );
}
