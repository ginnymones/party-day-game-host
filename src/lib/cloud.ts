import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "./db";
import type { Game, Party } from "./types";

/**
 * Durable cloud persistence so an account's parties and games follow the user
 * across devices. Local IndexedDB stays the source of truth for offline use;
 * this layer mirrors it to Supabase and reconciles on login / reconnect.
 *
 * Access control without a login server: every row carries a secret `owner_key`
 * derived from the user's username + PIN (see crypto.deriveOwnerKey). The client
 * sends it as an `x-owner-key` header and RLS policies only expose rows whose
 * owner_key matches that header (see supabase/schema.sql). The key is
 * unguessable without the PIN, so it scopes each account's data.
 *
 * Conflict handling is last-write-wins on `updated_at`. Deletes are tombstones
 * so they propagate to other devices.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let ownerKey: string | null = null;
let client: SupabaseClient | null = null;

export function isCloudConfigured(): boolean {
  return Boolean(url && anon);
}

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Called on login/logout. Recreates the client so the header updates. */
export function setOwnerKey(key: string | null): void {
  if (key === ownerKey) return;
  ownerKey = key || null;
  client = null;
}

function getClient(): SupabaseClient | null {
  if (!isCloudConfigured() || !ownerKey) return null;
  if (!client) {
    client = createClient(url as string, anon as string, {
      auth: { persistSession: false },
      global: { headers: { "x-owner-key": ownerKey } },
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Status (for a small UI indicator)
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing" | "saved" | "error" | "offline";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
}

let state: SyncState = { status: "idle", lastSyncedAt: null };
const listeners = new Set<(s: SyncState) => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSync(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface PartyRow {
  id: string;
  owner_key: string;
  data: Party;
  updated_at: number;
  deleted: boolean;
}
interface GameRow {
  id: string;
  owner_key: string;
  party_id: string;
  data: Game;
  updated_at: number;
  deleted: boolean;
}

// ---------------------------------------------------------------------------
// Pushes (fire-and-forget; safe to call always)
// ---------------------------------------------------------------------------

export function pushParty(party: Party): void {
  const c = getClient();
  if (!c || !online()) return;
  setState({ status: "syncing" });
  void c
    .from("parties")
    .upsert({
      id: party.id,
      owner_key: ownerKey,
      data: party,
      updated_at: party.updatedAt,
      deleted: false,
    })
    .then(({ error }) =>
      setState(
        error
          ? { status: "error" }
          : { status: "saved", lastSyncedAt: Date.now() }
      )
    );
}

export function pushGame(game: Game): void {
  const c = getClient();
  if (!c || !online()) return;
  setState({ status: "syncing" });
  void c
    .from("games")
    .upsert({
      id: game.id,
      owner_key: ownerKey,
      party_id: game.partyId,
      data: game,
      updated_at: game.updatedAt,
      deleted: false,
    })
    .then(({ error }) =>
      setState(
        error
          ? { status: "error" }
          : { status: "saved", lastSyncedAt: Date.now() }
      )
    );
}

export function tombstoneParty(id: string): void {
  const c = getClient();
  if (!c || !online()) return;
  void c.from("parties").update({ deleted: true, updated_at: Date.now() }).eq("id", id);
}

export function tombstoneGames(ids: string[]): void {
  const c = getClient();
  if (!c || !online() || ids.length === 0) return;
  void c.from("games").update({ deleted: true, updated_at: Date.now() }).in("id", ids);
}

// ---------------------------------------------------------------------------
// Two-way reconcile
// ---------------------------------------------------------------------------

/**
 * Reconcile local IndexedDB with the cloud for the current owner. Pull remote
 * rows and apply any that are newer locally; push any local rows that are newer
 * or missing remotely. Idempotent and safe to call repeatedly.
 */
export async function syncNow(): Promise<void> {
  const c = getClient();
  if (!c) return;
  if (!online()) {
    setState({ status: "offline" });
    return;
  }
  setState({ status: "syncing" });
  try {
    const [{ data: remoteParties, error: pErr }, { data: remoteGames, error: gErr }] =
      await Promise.all([
        c.from("parties").select("*"),
        c.from("games").select("*"),
      ]);
    if (pErr || gErr) throw pErr || gErr;

    await reconcileParties((remoteParties as PartyRow[]) ?? []);
    await reconcileGames((remoteGames as GameRow[]) ?? []);

    setState({ status: "saved", lastSyncedAt: Date.now() });
  } catch {
    setState({ status: "error" });
  }
}

async function reconcileParties(remoteRows: PartyRow[]): Promise<void> {
  const c = getClient();
  if (!c) return;

  const remoteById = new Map(remoteRows.map((r) => [r.id, r]));
  // Only touch parties belonging to this account locally.
  const localOwned = (await db.parties.toArray()).filter(
    (p) => p.ownerId === ownerKey
  );
  const localById = new Map(localOwned.map((p) => [p.id, p]));

  // Remote -> local
  for (const row of remoteRows) {
    const local = localById.get(row.id);
    if (row.deleted) {
      if (local && row.updated_at >= local.updatedAt) {
        await db.parties.delete(row.id);
        await db.games.where("partyId").equals(row.id).delete();
      }
      continue;
    }
    if (!local || row.updated_at > local.updatedAt) {
      await db.parties.put(row.data);
    }
  }

  // Local -> remote (newer or missing remotely)
  for (const local of localOwned) {
    const row = remoteById.get(local.id);
    if (!row || (!row.deleted && local.updatedAt > row.updated_at)) {
      await c.from("parties").upsert({
        id: local.id,
        owner_key: ownerKey,
        data: local,
        updated_at: local.updatedAt,
        deleted: false,
      });
    }
  }
}

async function reconcileGames(remoteRows: GameRow[]): Promise<void> {
  const c = getClient();
  if (!c) return;

  const remoteById = new Map(remoteRows.map((r) => [r.id, r]));
  // Games owned by this account = games whose party is owned locally by us.
  const ownedPartyIds = new Set(
    (await db.parties.toArray())
      .filter((p) => p.ownerId === ownerKey)
      .map((p) => p.id)
  );
  const localOwned = (await db.games.toArray()).filter((g) =>
    ownedPartyIds.has(g.partyId)
  );
  const localById = new Map(localOwned.map((g) => [g.id, g]));

  for (const row of remoteRows) {
    const local = localById.get(row.id);
    if (row.deleted) {
      if (local && row.updated_at >= local.updatedAt) {
        await db.games.delete(row.id);
      }
      continue;
    }
    if (!local || row.updated_at > local.updatedAt) {
      await db.games.put(row.data);
    }
  }

  for (const local of localOwned) {
    const row = remoteById.get(local.id);
    if (!row || (!row.deleted && local.updatedAt > row.updated_at)) {
      await c.from("games").upsert({
        id: local.id,
        owner_key: ownerKey,
        party_id: local.partyId,
        data: local,
        updated_at: local.updatedAt,
        deleted: false,
      });
    }
  }
}
