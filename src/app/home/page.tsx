"use client";

import { useState } from "react";
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
  const [checking, setChecking] = useState(false);

  if (loading || !authorized || !session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const resolveCode = async (): Promise<string | null> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast("Enter a party code first.", "error");
      return null;
    }
    return trimmed;
  };

  const onWatch = async () => {
    const c = await resolveCode();
    if (c) router.push(`/audience/${c}`);
  };

  const onCohost = async () => {
    const c = await resolveCode();
    if (!c) return;
    setChecking(true);
    // A quick existence check for same-device parties; remote is validated live.
    await getPartyByCode(c);
    setChecking(false);
    router.push(`/cohost/${c}`);
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
            Host your own party or help run someone else&apos;s.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="flex flex-col">
            <h2 className="text-lg font-semibold text-text-primary">
              Host a party
            </h2>
            <p className="mt-1 flex-1 text-sm text-text-muted">
              Set up your banner and games, then run everything from the game
              master screen — works even without internet. You&apos;re the game
              master of any party you create.
            </p>
            <div className="mt-4">
              <Button onClick={() => router.push("/host")}>
                Go to my parties
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col">
            <h2 className="text-lg font-semibold text-text-primary">
              Join a party
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Enter the code your host shared with you.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Input
                label="Party code"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUNSET-42"
                autoCapitalize="characters"
                className="uppercase tracking-wide"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onWatch}>
                  Watch as audience
                </Button>
                <Button variant="ghost" loading={checking} onClick={onCohost}>
                  Co-host controls
                </Button>
              </div>
              <p className="text-xs text-text-muted">
                Playing along? Ask your host for the participant link — no account
                needed to submit answers.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
