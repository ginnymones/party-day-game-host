import Dexie, { type Table } from "dexie";
import type {
  AnswerSubmission,
  Game,
  Party,
  Session,
  User,
} from "./types";
import { hashPin, newId, randomSalt } from "./crypto";

/**
 * Local-first storage. Everything the app needs to run a party lives here in
 * IndexedDB, so the game master's device works with zero connectivity. The
 * optional Supabase layer (lib/sync.ts) mirrors this for live cross-device
 * updates when online.
 */
class PartyDB extends Dexie {
  users!: Table<User, string>;
  parties!: Table<Party, string>;
  games!: Table<Game, string>;
  answers!: Table<AnswerSubmission, string>;
  session!: Table<Session & { id: string }, string>;

  constructor() {
    super("party-day-game-host");
    this.version(1).stores({
      users: "id, &username, role",
      parties: "id, &code, ownerId",
      games: "id, partyId, order",
      answers: "id, partyId, gameId",
      session: "id",
    });
  }
}

export const db = new PartyDB();

/** Accounts seeded on first run. Documented in PROJECT_SPEC test accounts. */
const SEED_USERS: Array<{
  username: string;
  pin: string;
  displayName: string;
  role: User["role"];
}> = [
  { username: "admin", pin: "246810", displayName: "Party Admin", role: "admin" },
  {
    username: "gamemaster",
    pin: "banana",
    displayName: "Game Master",
    role: "gamemaster",
  },
  {
    username: "participant",
    pin: "bababa",
    displayName: "Participant",
    role: "participant",
  },
  {
    username: "audience",
    pin: "123456",
    displayName: "Audience",
    role: "audience",
  },
];

let seedPromise: Promise<void> | null = null;

/** Idempotently seed the default users. Safe to call on every app load. */
export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const count = await db.users.count();
    if (count > 0) return;
    const now = Date.now();
    for (const u of SEED_USERS) {
      const salt = randomSalt();
      const pinHash = await hashPin(u.pin, salt);
      await db.users.add({
        id: newId(),
        username: u.username,
        pinHash,
        salt,
        displayName: u.displayName,
        role: u.role,
        createdAt: now,
      });
    }
  })();
  return seedPromise;
}
