import { randomBytes, randomInt } from "crypto";

// No 0/O or 1/I/L, so codes read back from a printed receipt are unambiguous
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * Order number shown to staff and customers, e.g. ORD-261028-7KQ3MX. Unique across all
 * businesses (the column is globally unique); callers retry on the rare collision.
 */
export function newOrderNumber(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `ORD-${yy}${mm}${dd}-${randomCode(6)}`;
}

/** Unguessable key for the public /takip page; the order number is not enough to look up an order */
export function newTrackingToken(): string {
  return randomBytes(16).toString("base64url");
}
