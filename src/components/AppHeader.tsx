"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { NetworkStatus } from "./NetworkStatus";
import { CloudStatus } from "./CloudStatus";
import { Button } from "./ui";

export function AppHeader({
  title,
  showNetwork = true,
}: {
  title?: string;
  showNetwork?: boolean;
}) {
  const { session, logout } = useAuth();
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-card-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/home"
            className="flex items-center gap-2 font-semibold text-text-primary"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-lg bg-button text-button-foreground"
            >
              🎉
            </span>
            <span className="hidden sm:inline">Party Day</span>
          </Link>
          {title && (
            <span className="truncate text-text-muted" aria-current="page">
              / {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showNetwork && <CloudStatus className="hidden sm:inline-flex" />}
          {showNetwork && <NetworkStatus className="hidden md:inline-flex" />}
          <ThemeToggle />
          {session && (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-text-muted md:inline">
                {session.displayName}
              </span>
              <Button variant="secondary" size="sm" onClick={onLogout}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
