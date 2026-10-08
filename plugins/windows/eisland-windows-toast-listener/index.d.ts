export type ToastAccessStatus = 'unspecified' | 'allowed' | 'denied' | 'unknown';
export type ToastNotificationChangeKind = 'added' | 'removed' | 'unknown';

export interface ToastNotificationChangedEvent {
  kind: ToastNotificationChangeKind;
  notificationId: number;
}

export interface ToastNotificationSnapshot {
  id: number;
  appUserModelId: string;
  appDisplayName: string;
  title: string;
  body: string;
  texts: string[];
  createdAt: number;
}

export type ToastNotificationChangedCallback = (event: ToastNotificationChangedEvent) => void;

export function requestAccess(): ToastAccessStatus;
export function getAccessStatus(): ToastAccessStatus;
export function getNotifications(): ToastNotificationSnapshot[];
export function startListening(callback: ToastNotificationChangedCallback): boolean;
export function stopListening(): boolean;
export function isListening(): boolean;
export function enableSuppression(): boolean;
export function disableSuppression(): boolean;
export function isSuppressionEnabled(): boolean;