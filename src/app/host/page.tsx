"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { createParty, listPartiesByOwner } from "@/lib/store";

export default function HostPage() {
  const { session, loading, authorized } = useRequireAuth(["gamemaster", "admin"]);
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const parties = useLiveQuery(
    () => (session ? listPartiesByOwner(session.ownerKey) : Promise.resolve([])),
    [session?.ownerKey]
  );

  if (loading || !authorized || !session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Give your party a name first.", "error");
      return;
    }
    setCreating(true);
    const party = await createParty({ name, ownerId: session.ownerKey });
    setCreating(false);
    setName("");
    toast(`Created "${party.name}"`, "success");
    router.push(`/host/${party.id}`);
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="My parties" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Card className="mb-8">
          <h1 className="text-lg font-semibold text-text-primary">
            Create a new party
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Name it now — you&apos;ll add the banner and games next.
          </p>
          <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Party name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maya's 30th Birthday Bash"
              />
            </div>
            <Button type="submit" loading={creating}>
              Create party
            </Button>
          </form>
        </Card>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Your parties
        </h2>

        {parties === undefined ? (
          <div className="grid place-items-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : parties.length === 0 ? (
          <Card className="text-center text-text-muted">
            No parties yet. Create your first one above to get started.
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {parties.map((p) => (
              <li key={p.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-text-primary">
                        {p.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-text-muted">
                        Code <span className="font-mono text-text-primary">{p.code}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-medium text-accent">
                      {p.mode === "banner" ? "Banner" : "Game"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => router.push(`/host/${p.id}`)}>
                      Set up
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/master/${p.id}`)}
                    >
                      Run
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
