"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Spinner } from "@/components/ui";
import { Stage } from "@/components/stage/Stage";
import { Scoreboard } from "@/components/Scoreboard";
import { openCohostChannel } from "@/lib/sync";
import { isCloudConfigured } from "@/lib/cloud";
import type { ControlCommand, GameData, LiveState } from "@/lib/types";

/**
 * Co-host live control. A logged-in user drives the running session (banner/game
 * toggle, active game, reveals) by sending control commands to the owner's
 * device over the live channel. The owner's device is the source of truth and
 * only applies commands from usernames on its co-host allowlist. Requires the
 * owner to be running the party and cloud sync to be configured.
 */
export default function CohostPage() {
  const { session, loading, authorized } = useRequireAuth();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "").toUpperCase();

  const [state, setState] = useState<LiveState | null>(null);
  const sendRef = useRef<((c: ControlCommand) => void) | null>(null);

  useEffect(() => {
    if (!code || !isCloudConfigured()) return;
    const handle = openCohostChannel(code, (s) => setState(s));
    if (handle) sendRef.current = handle.send;
    return () => {
      handle?.close();
      sendRef.current = null;
    };
  }, [code]);

  const isAllowed = useMemo(() => {
    if (!state || !session) return false;
    return (state.party.cohostUsernames ?? []).includes(session.username);
  }, [state, session]);

  if (loading || !authorized || !session) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  const send = (cmd: ControlCommand) => sendRef.current?.(cmd);
  const from = session.username;

  const setMode = (mode: "banner" | "game") =>
    send({ kind: "party", from, patch: { mode } });
  const setActiveGame = (gameId: string) =>
    send({ kind: "party", from, patch: { activeGameId: gameId, mode: "game" } });
  const activeGame = state?.activeGame ?? null;

  const onReveal = (next: GameData) => {
    if (activeGame) send({ kind: "game", from, gameId: activeGame.id, data: next });
  };

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

  const gameType = activeGame?.data.type;
  const isBringMe = gameType === "bringme";
  const isFeud = gameType === "feud";
  const isRevealGame = isFeud || gameType === "jeopardy";

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Co-host controls" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {!isCloudConfigured() ? (
          <Card className="text-center text-text-muted">
            Co-hosting needs live sync, which isn&apos;t configured on this
            deployment.
          </Card>
        ) : !state ? (
          <Card className="text-center text-text-muted">
            <Spinner className="mx-auto mb-3 h-6 w-6" />
            Waiting for the host to start party{" "}
            <span className="font-mono">{code}</span>. Keep this open — controls
            appear once the host is live.
          </Card>
        ) : !isAllowed ? (
          <Card className="text-center text-text-muted">
            <p className="text-lg font-semibold text-text-primary">
              You don&apos;t have co-host access yet
            </p>
            <p className="mt-2 text-sm">
              Ask the host to add <span className="font-mono">@{session.username}</span>{" "}
              as a co-host for “{state.party.name}”. You can still watch the{" "}
              <a className="font-medium text-accent hover:underline" href={`/audience/${code}`}>
                audience view
              </a>
              .
            </p>
          </Card>
        ) : (
          <>
            <Card className="mb-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex overflow-hidden rounded-xl border border-card-border">
                  <button
                    type="button"
                    onClick={() => setMode("banner")}
                    aria-pressed={state.party.mode === "banner"}
                    className={modeBtn(state.party.mode === "banner")}
                  >
                    Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("game")}
                    aria-pressed={state.party.mode === "game"}
                    disabled={!state.party.activeGameId}
                    className={modeBtn(state.party.mode === "game")}
                  >
                    Game
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant={state.party.showScores ? "primary" : "secondary"}
                    aria-pressed={!!state.party.showScores}
                    onClick={() =>
                      send({
                        kind: "party",
                        from,
                        patch: { showScores: !state.party.showScores },
                      })
                    }
                  >
                    {state.party.showScores ? "Scores: shown" : "Scores: hidden"}
                  </Button>
                  <span className="text-sm text-text-muted">
                    Co-hosting{" "}
                    <span className="font-medium text-text-primary">
                      {state.party.name}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-text-primary">Active game</p>
                {(state.games ?? []).length === 0 ? (
                  <p className="text-sm text-text-muted">No games in this party.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(state.games ?? []).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveGame(g.id)}
                        aria-pressed={state.party.activeGameId === g.id}
                        className={
                          "rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer " +
                          (state.party.activeGameId === g.id
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

              {state.party.mode === "game" && activeGame && (
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
                      <Button size="sm" variant="secondary" onClick={() => setReveals(false)}>
                        Reset reveals
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReveals(true)}>
                        Reveal all
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="border-b border-card-border bg-background px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                {state.party.mode === "game" && isRevealGame
                  ? "Tap cards to reveal — mirrors the audience screen"
                  : "Live preview — mirrors the audience screen"}
              </div>
              <div className="flex min-h-[420px]">
                <Stage
                  party={state.party}
                  game={activeGame}
                  interactive={state.party.mode === "game" && isRevealGame}
                  onReveal={onReveal}
                  className="flex-1"
                />
              </div>
            </Card>

            <Card className="mt-5">
              <Scoreboard
                scores={state.party.scores ?? []}
                onChange={(s) => send({ kind: "party", from, patch: { scores: s } })}
              />
            </Card>
          </>
        )}
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
