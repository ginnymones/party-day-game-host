"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  isCloudConfigured,
  subscribeSync,
  syncNow,
  type SyncStatus,
} from "@/lib/cloud";

const LABEL: Record<SyncStatus, string> = {
  idle: "Sync now",
  syncing: "Saving…",
  saved: "Saved",
  error: "Retry sync",
  offline: "Offline",
};

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 10_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

/**
 * Interactive cloud sync control: shows current status and the last synced time,
 * and lets the user force a reconcile. Renders nothing when cloud sync isn't
 * configured, so purely-local deployments stay clean.
 */
export function CloudStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  // Re-render periodically so the relative time stays fresh.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isCloudConfigured()) return;
    const unsub = subscribeSync((s) => {
      setStatus(s.status);
      setLastSyncedAt(s.lastSyncedAt);
    });
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (!isCloudConfigured()) return null;

  const tone =
    status === "error"
      ? "bg-danger/15 text-danger hover:bg-danger/25"
      : status === "offline"
      ? "bg-warning/15 text-warning"
      : status === "syncing"
      ? "bg-accent/15 text-accent"
      : "bg-success/15 text-success hover:bg-success/25";

  const busy = status === "syncing";
  const synced = relativeTime(lastSyncedAt);

  return (
    <button
      type="button"
      onClick={() => syncNow()}
      disabled={busy || status === "offline"}
      aria-label={
        synced ? `Sync now. Last synced ${synced}.` : "Sync now"
      }
      title={
        synced
          ? `Last synced ${synced}. Click to sync now.`
          : "Back up your parties and games to your account. Click to sync now."
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors disabled:cursor-default",
        tone,
        className
      )}
    >
      {busy ? <SpinnerIcon /> : <CloudIcon />}
      {LABEL[status]}
      {synced && status !== "syncing" && (
        <span className="opacity-70">· {synced}</span>
      )}
    </button>
  );
}

function CloudIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17.5 18H7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
