"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "./ui";
import { newId } from "@/lib/crypto";
import type { ScoreEntry } from "@/lib/types";

/**
 * Editable scoreboard shown only to the game master and co-hosts. It keeps a
 * local working copy for smooth typing and pushes every change up via onChange
 * (the master persists to the DB; co-hosts send a control command). The local
 * copy re-seeds if the external scores change from elsewhere.
 */
export function Scoreboard({
  scores,
  onChange,
}: {
  scores: ScoreEntry[];
  onChange: (next: ScoreEntry[]) => void;
}) {
  const [list, setList] = useState<ScoreEntry[]>(scores);
  const [newName, setNewName] = useState("");

  const externalSig = JSON.stringify(scores);
  useEffect(() => {
    // Re-seed only when the external value genuinely differs from our copy,
    // so incoming echoes of our own edits don't clobber active typing.
    setList((current) =>
      JSON.stringify(current) === externalSig ? current : scores
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSig]);

  const commit = (next: ScoreEntry[]) => {
    setList(next);
    onChange(next);
  };

  const addEntry = () => {
    const name = newName.trim();
    if (!name) return;
    commit([...list, { id: newId(), name, score: 0 }]);
    setNewName("");
  };

  const rename = (id: string, name: string) =>
    commit(list.map((e) => (e.id === id ? { ...e, name } : e)));

  const setScore = (id: string, score: number) =>
    commit(list.map((e) => (e.id === id ? { ...e, score } : e)));

  const bump = (id: string, delta: number) =>
    commit(
      list.map((e) => (e.id === id ? { ...e, score: e.score + delta } : e))
    );

  const remove = (id: string) => commit(list.filter((e) => e.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Scoreboard
        </h2>
        <span className="text-xs text-text-muted">Only you and co-hosts see this</span>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          Add a team or player to start keeping score.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-xl border border-card-border bg-background p-2"
            >
              <input
                aria-label="Team or player name"
                value={e.name}
                onChange={(ev) => rename(e.id, ev.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-sm text-text-primary focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => bump(e.id, -1)}
                  aria-label={`Decrease ${e.name || "team"} score`}
                  className="grid h-7 w-7 place-items-center rounded-md border border-card-border bg-card text-text-primary cursor-pointer hover:bg-background"
                >
                  −
                </button>
                <input
                  aria-label={`${e.name || "team"} score`}
                  type="number"
                  value={e.score}
                  onChange={(ev) => setScore(e.id, Number(ev.target.value) || 0)}
                  className="w-14 rounded-md border border-card-border bg-card px-1.5 py-1.5 text-center text-sm font-semibold tabular-nums text-text-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => bump(e.id, 1)}
                  aria-label={`Increase ${e.name || "team"} score`}
                  className="grid h-7 w-7 place-items-center rounded-md border border-card-border bg-card text-text-primary cursor-pointer hover:bg-background"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label={`Remove ${e.name || "team"}`}
                className="text-text-muted hover:text-danger cursor-pointer px-1"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          addEntry();
        }}
        className="mt-3 flex gap-2"
      >
        <div className="flex-1">
          <Input
            aria-label="New team or player name"
            value={newName}
            onChange={(ev) => setNewName(ev.target.value)}
            placeholder="Add team or player"
            className="h-10"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary">
          Add
        </Button>
      </form>
    </div>
  );
}
