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
 * @file useSliderCaptchaDerived.test.ts
 * @description 验证滑块验证码进度边界、随机算式、追踪号与真实 memo 依赖缓存。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle } from '../../../../components/test/contentLifecycleHarness';
import { useSliderCaptchaDerived } from '../useSliderCaptchaDerived';
import type { UserCaptchaChallenge } from '../../../../../api/user/types/UserCaptcha';

vi.mock('react', async (load) => ({
  ...await load<typeof import('react')>(),
  ...lifecycleHooks,
}));

const challenge: UserCaptchaChallenge = {
  challengeId: ' challenge-abc ', minValue: 10, maxValue: 110,
  targetValue: 40, tolerance: 2, captchaSign: 'signed',
};

describe('useSliderCaptchaDerived 的真实派生与缓存', () => {
  beforeEach(() => {
    resetLifecycle();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it.each([[0, 0], [10, 0], [60, 50], [110, 100], [150, 100]])('数值 %i 限制进度为 %i', (value, progress) => {
    const result = renderWithHooks(() => useSliderCaptchaDerived(challenge, value));
    expect(result.sliderProgress).toBe(progress);
    expect(result.sliderStyle).toEqual({ '--slider-progress': `${String(progress)  }%` });
    expect(result.challengeExpression).toBe('20 + 20');
    expect(result.traceCode).toBe('CHALLENGE-ABC');
  });

  it.each([10, 5])('无正数区间时进度保持零，max=%i', (maxValue) => {
    // eslint-disable-next-line prefer-object-spread -- 最大值覆盖基础挑战，不能因简写排序覆盖回原值。
    const input = Object.assign({}, challenge, { maxValue });
    expect(renderWithHooks(() => useSliderCaptchaDerived(input, 60)).sliderProgress).toBe(0);
  });

  it('只在挑战标识或目标改变时重新随机，进度样式复用稳定依赖', () => {
    const first = renderWithHooks(() => useSliderCaptchaDerived(challenge, 60));
    const same = renderWithHooks(() => useSliderCaptchaDerived(challenge, 60));
    expect(same.sliderStyle).toBe(first.sliderStyle);
    renderWithHooks(() => useSliderCaptchaDerived(challenge, 70));
    expect(Math.random).toHaveBeenCalledTimes(1);
    vi.mocked(Math.random).mockReturnValue(0);
    const changed = { ...challenge, challengeId: 'next' };
    expect(renderWithHooks(() => useSliderCaptchaDerived(changed, 70)).challengeExpression).toBe('0 + 40');
    const zero = { ...changed, targetValue: 0 };
    expect(renderWithHooks(() => useSliderCaptchaDerived(zero, 70)).challengeExpression).toBe('0 + 0');
    expect(Math.random).toHaveBeenCalledTimes(3);
  });

  it('空白挑战号呈现占位符，随机值的上界仍保持加数和等于目标', () => {
    vi.mocked(Math.random).mockReturnValue(0.99999);
    const input = { ...challenge, challengeId: '   ' };
    const result = renderWithHooks(() => useSliderCaptchaDerived(input, 10));
    expect(result.traceCode).toBe('--');
    expect(result.challengeExpression).toBe('40 + 0');
  });
});
