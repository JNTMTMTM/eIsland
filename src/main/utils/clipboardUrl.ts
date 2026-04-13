export type ClipboardUrlDetectMode = 'https-only' | 'http-https' | 'domain-only';

const URL_REGEX_HTTPS_ONLY = /https:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const URL_REGEX_HTTP_HTTPS = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const URL_REGEX_DOMAIN_ONLY = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi;

export function normalizeClipboardUrlDetectMode(mode: unknown): ClipboardUrlDetectMode | null {
  if (mode === 'https-only' || mode === 'http-https' || mode === 'domain-only') {
    return mode;
  }
  return null;
}

export function normalizeClipboardUrlBlacklistDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const hostname = new URL(withScheme).hostname.toLowerCase().replace(/\.$/, '');
    return hostname;
  } catch {
    return '';
  }
}

export function sanitizeClipboardUrlBlacklist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const normalized = normalizeClipboardUrlBlacklistDomain(item);
    if (normalized) unique.add(normalized);
  }
  return [...unique.values()];
}

function normalizeDomainOnlyUrl(url: string): string {
  const trimmed = url.replace(/[),.;!?]+$/g, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function extractUrls(text: string, mode: ClipboardUrlDetectMode): string[] {
  let matches: string[] = [];

  if (mode === 'https-only') {
    matches = text.match(URL_REGEX_HTTPS_ONLY) || [];
  } else if (mode === 'domain-only') {
    matches = (text.match(URL_REGEX_DOMAIN_ONLY) || []).map(normalizeDomainOnlyUrl).filter(Boolean);
  } else {
    matches = text.match(URL_REGEX_HTTP_HTTPS) || [];
  }

  if (matches.length === 0) return [];

  const unique = new Map<string, string>();
  for (const item of matches) {
    const key = item.toLowerCase();
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

export function isUrlBlacklisted(url: string, blacklist: string[]): boolean {
  if (blacklist.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blacklist.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
