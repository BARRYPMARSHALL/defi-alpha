import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { User } from "@shared/schema";

/**
 * Password hashing using Node's built-in scrypt (no external deps).
 * Format: scrypt$<saltHex>$<hashHex>
 */
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/** Safe public shape — never expose the password hash. */
export function publicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
