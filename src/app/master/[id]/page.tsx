"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Spinner } from "@/components/ui";
import { Stage } from "@/components/stage/Stage";
import { useToast } from "@/components/Toast";
import { getParty, getGame, listGames, updateGame, updateParty } from "@/lib/store";
import { openHostChannel } from "@/lib/sync";
import { db } from "@/lib/db";
import type {
  AnswerSubmission,
  ControlCommand,
  GameData,
  LiveState,
  Party,
} from "@/lib/types";

export default function MasterPage() {
  const { loading, authorized } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const partyId = params.id;
  const router = useRouter();
  const { toast } = useToast();

  // Coalesce to null so we can distinguish "loading" (undefined) from
  // "not found" (null).
  const party = useLiveQuery(
    async () => (await getParty(partyId)) ?? null,
    [partyId]
  );
  const games = useLiveQuery(() => listGames(partyId), [partyId]);
  const activeGame = useLiveQuery(
    () =>
      party?.activeGameId
        ? getGame(party.activeGameId)
        : Promise.resolve(null),
    [party?.activeGameId]
  );

  const [answers, setAnswers] = useState<AnswerSubmission[]>([]);
  const pushRef = useRef<((s: LiveState) => void) | null>(null);

  // Build the current live state to broadcast to viewers (and co-hosts).
  const liveState: LiveState | null = useMemo(() => {
    if (!party) return null;
    return { party, activeGame: activeGame ?? null, games: games ?? [] };
  }, [party, activeGame, games]);

  const getStateRef = useRef<() => LiveState>(() => liveState as LiveState);
  useEffect(() => {
    getStateRef.current = () => liveState as LiveState;
  }, [liveState]);

  // Keep the latest party in a ref so the channel callback can authorize
  // incoming co-host commands against the current allowlist.
  const partyRef = useRef<Party | null>(null);
  useEffect(() => {
    partyRef.current = party ?? null;
  }, [party]);

  // Apply a control command from an authorized co-host to our local DB, which
  // then re-broadcasts the new state to everyone.
  const applyControl = useCallback((cmd: ControlCommand) => {
    const current = partyRef.current;
    if (!current) return;
    const allow = current.cohostUsernames ?? [];
    if (!allow.includes(cmd.from)) return; // not an authorized co-host
    if (cmd.kind === "party") {
      updateParty(current.id, cmd.patch);
    } else if (cmd.kind === "game") {
      updateGame(cmd.gameId, { data: cmd.data });
    }
  }, []);

  // Open the realtime channel once per party code (when sync is configured).
  useEffect(() => {
    if (!party?.code) return;
    const onAnswer = (a: AnswerSubmission) => {
      setAnswers((prev) => [a, ...prev].slice(0, 100));
      db.answers.put(a).catch(() => {});
    };
    const handle = openHostChannel(party.code, {
      onAnswer,
      onControl: applyControl,
      getState: () => getStateRef.current(),
    });
    if (handle) pushRef.current = handle.push;
    return () => {
      handle?.close();
      pushRef.current = null;
    };
  }, [party?.code, applyControl]);

  // Broadcast whenever the live state changes.
  useEffect(() => {
    if (liveState && pushRef.current) pushRef.current(liveState);
  }, [liveState]);

  // Load any previously collected answers for this party.
  useEffect(() => {
    if (!partyId) return;
    db.answers
      .where("partyId")
      .equals(partyId)
      .toArray()
      .then((rows) =>
        setAnswers(rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100))
      )
      .catch(() => {});
  }, [partyId]);

  const onReveal = useCallback(
    (next: GameData) => {
      if (party?.activeGameId) updateGame(party.activeGameId, { data: next });
    },
    [party?.activeGameId]
  );

  if (loading || !authorized) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  if (party === undefined) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Game master" />
        <main className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </main>
      </div>
    );
  }

  if (party === null) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Game master" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <Card className="text-center text-text-muted">
            Party not found.
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.push("/host")}>
                Back to my parties
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const setMode = (mode: "banner" | "game") => updateParty(partyId, { mode });
  const setActiveGame = (gameId: string | null) =>
    updateParty(partyId, { activeGameId: gameId, mode: gameId ? "game" : "banner" });

  // Reveal state applies to the current Feud question / the whole Jeopardy board.
  const setReveals = (revealed: boolean) => {
    if (!activeGame) return;
    const d = activeGame.data;
    if (d.type === "feud") {
      const idx = Math.min(d.currentIndex, Math.max(d.questions.length - 1, 0));
      onReveal({
        ...d,
        questions: d.questions.map((q, i) =>
          i === idx
            ? { ...q, answers: q.answers.map((a) => ({ ...a, revealed })) }
            : q
        ),
      });
    } else if (d.type === "jeopardy") {
      onReveal({
        ...d,
        categories: d.categories.map((c) => ({
          ...c,
          clues: c.clues.map((q) => ({ ...q, revealed })),
        })),
      });
    }
  };

  const resetReveals = () => {
    setReveals(false);
    toast("Reveals reset", "info");
  };
  const revealAll = () => setReveals(true);

  // Step through Bring Me challenges or Feud questions.
  const stepIndex = (dir: 1 | -1) => {
    if (!activeGame) return;
    const d = activeGame.data;
    if (d.type === "bringme") {
      const n = Math.min(
        Math.max(d.currentIndex + dir, 0),
        Math.max(d.challenges.length - 1, 0)
      );
      onReveal({ ...d, currentIndex: n });
    } else if (d.type === "feud") {
      const n = Math.min(
        Math.max(d.currentIndex + dir, 0),
        Math.max(d.questions.length - 1, 0)
      );
      onReveal({ ...d, currentIndex: n });
    }
  };

  const gameType = activeGame?.data.type;
  const isBringMe = gameType === "bringme";
  const isFeud = gameType === "feud";
  const isRevealGame = isFeud || gameType === "jeopardy";

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title={`Run · ${party.name}`} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Top controls */}
        <Card className="mb-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex overflow-hidden rounded-xl border border-card-border">
              <button
                type="button"
                onClick={() => setMode("banner")}
                aria-pressed={party.mode === "banner"}
                className={modeBtn(party.mode === "banner")}
              >
                Banner
              </button>
              <button
                type="button"
                onClick={() => setMode("game")}
                aria-pressed={party.mode === "game"}
                disabled={!party.activeGameId}
                className={modeBtn(party.mode === "game")}
              >
                Game
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Code</span>
              <span className="font-mono font-semibold text-text-primary">
                {party.code}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(`/audience/${party.code}`, "_blank")}
              >
                Audience view
              </Button>
            </div>
          </div>

          {/* Game selector */}
          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">
              Active game
            </p>
            {games === undefined ? (
              <Spinner className="h-5 w-5" />
            ) : games.length === 0 ? (
              <p className="text-sm text-text-muted">
                No games yet.{" "}
                <button
                  className="font-medium text-accent hover:underline"
                  onClick={() => router.push(`/host/${partyId}`)}
                >
                  Add one in setup.
                </button>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {games.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGame(g.id)}
                    aria-pressed={party.activeGameId === g.id}
                    className={
                      "rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer " +
                      (party.activeGameId === g.id
                        ? "border-button bg-button text-button-foreground"
                        : "border-card-border bg-card text-text-primary hover:bg-background")
                    }
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Per-game controls */}
          {party.mode === "game" && activeGame && (
            <div className="flex flex-wrap gap-2 border-t border-card-border pt-3">
              {isBringMe && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => stepIndex(-1)}>
                    ← Previous
                  </Button>
                  <Button size="sm" onClick={() => stepIndex(1)}>
                    Next challenge →
                  </Button>
                </>
              )}
              {isFeud && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => stepIndex(-1)}>
                    ← Previous question
                  </Button>
                  <Button size="sm" onClick={() => stepIndex(1)}>
                    Next question →
                  </Button>
                </>
              )}
              {isRevealGame && (
                <>
                  <Button size="sm" variant="secondary" onClick={resetReveals}>
                    Reset reveals
                  </Button>
                  <Button size="sm" variant="ghost" onClick={revealAll}>
                    Reveal all
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Stage preview / control surface */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-card-border bg-background px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              {party.mode === "game" && isRevealGame
                ? "Tap cards to reveal — this is what the audience sees"
                : "Live preview — this is what the audience sees"}
            </div>
            <div className="flex min-h-[420px]">
              <Stage
                party={party}
                game={activeGame ?? null}
                interactive={party.mode === "game" && isRevealGame}
                onReveal={onReveal}
                className="flex-1"
              />
            </div>
          </Card>

          {/* Answers feed */}
          <Card className="flex max-h-[560px] flex-col">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Participant answers
            </h2>
            {answers.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">
                Answers submitted by participants will appear here in real time.
              </p>
            ) : (
              <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
                {answers.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-card-border bg-background p-2.5"
                  >
                    <p className="text-sm text-text-primary">{a.text}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {a.participantName} ·{" "}
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function modeBtn(active: boolean) {
  return (
    "px-5 py-2 text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 " +
    (active
      ? "bg-button text-button-foreground"
      : "bg-card text-text-primary hover:bg-background")
  );
}
