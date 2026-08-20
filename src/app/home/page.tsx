"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { getPartyByCode } from "@/lib/store";
import { useToast } from "@/components/Toast";

export default function HomePage() {
  const { session, loading, authorized } = useRequireAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  if (loading || !authorized || !session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const canHost = session.role === "gamemaster" || session.role === "admin";

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setJoining(true);
    const party = await getPartyByCode(trimmed);
    setJoining(false);
    if (!party) {
      toast("No party found with that code.", "error");
      return;
    }
    // Participants go to answer view; everyone else can watch as audience.
    if (session.role === "participant") {
      router.push(`/play/${party.code}`);
    } else {
      router.push(`/audience/${party.code}`);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">
            Welcome, {session.displayName}
          </h1>
          <p className="mt-1 text-text-muted">
            Host a gathering or join one that&apos;s already running.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="flex flex-col">
            <h2 className="text-lg font-semibold text-text-primary">
              Host a party
            </h2>
            <p className="mt-1 flex-1 text-sm text-text-muted">
              Set up your banner and games, then run everything from the game
              master screen — works even without internet.
            </p>
            <div className="mt-4">
              {canHost ? (
                <Button onClick={() => router.push("/host")}>
                  Go to my parties
                </Button>
              ) : (
                <p className="rounded-xl bg-background p-3 text-sm text-text-muted">
                  Hosting is available to game masters. Ask an admin to upgrade
                  your account if you need to run a party.
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col">
            <h2 className="text-lg font-semibold text-text-primary">
              Join a party
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Enter the code your host shared with you.
            </p>
            <form onSubmit={onJoin} className="mt-4 flex flex-col gap-3">
              <Input
                label="Party code"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUNSET-42"
                autoCapitalize="characters"
                className="uppercase tracking-wide"
              />
              <Button type="submit" variant="secondary" loading={joining}>
                Join party
              </Button>
            </form>
          </Card>
        </div>

        {session.role === "admin" && (
          <div className="mt-6">
            <Link
              href="/admin"
              className="text-sm font-medium text-accent hover:underline"
            >
              Open admin panel →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
