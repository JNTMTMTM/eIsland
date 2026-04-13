import type { ClipboardUrlDetectMode } from '../config/storeConfig';
import {
  DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED,
  DEFAULT_CLIPBOARD_URL_DETECT_MODE,
  DEFAULT_CLIPBOARD_URL_BLACKLIST,
} from '../config/storeConfig';

interface ClipboardUrlState {
  getMonitorEnabled: () => boolean;
  setMonitorEnabled: (enabled: boolean) => void;
  getDetectMode: () => ClipboardUrlDetectMode;
  setDetectMode: (mode: ClipboardUrlDetectMode) => void;
  getBlacklist: () => string[];
  setBlacklist: (list: string[]) => void;
}

export function createClipboardUrlState(): ClipboardUrlState {
  let monitorEnabled: boolean = DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;
  let detectMode: ClipboardUrlDetectMode = DEFAULT_CLIPBOARD_URL_DETECT_MODE;
  let blacklist: string[] = [...DEFAULT_CLIPBOARD_URL_BLACKLIST];

  return {
    getMonitorEnabled: () => monitorEnabled,
    setMonitorEnabled: (enabled) => {
      monitorEnabled = enabled;
    },
    getDetectMode: () => detectMode,
    setDetectMode: (mode) => {
      detectMode = mode;
    },
    getBlacklist: () => blacklist,
    setBlacklist: (list) => {
      blacklist = list;
    },
  };
}
