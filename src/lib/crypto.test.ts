import { describe, it, expect } from "vitest";
import { encrypt, decrypt, isEncrypted, maybeEncrypt, maybeDecrypt } from "./crypto";

describe("encrypt/decrypt", () => {
  it("encrypts and decrypts a string roundtrip", () => {
    const plaintext = "my-secret-api-token-abc123";
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted.startsWith("ENC:v1:")).toBe(true);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for same input (random salt/iv)", () => {
    const a = encrypt("same-value");
    const b = encrypt("same-value");
    expect(a).not.toBe(b); // different random components
    expect(decrypt(a)).toBe("same-value");
    expect(decrypt(b)).toBe("same-value");
  });

  it("detects non-encrypted values", () => {
    expect(isEncrypted("plain-value")).toBe(false);
    expect(isEncrypted("ENC:v1:abc")).toBe(true);
  });

  it("decrypt returns non-encrypted values as-is", () => {
    expect(decrypt("not-encrypted")).toBe("not-encrypted");
  });

  it("handles empty strings", () => {
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles unicode", () => {
    const plaintext = "🔑 secret--café-日本語";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret");
    // Tamper with the last character
    const tampered = encrypted.slice(0, -1) + (encrypted.slice(-1) === "A" ? "B" : "A");
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe("maybeEncrypt/maybeDecrypt", () => {
  it("encrypts sensitive keys", () => {
    const value = "habitica-api-token-123";
    const encrypted = maybeEncrypt("habiticaApiToken", value);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(maybeDecrypt("habiticaApiToken", encrypted)).toBe(value);
  });

  it("passes through non-sensitive keys unchanged", () => {
    const value = "some-non-secret";
    expect(maybeEncrypt("habiticaUserId", value)).toBe(value);
    expect(maybeDecrypt("habiticaUserId", value)).toBe(value);
  });

  it("does not double-encrypt already encrypted values", () => {
    const value = "token-123";
    const once = maybeEncrypt("habiticaApiToken", value);
    const twice = maybeEncrypt("habiticaApiToken", once);
    expect(once).toBe(twice);
  });
});
