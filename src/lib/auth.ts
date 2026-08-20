import { db, ensureSeeded } from "./db";
import {
  deriveOwnerKey,
  hashPin,
  newId,
  randomSalt,
  safeEqual,
} from "./crypto";
import {
  cloudCreateAccount,
  cloudFindAccount,
  isCloudConfigured,
  isOnline,
} from "./cloud";
import type { Role, Session, User } from "./types";

const SESSION_ID = "current";

export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

async function persistSession(
  user: Pick<User, "id" | "username" | "displayName" | "role">,
  ownerKey: string
): Promise<Session> {
  const session: Session = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    ownerKey,
    issuedAt: Date.now(),
  };
  await db.session.put({ id: SESSION_ID, ...session });
  return session;
}

/**
 * Create or refresh the local mirror of a cloud account so the user can log in
 * offline on this device afterward, and so role/display-name changes propagate.
 */
async function upsertLocalUser(input: {
  username: string;
  pin: string;
  displayName: string;
  role: Role;
}): Promise<User> {
  const existing = await db.users
    .where("username")
    .equals(input.username)
    .first();
  if (existing) {
    await db.users.update(existing.id, {
      displayName: input.displayName,
      role: input.role,
    });
    return { ...existing, displayName: input.displayName, role: input.role };
  }
  const salt = randomSalt();
  const pinHash = await hashPin(input.pin, salt);
  const user: User = {
    id: newId(),
    username: input.username,
    pinHash,
    salt,
    displayName: input.displayName,
    role: input.role,
    createdAt: Date.now(),
  };
  await db.users.add(user);
  return user;
}

/**
 * Validate a username + PIN. When cloud is configured and online, the cloud
 * account store is the source of truth (so accounts work across devices);
 * a local mirror is created for offline use. Falls back to the local store for
 * seeded/demo accounts and for offline sign-in.
 */
export async function login(username: string, pin: string): Promise<LoginResult> {
  await ensureSeeded();
  const uname = username.trim().toLowerCase();
  if (!uname || !pin) {
    return { ok: false, error: "Enter your username and PIN." };
  }

  const ownerKey = await deriveOwnerKey(uname, pin);

  // 1) Cloud check (authoritative for cross-device accounts).
  if (isCloudConfigured() && isOnline()) {
    try {
      const account = await cloudFindAccount(ownerKey);
      if (account && account.username === uname) {
        const user = await upsertLocalUser({
          username: uname,
          pin,
          displayName: account.displayName,
          role: account.role as Role,
        });
        const session = await persistSession(user, ownerKey);
        return { ok: true, session };
      }
      // Not found in cloud → fall through to local (seeded/demo accounts).
    } catch {
      // Network/permission error → fall through to local sign-in.
    }
  }

  // 2) Local check (offline + seeded/demo accounts).
  const user = await db.users.where("username").equals(uname).first();
  if (!user) {
    return { ok: false, error: "Username or PIN is incorrect." };
  }
  const candidate = await hashPin(pin, user.salt);
  if (!safeEqual(candidate, user.pinHash)) {
    return { ok: false, error: "Username or PIN is incorrect." };
  }
  const session = await persistSession(user, ownerKey);
  return { ok: true, session };
}

/**
 * Register a new account. When cloud is configured, the username is reserved in
 * the cloud accounts table (globally unique) and requires connectivity; a local
 * mirror is always created so the account can sign in offline afterward.
 */
export async function signup(input: {
  username: string;
  pin: string;
  displayName: string;
  role: Role;
}): Promise<LoginResult> {
  await ensureSeeded();
  const uname = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim() || uname;
  if (!uname) return { ok: false, error: "Choose a username." };
  if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
    return {
      ok: false,
      error: "Username must be 3–20 characters: letters, numbers, or underscore.",
    };
  }
  if (input.pin.length < 4) {
    return { ok: false, error: "PIN must be at least 4 characters." };
  }

  const ownerKey = await deriveOwnerKey(uname, input.pin);

  if (isCloudConfigured()) {
    if (!isOnline()) {
      return {
        ok: false,
        error: "You need to be online to create an account.",
      };
    }
    const result = await cloudCreateAccount(ownerKey, {
      username: uname,
      displayName,
      role: input.role,
    });
    if (!result.ok) return { ok: false, error: result.error };
  } else {
    // No cloud: enforce uniqueness locally.
    const existing = await db.users.where("username").equals(uname).first();
    if (existing) {
      return { ok: false, error: "That username is already taken." };
    }
  }

  const user = await upsertLocalUser({
    username: uname,
    pin: input.pin,
    displayName,
    role: input.role,
  });
  const session = await persistSession(user, ownerKey);
  return { ok: true, session };
}

export async function logout(): Promise<void> {
  await db.session.delete(SESSION_ID);
}

export async function getSession(): Promise<Session | null> {
  const row = await db.session.get(SESSION_ID);
  if (!row) return null;
  // Sessions created before cloud sync lack an owner key — require re-login so
  // ownership resolves consistently.
  if (!row.ownerKey) {
    await db.session.delete(SESSION_ID);
    return null;
  }
  return {
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    ownerKey: row.ownerKey,
    issuedAt: row.issuedAt,
  };
}

/** Create a new user (admin action). Returns an error message on conflict. */
export async function createUser(input: {
  username: string;
  pin: string;
  displayName: string;
  role: Role;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const username = input.username.trim().toLowerCase();
  if (!username) return { ok: false, error: "Username is required." };
  if (input.pin.length < 4)
    return { ok: false, error: "PIN must be at least 4 characters." };
  const existing = await db.users.where("username").equals(username).first();
  if (existing) return { ok: false, error: "That username is already taken." };

  const salt = randomSalt();
  const pinHash = await hashPin(input.pin, salt);
  const user: User = {
    id: newId(),
    username,
    pinHash,
    salt,
    displayName: input.displayName.trim() || username,
    role: input.role,
    createdAt: Date.now(),
  };
  await db.users.add(user);
  return { ok: true, user };
}

export async function deleteUser(userId: string): Promise<void> {
  await db.users.delete(userId);
}

export async function updateUserPin(userId: string, pin: string): Promise<void> {
  const salt = randomSalt();
  const pinHash = await hashPin(pin, salt);
  await db.users.update(userId, { salt, pinHash });
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  gamemaster: "Game Master",
  participant: "Participant",
  audience: "Audience",
};
