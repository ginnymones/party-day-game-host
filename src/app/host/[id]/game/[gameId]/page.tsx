"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Spinner, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getGame, saveGame, defaultGameTitle } from "@/lib/store";
import { newId } from "@/lib/crypto";
import type { Game, GameData } from "@/lib/types";

export default function GameEditorPage() {
  const { loading, authorized } = useRequireAuth();
  const params = useParams<{ id: string; gameId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [data, setData] = useState<GameData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const g = await getGame(params.gameId);
      if (!active) return;
      setGame(g ?? null);
      if (g) {
        setTitle(g.title);
        setData(g.data);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.gameId]);

  if (loading || !authorized) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Spinner className="h-6 w-6" />
      </main>
    );
  }

  if (game === undefined) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Edit game" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <Spinner className="h-6 w-6" />
        </main>
      </div>
    );
  }

  if (game === null || !data) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Edit game" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <Card className="text-center text-text-muted">
            Game not found.
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.push(`/host/${params.id}`)}>
                Back to party
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const onSave = async () => {
    setSaving(true);
    await saveGame({ ...game, title: title.trim() || defaultGameTitle(game.type), data });
    setSaving(false);
    toast("Game saved", "success");
    router.push(`/host/${params.id}`);
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Edit game" />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-medium text-accent">
              {defaultGameTitle(game.type)}
            </span>
          </div>
          <Input
            label="Game title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Card>

        {data.type === "bringme" && (
          <BringMeEditor data={data} onChange={setData} />
        )}
        {data.type === "feud" && <FeudEditor data={data} onChange={setData} />}
        {data.type === "jeopardy" && (
          <JeopardyEditor data={data} onChange={setData} />
        )}

        <div className="sticky bottom-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push(`/host/${params.id}`)}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={saving}>
            Save game
          </Button>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bring Me editor
// ---------------------------------------------------------------------------

function BringMeEditor({
  data,
  onChange,
}: {
  data: Extract<GameData, { type: "bringme" }>;
  onChange: (d: GameData) => void;
}) {
  const update = (challenges: typeof data.challenges) =>
    onChange({ ...data, challenges });

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Challenges</h2>
        <p className="text-sm text-text-muted">
          Each challenge is shown full-screen, one at a time.
        </p>
      </div>
      <ul className="space-y-2">
        {data.challenges.map((c, i) => (
          <li key={c.id} className="flex items-start gap-2">
            <span className="mt-3 w-6 text-right text-sm text-text-muted">
              {i + 1}.
            </span>
            <div className="flex-1">
              <Input
                aria-label={`Challenge ${i + 1}`}
                value={c.text}
                onChange={(e) =>
                  update(
                    data.challenges.map((x) =>
                      x.id === c.id ? { ...x, text: e.target.value } : x
                    )
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-0.5"
              onClick={() => update(data.challenges.filter((x) => x.id !== c.id))}
              aria-label={`Remove challenge ${i + 1}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          update([...data.challenges, { id: newId(), text: "", done: false }])
        }
      >
        + Add challenge
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Family Feud editor
// ---------------------------------------------------------------------------

function FeudEditor({
  data,
  onChange,
}: {
  data: Extract<GameData, { type: "feud" }>;
  onChange: (d: GameData) => void;
}) {
  const updateAnswers = (answers: typeof data.answers) =>
    onChange({ ...data, answers });

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Question &amp; answers</h2>
        <p className="text-sm text-text-muted">
          List answers with their point values. Tap a card during play to reveal it.
        </p>
      </div>
      <Textarea
        label="Question"
        value={data.question}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
      />
      <ul className="space-y-2">
        {data.answers.map((a, i) => (
          <li key={a.id} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                aria-label={`Answer ${i + 1} text`}
                value={a.text}
                placeholder="Answer"
                onChange={(e) =>
                  updateAnswers(
                    data.answers.map((x) =>
                      x.id === a.id ? { ...x, text: e.target.value } : x
                    )
                  )
                }
              />
            </div>
            <div className="w-24">
              <Input
                aria-label={`Answer ${i + 1} points`}
                type="number"
                min={0}
                value={a.points}
                onChange={(e) =>
                  updateAnswers(
                    data.answers.map((x) =>
                      x.id === a.id
                        ? { ...x, points: Number(e.target.value) || 0 }
                        : x
                    )
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-0.5"
              onClick={() => updateAnswers(data.answers.filter((x) => x.id !== a.id))}
              aria-label={`Remove answer ${i + 1}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          updateAnswers([
            ...data.answers,
            { id: newId(), text: "", points: 0, revealed: false },
          ])
        }
      >
        + Add answer
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Jeopardy editor
// ---------------------------------------------------------------------------

function JeopardyEditor({
  data,
  onChange,
}: {
  data: Extract<GameData, { type: "jeopardy" }>;
  onChange: (d: GameData) => void;
}) {
  const updateCategories = (categories: typeof data.categories) =>
    onChange({ ...data, categories });

  return (
    <div className="space-y-4">
      {data.categories.map((cat, ci) => (
        <Card key={cat.id} className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={`Category ${ci + 1}`}
                value={cat.name}
                onChange={(e) =>
                  updateCategories(
                    data.categories.map((c) =>
                      c.id === cat.id ? { ...c, name: e.target.value } : c
                    )
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateCategories(data.categories.filter((c) => c.id !== cat.id))
              }
            >
              Remove category
            </Button>
          </div>

          <ul className="space-y-3">
            {cat.clues.map((clue, qi) => (
              <li key={clue.id} className="rounded-xl border border-card-border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="w-24">
                    <Input
                      aria-label={`Points for clue ${qi + 1}`}
                      type="number"
                      min={0}
                      value={clue.points}
                      onChange={(e) =>
                        updateCategories(
                          data.categories.map((c) =>
                            c.id === cat.id
                              ? {
                                  ...c,
                                  clues: c.clues.map((q) =>
                                    q.id === clue.id
                                      ? { ...q, points: Number(e.target.value) || 0 }
                                      : q
                                  ),
                                }
                              : c
                          )
                        )
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() =>
                      updateCategories(
                        data.categories.map((c) =>
                          c.id === cat.id
                            ? { ...c, clues: c.clues.filter((q) => q.id !== clue.id) }
                            : c
                        )
                      )
                    }
                  >
                    Remove clue
                  </Button>
                </div>
                <div className="space-y-2">
                  <Textarea
                    label="Clue"
                    value={clue.clue}
                    onChange={(e) =>
                      updateCategories(
                        data.categories.map((c) =>
                          c.id === cat.id
                            ? {
                                ...c,
                                clues: c.clues.map((q) =>
                                  q.id === clue.id ? { ...q, clue: e.target.value } : q
                                ),
                              }
                            : c
                        )
                      )
                    }
                  />
                  <Input
                    label="Answer"
                    value={clue.answer}
                    onChange={(e) =>
                      updateCategories(
                        data.categories.map((c) =>
                          c.id === cat.id
                            ? {
                                ...c,
                                clues: c.clues.map((q) =>
                                  q.id === clue.id ? { ...q, answer: e.target.value } : q
                                ),
                              }
                            : c
                        )
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              updateCategories(
                data.categories.map((c) =>
                  c.id === cat.id
                    ? {
                        ...c,
                        clues: [
                          ...c.clues,
                          {
                            id: newId(),
                            points: (c.clues.at(-1)?.points ?? 0) + 100,
                            clue: "",
                            answer: "",
                            revealed: false,
                          },
                        ],
                      }
                    : c
                )
              )
            }
          >
            + Add clue
          </Button>
        </Card>
      ))}

      <Button
        variant="secondary"
        onClick={() =>
          updateCategories([
            ...data.categories,
            { id: newId(), name: "", clues: [] },
          ])
        }
      >
        + Add category
      </Button>
    </div>
  );
}
