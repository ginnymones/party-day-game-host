/**
 * Shared domain types for the party game host app.
 * These map 1:1 to the local IndexedDB tables (see lib/db.ts) and to the
 * optional Supabase mirror used for live sync (see lib/sync.ts).
 */

export type Role = "admin" | "gamemaster" | "participant" | "audience";

export interface User {
  id: string;
  username: string;
  /** SHA-256 hash of the PIN + per-user salt. Never store the raw PIN. */
  pinHash: string;
  salt: string;
  displayName: string;
  role: Role;
  createdAt: number;
}

/** The current session, persisted so login survives reloads while offline. */
export interface Session {
  userId: string;
  username: string;
  displayName: string;
  role: Role;
  /**
   * Stable secret key derived from username + PIN. Used as the ownership id for
   * parties (so an account's data is consistent across devices) and as the
   * cloud row-level access secret.
   */
  ownerKey: string;
  issuedAt: number;
}

export type GameType = "bringme" | "feud" | "jeopardy";

export interface FeudAnswer {
  id: string;
  text: string;
  points: number;
  revealed: boolean;
}

export interface BringMeChallenge {
  id: string;
  text: string;
  done: boolean;
}

export interface JeopardyClue {
  id: string;
  points: number;
  clue: string;
  answer: string;
  /** false = card face up (showing points), true = opened (showing clue/answer) */
  revealed: boolean;
}

export interface JeopardyCategory {
  id: string;
  name: string;
  clues: JeopardyClue[];
}

/** Discriminated union of the per-type game payload. */
export type GameData =
  | { type: "bringme"; challenges: BringMeChallenge[]; currentIndex: number }
  | { type: "feud"; question: string; answers: FeudAnswer[] }
  | { type: "jeopardy"; categories: JeopardyCategory[] };

export interface Game {
  id: string;
  partyId: string;
  type: GameType;
  title: string;
  order: number;
  data: GameData;
  updatedAt: number;
}

export type PartyMode = "banner" | "game";

/** Named palettes the game master can switch between for a party. */
export type ColorSchemeId =
  | "primary"
  | "pastel"
  | "autumn"
  | "ocean"
  | "berry"
  | "midnight";

export interface Party {
  id: string;
  /** Short human-friendly join code, e.g. "SUNSET-42". */
  code: string;
  name: string;
  /** Compressed data URL of the banner image, kept small for offline storage. */
  bannerImage: string | null;
  bannerAlt: string;
  colorScheme: ColorSchemeId;
  theme: "light" | "dark";
  /** What the audience currently sees. */
  mode: PartyMode;
  /** Which game is on screen when mode === "game". */
  activeGameId: string | null;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

/** A participant's submitted answer during a live game. */
export interface AnswerSubmission {
  id: string;
  partyId: string;
  gameId: string;
  participantName: string;
  text: string;
  createdAt: number;
}

/** Broadcast payload sent over the realtime channel to drive live views. */
export interface LiveState {
  party: Party;
  activeGame: Game | null;
}
