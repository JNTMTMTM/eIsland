export interface ScreenshotResult {
  data: Buffer;
  size: number;
  format: 'png';
}

export interface VisibleWindowBounds {
  hwnd: string;
  title: string;
  processId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function capturePrimaryDisplayPng(): ScreenshotResult | null;
export function captureAllDisplaysPng(): ScreenshotResult | null;
export function getVisibleWindows(): VisibleWindowBounds[];
export function getLastError(): string;