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
 * @file useSettingsShortcuts.ts
 * @description 快捷键录入状态、冲突检测与注册操作
 * @author 鸡哥
 */

import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

import type { useTranslation } from 'react-i18next';
import type { HotkeyBinding } from '../config/hotkeyConfig';
import { isDuplicateHotkey } from '../utils/isDuplicateHotkey';
import { keyEventToAccelerator } from '../utils/keyEventToAccelerator';

interface SettingsShortcutsOptions {
  t: ReturnType<typeof useTranslation>['t'];
}

/**
 * 快捷键录入状态、冲突检测与注册操作。
 * @param options - 当前设置上下文
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsShortcuts(options: SettingsShortcutsOptions) {
  const { t } = options;

  /** 快捷键相关状态 */
  const [hideHotkey, setHideHotkey] = useState<string>('Alt+X');
  const [hotkeyRecording, setHotkeyRecording] = useState(false);
  const [hotkeyError, setHotkeyError] = useState<string>('');
  const hotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 关闭快捷键相关状态 */
  const [quitHotkey, setQuitHotkey] = useState<string>('Alt+C');
  const [quitHotkeyRecording, setQuitHotkeyRecording] = useState(false);
  const [quitHotkeyError, setQuitHotkeyError] = useState<string>('');
  const quitHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 截图快捷键相关状态 */
  const [screenshotHotkey, setScreenshotHotkey] = useState<string>('Alt+A');
  const [screenshotHotkeyRecording, setScreenshotHotkeyRecording] = useState(false);
  const [screenshotHotkeyError, setScreenshotHotkeyError] = useState<string>('');
  const screenshotHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切歌快捷键相关状态 */
  const [nextSongHotkey, setNextSongHotkey] = useState<string>('');
  const [nextSongHotkeyRecording, setNextSongHotkeyRecording] = useState(false);
  const [nextSongHotkeyError, setNextSongHotkeyError] = useState<string>('');
  const nextSongHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 暂停/播放快捷键相关状态 */
  const [playPauseSongHotkey, setPlayPauseSongHotkey] = useState<string>('');
  const [playPauseSongHotkeyRecording, setPlayPauseSongHotkeyRecording] = useState(false);
  const [playPauseSongHotkeyError, setPlayPauseSongHotkeyError] = useState<string>('');
  const playPauseSongHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 还原默认位置快捷键相关状态 */
  const [resetPositionHotkey, setResetPositionHotkey] = useState<string>('');
  const [resetPositionHotkeyRecording, setResetPositionHotkeyRecording] = useState(false);
  const [resetPositionHotkeyError, setResetPositionHotkeyError] = useState<string>('');
  const resetPositionHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换托盘图标快捷键相关状态 */
  const [toggleTrayHotkey, setToggleTrayHotkey] = useState<string>('');
  const [toggleTrayHotkeyRecording, setToggleTrayHotkeyRecording] = useState(false);
  const [toggleTrayHotkeyError, setToggleTrayHotkeyError] = useState<string>('');
  const toggleTrayHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 显示配置窗口快捷键相关状态 */
  const [showSettingsWindowHotkey, setShowSettingsWindowHotkey] = useState<string>('');
  const [showSettingsWindowHotkeyRecording, setShowSettingsWindowHotkeyRecording] = useState(false);
  const [showSettingsWindowHotkeyError, setShowSettingsWindowHotkeyError] = useState<string>('');
  const showSettingsWindowHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 打开剪贴板历史快捷键相关状态 */
  const [openClipboardHistoryHotkey, setOpenClipboardHistoryHotkey] = useState<string>('');
  const [openClipboardHistoryHotkeyRecording, setOpenClipboardHistoryHotkeyRecording] = useState(false);
  const [openClipboardHistoryHotkeyError, setOpenClipboardHistoryHotkeyError] = useState<string>('');
  const openClipboardHistoryHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换鼠标穿透快捷键相关状态 */
  const [togglePassthroughHotkey, setTogglePassthroughHotkey] = useState<string>('');
  const [togglePassthroughHotkeyRecording, setTogglePassthroughHotkeyRecording] = useState(false);
  const [togglePassthroughHotkeyError, setTogglePassthroughHotkeyError] = useState<string>('');
  const togglePassthroughHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换 UI 状态锁定快捷键相关状态 */
  const [toggleUiLockHotkey, setToggleUiLockHotkey] = useState<string>('');
  const [toggleUiLockHotkeyRecording, setToggleUiLockHotkeyRecording] = useState(false);
  const [toggleUiLockHotkeyError, setToggleUiLockHotkeyError] = useState<string>('');
  const toggleUiLockHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** Agent 语音输入快捷键相关状态 */
  const [agentVoiceInputHotkey, setAgentVoiceInputHotkey] = useState<string>('');
  const [agentVoiceInputHotkeyRecording, setAgentVoiceInputHotkeyRecording] = useState(false);
  const [agentVoiceInputHotkeyError, setAgentVoiceInputHotkeyError] = useState<string>('');
  const agentVoiceInputHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换形态模式快捷键相关状态 */
  const [toggleShapeModeHotkey, setToggleShapeModeHotkey] = useState<string>('');
  const [toggleShapeModeHotkeyRecording, setToggleShapeModeHotkeyRecording] = useState(false);
  const [toggleShapeModeHotkeyError, setToggleShapeModeHotkeyError] = useState<string>('');
  const toggleShapeModeHotkeyInputRef = useRef<HTMLInputElement>(null);
  const hotkeyBindings: HotkeyBinding[] = [
    { key: 'hide', value: hideHotkey },
    { key: 'quit', value: quitHotkey },
    { key: 'screenshot', value: screenshotHotkey },
    { key: 'next-song', value: nextSongHotkey },
    { key: 'play-pause-song', value: playPauseSongHotkey },
    { key: 'reset-position', value: resetPositionHotkey },
    { key: 'toggle-tray', value: toggleTrayHotkey },
    { key: 'show-settings-window', value: showSettingsWindowHotkey },
    { key: 'open-clipboard-history', value: openClipboardHistoryHotkey },
    { key: 'toggle-passthrough', value: togglePassthroughHotkey },
    { key: 'toggle-ui-lock', value: toggleUiLockHotkey },
    { key: 'agent-voice-input', value: agentVoiceInputHotkey },
    { key: 'toggle-shape-mode', value: toggleShapeModeHotkey },
  ];

  /**
   * 隐藏快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'hide', hotkeyBindings)) {
      setHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setHotkeyRecording(false);
      hotkeyInputRef.current?.blur();
      return;
    }

    window.api.hotkeySet(acc).then((ok) => {
      if (ok) {
        setHideHotkey(acc);
        setHotkeyRecording(false);
        hotkeyInputRef.current?.blur();
      } else {
        setHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 关闭快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleQuitHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setQuitHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'quit', hotkeyBindings)) {
      setQuitHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setQuitHotkeyRecording(false);
      quitHotkeyInputRef.current?.blur();
      return;
    }

    window.api.quitHotkeySet(acc).then((ok) => {
      if (ok) {
        setQuitHotkey(acc);
        setQuitHotkeyRecording(false);
        quitHotkeyInputRef.current?.blur();
      } else {
        setQuitHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setQuitHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 截图快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleScreenshotHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setScreenshotHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'screenshot', hotkeyBindings)) {
      setScreenshotHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setScreenshotHotkeyRecording(false);
      screenshotHotkeyInputRef.current?.blur();
      return;
    }

    window.api.screenshotHotkeySet(acc).then((ok) => {
      if (ok) {
        setScreenshotHotkey(acc);
        setScreenshotHotkeyRecording(false);
        screenshotHotkeyInputRef.current?.blur();
      } else {
        setScreenshotHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setScreenshotHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 还原位置快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleResetPositionHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setResetPositionHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'reset-position', hotkeyBindings)) {
      setResetPositionHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setResetPositionHotkeyRecording(false);
      resetPositionHotkeyInputRef.current?.blur();
      return;
    }

    window.api.resetPositionHotkeySet(acc).then((ok) => {
      if (ok) {
        setResetPositionHotkey(acc);
        setResetPositionHotkeyRecording(false);
        resetPositionHotkeyInputRef.current?.blur();
      } else {
        setResetPositionHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setResetPositionHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 切换托盘图标快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleToggleTrayHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleTrayHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-tray', hotkeyBindings)) {
      setToggleTrayHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setToggleTrayHotkeyRecording(false);
      toggleTrayHotkeyInputRef.current?.blur();
      return;
    }

    window.api.toggleTrayHotkeySet(acc).then((ok) => {
      if (ok) {
        setToggleTrayHotkey(acc);
        setToggleTrayHotkeyRecording(false);
        toggleTrayHotkeyInputRef.current?.blur();
      } else {
        setToggleTrayHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setToggleTrayHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 显示配置窗口快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleShowSettingsWindowHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettingsWindowHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'show-settings-window', hotkeyBindings)) {
      setShowSettingsWindowHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setShowSettingsWindowHotkeyRecording(false);
      showSettingsWindowHotkeyInputRef.current?.blur();
      return;
    }

    window.api.showSettingsWindowHotkeySet(acc).then((ok) => {
      if (ok) {
        setShowSettingsWindowHotkey(acc);
        setShowSettingsWindowHotkeyRecording(false);
        showSettingsWindowHotkeyInputRef.current?.blur();
      } else {
        setShowSettingsWindowHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setShowSettingsWindowHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleOpenClipboardHistoryHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setOpenClipboardHistoryHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'open-clipboard-history', hotkeyBindings)) {
      setOpenClipboardHistoryHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setOpenClipboardHistoryHotkeyRecording(false);
      openClipboardHistoryHotkeyInputRef.current?.blur();
      return;
    }

    window.api.openClipboardHistoryHotkeySet(acc).then((ok) => {
      if (ok) {
        setOpenClipboardHistoryHotkey(acc);
        setOpenClipboardHistoryHotkeyRecording(false);
        openClipboardHistoryHotkeyInputRef.current?.blur();
      } else {
        setOpenClipboardHistoryHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setOpenClipboardHistoryHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleTogglePassthroughHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setTogglePassthroughHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-passthrough', hotkeyBindings)) {
      setTogglePassthroughHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setTogglePassthroughHotkeyRecording(false);
      togglePassthroughHotkeyInputRef.current?.blur();
      return;
    }

    window.api.togglePassthroughHotkeySet(acc).then((ok) => {
      if (ok) {
        setTogglePassthroughHotkey(acc);
        setTogglePassthroughHotkeyRecording(false);
        togglePassthroughHotkeyInputRef.current?.blur();
      } else {
        setTogglePassthroughHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setTogglePassthroughHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleToggleUiLockHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleUiLockHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-ui-lock', hotkeyBindings)) {
      setToggleUiLockHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setToggleUiLockHotkeyRecording(false);
      toggleUiLockHotkeyInputRef.current?.blur();
      return;
    }

    window.api.toggleUiLockHotkeySet(acc).then((ok) => {
      if (ok) {
        setToggleUiLockHotkey(acc);
        setToggleUiLockHotkeyRecording(false);
        toggleUiLockHotkeyInputRef.current?.blur();
      } else {
        setToggleUiLockHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setToggleUiLockHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleAgentVoiceInputHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setAgentVoiceInputHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'agent-voice-input', hotkeyBindings)) {
      setAgentVoiceInputHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setAgentVoiceInputHotkeyRecording(false);
      agentVoiceInputHotkeyInputRef.current?.blur();
      return;
    }

    window.api.agentVoiceInputHotkeySet(acc).then((ok) => {
      if (ok) {
        setAgentVoiceInputHotkey(acc);
        setAgentVoiceInputHotkeyRecording(false);
        agentVoiceInputHotkeyInputRef.current?.blur();
      } else {
        setAgentVoiceInputHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setAgentVoiceInputHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 切换形态模式快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleToggleShapeModeHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleShapeModeHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-shape-mode', hotkeyBindings)) {
      setToggleShapeModeHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setToggleShapeModeHotkeyRecording(false);
      toggleShapeModeHotkeyInputRef.current?.blur();
      return;
    }

    window.api.toggleShapeModeHotkeySet(acc).then((ok) => {
      if (ok) {
        setToggleShapeModeHotkey(acc);
        setToggleShapeModeHotkeyRecording(false);
        toggleShapeModeHotkeyInputRef.current?.blur();
      } else {
        setToggleShapeModeHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setToggleShapeModeHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleNextSongHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setNextSongHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'next-song', hotkeyBindings)) {
      setNextSongHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setNextSongHotkeyRecording(false);
      nextSongHotkeyInputRef.current?.blur();
      return;
    }

    window.api.nextSongHotkeySet(acc).then((ok) => {
      if (ok) {
        setNextSongHotkey(acc);
        setNextSongHotkeyRecording(false);
        nextSongHotkeyInputRef.current?.blur();
      } else {
        setNextSongHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setNextSongHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handlePlayPauseSongHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setPlayPauseSongHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'play-pause-song', hotkeyBindings)) {
      setPlayPauseSongHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setPlayPauseSongHotkeyRecording(false);
      playPauseSongHotkeyInputRef.current?.blur();
      return;
    }

    window.api.playPauseSongHotkeySet(acc).then((ok) => {
      if (ok) {
        setPlayPauseSongHotkey(acc);
        setPlayPauseSongHotkeyRecording(false);
        playPauseSongHotkeyInputRef.current?.blur();
      } else {
        setPlayPauseSongHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setPlayPauseSongHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  return {
    hideHotkey,
    setHideHotkey,
    hotkeyRecording,
    setHotkeyRecording,
    hotkeyError,
    setHotkeyError,
    hotkeyInputRef,
    quitHotkey,
    setQuitHotkey,
    quitHotkeyRecording,
    setQuitHotkeyRecording,
    quitHotkeyError,
    setQuitHotkeyError,
    quitHotkeyInputRef,
    screenshotHotkey,
    setScreenshotHotkey,
    screenshotHotkeyRecording,
    setScreenshotHotkeyRecording,
    screenshotHotkeyError,
    setScreenshotHotkeyError,
    screenshotHotkeyInputRef,
    nextSongHotkey,
    setNextSongHotkey,
    nextSongHotkeyRecording,
    setNextSongHotkeyRecording,
    nextSongHotkeyError,
    setNextSongHotkeyError,
    nextSongHotkeyInputRef,
    playPauseSongHotkey,
    setPlayPauseSongHotkey,
    playPauseSongHotkeyRecording,
    setPlayPauseSongHotkeyRecording,
    playPauseSongHotkeyError,
    setPlayPauseSongHotkeyError,
    playPauseSongHotkeyInputRef,
    resetPositionHotkey,
    setResetPositionHotkey,
    resetPositionHotkeyRecording,
    setResetPositionHotkeyRecording,
    resetPositionHotkeyError,
    setResetPositionHotkeyError,
    resetPositionHotkeyInputRef,
    toggleTrayHotkey,
    setToggleTrayHotkey,
    toggleTrayHotkeyRecording,
    setToggleTrayHotkeyRecording,
    toggleTrayHotkeyError,
    setToggleTrayHotkeyError,
    toggleTrayHotkeyInputRef,
    showSettingsWindowHotkey,
    setShowSettingsWindowHotkey,
    showSettingsWindowHotkeyRecording,
    setShowSettingsWindowHotkeyRecording,
    showSettingsWindowHotkeyError,
    setShowSettingsWindowHotkeyError,
    showSettingsWindowHotkeyInputRef,
    openClipboardHistoryHotkey,
    setOpenClipboardHistoryHotkey,
    openClipboardHistoryHotkeyRecording,
    setOpenClipboardHistoryHotkeyRecording,
    openClipboardHistoryHotkeyError,
    setOpenClipboardHistoryHotkeyError,
    openClipboardHistoryHotkeyInputRef,
    togglePassthroughHotkey,
    setTogglePassthroughHotkey,
    togglePassthroughHotkeyRecording,
    setTogglePassthroughHotkeyRecording,
    togglePassthroughHotkeyError,
    setTogglePassthroughHotkeyError,
    togglePassthroughHotkeyInputRef,
    toggleUiLockHotkey,
    setToggleUiLockHotkey,
    toggleUiLockHotkeyRecording,
    setToggleUiLockHotkeyRecording,
    toggleUiLockHotkeyError,
    setToggleUiLockHotkeyError,
    toggleUiLockHotkeyInputRef,
    agentVoiceInputHotkey,
    setAgentVoiceInputHotkey,
    agentVoiceInputHotkeyRecording,
    setAgentVoiceInputHotkeyRecording,
    agentVoiceInputHotkeyError,
    setAgentVoiceInputHotkeyError,
    agentVoiceInputHotkeyInputRef,
    toggleShapeModeHotkey,
    setToggleShapeModeHotkey,
    toggleShapeModeHotkeyRecording,
    setToggleShapeModeHotkeyRecording,
    toggleShapeModeHotkeyError,
    setToggleShapeModeHotkeyError,
    toggleShapeModeHotkeyInputRef,
    handleHotkeyKeyDown,
    handleQuitHotkeyKeyDown,
    handleScreenshotHotkeyKeyDown,
    handleResetPositionHotkeyKeyDown,
    handleToggleTrayHotkeyKeyDown,
    handleShowSettingsWindowHotkeyKeyDown,
    handleOpenClipboardHistoryHotkeyKeyDown,
    handleTogglePassthroughHotkeyKeyDown,
    handleToggleUiLockHotkeyKeyDown,
    handleAgentVoiceInputHotkeyKeyDown,
    handleToggleShapeModeHotkeyKeyDown,
    handleNextSongHotkeyKeyDown,
    handlePlayPauseSongHotkeyKeyDown,
  };
}
