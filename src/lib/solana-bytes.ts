/**
 * Byte codecs for the wallet boundary.
 *
 * The backend assembles transactions and hands them over base64-encoded; the
 * Wallet Standard `solana:signAndSendTransaction` feature takes and returns raw
 * bytes. These two functions are the whole bridge — no @solana/web3.js needed.
 */

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Big-endian base58 with leading-zero preservation, per the Bitcoin/Solana encoding. */
export function bytesToBase58(bytes: Uint8Array | ReadonlyUint8ArrayLike): string {
  if (bytes.length === 0) return "";

  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    out += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58_ALPHABET[digits[i]];
  return out;
}

/** Wallet Standard hands back `ReadonlyUint8Array`, which is not assignable to Uint8Array. */
type ReadonlyUint8ArrayLike = {
  readonly length: number;
  readonly [index: number]: number;
  [Symbol.iterator](): IterableIterator<number>;
};
