import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

/** 32 random bytes, URL-safe: for session cookies and links sent by email. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Tokens are stored only as their SHA-256, so a leaked database cannot be used to sign in. A fast
 * hash is enough here because the tokens are random, unlike passwords.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Argon2id with the library's defaults. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

// Checked against when there is no real hash to compare with, so a missing account takes as long
// to reject as a wrong password and response times do not reveal which emails exist.
const dummyHash = hash("not a real password");

export async function verifyPassword(
  passwordHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!passwordHash) {
    await verify(await dummyHash, password);
    return false;
  }
  return verify(passwordHash, password);
}
