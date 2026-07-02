const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** RFC 4122 v4 UUID without relying on a secure context. */
export function createInstanceIdFallback(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const n = Math.floor(Math.random() * 16);
    const value = char === "x" ? n : (n & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Mint a unique canvas placement id.
 * Uses `crypto.randomUUID` when available; falls back on HTTP LAN dev hosts
 * where the Web Crypto API UUID helper is undefined.
 */
export function createInstanceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return createInstanceIdFallback();
}

export function isUuidV4(value: string): boolean {
  return UUID_V4_PATTERN.test(value);
}
