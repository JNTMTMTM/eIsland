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
 * @file alarmEditor.test.tsx
 * @description AlarmEditor 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { stopPreviewAlarmSound, subscribePreviewAlarmSoundState, SystemAlarmRingtone } from '../../../../../../../utils/audio/alarmSound';
import { AlarmEditor as Component } from '../AlarmEditor';
import { WheelPicker } from '../WheelPicker';
describe('AlarmEditor', () => {
  afterEach(() => { stopPreviewAlarmSound(); vi.unstubAllGlobals(); });
  const props = { adding: true, visible: true, hour: 8, minute: 5, second: 3, repeat: [0], ringtone: 'default', loop: true, repeatSummary: () => 'Sunday', weekdayLabel: (day: number) => String(day), setHour: vi.fn(), setLabel: vi.fn(), setRepeat: vi.fn(), setLoop: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
  it('renders bounded time wheels and adding or editing preview labels', () => {
    const tree = render(Component, props);
    expect(nodes(tree, WheelPicker)).toHaveLength(3);
    expect(value(tree, WheelPicker, 'max')).toBe(23);
    expect(value(tree, WheelPicker, 'max', 1)).toBe(59);
    expect(value(tree, WheelPicker, 'onChange')).toBe(props.setHour);
    expect(text(tree)).toContain('maxExpand.alarm.newTitle');
    const editing = render(Component, { ...props, adding: false, visible: false, previewPlaying: true });
    expect(text(editing)).toContain('maxExpand.alarm.editTitle');
    expect(text(editing)).toContain('maxExpand.alarm.pausePreviewRingtone');
    expect(nodes(editing, '.alarm-editor-panel--visible')).toHaveLength(0);
  });
  it('toggles weekday, label and loop and routes save and cancel', () => {
    const tree = render(Component, props);
    trigger(tree, '.alarm-weekday-btn', 'onClick');
    expect(props.setRepeat).toHaveBeenCalledWith([0, 1]);
    trigger(tree, '.alarm-editor-label-input', 'onChange', { target: { value: 'Wake' } });
    (value(tree, 'input', 'onChange', 1) as (event: unknown) => void)({ target: { checked: false } });
    expect(props.setLabel).toHaveBeenCalledWith('Wake');
    expect(props.setLoop).toHaveBeenCalledWith(false);
    trigger(tree, '.alarm-editor-save-btn', 'onClick');
    trigger(tree, '.alarm-editor-cancel-btn', 'onClick');
    expect(props.onSave).toHaveBeenCalledOnce();
    expect(props.onCancel).toHaveBeenCalledOnce();
  });

  it('selects a system ringtone and toggles its real audio preview through the button', async () => {
    const audio = {
      src: '', preload: '', volume: 1, currentTime: 0, duration: 10, paused: true, loop: false,
      play: vi.fn(() => { audio.paused = false; return Promise.resolve(); }),
      pause: vi.fn(() => { audio.paused = true; }),
    };
    vi.stubGlobal('Audio', class AudioConstructor {
      /**
       * 记录真实预览模块交给浏览器的资源路径。
       * @param src - 系统铃声地址。
       */
      constructor(src: string) {
        audio.src = src;
        return audio;
      }
    });
    vi.stubGlobal('window', {
      api: { storeRead: vi.fn().mockResolvedValue(.8) },
      requestAnimationFrame: vi.fn().mockReturnValue(1), cancelAnimationFrame: vi.fn(),
    });
    const states: boolean[] = [];
    const unsubscribe = subscribePreviewAlarmSoundState((state) => states.push(state.playing));
    const setRingtone = vi.fn();
    const tree = render(Component, { setRingtone, ...props, ringtone: SystemAlarmRingtone.ALARM_1 });
    const options = nodes(tree, '.alarm-editor-ringtone-btn');
    (options[1].props.onClick as () => void)();
    expect(setRingtone).toHaveBeenCalledExactlyOnceWith(SystemAlarmRingtone.ALARM_2);
    const selected = render(Component, { setRingtone, ...props, ringtone: SystemAlarmRingtone.ALARM_2 });
    trigger(selected, '.alarm-editor-preview-btn', 'onClick');
    await Array.from({ length: 10 }).reduce<Promise<void>>((pending) => pending.then(() => undefined), Promise.resolve());
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.src).toContain('ALARM_2.wav');
    expect(states.at(-1)).toBe(true);
    trigger(selected, '.alarm-editor-preview-btn', 'onClick');
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(states.at(-1)).toBe(false);
    unsubscribe();
  });
});
