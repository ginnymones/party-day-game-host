import { db, ensureSeeded } from "./db";
import {
  deriveOwnerKey,
  hashPin,
  newId,
  randomSalt,
  safeEqual,
} from "./crypto";
import type { Role, Session, User } from "./types";

const SESSION_ID = "current";

export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

/**
 * Validate a username + PIN against the local user store. Works fully offline.
 */
export async function login(username: string, pin: string): Promise<LoginResult> {
  await ensureSeeded();
  const uname = username.trim().toLowerCase();
  if (!uname || !pin) {
    return { ok: false, error: "Enter your username and PIN." };
  }
  const user = await db.users.where("username").equals(uname).first();
  if (!user) {
    // Same message for unknown user and wrong PIN to avoid enumeration.
    return { ok: false, error: "Username or PIN is incorrect." };
  }
  const candidate = await hashPin(pin, user.salt);
  if (!safeEqual(candidate, user.pinHash)) {
    return { ok: false, error: "Username or PIN is incorrect." };
  }
  const ownerKey = await deriveOwnerKey(user.username, pin);
  const session: Session = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    ownerKey,
    issuedAt: Date.now(),
  };
  await db.session.put({ id: SESSION_ID, ...session });
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
