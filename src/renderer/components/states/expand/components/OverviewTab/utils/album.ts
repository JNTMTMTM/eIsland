import type { OverviewAlbumCardConfig, OverviewAlbumItem } from './types';

export function normalizeOverviewAlbumItems(data: unknown): OverviewAlbumItem[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: OverviewAlbumItem[] = [];
  data.forEach((entry) => {
    const row = entry as Partial<OverviewAlbumItem> | null;
    if (!row || typeof row.path !== 'string') return;
    const path = row.path.trim();
    if (!path) return;
    const lowerPath = path.toLowerCase();
    if (seen.has(lowerPath)) return;
    seen.add(lowerPath);
    const mediaType = row.mediaType === 'video' ? 'video' : 'image';
    const ext = typeof row.ext === 'string' ? row.ext.toLowerCase() : '';
    const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
    const fallbackName = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : fallbackName;
    const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : Date.now();
    const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : addedAt;
    result.push({ id, path, name, ext, mediaType, addedAt });
  });
  return result;
}

export function normalizeOverviewAlbumCardConfig(data: unknown): OverviewAlbumCardConfig {
  const row = (data ?? {}) as Partial<OverviewAlbumCardConfig>;
  const intervalMs = row.intervalMs === 3000 || row.intervalMs === 5000 || row.intervalMs === 8000
    ? row.intervalMs
    : 5000;
  const orderMode = row.orderMode === 'random' ? 'random' : 'sequential';
  const mediaFilter = row.mediaFilter === 'image' || row.mediaFilter === 'video' ? row.mediaFilter : 'all';
  const clickBehavior = row.clickBehavior === 'none' ? 'none' : 'open-album';

  return {
    intervalMs,
    autoRotate: row.autoRotate !== false,
    orderMode,
    mediaFilter,
    clickBehavior,
    videoAutoPlay: row.videoAutoPlay !== false,
    videoMuted: row.videoMuted !== false,
  };
}

export function getOverviewVideoMimeByExt(ext: string): string {
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'mkv') return 'video/x-matroska';
  return 'video/mp4';
}
