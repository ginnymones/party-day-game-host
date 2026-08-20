/**
 * Lightweight PIN hashing using the built-in Web Crypto API (no dependencies).
 *
 * PINs are low-entropy by nature, so this is not a substitute for a real
 * password KDF. It exists to avoid storing raw PINs in IndexedDB. We salt each
 * user and run several SHA-256 iterations to slow down trivial brute forcing.
 */

const ITERATIONS = 5000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}`);
  let digest = await crypto.subtle.digest("SHA-256", data);
  for (let i = 1; i < ITERATIONS; i++) {
    digest = await crypto.subtle.digest("SHA-256", digest);
  }
  return toHex(digest);
}

/** Constant-time-ish comparison to avoid leaking timing on hash checks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Derive a stable, secret account key from username + PIN. It is identical on
 * every device the user signs in on (enabling cross-device cloud sync) but is
 * unguessable without the PIN, so it doubles as the row-level access secret for
 * the cloud store. Not stored anywhere server-side in plaintext form beyond the
 * scoping column.
 */
export async function deriveOwnerKey(
  username: string,
  pin: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`pdgh-owner:v1:${username.toLowerCase()}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}
