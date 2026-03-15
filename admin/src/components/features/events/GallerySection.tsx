"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { EventGalleryNested } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FileUpload } from "@/components/shared/FileUpload";
import { Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface GallerySectionProps {
  eventId: string;
  galleries: EventGalleryNested[];
}

export function GallerySection({ eventId, galleries }: GallerySectionProps) {
  const queryClient = useQueryClient();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryAccessLevel, setGalleryAccessLevel] = useState<"public" | "members_only">("members_only");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const [photoUploadGalleryId, setPhotoUploadGalleryId] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  async function createGallery() {
    setGalleryLoading(true);
    try {
      const { data: gallery } = await api.post(`/admin/events/${eventId}/galleries`, {
        title: galleryTitle.trim() || "Галерея",
        access_level: galleryAccessLevel,
      });
      if (galleryFiles.length > 0) {
        const fd = new FormData();
        galleryFiles.forEach((f) => fd.append("photos", f));
        await api.post(`/admin/events/${eventId}/galleries/${gallery.id}/photos`, fd);
      }
      toast.success("Галерея добавлена");
      setGalleryOpen(false);
      setGalleryFiles([]);
      setGalleryTitle("");
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    } catch { /* handled by interceptor */ }
    finally { setGalleryLoading(false); }
  }

  async function uploadPhotos() {
    if (!photoUploadGalleryId || photoFiles.length === 0) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      photoFiles.forEach((f) => fd.append("photos", f));
      await api.post(`/admin/events/${eventId}/galleries/${photoUploadGalleryId}/photos`, fd);
      toast.success("Фото загружены");
      setPhotoUploadGalleryId(null);
      setPhotoFiles([]);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    } catch { /* handled by interceptor */ }
    finally { setPhotoUploading(false); }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Фотогалереи</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setGalleryOpen(true)}>
            <Plus className="mr-1 h-3 w-3" /> Добавить галерею
          </Button>
        </CardHeader>
        <CardContent>
          {galleries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Загрузите фотографии с мероприятия</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Доступ</TableHead>
                  <TableHead>Фото</TableHead>
                  <TableHead>Создана</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {galleries.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={g.access_level} label={g.access_level === "public" ? "Всем" : "Членам"} />
                    </TableCell>
                    <TableCell>{g.photos_count ?? 0}</TableCell>
                    <TableCell>{format(new Date(g.created_at), "dd.MM.yyyy")}</TableCell>
                    <TableCell>
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => { setPhotoUploadGalleryId(g.id); setPhotoFiles([]); }}
                      >
                        <Upload className="mr-1 h-3 w-3" /> Фото
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={galleryOpen} onOpenChange={(open) => { if (!open) { setGalleryFiles([]); setGalleryTitle(""); } setGalleryOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить фотогалерею</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} placeholder="Галерея мероприятия" />
            </div>
            <div className="space-y-2">
              <Label>Уровень доступа</Label>
              <Select value={galleryAccessLevel} onValueChange={(v: "public" | "members_only") => setGalleryAccessLevel(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Всем</SelectItem>
                  <SelectItem value="members_only">Только членам</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FileUpload
              accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
              maxSize={10 * 1024 * 1024}
              multiple
              value={galleryFiles}
              onChange={(f) => setGalleryFiles(f ? (Array.isArray(f) ? f : [f]) : [])}
              label="Перетащите фото или нажмите для выбора"
              hint="До 50 файлов, JPG/PNG/WebP"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGalleryOpen(false)}>Отмена</Button>
            <Button type="button" disabled={galleryLoading || !galleryTitle.trim()} onClick={createGallery}>
              {galleryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!photoUploadGalleryId} onOpenChange={(open) => { if (!open) { setPhotoUploadGalleryId(null); setPhotoFiles([]); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Загрузить фото</DialogTitle></DialogHeader>
          <FileUpload
            accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
            maxSize={10 * 1024 * 1024}
            multiple
            value={photoFiles}
            onChange={(f) => setPhotoFiles(f ? (Array.isArray(f) ? f : [f]) : [])}
            label="Перетащите фото или нажмите для выбора"
            hint="До 50 файлов, JPG/PNG/WebP"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPhotoUploadGalleryId(null)}>Отмена</Button>
            <Button type="button" disabled={photoUploading || photoFiles.length === 0} onClick={uploadPhotos}>
              {photoUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Загрузить ({photoFiles.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
