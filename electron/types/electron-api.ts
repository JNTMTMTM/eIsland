export interface NotificationPayload {
  id: string;
  appId: string;
  appName: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actions?: Array<{ label: string; action: string }>;
}

export interface ElectronAPI {
  getNotifications: () => Promise<NotificationPayload[]>;
  addNotification: (notification: Omit<NotificationPayload, 'id'>) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updateIslandState: (state: { expanded: boolean; height: number }) => Promise<void>;
  getIslandState: () => Promise<{ expanded: boolean; height: number }>;
  minimizeToTray: () => Promise<void>;
  quitApp: () => Promise<void>;
  onNotification: (callback: (notification: NotificationPayload) => void) => () => void;
  onIslandExpand: (callback: (expanded: boolean) => void) => () => void;
  getSettings: () => Promise<Record<string, unknown>>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
