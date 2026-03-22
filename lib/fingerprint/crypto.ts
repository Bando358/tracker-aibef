import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.FINGERPRINT_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "FINGERPRINT_ENCRYPTION_KEY manquante ou trop courte (minimum 32 caracteres)"
    );
  }
  // Use first 32 bytes of the key
  return Buffer.from(key.slice(0, 32), "utf-8");
}

/**
 * Chiffre un template d'empreinte (base64) avec AES-256-GCM.
 * Retourne une chaine au format `iv:tag:data` (hex).
 */
export function encryptTemplate(base64Template: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(base64Template, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Dechiffre un template chiffre au format `iv:tag:data` (hex).
 * Retourne le template base64 original.
 */
export function decryptTemplate(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Format de donnees chiffrees invalide");
  }

  const [ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}
