"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getGame, getPartyByCode } from "@/lib/store";
import { ensureSeeded, db } from "@/lib/db";
import { sendAnswer, subscribeToParty } from "@/lib/sync";
import { newId } from "@/lib/crypto";
import type { AnswerSubmission, LiveState } from "@/lib/types";

export default function PlayPage() {
  const { session } = useAuth();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "").toUpperCase();
  const { toast } = useToast();

  const [remote, setRemote] = useState<LiveState | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    ensureSeeded().finally(() => setSeeded(true));
  }, []);

  useEffect(() => {
    if (session && !name) setName(session.displayName);
  }, [session, name]);

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

  useEffect(() => {
    if (!code) return;
    const unsub = subscribeToParty(code, (state) => setRemote(state));
    return () => unsub?.();
  }, [code]);

  const state: LiveState | null = localParty
    ? { party: localParty, activeGame: localGame ?? null }
    : remote;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      toast("Type an answer first.", "error");
      return;
    }
    if (!name.trim()) {
      toast("Add your name so the host knows who answered.", "error");
      return;
    }
    setSending(true);
    const submission: AnswerSubmission = {
      id: newId(),
      partyId: state?.party.id ?? code,
      gameId: state?.activeGame?.id ?? "",
      participantName: name.trim(),
      text: answer.trim(),
      createdAt: Date.now(),
    };
    // Send live to the host if online; always store locally for same-device hosts.
    sendAnswer(code, submission);
    await db.answers.put(submission).catch(() => {});
    setSending(false);
    setAnswer("");
    toast("Answer sent!", "success");
  };

  const prompt = (() => {
    const g = state?.activeGame;
    if (!g || state?.party.mode !== "game") return null;
    if (g.data.type === "feud")
      return g.data.questions[g.data.currentIndex]?.question ?? null;
    if (g.data.type === "bringme")
      return g.data.challenges[g.data.currentIndex]?.text ?? null;
    return "Jeopardy is in play — answer when the host calls on you.";
  })();

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Play" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Card className="mb-5">
          <p className="text-sm text-text-muted">You&apos;re playing in</p>
          <h1 className="text-xl font-semibold text-text-primary">
            {state?.party.name ?? code}
          </h1>
          <p className="mt-1 font-mono text-sm text-text-muted">{code}</p>
        </Card>

        <Card className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Now on screen
          </h2>
          {prompt ? (
            <p className="mt-2 text-lg font-medium text-text-primary text-balance">
              {prompt}
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-muted">
              Waiting for the host to start a game. Hang tight!
            </p>
          )}
        </Card>

        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
            />
            <Textarea
              label="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here"
            />
            <Button type="submit" size="lg" loading={sending}>
              Send answer
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
