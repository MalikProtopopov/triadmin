"use client";

import { type SortingState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortableHeaderProps {
  label: string;
  columnId: string;
  sorting: SortingState;
  onSort: (id: string) => void;
}

export function SortableHeader({ label, columnId, sorting, onSort }: SortableHeaderProps) {
  const current = sorting.find((s) => s.id === columnId);
  const Icon = !current ? ArrowUpDown : current.desc ? ArrowDown : ArrowUp;
  return (
    <Button variant="ghost" className="-ml-3 h-8 hover:bg-transparent" onClick={() => onSort(columnId)}>
      {label}
      <Icon className="ml-1 h-3 w-3" />
    </Button>
  );
}
