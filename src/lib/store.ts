import { db } from "./db";
import { newId } from "./crypto";
import {
  pushGame,
  pushParty,
  tombstoneGames,
  tombstoneParty,
} from "./cloud";
import type {
  Game,
  GameData,
  GameType,
  Party,
  ColorSchemeId,
} from "./types";

/** Words used to build friendly, readable join codes like "SUNSET-42". */
const CODE_WORDS = [
  "SUNSET",
  "CONFETTI",
  "FIESTA",
  "JUBILEE",
  "GALA",
  "SOIREE",
  "CARNIVAL",
  "SPARKLE",
  "HOORAY",
  "MERRY",
];

export function generateCode(): string {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const num = Math.floor(10 + Math.random() * 89);
  return `${word}-${num}`;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const code = generateCode();
    const clash = await db.parties.where("code").equals(code).first();
    if (!clash) return code;
  }
  // Extremely unlikely fallback.
  return `PARTY-${Math.floor(1000 + Math.random() * 8999)}`;
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

export async function createParty(input: {
  name: string;
  ownerId: string;
  bannerImage?: string | null;
  bannerAlt?: string;
  colorScheme?: ColorSchemeId;
  theme?: "light" | "dark";
}): Promise<Party> {
  const now = Date.now();
  const party: Party = {
    id: newId(),
    code: await uniqueCode(),
    name: input.name.trim() || "Untitled Party",
    bannerImage: input.bannerImage ?? null,
    bannerAlt: input.bannerAlt?.trim() || `${input.name} banner`,
    colorScheme: input.colorScheme ?? "primary",
    theme: input.theme ?? "light",
    mode: "banner",
    activeGameId: null,
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
  };
  await db.parties.add(party);
  pushParty(party);
  return party;
}

export async function getParty(id: string): Promise<Party | undefined> {
  return db.parties.get(id);
}

export async function getPartyByCode(code: string): Promise<Party | undefined> {
  return db.parties.where("code").equals(code.trim().toUpperCase()).first();
}

export async function listPartiesByOwner(ownerId: string): Promise<Party[]> {
  const rows = await db.parties.where("ownerId").equals(ownerId).toArray();
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateParty(
  id: string,
  patch: Partial<Party>
): Promise<void> {
  await db.parties.update(id, { ...patch, updatedAt: Date.now() });
  const updated = await db.parties.get(id);
  if (updated) pushParty(updated);
}

export async function deleteParty(id: string): Promise<void> {
  const gameIds = (await db.games.where("partyId").equals(id).primaryKeys()) as string[];
  await db.transaction("rw", db.parties, db.games, db.answers, async () => {
    await db.games.where("partyId").equals(id).delete();
    await db.answers.where("partyId").equals(id).delete();
    await db.parties.delete(id);
  });
  tombstoneGames(gameIds);
  tombstoneParty(id);
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

/** Starter content so a new game is never empty (per UX: no placeholder text). */
export function defaultGameData(type: GameType): GameData {
  switch (type) {
    case "bringme":
      return {
        type: "bringme",
        currentIndex: 0,
        challenges: [
          { id: newId(), text: "Bring me a pair of matching socks", done: false },
          { id: newId(), text: "Bring me something older than you", done: false },
          { id: newId(), text: "Bring me a phone with over 90% battery", done: false },
        ],
      };
    case "feud":
      return {
        type: "feud",
        question: "Name something people always forget to pack for a trip",
        answers: [
          { id: newId(), text: "Toothbrush", points: 32, revealed: false },
          { id: newId(), text: "Phone charger", points: 27, revealed: false },
          { id: newId(), text: "Underwear", points: 18, revealed: false },
          { id: newId(), text: "Sunscreen", points: 13, revealed: false },
          { id: newId(), text: "Passport", points: 10, revealed: false },
        ],
      };
    case "jeopardy":
      return {
        type: "jeopardy",
        categories: [
          {
            id: newId(),
            name: "Party Foods",
            clues: [
              { id: newId(), points: 100, clue: "This dip is made from mashed avocados", answer: "What is guacamole?", revealed: false },
              { id: newId(), points: 200, clue: "Round Italian dish topped with cheese", answer: "What is pizza?", revealed: false },
              { id: newId(), points: 300, clue: "Skewered grilled meat and veggies", answer: "What are kebabs?", revealed: false },
            ],
          },
          {
            id: newId(),
            name: "Famous Birthdays",
            clues: [
              { id: newId(), points: 100, clue: "Sang 'Happy Birthday' to a president in 1962", answer: "Who is Marilyn Monroe?", revealed: false },
              { id: newId(), points: 200, clue: "This day marks a country's founding", answer: "What is a national day?", revealed: false },
              { id: newId(), points: 300, clue: "The number of candles on a golden birthday", answer: "What is your age matching the date?", revealed: false },
            ],
          },
        ],
      };
  }
}

export function defaultGameTitle(type: GameType): string {
  return type === "bringme"
    ? "Bring Me"
    : type === "feud"
    ? "Family Feud"
    : "Jeopardy";
}

export async function addGame(
  partyId: string,
  type: GameType,
  title?: string
): Promise<Game> {
  const count = await db.games.where("partyId").equals(partyId).count();
  const game: Game = {
    id: newId(),
    partyId,
    type,
    title: title?.trim() || defaultGameTitle(type),
    order: count,
    data: defaultGameData(type),
    updatedAt: Date.now(),
  };
  await db.games.add(game);
  pushGame(game);
  return game;
}

export async function getGame(id: string): Promise<Game | undefined> {
  return db.games.get(id);
}

export async function listGames(partyId: string): Promise<Game[]> {
  const rows = await db.games.where("partyId").equals(partyId).toArray();
  return rows.sort((a, b) => a.order - b.order);
}

export async function saveGame(game: Game): Promise<void> {
  const saved = { ...game, updatedAt: Date.now() };
  await db.games.put(saved);
  pushGame(saved);
}

export async function updateGame(
  id: string,
  patch: Partial<Game>
): Promise<void> {
  await db.games.update(id, { ...patch, updatedAt: Date.now() });
  const updated = await db.games.get(id);
  if (updated) pushGame(updated);
}

export async function deleteGame(id: string): Promise<void> {
  await db.games.delete(id);
  tombstoneGames([id]);
}
