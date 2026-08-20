"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useRequireAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { ColorSchemePicker } from "@/components/ColorSchemePicker";
import { FontThemePicker } from "@/components/FontThemePicker";
import { BannerUploader } from "@/components/BannerUploader";
import { useToast } from "@/components/Toast";
import {
  addCohost,
  addGame,
  deleteGame,
  deleteParty,
  defaultGameTitle,
  getParty,
  listGames,
  removeCohost,
  updateParty,
} from "@/lib/store";
import type { ColorSchemeId, GameType } from "@/lib/types";

const GAME_TYPES: { type: GameType; label: string; blurb: string }[] = [
  { type: "bringme", label: "Bring Me", blurb: "Show a challenge on screen." },
  { type: "feud", label: "Family Feud", blurb: "Ranked answers, revealed on tap." },
  { type: "jeopardy", label: "Jeopardy", blurb: "Categories with point-value clues." },
];

export default function PartySetupPage() {
  const { session, loading, authorized } = useRequireAuth();
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

  // Local editable copy of party name for a snappy input experience.
  const [name, setName] = useState("");
  const [bannerAlt, setBannerAlt] = useState("");
  const [cohostInput, setCohostInput] = useState("");
  useEffect(() => {
    if (party) {
      setName(party.name);
      setBannerAlt(party.bannerAlt);
    }
  }, [party?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <AppHeader title="Party setup" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <Spinner className="h-6 w-6" />
        </main>
      </div>
    );
  }

  if (party === null || (session && party && party.ownerId !== session.ownerKey)) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Party setup" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <Card className="text-center text-text-muted">
            This party could not be found, or you don&apos;t have access to it.
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

  const saveName = async () => {
    await updateParty(partyId, { name: name.trim() || "Untitled Party", bannerAlt: bannerAlt.trim() });
    toast("Saved", "success");
  };

  const onAddGame = async (type: GameType) => {
    const g = await addGame(partyId, type);
    toast(`Added ${defaultGameTitle(type)}`, "success");
    router.push(`/host/${partyId}/game/${g.id}`);
  };

  const onDeleteGame = async (gameId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    await deleteGame(gameId);
    // If it was the active game, clear it.
    if (party.activeGameId === gameId) {
      await updateParty(partyId, { activeGameId: null, mode: "banner" });
    }
    toast("Game deleted", "info");
  };

  const onDeleteParty = async () => {
    if (!confirm(`Delete "${party.name}" and all its games? This can't be undone.`))
      return;
    await deleteParty(partyId);
    toast("Party deleted", "info");
    router.replace("/host");
  };

  const copyLink = async (path: string, label: string) => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(`${label} link copied`, "success");
    } catch {
      // Clipboard can be blocked (e.g. non-secure context); show the URL instead.
      toast(url, "info");
    }
  };

  const onAddCohost = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = cohostInput.trim().toLowerCase();
    if (!uname) return;
    if ((party.cohostUsernames ?? []).includes(uname)) {
      toast("That co-host is already added.", "info");
      return;
    }
    await addCohost(partyId, uname);
    setCohostInput("");
    toast(`Added @${uname} as a co-host`, "success");
  };

  const shareCode = party.code;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title={party.name} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* Launch bar */}
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-text-muted">Join code</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-semibold text-text-primary">
                {shareCode}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(shareCode);
                  toast("Code copied", "success");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/master/${partyId}`)}>
              Run party
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/audience/${shareCode}`, "_blank")}
            >
              Open audience view
            </Button>
            <Button
              variant="secondary"
              onClick={() => copyLink(`/play/${shareCode}`, "Participant")}
            >
              Copy participant link
            </Button>
          </div>
        </Card>

        {/* Party details */}
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-text-primary">Party details</h2>
          <Input
            label="Party name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
          />
          <BannerUploader
            value={party.bannerImage}
            onChange={(dataUrl) => updateParty(partyId, { bannerImage: dataUrl })}
          />
          <Input
            label="Banner description (for screen readers)"
            value={bannerAlt}
            onChange={(e) => setBannerAlt(e.target.value)}
            onBlur={saveName}
            hint="Describe the banner image so audience members using assistive tech know what's shown."
          />
          <ColorSchemePicker
            value={party.colorScheme}
            onChange={(id: ColorSchemeId) => updateParty(partyId, { colorScheme: id })}
          />
          <FontThemePicker
            value={party.fontTheme ?? "system"}
            onChange={(id) => updateParty(partyId, { fontTheme: id })}
          />
          <div>
            <span className="mb-2 block text-sm font-medium text-text-primary">
              Stage theme
            </span>
            <div className="inline-flex overflow-hidden rounded-xl border border-card-border">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateParty(partyId, { theme: t })}
                  aria-pressed={party.theme === t}
                  className={
                    "px-4 py-2 text-sm font-medium capitalize cursor-pointer " +
                    (party.theme === t
                      ? "bg-button text-button-foreground"
                      : "bg-card text-text-primary hover:bg-background")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Games */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Games</h2>
            <span className="text-sm text-text-muted">
              {games?.length ?? 0} added
            </span>
          </div>

          {games === undefined ? (
            <Spinner className="h-5 w-5" />
          ) : games.length === 0 ? (
            <p className="text-sm text-text-muted">
              No games yet. Add one below to start building.
            </p>
          ) : (
            <ul className="divide-y divide-card-border">
              {games.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{g.title}</p>
                    <p className="text-xs text-text-muted">
                      {defaultGameTitle(g.type)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/host/${partyId}/game/${g.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteGame(g.id, g.title)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">Add a game</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {GAME_TYPES.map((gt) => (
                <button
                  key={gt.type}
                  type="button"
                  onClick={() => onAddGame(gt.type)}
                  className="rounded-xl border border-card-border bg-card p-3 text-left cursor-pointer hover:border-button hover:bg-background"
                >
                  <span className="block font-medium text-text-primary">
                    {gt.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {gt.blurb}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Co-hosts */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Co-hosts</h2>
            <p className="mt-1 text-sm text-text-muted">
              Co-hosts can help run the live session — switch the banner/game and
              reveal cards — but can&apos;t edit your games. They need their own
              account, and control works while you have this party running.
            </p>
          </div>

          <form onSubmit={onAddCohost} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Add co-host by username"
                value={cohostInput}
                autoCapitalize="none"
                onChange={(e) => setCohostInput(e.target.value)}
                placeholder="e.g. jordan"
              />
            </div>
            <Button type="submit" variant="secondary">
              Add co-host
            </Button>
          </form>

          {(party.cohostUsernames ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">No co-hosts yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {(party.cohostUsernames ?? []).map((u) => (
                <li
                  key={u}
                  className="inline-flex items-center gap-2 rounded-full border border-card-border bg-background px-3 py-1 text-sm"
                >
                  <span className="text-text-primary">@{u}</span>
                  <button
                    type="button"
                    onClick={() => removeCohost(partyId, u)}
                    aria-label={`Remove co-host ${u}`}
                    className="text-text-muted hover:text-danger cursor-pointer"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyLink(`/cohost/${shareCode}`, "Co-host")}
            >
              Copy co-host link
            </Button>
            <span className="text-xs text-text-muted">
              Send this to a co-host. They sign into their own account, open the
              link, and can help run the live party.
            </span>
          </div>
        </Card>

        {/* Danger zone */}
        <Card>
          <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
          <p className="mt-1 text-sm text-text-muted">
            Deleting a party removes its games and any collected answers.
          </p>
          <div className="mt-3">
            <Button variant="danger" size="sm" onClick={onDeleteParty}>
              Delete party
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
