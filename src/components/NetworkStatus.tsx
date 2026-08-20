"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { isSyncConfigured } from "@/lib/sync";

/**
 * Small pill showing whether the device is online and whether live sync is
 * configured. Helps hosts understand when participant/audience devices will
 * update in real time versus when they're running purely offline.
 */
export function NetworkStatus({ className }: { className?: string }) {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (!mounted) return null;

  const syncing = online && isSyncConfigured();
  const label = !online
    ? "Offline"
    : syncing
    ? "Live sync on"
    : "Online (local only)";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online
          ? "bg-success/15 text-success"
          : "bg-warning/15 text-warning",
        className
      )}
      title={
        syncing
          ? "Connected. Participant and audience screens update live."
          : online
          ? "Online, but live sync isn't configured. Everything still works on this device."
          : "No connection. The game runs fully on this device."
      }
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-success" : "bg-warning"
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
