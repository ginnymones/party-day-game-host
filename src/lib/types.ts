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

export interface FeudQuestion {
  id: string;
  question: string;
  answers: FeudAnswer[];
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
  | { type: "feud"; questions: FeudQuestion[]; currentIndex: number }
  | { type: "jeopardy"; categories: JeopardyCategory[] };

/** Legacy single-question Feud shape, migrated on read (see store.ts). */
export interface LegacyFeudData {
  type: "feud";
  question?: string;
  answers?: FeudAnswer[];
}

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

/** Display font personality for a party's on-screen text. */
export type FontThemeId =
  | "system"
  | "playful"
  | "bold"
  | "elegant"
  | "handwritten";

export interface Party {
  id: string;
  /** Short human-friendly join code, e.g. "SUNSET-42". */
  code: string;
  name: string;
  /** Compressed data URL of the banner image, kept small for offline storage. */
  bannerImage: string | null;
  bannerAlt: string;
  /** How the banner image is shown. Defaults to "framed". */
  bannerFit?: "framed" | "fullscreen";
  colorScheme: ColorSchemeId;
  /** Display font personality for on-screen text. Defaults to "system". */
  fontTheme?: FontThemeId;
  theme: "light" | "dark";
  /** What the audience currently sees. */
  mode: PartyMode;
  /** Which game is on screen when mode === "game". */
  activeGameId: string | null;
  ownerId: string;
  /**
   * Usernames granted live-control co-hosting for this party. Co-hosts can drive
   * the running session but cannot edit the party or its games. Managed by the
   * owner; enforced on the owner's device (see master screen).
   */
  cohostUsernames: string[];
  /**
   * Scoreboard for teams/players. Only shown to the game master and co-hosts,
   * never to the audience or participants.
   */
  scores?: ScoreEntry[];
  createdAt: number;
  updatedAt: number;
}

/** A team or player on the scoreboard. Only game masters/co-hosts see this. */
export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
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
  /** All games for the party — sent so co-hosts can switch between them. */
  games?: Game[];
}

/**
 * A control action sent by a co-host to the owner's device over the live
 * channel. `from` is the co-host's username, checked against the party's
 * allowlist before the owner applies it.
 */
export type ControlCommand =
  | { kind: "party"; from: string; patch: Partial<Party> }
  | { kind: "game"; from: string; gameId: string; data: GameData };
