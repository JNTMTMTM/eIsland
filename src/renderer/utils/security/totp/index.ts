import {
  BASE32_ALPHABET,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_HMAC_HASH,
  DEFAULT_TOTP_PERIOD_SECONDS,
} from '../data';

function decodeBase32(seed: string): ArrayBuffer {
  const normalized = seed.trim().toUpperCase().replace(/=/g, '');
  if (!normalized) {
    throw new Error('TOTP Seed 为空');
  }

  let value = 0;
  let bits = 0;
  const out: number[] = [];
  normalized.split('').forEach((ch) => {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) {
      throw new Error('TOTP Seed 格式错误');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  });

  const bytes = Uint8Array.from(out);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function generateTotpFromBase32Seed(
  seed: string,
  timestampSeconds: number,
  periodSeconds: number = DEFAULT_TOTP_PERIOD_SECONDS,
  digits: number = DEFAULT_TOTP_DIGITS,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto 不可用');
  }

  const counter = Math.floor(timestampSeconds / periodSeconds);
  const counterBytes = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = value & 0xff;
    value = Math.floor(value / 256);
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    decodeBase32(seed),
    { name: 'HMAC', hash: DEFAULT_TOTP_HMAC_HASH },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, counterBytes);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24)
    | ((hash[offset + 1] & 0xff) << 16)
    | ((hash[offset + 2] & 0xff) << 8)
    | (hash[offset + 3] & 0xff);
  const otp = binary % (10 ** digits);
  return String(otp).padStart(digits, '0');
}
