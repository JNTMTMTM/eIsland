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
 */

/**
 * @file SliderCaptchaContent.tsx
 * @description 滑块验证码状态界面组件。
 * @description 负责展示挑战信息、滑块输入及确认/取消交互。
 * @author 鸡哥
 */

import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { UserEmailCaptchaChallenge } from '../../../api/userAccountApi';
import '../../../styles/slider-captcha.css';
import eislandLogo from '../../../../../resources/icon/eisland.svg';

interface SliderCaptchaContentProps {
  challenge: UserEmailCaptchaChallenge;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}

/**
 * 渲染滑块验证码弹层组件。
 * @param challenge - 服务端下发的滑块挑战参数。
 * @param onCancel - 用户取消验证时的回调。
 * @param onConfirm - 用户确认验证时的回调，参数为当前滑块值。
 * @returns 滑块验证界面节点。
 */
export function SliderCaptchaContent({ challenge, onCancel, onConfirm }: SliderCaptchaContentProps): ReactElement {
  const [value, setValue] = useState(challenge.minValue);
  const [closing, setClosing] = useState(false);

  const sliderProgress = useMemo(() => {
    const range = challenge.maxValue - challenge.minValue;
    if (range <= 0) {
      return 0;
    }
    const progress = ((value - challenge.minValue) / range) * 100;
    return Math.max(0, Math.min(100, progress));
  }, [challenge.maxValue, challenge.minValue, value]);

  const sliderStyle = useMemo(() => ({
    '--slider-progress': `${sliderProgress}%`,
  }) as CSSProperties, [sliderProgress]);

  const challengeExpression = useMemo(() => {
    const target = challenge.targetValue;
    const useAddition = Math.random() >= 0.5;
    if (useAddition && target >= 0) {
      const left = Math.floor(Math.random() * (target + 1));
      const right = target - left;
      return `${left} + ${right}`;
    }
    const right = Math.floor(Math.random() * 20) + 1;
    const left = target + right;
    return `${left} - ${right}`;
  }, [challenge.challengeId, challenge.targetValue]);

  const traceCode = useMemo(() => {
    const challengeId = challenge.challengeId?.trim();
    if (!challengeId) {
      return '--';
    }
    return challengeId.toUpperCase();
  }, [challenge.challengeId]);

  const closeWithAnimation = (handler: () => void): void => {
    if (closing) {
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      handler();
    }, 180);
  };

  return (
    <div
      className={`slider-captcha-overlay${closing ? ' is-closing' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeWithAnimation(onCancel);
        }
      }}
    >
      <div className={`slider-captcha-card${closing ? ' is-closing' : ''}`}>
        <div className="slider-captcha-brand">
          <img className="slider-captcha-brand-logo" src={eislandLogo} alt="eIsland" />
          <div className="slider-captcha-brand-texts">
            <div className="slider-captcha-title">滑块验证</div>
            <div className="slider-captcha-subtitle">由 Pyisland Server & eIsland 提供质询服务</div>
          </div>
        </div>
        <div className="slider-captcha-hint">请先计算下方算式结果，再将滑块拖到对应值</div>
        <div className="slider-captcha-subtitle slider-captcha-trace-code" title={challenge.challengeId || undefined}>
          traceCode: {traceCode}
        </div>
        <div className="slider-captcha-equation-row">
          <span className="slider-captcha-equation-label">算式挑战</span>
          <span className="slider-captcha-equation-value">{challengeExpression}</span>
        </div>
        <div className="slider-captcha-value">当前值：{value}</div>
        <input
          className="slider-captcha-range"
          type="range"
          min={challenge.minValue}
          max={challenge.maxValue}
          step={1}
          value={value}
          style={sliderStyle}
          onChange={(event) => setValue(Number(event.target.value))}
        />
        <div className="slider-captcha-actions">
          <button
            className="slider-captcha-btn slider-captcha-btn-cancel"
            type="button"
            onClick={() => closeWithAnimation(onCancel)}
          >
            取消
          </button>
          <button
            className="slider-captcha-btn slider-captcha-btn-confirm"
            type="button"
            onClick={() => closeWithAnimation(() => onConfirm(value))}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
