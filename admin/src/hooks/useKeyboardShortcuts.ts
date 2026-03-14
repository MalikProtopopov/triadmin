"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onSearchFocus?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({ onSave, onSearchFocus, enabled = true }: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }

      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) && !target?.isContentEditable) {
        e.preventDefault();
        onSearchFocus?.();
      }
    },
    [enabled, onSave, onSearchFocus]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
