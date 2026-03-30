/// <reference types="vite/client" />

import type { NotificationPayload, ElectronAPI } from './types/electron-api';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { NotificationPayload, ElectronAPI };
