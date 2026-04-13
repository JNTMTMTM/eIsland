import wallpaperArt002 from './art002e008487~orig.jpg';

export interface BuiltinWallpaper {
  id: string;
  name: string;
  src: string;
  defaultOpacity: number;
}

export const BUILTIN_WALLPAPERS: BuiltinWallpaper[] = [
  { id: 'art002', name: 'Artemis II', src: wallpaperArt002, defaultOpacity: 16 },
];

export function resolveBuiltinWallpaper(id: string): BuiltinWallpaper | undefined {
  return BUILTIN_WALLPAPERS.find((w) => w.id === id);
}
