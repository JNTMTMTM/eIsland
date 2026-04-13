import { BrowserWindow, clipboard, net } from 'electron';
import { extractUrls, isUrlBlacklisted, type ClipboardUrlDetectMode } from '../utils/clipboardUrl';

interface ClipboardUrlWatcherOptions {
  getWindow: () => BrowserWindow | null;
  getEnabled: () => boolean;
  getDetectMode: () => ClipboardUrlDetectMode;
  getBlacklist: () => string[];
}

let lastClipboardText = '';
let clipboardPollTimer: ReturnType<typeof setInterval> | null = null;

function extractHtmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : '';
}

async function fetchPageTitle(url: string, timeoutMs = 3000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await net.fetch(url, {
      signal: controller.signal as never,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timer);
    if (!resp.ok) return '';
    const html = await resp.text();
    return extractHtmlTitle(html);
  } catch {
    return '';
  }
}

export function startClipboardUrlWatcher(options: ClipboardUrlWatcherOptions): void {
  if (!options.getEnabled() || clipboardPollTimer) return;
  lastClipboardText = clipboard.readText() || '';

  clipboardPollTimer = setInterval(() => {
    const win = options.getWindow();
    if (!win || win.isDestroyed()) return;
    const current = clipboard.readText() || '';
    if (current === lastClipboardText) return;
    lastClipboardText = current;

    const urls = extractUrls(current, options.getDetectMode());
    const blacklist = options.getBlacklist();
    const filteredUrls = urls.filter((url) => !isUrlBlacklisted(url, blacklist));
    if (filteredUrls.length > 0) {
      fetchPageTitle(filteredUrls[0]).then((title) => {
        const currentWindow = options.getWindow();
        if (!currentWindow || currentWindow.isDestroyed()) return;
        currentWindow.webContents.send('clipboard:urls-detected', { urls: filteredUrls, title });
      });
    }
  }, 1000);
}

export function stopClipboardUrlWatcher(): void {
  if (!clipboardPollTimer) return;
  clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
}
