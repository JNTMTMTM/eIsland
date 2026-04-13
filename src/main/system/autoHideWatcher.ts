import { BrowserWindow } from 'electron';
import { hasAnyRunningProcess } from './runningProcesses';

interface CreateAutoHideWatcherOptions {
  getMainWindow: () => BrowserWindow | null;
  defaultProcessList: string[];
  pollIntervalMs?: number;
}

interface AutoHideWatcherService {
  start: () => void;
  stop: () => void;
  checkNow: () => Promise<void>;
  getAutoHideProcessList: () => string[];
  setAutoHideProcessList: (list: string[]) => void;
  getConfiguredHideProcessList: () => string[];
  setConfiguredHideProcessList: (list: string[]) => void;
  getHiddenByAutoHideProcess: () => boolean;
  setHiddenByAutoHideProcess: (hidden: boolean) => void;
}

export function createAutoHideWatcher(options: CreateAutoHideWatcherOptions): AutoHideWatcherService {
  const pollIntervalMs = options.pollIntervalMs ?? 2500;

  let autoHideProcessList: string[] = [...options.defaultProcessList];
  let configuredHideProcessList: string[] = [...options.defaultProcessList];
  let watcherTimer: NodeJS.Timeout | null = null;
  let checkInFlight = false;
  let hiddenByAutoHideProcess = false;

  async function checkNow(): Promise<void> {
    if (checkInFlight) return;
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    checkInFlight = true;
    try {
      if (!autoHideProcessList.length) {
        if (hiddenByAutoHideProcess && !mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        hiddenByAutoHideProcess = false;
        return;
      }

      const shouldHide = await hasAnyRunningProcess(autoHideProcessList);

      if (shouldHide) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        }
        hiddenByAutoHideProcess = true;
        return;
      }

      if (hiddenByAutoHideProcess) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        hiddenByAutoHideProcess = false;
      }
    } finally {
      checkInFlight = false;
    }
  }

  function start(): void {
    if (watcherTimer) {
      clearInterval(watcherTimer);
      watcherTimer = null;
    }

    checkNow().catch(() => {});
    watcherTimer = setInterval(() => {
      checkNow().catch(() => {});
    }, pollIntervalMs);
  }

  function stop(): void {
    if (watcherTimer) {
      clearInterval(watcherTimer);
      watcherTimer = null;
    }
  }

  return {
    start,
    stop,
    checkNow,
    getAutoHideProcessList: () => autoHideProcessList,
    setAutoHideProcessList: (list) => {
      autoHideProcessList = list;
    },
    getConfiguredHideProcessList: () => configuredHideProcessList,
    setConfiguredHideProcessList: (list) => {
      configuredHideProcessList = list;
    },
    getHiddenByAutoHideProcess: () => hiddenByAutoHideProcess,
    setHiddenByAutoHideProcess: (hidden) => {
      hiddenByAutoHideProcess = hidden;
    },
  };
}
