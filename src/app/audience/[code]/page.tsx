"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Stage } from "@/components/stage/Stage";
import { Spinner } from "@/components/ui";
import { getGame, getPartyByCode } from "@/lib/store";
import { ensureSeeded } from "@/lib/db";
import { subscribeToParty } from "@/lib/sync";
import type { LiveState } from "@/lib/types";

/**
 * Public audience view. No login required so it can be opened on a TV or shared
 * device. If this device is the one hosting (same browser storage), it reads
 * live from local IndexedDB and works fully offline. Otherwise it subscribes to
 * the game master's realtime broadcasts.
 */
export default function AudiencePage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "").toUpperCase();

  const [remote, setRemote] = useState<LiveState | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    ensureSeeded().finally(() => setSeeded(true));
  }, []);

  // Local (same-device / offline) source of truth.
  const localParty = useLiveQuery(
    () => (seeded ? getPartyByCode(code) : Promise.resolve(undefined)),
    [code, seeded]
  );
  const localGame = useLiveQuery(
    () =>
      localParty?.activeGameId
        ? getGame(localParty.activeGameId)
        : Promise.resolve(null),
    [localParty?.activeGameId]
  );

  // Remote (cross-device) source via realtime broadcast.
  useEffect(() => {
    if (!code) return;
    const unsub = subscribeToParty(code, (state) => setRemote(state));
    return () => unsub?.();
  }, [code]);

  const state: LiveState | null = localParty
    ? { party: localParty, activeGame: localGame ?? null }
    : remote;

  useEffect(() => {
    document.title = state?.party?.name
      ? `${state.party.name} — Audience`
      : "Audience";
  }, [state?.party?.name]);

  if (localParty === undefined && !remote) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-6 text-center">
        <div className="max-w-sm text-text-muted">
          <p className="text-lg font-semibold text-text-primary">
            Waiting for the host…
          </p>
          <p className="mt-2 text-sm">
            We couldn&apos;t find party <span className="font-mono">{code}</span>{" "}
            on this device yet. Keep this screen open — it will update the moment
            the game master goes live.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <Stage party={state.party} game={state.activeGame} className="min-h-dvh" />
    </main>
  );
}
