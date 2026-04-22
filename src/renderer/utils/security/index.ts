export { generateTotpFromBase32Seed } from './totp';
export {
  BASE32_ALPHABET,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_HMAC_HASH,
  DEFAULT_TOTP_PERIOD_SECONDS,
} from './data';

export function createReplayNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildReplayHeaders(
  timestampHeaderName: string,
  nonceHeaderName: string,
  timestampMs: number = Date.now(),
): Record<string, string> {
  return {
    [timestampHeaderName]: String(timestampMs),
    [nonceHeaderName]: createReplayNonce(),
  };
}
