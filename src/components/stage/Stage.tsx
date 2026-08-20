"use client";

import { schemeStyle } from "@/lib/colorSchemes";
import { displayFontFamily } from "@/lib/fontThemes";
import { cn } from "@/lib/cn";
import type { Game, GameData, Party } from "@/lib/types";

/**
 * The Stage is what fills the screen for the audience and previews for the game
 * master. It applies the party's chosen color scheme via scoped CSS variables
 * (independent of the app's light/dark toggle) and renders either the banner or
 * the active game.
 *
 * When `interactive` is true (game master), clicking answer cards reveals them
 * and calls `onReveal` with the updated game data.
 */
export function Stage({
  party,
  game,
  interactive = false,
  onReveal,
  className,
}: {
  party: Party;
  game: Game | null;
  interactive?: boolean;
  onReveal?: (next: GameData) => void;
  className?: string;
}) {
  const displayFont = displayFontFamily(party.fontTheme);
  return (
    <div
      style={schemeStyle(party.colorScheme)}
      className={cn(
        "relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden p-6 sm:p-10",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(160deg, rgb(var(--stage-from)) 0%, rgb(var(--stage-to)) 100%)",
        }}
      />
      <div className="w-full max-w-5xl" style={{ color: "rgb(var(--stage-ink))" }}>
        {party.mode === "banner" || !game ? (
          <BannerStage party={party} displayFont={displayFont} />
        ) : (
          <GameStage
            game={game}
            interactive={interactive}
            onReveal={onReveal}
            displayFont={displayFont}
          />
        )}
      </div>
    </div>
  );
}

function BannerStage({
  party,
  displayFont,
}: {
  party: Party;
  displayFont?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center animate-fade-in">
      {party.bannerImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={party.bannerImage}
            alt={party.bannerAlt || `${party.name} banner`}
            className="max-h-[70vh] w-auto rounded-2xl object-contain shadow-card"
          />
          <h1 className="text-2xl font-semibold sm:text-4xl" style={{ fontFamily: displayFont }}>
            {party.name}
          </h1>
        </>
      ) : (
        <div className="py-16">
          <p className="text-lg opacity-70">Welcome to</p>
          <h1
            className="mt-2 text-4xl font-bold sm:text-6xl"
            style={{ fontFamily: displayFont }}
          >
            {party.name}
          </h1>
          <p className="mt-6 text-base opacity-70">
            The party will begin shortly.
          </p>
        </div>
      )}
    </div>
  );
}

function GameStage({
  game,
  interactive,
  onReveal,
  displayFont,
}: {
  game: Game;
  interactive: boolean;
  onReveal?: (next: GameData) => void;
  displayFont?: string;
}) {
  const { data } = game;
  if (data.type === "bringme")
    return <BringMeStage data={data} displayFont={displayFont} />;
  if (data.type === "feud")
    return (
      <FeudStage
        data={data}
        interactive={interactive}
        onReveal={onReveal}
        displayFont={displayFont}
      />
    );
  return (
    <JeopardyStage
      data={data}
      interactive={interactive}
      onReveal={onReveal}
      displayFont={displayFont}
    />
  );
}

// ---------------------------------------------------------------------------
// Bring Me — display only
// ---------------------------------------------------------------------------

