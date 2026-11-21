import { createHash, createHmac, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { jwtVerify, SignJWT } from "jose";

/** Passwords, tokens and tickets (docs/architecture/security-and-anticheat.md §3). */

// Argon2id with the OWASP minimum (19 MiB, 2 passes, 1 lane)
const ARGON = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
export const hashPassword = (pw: string) => hash(pw, ARGON);
export const checkPassword = (stored: string, pw: string) => verify(stored, pw).catch(() => false);

/** A few of the most common passwords (security §3: block common passwords). */
const COMMON = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "matkhau123",
  "qwerty123",
  "qwertyuiop",
  "11111111",
  "00000000",
  "123123123",
  "abc12345",
  "iloveyou",
  "88888888",
  "66666666",
  "abcd1234",
  "1q2w3e4r",
  "anhyeuem",
  "zxcvbnm123",
]);
export const isCommonPassword = (pw: string) => COMMON.has(pw.toLowerCase());

export const ACCESS_TTL_S = 15 * 60; // security §3: 15 minutes
export const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;
export const TICKET_TTL_S = 30; // 30 s, one use

export async function signAccess(secret: Uint8Array, accountId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(accountId)
    .setIssuer("htk-api")
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_S}s`)
    .sign(secret);
}

/** The account id of a valid access token, or null. */
export async function readAccess(secret: Uint8Array, token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "htk-api", algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
/** Refresh tokens are stored hashed (security §3). */
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** IPs are kept hashed (security §11); keyed so the hash cannot be reversed by brute force over IPv4. */
export const ipHash = (key: Uint8Array, ip: string) => createHmac("sha256", key).update(ip).digest("hex").slice(0, 32);
