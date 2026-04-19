import { createUserEmailCaptchaChallenge, fetchUserEmailCaptchaConfig, type UserEmailCaptchaChallenge } from '../api/userAccountApi';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { SliderCaptchaContent } from '../components/states/sliderCaptcha/SliderCaptchaContent';

function showBuiltinSliderModal(challenge: UserEmailCaptchaChallenge): Promise<number | null> {
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

export async function runEmailSliderCaptcha(account: string): Promise<{ ticket: string; randstr: string } | null> {
  const cfg = await fetchUserEmailCaptchaConfig();
  if (!cfg.ok || !cfg.data) {
    throw new Error(cfg.message || '获取滑块配置失败');
  }
  if (!cfg.data.enabled) {
    return { ticket: '', randstr: '' };
  }
  if (cfg.data.provider !== 'builtin') {
    throw new Error('暂不支持的滑块验证提供方');
  }
  const challengeResult = await createUserEmailCaptchaChallenge(account);
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
  };
}
