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
 * @file index.ts
 * @description 渲染端滑块验证码流程封装
 * @author 鸡哥
 */

import { createUserCaptchaChallenge, fetchUserCaptchaConfig, type UserCaptchaChallenge } from '../../api/user/userAccountApi';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { SliderCaptchaContent } from '../../components/states/sliderCaptcha/SliderCaptchaContent';

function showBuiltinSliderModal(challenge: UserCaptchaChallenge): Promise<number | null> {
  return new Promise((resolve) => {
    const mountNode = document.createElement('div');
    const modalHost = document.querySelector('.island-shell') ?? document.body;
    modalHost.appendChild(mountNode);
    const root = createRoot(mountNode);

    const close = (value: number | null): void => {
      root.unmount();
      mountNode.remove();
      resolve(value);
    };

    root.render(createElement(SliderCaptchaContent, {
      challenge,
      onCancel: () => close(null),
      onConfirm: (value: number) => close(value),
    }));
  });
}

/**
 * 执行滑块验证流程
 * @param account - 当前进行验证的账号标识
 * @returns 验证成功返回 ticket、randstr 与短期签名，取消返回 null
 */
export async function runSliderCaptcha(account: string): Promise<{ ticket: string; randstr: string; sign: string } | null> {
  const cfg = await fetchUserCaptchaConfig();
  if (!cfg.ok || !cfg.data) {
    throw new Error(cfg.message || '获取滑块配置失败');
  }
  if (!cfg.data.enabled) {
    return { ticket: '', randstr: '', sign: '' };
  }
  if (cfg.data.provider !== 'builtin') {
    throw new Error('暂不支持的滑块验证提供方');
  }
  const challengeResult = await createUserCaptchaChallenge(account);
  if (!challengeResult.ok || !challengeResult.data) {
    throw new Error(challengeResult.message || '获取滑块挑战失败');
  }
  const answer = await showBuiltinSliderModal(challengeResult.data);
  if (answer === null) {
    return null;
  }
  return {
    ticket: challengeResult.data.challengeId,
    randstr: String(answer),
    sign: challengeResult.data.captchaSign,
  };
}
