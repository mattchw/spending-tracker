import crypto from "node:crypto";

/*
 * Symmetric encryption for TrueLayer tokens at rest. Bank access/refresh tokens
 * are the crown jewels of this app — anyone holding them can read a user's
 * financial data — so we never store them in plaintext. We use AES-256-GCM
 * (authenticated encryption: tampering is detected on decrypt) with a random
 * IV per value and a key supplied via TOKEN_ENC_KEY.
 *
 * Stored format: "v1:<iv>:<authTag>:<ciphertext>", all base64url. The version
 * prefix lets decrypt() transparently pass through legacy plaintext rows (from
 * before encryption was enabled) and gives us room to rotate schemes later.
 */

const PREFIX = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the standard/most efficient size for GCM

let cachedKey: Buffer | null = null;

/**
 * Decode TOKEN_ENC_KEY into a 32-byte key. Accepts hex (64 chars), base64, or
 * base64url. Throws if missing/wrong length so misconfiguration fails loudly
 * rather than silently writing weakly-protected data.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENC_KEY is not set — cannot encrypt/decrypt bank tokens",
    );
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    // base64 and base64url both decode correctly via the "base64" decoder.
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      `TOKEN_ENC_KEY must decode to 32 bytes (got ${key.length}); ` +
        'generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"',
    );
  }
  cachedKey = key;
  return key;
}

function looksEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:`);
}

/** Encrypt a token for storage. null/empty passes through unchanged. */
export function encryptToken(plaintext: string | null): string | null {
  if (plaintext == null || plaintext === "") return plaintext;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

/**
 * Decrypt a stored token. Values without the version prefix are assumed to be
 * legacy plaintext (written before encryption was enabled) and returned as-is,
 * so existing connections keep working until they're next re-written encrypted.
 */
export function decryptToken(stored: string | null): string | null {
  if (stored == null || stored === "") return stored;
  if (!looksEncrypted(stored)) return stored;
  const parts = stored.split(":");
  if (parts.length !== 4) return stored;
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(dataB64, "base64url");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
