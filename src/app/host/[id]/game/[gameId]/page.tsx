"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Spinner, Textarea } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getGame, saveGame, defaultGameTitle } from "@/lib/store";
import { newId } from "@/lib/crypto";
import { cn } from "@/lib/cn";
import type { Game, GameData } from "@/lib/types";

/** Return a copy of `arr` with the item at `index` moved one step in `dir`. */
function move<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

/** Accessible up/down buttons for reordering a list item. */
function ReorderControls({
  index,
  count,
  onMove,
  label,
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  label: string;
}) {
  const btn =
    "grid h-6 w-6 place-items-center rounded-md border border-card-border bg-card text-text-primary cursor-pointer hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={`Move ${label} up`}
        className={cn(btn)}
      >
        <span aria-hidden="true">↑</span>
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
        className={cn(btn)}
      >
        <span aria-hidden="true">↓</span>
      </button>
    </div>
  );
}

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
            <ReorderControls
              index={i}
              count={data.challenges.length}
              label={`challenge ${i + 1}`}
              onMove={(dir) => update(move(data.challenges, i, dir))}
            />
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
  const updateQuestions = (questions: typeof data.questions) =>
    onChange({ ...data, questions });

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-text-primary">Questions</h2>
        <p className="text-sm text-text-muted">
          Add as many questions as you like — during play you step through them
          one at a time. Each has ranked answers you reveal by tapping.
        </p>
      </Card>

      {data.questions.map((q, qi) => (
        <Card key={q.id} className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="mt-1 rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-medium text-accent">
              Question {qi + 1}
            </span>
            <div className="flex items-center gap-2">
              <ReorderControls
                index={qi}
                count={data.questions.length}
                label={`question ${qi + 1}`}
                onMove={(dir) => updateQuestions(move(data.questions, qi, dir))}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateQuestions(data.questions.filter((x) => x.id !== q.id))
                }
                aria-label={`Remove question ${qi + 1}`}
              >
                Remove question
              </Button>
            </div>
          </div>

          <Textarea
            label="Question"
            value={q.question}
            onChange={(e) =>
              updateQuestions(
                data.questions.map((x) =>
                  x.id === q.id ? { ...x, question: e.target.value } : x
                )
              )
            }
          />

          <ul className="space-y-2">
            {q.answers.map((a, i) => (
              <li key={a.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    aria-label={`Question ${qi + 1} answer ${i + 1} text`}
                    value={a.text}
                    placeholder="Answer"
                    onChange={(e) =>
                      updateQuestions(
                        data.questions.map((x) =>
                          x.id === q.id
                            ? {
                                ...x,
                                answers: x.answers.map((y) =>
                                  y.id === a.id ? { ...y, text: e.target.value } : y
                                ),
                              }
                            : x
                        )
                      )
                    }
                  />
                </div>
                <div className="w-24">
                  <Input
                    aria-label={`Question ${qi + 1} answer ${i + 1} points`}
                    type="number"
                    min={0}
                    value={a.points}
                    onChange={(e) =>
                      updateQuestions(
                        data.questions.map((x) =>
                          x.id === q.id
                            ? {
                                ...x,
                                answers: x.answers.map((y) =>
                                  y.id === a.id
                                    ? { ...y, points: Number(e.target.value) || 0 }
                                    : y
                                ),
                              }
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
                  onClick={() =>
                    updateQuestions(
                      data.questions.map((x) =>
                        x.id === q.id
                          ? { ...x, answers: x.answers.filter((y) => y.id !== a.id) }
                          : x
                      )
                    )
                  }
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
              updateQuestions(
                data.questions.map((x) =>
                  x.id === q.id
                    ? {
                        ...x,
                        answers: [
                          ...x.answers,
                          { id: newId(), text: "", points: 0, revealed: false },
                        ],
                      }
                    : x
                )
              )
            }
          >
            + Add answer
          </Button>
        </Card>
      ))}

      <Button
        variant="secondary"
        onClick={() =>
          updateQuestions([
            ...data.questions,
            { id: newId(), question: "", answers: [] },
          ])
        }
      >
        + Add question
      </Button>
    </div>
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
            <ReorderControls
              index={ci}
              count={data.categories.length}
              label={`category ${ci + 1}`}
              onMove={(dir) => updateCategories(move(data.categories, ci, dir))}
            />
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
                  <div className="ml-auto flex items-center gap-2">
                    <ReorderControls
                      index={qi}
                      count={cat.clues.length}
                      label={`clue ${qi + 1}`}
                      onMove={(dir) =>
                        updateCategories(
                          data.categories.map((c) =>
                            c.id === cat.id
                              ? { ...c, clues: move(c.clues, qi, dir) }
                              : c
                          )
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
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
