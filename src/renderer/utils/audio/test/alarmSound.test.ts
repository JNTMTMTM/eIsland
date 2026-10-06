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
 * @file alarmSound.test.ts
 * @description 系统闹钟铃声枚举、默认项与非法值标准化测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import {
  normalizeSystemAlarmRingtone,
  SystemAlarmRingtone,
  DEFAULT_SYSTEM_ALARM_RINGTONE,
  ALARM_SOUND_STOP_EVENT,
  SYSTEM_ALARM_RINGTONE_OPTIONS,
} from '../alarmSound';

vi.mock('../volume', () => ({
  readEffectiveAudioVolume: vi.fn(async () => 1),
}));

vi.stubGlobal(
  'HTMLAudioElement',
  class {
    src = '';
    preload = '';
    loop = false;
    volume = 1;
    currentTime = 0;
    duration = 100;
    paused = true;
    onended: (() => void) | null = null;
    play = vi.fn(async () => {});
    pause = vi.fn(() => {});
  },
);

vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
  cb(performance.now());
  return 1;
}));

vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('normalizeSystemAlarmRingtone', () => {
  it('returns itself for valid enum values', () => {
    expect(normalizeSystemAlarmRingtone(SystemAlarmRingtone.ALARM_1)).toBe(SystemAlarmRingtone.ALARM_1);
    expect(normalizeSystemAlarmRingtone(SystemAlarmRingtone.ALARM_2)).toBe(SystemAlarmRingtone.ALARM_2);
    expect(normalizeSystemAlarmRingtone(SystemAlarmRingtone.ALARM_3)).toBe(SystemAlarmRingtone.ALARM_3);
  });

  it('returns default for invalid values', () => {
    expect(normalizeSystemAlarmRingtone(null)).toBe(DEFAULT_SYSTEM_ALARM_RINGTONE);
    expect(normalizeSystemAlarmRingtone(undefined)).toBe(DEFAULT_SYSTEM_ALARM_RINGTONE);
    expect(normalizeSystemAlarmRingtone('')).toBe(DEFAULT_SYSTEM_ALARM_RINGTONE);
    expect(normalizeSystemAlarmRingtone('random')).toBe(DEFAULT_SYSTEM_ALARM_RINGTONE);
    expect(normalizeSystemAlarmRingtone(123)).toBe(DEFAULT_SYSTEM_ALARM_RINGTONE);
  });
});

describe('SystemAlarmRingtone enum', () => {
  it('has correct values', () => {
    expect(SystemAlarmRingtone.ALARM_1).toBe('alarm-1');
    expect(SystemAlarmRingtone.ALARM_2).toBe('alarm-2');
    expect(SystemAlarmRingtone.ALARM_3).toBe('alarm-3');
  });
});

describe('DEFAULT_SYSTEM_ALARM_RINGTONE', () => {
  it('is SystemAlarmRingtone.ALARM_1', () => {
    expect(DEFAULT_SYSTEM_ALARM_RINGTONE).toBe(SystemAlarmRingtone.ALARM_1);
  });
});

describe('ALARM_SOUND_STOP_EVENT', () => {
  it('is "alarm-sound-stop"', () => {
    expect(ALARM_SOUND_STOP_EVENT).toBe('alarm-sound-stop');
  });
});

describe('SYSTEM_ALARM_RINGTONE_OPTIONS', () => {
  it('has 3 items with correct structure', () => {
    expect(SYSTEM_ALARM_RINGTONE_OPTIONS).toHaveLength(3);
    SYSTEM_ALARM_RINGTONE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('src');
      expect(option).toHaveProperty('labelKey');
      expect(option).toHaveProperty('defaultLabel');
      expect(typeof option.value).toBe('string');
      expect(typeof option.src).toBe('string');
      expect(typeof option.labelKey).toBe('string');
      expect(typeof option.defaultLabel).toBe('string');
    });
    expect(SYSTEM_ALARM_RINGTONE_OPTIONS[0].value).toBe(SystemAlarmRingtone.ALARM_1);
    expect(SYSTEM_ALARM_RINGTONE_OPTIONS[1].value).toBe(SystemAlarmRingtone.ALARM_2);
    expect(SYSTEM_ALARM_RINGTONE_OPTIONS[2].value).toBe(SystemAlarmRingtone.ALARM_3);
  });
});
