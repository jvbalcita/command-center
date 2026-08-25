/**
 * Encryption utilities for sensitive settings at rest.
 *
 * Uses AES-256-GCM with a key derived from machine-specific data
 * (hostname + salt) via PBKDF2. This prevents casual file-system
 * snooping; a determined attacker with root access could still
 * extract the key, but that threat model is out of scope for
 * a local-first personal app.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, pbkdf2Sync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;

// Machine-specific derivation (stable across restarts, unique per host)
const MACHINE_SALT = `mission-control-${typeof process !== "undefined" ? process.env.HOSTNAME ?? "local" : "local"}`;

let cachedKey: Buffer | null = null;

function deriveKey(): Buffer {
  if (cachedKey) return cachedKey;
  const salt = createHash("sha256").update(MACHINE_SALT).digest();
  // Use a fixed passphrase tied to the app identity; the real entropy comes from the salt
  cachedKey = pbkdf2Sync("mission-control-encryption-key", salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
  return cachedKey;
}

/** Check if a value is already encrypted (has our prefix). */
export function isEncrypted(value: string): boolean {
  return value.startsWith("ENC:v1:");
}

/**
 * Encrypt a plaintext string. Returns a prefixed encoded string
 * that can be stored in the database.
 *
 * Format: ENC:v1:<base64(salt + iv + tag + ciphertext)>
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive per-value key from the master key + salt
  const perValueKey = pbkdf2Sync(key, salt, 1, KEY_LENGTH, "sha512");

  const cipher = createCipheriv(ALGORITHM, perValueKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([salt, iv, tag, encrypted]);
  return `ENC:v1:${payload.toString("base64")}`;
}

/**
 * Decrypt an encrypted string. If the value is not encrypted
 * (no prefix), returns it as-is for backward compatibility.
 */
export function decrypt(value: string): string {
  if (!isEncrypted(value)) return value;

  const payload = Buffer.from(value.slice("ENC:v1:".length), "base64");

  const salt = payload.subarray(0, SALT_LENGTH);
  const iv = payload.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = payload.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey();
  const perValueKey = pbkdf2Sync(key, salt, 1, KEY_LENGTH, "sha512");

  const decipher = createDecipheriv(ALGORITHM, perValueKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// ── Keys that should be encrypted at rest ────────────────────
const SENSITIVE_KEYS = new Set(["habiticaApiToken"]);

/** Check if a settings key contains sensitive data. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

/**
 * Encrypt a value if its key is sensitive.
 * Non-sensitive keys pass through unchanged.
 */
export function maybeEncrypt(key: string, value: string): string {
  if (!isSensitiveKey(key)) return value;
  if (isEncrypted(value)) return value; // already encrypted
  return encrypt(value);
}

/**
 * Decrypt a value if its key is sensitive.
 * Non-sensitive keys and unencrypted values pass through unchanged.
 */
export function maybeDecrypt(key: string, value: string): string {
  if (!isSensitiveKey(key)) return value;
  return decrypt(value);
}
