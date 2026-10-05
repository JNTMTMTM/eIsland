/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */
/**
 * @file apiBridge.test.ts
 * @description 固定250个公开预加载API的IPC协议清单，覆盖参数转发、默认值、业务载荷与逐监听器取消订阅。
 * @author 鸡哥
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

type Api = Record<string, (...args: unknown[]) => unknown>;

type Listener = (...args: unknown[]) => void;

interface PreloadMocks {
  api: Api;
  invoke: Mock<(channel: string, ...args: unknown[]) => Promise<unknown>>;
  send: Mock<(...args: unknown[]) => void>;
  listeners: Map<string, Set<Listener>>;
  remove: Mock<(channel: string, handler: Listener) => void>;
  path: Mock<(file: File) => string>;
}

const mocks = vi.hoisted<PreloadMocks>(() => ({
  api: {},
  invoke: vi.fn<(channel: string, ...args: unknown[]) => Promise<unknown>>(),
  send: vi.fn(),
  listeners: new Map<string, Set<Listener>>(),
  remove: vi.fn<(channel: string, handler: Listener) => void>(),
  path: vi.fn<(file: File) => string>(() => 'C:/file.txt')
}));

vi.mock('electron', () => ({
  ipcRenderer: {
    send: mocks.send,
    invoke: mocks.invoke,
    on: (channel: string, handler: Listener) => {
      const handlers = mocks.listeners.get(channel) ?? new Set<Listener>();
      handlers.add(handler);
      mocks.listeners.set(channel, handlers);
    },
    removeListener: mocks.remove
  },
  contextBridge: {
    exposeInMainWorld: (key: string, api: unknown) => {
      if (key === 'api') {
        mocks.api = api as Api;
      }
    }
  },
  webUtils: {
    getPathForFile: mocks.path
  }
}));

vi.mock('@electron-toolkit/preload', () => ({
  electronAPI: {
    transport: true
  }
}));

const isolation = Object.getOwnPropertyDescriptor(process, 'contextIsolated');

const TRANSPORT_ROUTES = [
  ['enableMousePassthrough', 'window:enable-mouse-passthrough', 0, 'send'],
  ['disableMousePassthrough', 'window:disable-mouse-passthrough', 0, 'send'],
  ['expandWindow', 'window:expand', 1, 'send'],
  ['expandWindowNotification', 'window:expand-notification', 1, 'send'],
  ['expandWindowLyrics', 'window:expand-lyrics', 1, 'send'],
  ['expandWindowLyricsTranslation', 'window:expand-lyrics-translation', 1, 'send'],
  ['expandWindowFull', 'window:expand-full', 1, 'send'],
  ['expandWindowSettings', 'window:expand-settings', 1, 'send'],
  ['collapseWindow', 'window:collapse', 1, 'send'],
  ['moveWindowDelta', 'window:move-delta', 2, 'send'],
  ['hideWindow', 'window:hide', 0, 'send'],
  ['getMousePosition', 'window:get-mouse-position', 0, 'invoke'],
  ['getMouseWindowState', 'window:get-mouse-window-state', 0, 'invoke'],
  ['getWindowBounds', 'window:get-bounds', 0, 'invoke'],
  ['getIslandDisplays', 'window:island-displays:list', 0, 'invoke'],
  ['getIslandDisplaySelection', 'window:island-display:get', 0, 'invoke'],
  ['setIslandDisplaySelection', 'window:island-display:set', 1, 'invoke'],
  ['getIslandPositionOffset', 'window:island-position:get', 0, 'invoke'],
  ['setIslandPositionOffset', 'window:island-position:set', 1, 'invoke'],
  ['quitApp', 'app:quit', 0, 'send'],
  ['restartApp', 'app:restart', 0, 'invoke'],
  ['openLogsFolder', 'app:open-logs-folder', 0, 'invoke'],
  ['pickFeedbackLogFile', 'app:pick-feedback-log-file', 0, 'invoke'],
  ['pickFeedbackScreenshotFile', 'app:pick-feedback-screenshot-file', 0, 'invoke'],
  ['pickLocalSearchDirectory', 'app:pick-local-search-directory', 0, 'invoke'],
  ['pickSkillFile', 'app:pick-skill-file', 0, 'invoke'],
  ['readTextFile', 'app:read-text-file', 1, 'invoke'],
  ['saveTextFile', 'app:save-text-file', 1, 'invoke'],
  ['searchLocalFiles', 'app:search-local-files', 3, 'invoke'],
  ['executeAgentLocalTool', 'agent:local-tool:execute', 1, 'invoke'],
  ['ollamaPing', 'ollama:ping', 1, 'invoke'],
  ['ollamaModels', 'ollama:models', 1, 'invoke'],
  ['ollamaDetectBaseUrl', 'ollama:detectBaseUrl', 0, 'invoke'],
  ['ollamaChatStart', 'ollama:chat:start', 2, 'invoke'],
  ['ollamaChatAbort', 'ollama:chat:abort', 1, 'invoke'],
  ['customDirectChatStart', 'customDirect:chat:start', 2, 'invoke'],
  ['customDirectChatAbort', 'customDirect:chat:abort', 1, 'invoke'],
  ['clearLogsCache', 'app:clear-logs-cache', 0, 'invoke'],
  ['windowMinimize', 'window:minimize', 0, 'send'],
  ['windowMaximize', 'window:maximize', 0, 'send'],
  ['windowClose', 'window:close', 0, 'send'],
  ['openStandaloneWindow', 'app:open-standalone-window', 0, 'invoke'],
  ['closeStandaloneWindow', 'app:close-standalone-window', 0, 'invoke'],
  ['mediaPlayPause', 'media:play-pause', 0, 'invoke'],
  ['mediaNext', 'media:next', 0, 'invoke'],
  ['mediaPrev', 'media:prev', 0, 'invoke'],
  ['mediaSeek', 'media:seek', 1, 'invoke'],
  ['mediaGetVolume', 'media:get-volume', 0, 'invoke'],
  ['mediaSetVolume', 'media:set-volume', 1, 'invoke'],
  ['mediaGetMuted', 'media:get-muted', 0, 'invoke'],
  ['mediaToggleMuted', 'media:toggle-muted', 0, 'invoke'],
  ['mediaCurrentInfoGet', 'media:current-info:get', 0, 'invoke'],
  ['screenshot', 'system:screenshot', 0, 'invoke'],
  ['startRegionScreenshot', 'system:screenshot:region:start', 0, 'invoke'],
  ['openTaskManager', 'system:open-task-manager', 0, 'send'],
  ['getBrightness', 'system:brightness:get', 0, 'invoke'],
  ['setBrightness', 'system:brightness:set', 1, 'invoke'],
  ['getVolume', 'system:volume:get', 0, 'invoke'],
  ['setVolume', 'system:volume:set', 1, 'invoke'],
  ['getPerformanceSnapshot', 'system:performance-snapshot:get', 2, 'invoke'],
  ['getFileIcon', 'app:get-file-icon', 1, 'invoke'],
  ['openFile', 'app:open-file', 1, 'invoke'],
  ['openInExplorer', 'app:open-in-explorer', 1, 'invoke'],
  ['pickFileForHash', 'app:pick-file-for-hash', 0, 'invoke'],
  ['computeFileHash', 'app:compute-file-hash', 2, 'invoke'],
  ['imageCompressionPickImages', 'image-compression:pick-images', 0, 'invoke'],
  ['imageCompressionPickOutputDir', 'image-compression:pick-output-dir', 0, 'invoke'],
  ['imageCompressionStart', 'image-compression:start', 1, 'invoke'],
  ['imageCompressionList', 'image-compression:list', 0, 'invoke'],
  ['imageCompressionRemove', 'image-compression:remove', 1, 'invoke'],
  ['saveImageAs', 'app:save-image-as', 1, 'invoke'],
  ['resolveShortcut', 'app:resolve-shortcut', 1, 'invoke'],
  ['openImageDialog', 'dialog:open-image', 0, 'invoke'],
  ['openVideoDialog', 'dialog:open-video', 0, 'invoke'],
  ['openFontDialog', 'dialog:open-font', 0, 'invoke'],
  ['readFontFile', 'font:read-file', 1, 'invoke'],
  ['loadWallpaperFile', 'wallpaper:load-file', 1, 'invoke'],
  ['loadAlbumThumbnail', 'album:load-thumbnail', 1, 'invoke'],
  ['getAlbumMediaInfo', 'album:media-info', 1, 'invoke'],
  ['clearWallpaperCache', 'wallpaper:clear-cache', 0, 'invoke'],
  ['setSystemDesktopWallpaper', 'wallpaper:system:set', 1, 'invoke'],
  ['wallpaperVideoCover', 'wallpaper:video:cover', 1, 'invoke'],
  ['readLocalFileAsBuffer', 'wallpaper:read-file-buffer', 1, 'invoke'],
  ['pickVideoForExtract', 'format-factory:pick-video', 0, 'invoke'],
  ['extractVideoTrack', 'format-factory:extract-track', 1, 'invoke'],
  ['netFetch', 'net:fetch', 2, 'invoke'],
  ['mailInboxList', 'mail:inbox:list', 2, 'invoke'],
  ['storeWrite', 'store:write', 2, 'invoke'],
  ['storeCompareAndSwap', 'store:compare-and-swap', 3, 'invoke'],
  ['setAlarmEnabled', 'alarm:set-enabled', 2, 'invoke'],
  ['hotkeyGet', 'hotkey:get', 0, 'invoke'],
  ['hotkeySet', 'hotkey:set', 1, 'invoke'],
  ['hotkeySuspend', 'hotkey:suspend', 0, 'invoke'],
  ['hotkeyResume', 'hotkey:resume', 0, 'invoke'],
  ['quitHotkeyGet', 'quit-hotkey:get', 0, 'invoke'],
  ['quitHotkeySet', 'quit-hotkey:set', 1, 'invoke'],
  ['screenshotHotkeyGet', 'screenshot-hotkey:get', 0, 'invoke'],
  ['screenshotHotkeySet', 'screenshot-hotkey:set', 1, 'invoke'],
  ['nextSongHotkeyGet', 'next-song-hotkey:get', 0, 'invoke'],
  ['nextSongHotkeySet', 'next-song-hotkey:set', 1, 'invoke'],
  ['playPauseSongHotkeyGet', 'play-pause-song-hotkey:get', 0, 'invoke'],
  ['playPauseSongHotkeySet', 'play-pause-song-hotkey:set', 1, 'invoke'],
  ['resetPositionHotkeyGet', 'reset-position-hotkey:get', 0, 'invoke'],
  ['resetPositionHotkeySet', 'reset-position-hotkey:set', 1, 'invoke'],
  ['toggleTrayHotkeyGet', 'toggle-tray-hotkey:get', 0, 'invoke'],
  ['toggleTrayHotkeySet', 'toggle-tray-hotkey:set', 1, 'invoke'],
  ['showSettingsWindowHotkeyGet', 'show-settings-window-hotkey:get', 0, 'invoke'],
  ['showSettingsWindowHotkeySet', 'show-settings-window-hotkey:set', 1, 'invoke'],
  ['openClipboardHistoryHotkeyGet', 'open-clipboard-history-hotkey:get', 0, 'invoke'],
  ['openClipboardHistoryHotkeySet', 'open-clipboard-history-hotkey:set', 1, 'invoke'],
  ['togglePassthroughHotkeyGet', 'toggle-passthrough-hotkey:get', 0, 'invoke'],
  ['togglePassthroughHotkeySet', 'toggle-passthrough-hotkey:set', 1, 'invoke'],
  ['toggleUiLockHotkeyGet', 'toggle-ui-lock-hotkey:get', 0, 'invoke'],
  ['toggleUiLockHotkeySet', 'toggle-ui-lock-hotkey:set', 1, 'invoke'],
  ['toggleShapeModeHotkeyGet', 'toggle-shape-mode-hotkey:get', 0, 'invoke'],
  ['toggleShapeModeHotkeySet', 'toggle-shape-mode-hotkey:set', 1, 'invoke'],
  ['agentVoiceInputHotkeyGet', 'agent-voice-input-hotkey:get', 0, 'invoke'],
  ['agentVoiceInputHotkeySet', 'agent-voice-input-hotkey:set', 1, 'invoke'],
  ['cliGlowShow', 'cli-glow:show', 0, 'invoke'],
  ['cliGlowHide', 'cli-glow:hide', 0, 'invoke'],
  ['logWrite', 'log:write', 2, 'send'],
  ['musicWhitelistGet', 'music:whitelist:get', 0, 'invoke'],
  ['musicWhitelistSet', 'music:whitelist:set', 1, 'invoke'],
  ['musicProviderAuthStatus', 'music-provider-auth:status', 1, 'invoke'],
  ['musicProviderAuthCreateQr', 'music-provider-auth:create-qr', 1, 'invoke'],
  ['musicProviderAuthCheckQr', 'music-provider-auth:check-qr', 2, 'invoke'],
  ['musicProviderAuthClear', 'music-provider-auth:clear', 1, 'invoke'],
  ['qishuiStatus', 'qishui:status', 0, 'invoke'],
  ['qishuiSearch', 'qishui:search', 2, 'invoke'],
  ['qishuiFeed', 'qishui:feed', 1, 'invoke'],
  ['qishuiPlaylists', 'qishui:playlists', 0, 'invoke'],
  ['qishuiPlaylistTracks', 'qishui:playlist-tracks', 2, 'invoke'],
  ['qishuiLyrics', 'qishui:lyrics', 1, 'invoke'],
  ['qishuiSongUrl', 'qishui:song-url', 2, 'invoke'],
  ['qishuiComments', 'qishui:comments', 2, 'invoke'],
  ['qishuiCreateComment', 'qishui:create-comment', 2, 'invoke'],
  ['qishuiCheckLiked', 'qishui:check-liked', 1, 'invoke'],
  ['qishuiLike', 'qishui:like', 2, 'invoke'],
  ['qishuiCollectPlaylist', 'qishui:collect-playlist', 2, 'invoke'],
  ['qishuiCollectAlbum', 'qishui:collect-album', 2, 'invoke'],
  ['qishuiAddSong', 'qishui:add-song', 2, 'invoke'],
  ['qishuiRecentPlay', 'qishui:recent-play', 1, 'invoke'],
  ['musicLyricsSourceGet', 'music:lyrics-source:get', 0, 'invoke'],
  ['musicLyricsSourceSet', 'music:lyrics-source:set', 1, 'invoke'],
  ['musicProviderModeGet', 'music:provider-mode:get', 0, 'invoke'],
  ['musicProviderModeSet', 'music:provider-mode:set', 1, 'invoke'],
  ['musicLyricsEnabledGet', 'music:lyrics-enabled:get', 0, 'invoke'],
  ['musicLyricsEnabledSet', 'music:lyrics-enabled:set', 1, 'invoke'],
  ['musicLyricsTranslationEnabledGet', 'music:lyrics-translation-enabled:get', 0, 'invoke'],
  ['musicLyricsTranslationEnabledSet', 'music:lyrics-translation-enabled:set', 1, 'invoke'],
  ['musicLyricsKaraokeGet', 'music:lyrics-karaoke:get', 0, 'invoke'],
  ['musicLyricsKaraokeSet', 'music:lyrics-karaoke:set', 1, 'invoke'],
  ['musicLyricsClockGet', 'music:lyrics-clock:get', 0, 'invoke'],
  ['musicLyricsClockSet', 'music:lyrics-clock:set', 1, 'invoke'],
  ['musicLyricsCalibrateEnabledGet', 'music:lyrics-calibrate-enabled:get', 0, 'invoke'],
  ['musicLyricsCalibrateEnabledSet', 'music:lyrics-calibrate-enabled:set', 1, 'invoke'],
  ['musicLyricsCalibrateDelayGet', 'music:lyrics-calibrate-delay:get', 0, 'invoke'],
  ['musicLyricsCalibrateDelaySet', 'music:lyrics-calibrate-delay:set', 1, 'invoke'],
  ['musicSmtcUnsubscribeMsGet', 'music:smtc-unsubscribe-ms:get', 0, 'invoke'],
  ['musicSmtcUnsubscribeMsSet', 'music:smtc-unsubscribe-ms:set', 1, 'invoke'],
  ['musicDetectSourceAppId', 'music:detect-source-app-id', 0, 'invoke'],
  ['smtcGetTimestamp', 'smtc:get-timestamp', 0, 'invoke'],
  ['getRunningNonSystemProcesses', 'system:running-processes:get', 0, 'invoke'],
  ['getRunningNonSystemProcessesWithIcons', 'system:running-processes:with-icons:get', 0, 'invoke'],
  ['getOpenWindowsWithIcons', 'system:open-windows:with-icons:get', 0, 'invoke'],
  ['getFocusedWindow', 'system:focused-window:get', 0, 'invoke'],
  ['hideProcessListGet', 'hide-process-list:get', 0, 'invoke'],
  ['hideProcessListSet', 'hide-process-list:set', 1, 'invoke'],
  ['autoHideFullscreenWindowsGet', 'hide-process-list:auto-hide-fullscreen:get', 0, 'invoke'],
  ['autoHideFullscreenWindowsSet', 'hide-process-list:auto-hide-fullscreen:set', 1, 'invoke'],
  ['mediaAcceptSourceSwitch', 'media:accept-source-switch', 0, 'invoke'],
  ['mediaRejectSourceSwitch', 'media:reject-source-switch', 0, 'invoke'],
  ['themeModeGet', 'theme:mode:get', 0, 'invoke'],
  ['themeModeSet', 'theme:mode:set', 1, 'invoke'],
  ['settingsPreview', 'settings:preview', 2, 'invoke'],
  ['islandOpacityGet', 'island:opacity:get', 0, 'invoke'],
  ['islandOpacitySet', 'island:opacity:set', 1, 'invoke'],
  ['expandMouseleaveIdleGet', 'island:expand-mouseleave-idle:get', 0, 'invoke'],
  ['expandMouseleaveIdleSet', 'island:expand-mouseleave-idle:set', 1, 'invoke'],
  ['maxexpandMouseleaveIdleGet', 'island:maxexpand-mouseleave-idle:get', 0, 'invoke'],
  ['maxexpandMouseleaveIdleSet', 'island:maxexpand-mouseleave-idle:set', 1, 'invoke'],
  ['idleClickExpandGet', 'island:idle-click-expand:get', 0, 'invoke'],
  ['idleClickExpandSet', 'island:idle-click-expand:set', 1, 'invoke'],
  ['springAnimationGet', 'island:spring-animation:get', 0, 'invoke'],
  ['springAnimationSet', 'island:spring-animation:set', 1, 'invoke'],
  ['animationSpeedGet', 'island:animation-speed:get', 0, 'invoke'],
  ['animationSpeedSet', 'island:animation-speed:set', 1, 'invoke'],
  ['shapeModeGet', 'island:shape-mode:get', 0, 'invoke'],
  ['shapeModeSet', 'island:shape-mode:set', 1, 'invoke'],
  ['clipboardReadText', 'clipboard:read-text', 0, 'invoke'],
  ['clipboardWriteText', 'clipboard:write-text', 1, 'invoke'],
  ['clipboardUrlMonitorGet', 'clipboard:url-monitor:get', 0, 'invoke'],
  ['clipboardUrlMonitorSet', 'clipboard:url-monitor:set', 1, 'invoke'],
  ['clipboardUrlDetectModeGet', 'clipboard:url-detect-mode:get', 0, 'invoke'],
  ['clipboardUrlDetectModeSet', 'clipboard:url-detect-mode:set', 1, 'invoke'],
  ['clipboardUrlBlacklistGet', 'clipboard:url-blacklist:get', 0, 'invoke'],
  ['clipboardUrlBlacklistSet', 'clipboard:url-blacklist:set', 1, 'invoke'],
  ['clipboardUrlBlacklistAddDomain', 'clipboard:url-blacklist:add-domain', 1, 'invoke'],
  ['autostartGet', 'island:autostart:get', 0, 'invoke'],
  ['autostartSet', 'island:autostart:set', 1, 'invoke'],
  ['navOrderGet', 'island:nav-order:get', 0, 'invoke'],
  ['navOrderSet', 'island:nav-order:set', 1, 'invoke'],
  ['downloadStart', 'download:start', 1, 'invoke'],
  ['downloadCancel', 'download:cancel', 1, 'invoke'],
  ['downloadPause', 'download:pause', 1, 'invoke'],
  ['downloadResume', 'download:resume', 1, 'invoke'],
  ['downloadRemove', 'download:remove', 1, 'invoke'],
  ['downloadList', 'download:list', 0, 'invoke'],
  ['downloadPickSavePath', 'download:pick-save-path', 1, 'invoke'],
  ['downloadGetDefaultDir', 'download:get-default-dir', 0, 'invoke'],
  ['updaterCheck', 'updater:check', 2, 'invoke'],
  ['updaterDownload', 'updater:download', 2, 'invoke'],
  ['updaterInstall', 'updater:install', 0, 'invoke'],
  ['updaterVersion', 'updater:version', 0, 'invoke'],
  ['guideReset', 'guide:reset', 0, 'invoke'],
  ['clipboardOpenUrl', 'clipboard:open-url', 1, 'invoke'],
  ['claudeCodeStatusGet', 'claude-code:status:get', 0, 'invoke'],
  ['claudeCodeHookInstall', 'claude-code:hook:install', 0, 'invoke'],
  ['claudeCodeHookUninstall', 'claude-code:hook:uninstall', 0, 'invoke'],
  ['claudeCodeEventsClear', 'claude-code:events:clear', 0, 'invoke'],
  ['claudeCodeSessionsDelete', 'claude-code:sessions:delete', 1, 'invoke'],
  ['claudeCodePermissionResolve', 'claude-code:permission:resolve', 2, 'invoke'],
  ['codexStatusGet', 'codex:status:get', 0, 'invoke'],
  ['codexMonitorEnable', 'codex:monitor:enable', 0, 'invoke'],
  ['codexMonitorDisable', 'codex:monitor:disable', 0, 'invoke'],
  ['codexEventsClear', 'codex:events:clear', 0, 'invoke'],
  ['codexSessionsDelete', 'codex:sessions:delete', 1, 'invoke']
] as const satisfies readonly (readonly [string, string, number, 'invoke' | 'send'])[];

const LISTENER_ROUTES = [
  ['onIslandPositionOffsetChanged', 'window:island-position:changed', 1, false],
  ['onOllamaChatEvent', 'ollama:chat:event:', 1, true],
  ['onCustomDirectChatEvent', 'customDirect:chat:event:', 1, true],
  ['onNowPlayingInfo', 'nowplaying:info', 1, false],
  ['onImageCompressionTaskUpdated', 'image-compression:task-updated', 1, false],
  ['onAgentVoiceInputState', 'agent-voice-input:state', 1, false],
  ['onPassthroughLockChanged', 'window:passthrough-lock-changed', 1, false],
  ['onSourceSwitchRequest', 'media:source-switch-request', 1, false],
  ['onSettingsChanged', 'settings:changed', 2, false],
  ['onShapeModeChanged', 'island:shape-mode:changed', 3, false],
  ['onDownloadTaskUpdated', 'download:task-updated', 1, false],
  ['onUpdaterProgress', 'updater:download-progress', 1, false],
  ['onUpdaterDownloaded', 'updater:update-downloaded', 1, false],
  ['onUpdaterAvailable', 'updater:update-available', 1, false],
  ['onUpdaterNotAvailable', 'updater:update-not-available', 1, false],
  ['onUpdaterStartupAutoCheckRequest', 'updater:startup-auto-check-request', 1, false],
  ['onClipboardUrlsDetected', 'clipboard:urls-detected', 1, false],
  ['onExternalAgentStarted', 'external-agent:started', 1, false],
  ['onExternalAgentStopped', 'external-agent:stopped', 1, false],
  ['onClaudeCodeStatusUpdated', 'claude-code:status-updated', 1, false],
  ['onCodexStatusUpdated', 'codex:status-updated', 1, false]
] as const satisfies readonly (readonly [string, string, number, boolean])[];

beforeAll(async () => {
  Object.defineProperty(process, 'contextIsolated', {
    configurable: true,
    value: true
  });
  await import('../index');
});

afterAll(() => {
  if (isolation) {
    Object.defineProperty(process, 'contextIsolated', isolation);
  } else {
    Reflect.deleteProperty(process, 'contextIsolated');
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockReset();
  mocks.listeners.clear();
  mocks.remove.mockImplementation((channel, handler) => {
    mocks.listeners.get(channel)?.delete(handler);
  });
});

describe('全部预加载API传输契约', () => {
  it('250个公开API均在通道、监听或文件桥接清单中，防止漏测新入口', () => {
    expect(Object.keys(mocks.api).sort()).toEqual([
      ...TRANSPORT_ROUTES.map((route) => route[0]),
      ...LISTENER_ROUTES.map((route) => route[0]),
      'storeRead',
      'getPathForFile'
    ].sort());
  });

  it.each(TRANSPORT_ROUTES)('%s转发到%s且参数顺序和返回值保持一致', async (name, channel, count, kind) => {
    const args: unknown[] = Array.from({
      length: count
    }, (value, index) => {
      void value;
      return {
        transportArgument: index
      };
    });
    const payload = {
      transportResult: true
    };
    mocks.invoke.mockResolvedValueOnce(payload);
    const result = mocks.api[name](...args);
    const transport = kind === 'invoke' ? mocks.invoke : mocks.send;
    expect(transport).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledWith(channel, ...args);
    if (kind === 'invoke') {
      expect(await Promise.resolve(result)).toBe(payload);
    } else {
      expect(result).toBeUndefined();
    }
  });

  it.each(LISTENER_ROUTES)('%s监听%s仅转发业务载荷，取消订阅只释放自己的handler', (name, prefix, count, sessionScoped) => {
    const callback = vi.fn();
    const other = vi.fn();
    const args: unknown[] = sessionScoped ? ['session-a', callback] : [callback];
    const unsubscribe = mocks.api[name](...args) as () => void;
    mocks.api[name](...(sessionScoped ? ['session-b', other] : [other]));
    const channel = prefix + (sessionScoped ? 'session-a' : '');
    const handlers = [...(mocks.listeners.get(channel) ?? [])];
    const [own] = handlers;
    const payload = Array.from({
      length: count
    }, (value, index) => {
      void value;
      return {
        payloadArgument: index
      };
    });
    own({
      eventOnly: true
    }, ...payload);
    expect(callback).toHaveBeenCalledWith(...payload);
    expect(callback).toHaveBeenCalledOnce();
    expect(other).not.toHaveBeenCalled();
    unsubscribe();
    expect(mocks.remove).toHaveBeenCalledWith(channel, own);
    expect(mocks.listeners.get(channel)?.has(own)).toBe(false);
    const remainingChannel = prefix + (sessionScoped ? 'session-b' : '');
    expect(mocks.listeners.get(remainingChannel)?.size).toBe(1);
  });

  it.each(TRANSPORT_ROUTES.filter((route) => route[1].startsWith('window:') && route[3] === 'send' && route[2] === 1))('%s未传延时使用0', (name, channel) => {
    mocks.api[name]();
    expect(mocks.send).toHaveBeenCalledWith(channel, 0);
  });

  it('性能采样默认请求硬件选项，也可显式关闭', async () => {
    mocks.invoke.mockResolvedValue(null);
    await Promise.resolve(mocks.api.getPerformanceSnapshot());
    expect(mocks.invoke).toHaveBeenLastCalledWith('system:performance-snapshot:get', undefined, true);
    await Promise.resolve(mocks.api.getPerformanceSnapshot({
      cpu: 'cpu'
    }, false));
    expect(mocks.invoke).toHaveBeenLastCalledWith('system:performance-snapshot:get', {
      cpu: 'cpu'
    }, false);
  });

  it.each([undefined, false, true])('storeRead strict=%s保留严格读取的通道参数契约', async (strict) => {
    mocks.invoke.mockResolvedValue(null);
    expect(await Promise.resolve(mocks.api.storeRead('key', strict))).toBeNull();
    expect(mocks.invoke).toHaveBeenCalledWith('store:read', 'key', ...(strict ? [true] : []));
  });

  it.each(['getWindowBounds', 'storeWrite', 'downloadStart'] as const)('%s原样传播主进程拒绝', async (name) => {
    mocks.invoke.mockRejectedValueOnce(new Error('IPC failure'));
    await expect(Promise.resolve(mocks.api[name]({
      transportArgument: 1
    }))).rejects.toThrow('IPC failure');
  });

  it('File经webUtils转换为本地路径，不读取file.path', () => {
    const file = new File(['content'], 'file.txt');
    expect(mocks.api.getPathForFile(file)).toBe('C:/file.txt');
    expect(mocks.path).toHaveBeenCalledWith(file);
  });
});
