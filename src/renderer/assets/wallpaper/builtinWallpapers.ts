import wallpaperArt002 from './art002e008487~orig.jpg';
import wallpaperArt004 from './art002e004441~orig.jpg';

export interface BuiltinWallpaper {
  id: string;
  name: string;
  src: string;
  defaultOpacity: number;
}

export const BUILTIN_WALLPAPERS: BuiltinWallpaper[] = [
  { id: 'art002', name: 'Spaceship Earth', src: wallpaperArt002, defaultOpacity: 16 },
  { id: 'art004', name: 'A Crescent Earth', src: wallpaperArt004, defaultOpacity: 45 },
];

export function resolveBuiltinWallpaper(id: string): BuiltinWallpaper | undefined {
  return BUILTIN_WALLPAPERS.find((w) => w.id === id);
}