function BringMeStage({
  data,
  displayFont,
}: {
  data: Extract<GameData, { type: "bringme" }>;
  displayFont?: string;
}) {
  const current = data.challenges[data.currentIndex];
  return (
    <div className="text-center animate-fade-in">
      <p className="text-lg font-medium uppercase tracking-widest opacity-70">
        Bring me…
      </p>
      <p
        className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl text-balance"
        style={{ fontFamily: displayFont }}
      >
        {current ? current.text : "No challenges yet"}
      </p>
      {data.challenges.length > 1 && (
        <p className="mt-8 text-sm opacity-60">
          {data.currentIndex + 1} of {data.challenges.length}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Family Feud — click to reveal ranked answers
// ---------------------------------------------------------------------------

function FeudStage({
  data,
  interactive,
  onReveal,
  displayFont,
}: {
  data: Extract<GameData, { type: "feud" }>;
  interactive: boolean;
  onReveal?: (next: GameData) => void;
  displayFont?: string;
}) {
  const index = Math.min(data.currentIndex, Math.max(data.questions.length - 1, 0));
  const current = data.questions[index];

  const toggle = (id: string) => {
    if (!interactive || !onReveal || !current) return;
    onReveal({
      ...data,
      questions: data.questions.map((q) =>
        q.id === current.id
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === id ? { ...a, revealed: !a.revealed } : a
              ),
            }
          : q
      ),
    });
  };

  if (!current) {
    return (
      <p className="text-center text-2xl font-semibold">No questions yet</p>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2
        className="mb-8 text-center text-2xl font-semibold sm:text-4xl text-balance"
        style={{ fontFamily: displayFont }}
      >
        {current.question}
      </h2>
      <ul className="mx-auto grid max-w-3xl gap-3">
        {current.answers.map((a, i) => {
          const cardClass = cn(
            "flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left text-xl font-semibold sm:text-2xl",
            "border-2 transition-all",
            interactive && "cursor-pointer",
            a.revealed
              ? "animate-flip-in border-transparent bg-[rgb(var(--button))] text-white"
              : "border-[rgb(var(--button))]/40 bg-white/60 text-[rgb(var(--stage-ink))]"
          );
          const inner = (
            <>
              <span className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/10 text-base">
                  {i + 1}
                </span>
                <span>{a.revealed ? a.text : "• • •"}</span>
              </span>
              <span className="tabular-nums">{a.revealed ? a.points : ""}</span>
            </>
          );
          return (
            <li key={a.id}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-pressed={a.revealed}
                  className={cardClass}
                >
                  {inner}
                </button>
              ) : (
                <div className={cardClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {data.questions.length > 1 && (
        <p className="mt-8 text-center text-sm opacity-60">
          Question {index + 1} of {data.questions.length}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jeopardy — grid of point-value cards that open to reveal clue + answer
// ---------------------------------------------------------------------------

function JeopardyStage({
  data,
  interactive,
  onReveal,
  displayFont,
}: {
  data: Extract<GameData, { type: "jeopardy" }>;
  interactive: boolean;
  onReveal?: (next: GameData) => void;
  displayFont?: string;
}) {
  const toggle = (categoryId: string, clueId: string) => {
    if (!interactive || !onReveal) return;
    onReveal({
      ...data,
      categories: data.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              clues: c.clues.map((q) =>
                q.id === clueId ? { ...q, revealed: !q.revealed } : q
              ),
            }
          : c
      ),
    });
  };

  return (
    <div
      className="grid animate-fade-in gap-3"
      style={{
        gridTemplateColumns: `repeat(${Math.max(
          1,
          data.categories.length
        )}, minmax(0, 1fr))`,
      }}
    >
      {data.categories.map((cat) => (
        <div key={cat.id} className="flex flex-col gap-3">
          <div
            className="rounded-xl bg-[rgb(var(--button))] px-3 py-3 text-center text-sm font-bold uppercase tracking-wide text-white sm:text-base"
            style={{ fontFamily: displayFont }}
          >
            {cat.name || "Category"}
          </div>
          {cat.clues.map((clue) => {
            const cardClass = cn(
              "min-h-[92px] w-full rounded-xl border-2 p-3 text-center transition-all",
              interactive && "cursor-pointer",
              clue.revealed
                ? "animate-flip-in border-transparent bg-white/70 text-[rgb(var(--stage-ink))]"
                : "grid place-items-center border-[rgb(var(--button))]/40 bg-white/40 text-[rgb(var(--button))]"
            );
            const inner = clue.revealed ? (
              <div className="space-y-1.5">
                <p className="text-sm font-medium sm:text-base">{clue.clue}</p>
                <p className="text-sm font-bold opacity-80">{clue.answer}</p>
              </div>
            ) : (
              <span className="text-2xl font-extrabold tabular-nums sm:text-3xl">
                {clue.points}
              </span>
            );
            return interactive ? (
              <button
                key={clue.id}
                type="button"
                onClick={() => toggle(cat.id, clue.id)}
                className={cardClass}
              >
                {inner}
              </button>
            ) : (
              <div key={clue.id} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
