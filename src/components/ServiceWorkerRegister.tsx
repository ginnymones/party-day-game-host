"use client";

import { useEffect } from "react";
import { applyStoredTheme } from "./ThemeToggle";

/**
 * Registers the service worker for offline support and applies the stored
 * theme before paint-sensitive interactions. Rendered once in the root layout.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    applyStoredTheme();

    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Registration failures shouldn't break the app; offline is a bonus.
        });
      };
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
