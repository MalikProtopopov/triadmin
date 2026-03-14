"use client";

import { useEffect } from "react";

const CONFIRM_MESSAGE = "У вас есть несохранённые изменения. Покинуть страницу?";

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const originalPushState = window.history.pushState.bind(window.history);

    window.history.pushState = function (...args: Parameters<typeof originalPushState>) {
      if (window.confirm(CONFIRM_MESSAGE)) {
        originalPushState(...args);
      }
    };

    const handlePopState = () => {
      if (!window.confirm(CONFIRM_MESSAGE)) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  return { isDirty };
}
