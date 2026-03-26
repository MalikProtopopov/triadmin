"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExport, type ExportQueryValue } from "@/lib/exportDownload";
import { cn } from "@/lib/utils";

type Props = {
  exportPath: string;
  buildParams: () => Record<string, ExportQueryValue>;
  label?: string;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

export function ExportXlsxButton({
  exportPath,
  buildParams,
  label = "Скачать XLSX",
  disabled,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await downloadExport(exportPath, buildParams());
    } catch {
      /* toast в downloadExport */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Download className="h-4 w-4 shrink-0" />}
      {label}
    </Button>
  );
}
