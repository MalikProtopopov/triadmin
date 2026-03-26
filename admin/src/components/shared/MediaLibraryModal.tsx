"use client";

import { useEffect, useState, useCallback } from "react";
import { ADMIN_MEDIA_PAGE_SIZE, getAdminMedia, postAdminMedia } from "@/lib/adminMedia";
import type { MediaAsset } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/shared/FileUpload";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type MediaLibrarySelection = { s3_key: string; public_url: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaLibrarySelection) => void;
  title?: string;
};

export function MediaLibraryModal({ open, onOpenChange, onSelect, title = "Медиатека" }: Props) {
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [fetchError, setFetchError] = useState<unknown>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!open) {
      setOffset(0);
      setItems([]);
      setTotal(0);
      setSelectedId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      if (offset === 0) setLoadingList(true);
      else setLoadingMore(true);
      setFetchError(null);
      try {
        const res = await getAdminMedia({ limit: ADMIN_MEDIA_PAGE_SIZE, offset });
        if (cancelled) return;
        setTotal(res.total);
        setItems((prev) =>
          offset === 0 ? res.data : [...prev, ...res.data.filter((x) => !prev.some((p) => p.id === x.id))]
        );
      } catch (e) {
        if (!cancelled) setFetchError(e);
      } finally {
        if (!cancelled) {
          setLoadingList(false);
          setLoadingMore(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, offset]);

  const hasMore = items.length < total;

  const refreshFromStart = useCallback(async () => {
    setOffset(0);
    const res = await getAdminMedia({ limit: ADMIN_MEDIA_PAGE_SIZE, offset: 0 });
    setTotal(res.total);
    setItems(res.data);
    return res;
  }, []);

  async function handleUpload(files: File | File[] | null) {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл больше 10 МБ");
      return;
    }
    setUploading(true);
    try {
      const asset = await postAdminMedia(file);
      await refreshFromStart();
      setSelectedId(asset.id);
      toast.success("Файл загружен — выберите его или нажмите «Выбрать»");
    } catch {
      /* interceptor */
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    const picked = selectedId ? items.find((x) => x.id === selectedId) : null;
    if (!picked) {
      toast.error("Выберите изображение в сетке");
      return;
    }
    onSelect({ s3_key: picked.s3_key, public_url: picked.public_url });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 overflow-y-auto flex-1 min-h-0">
          <FileUpload
            accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }}
            maxSize={10 * 1024 * 1024}
            value={null}
            onChange={handleUpload}
            label={uploading ? "Загрузка…" : "Загрузить новое изображение (до 10 МБ)"}
            hint="JPEG, PNG, WebP. После загрузки список обновится."
          />
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Загрузка на сервер…
            </div>
          )}

          <div className="border rounded-lg p-3 min-h-[200px]">
            {fetchError != null ? <p className="text-sm text-destructive">Не удалось загрузить медиатеку</p> : null}
            {loadingList && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingList && !items.length && fetchError == null && (
              <p className="text-sm text-muted-foreground text-center py-8">Пока нет файлов. Загрузите изображение выше.</p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={cn(
                    "relative aspect-square rounded-md overflow-hidden border-2 transition-colors bg-muted",
                    selectedId === asset.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.public_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {hasMore && items.length > 0 && (
              <div className="flex justify-center mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => setOffset((o) => o + ADMIN_MEDIA_PAGE_SIZE)}
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Загрузить ещё"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedId}>
            Выбрать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
