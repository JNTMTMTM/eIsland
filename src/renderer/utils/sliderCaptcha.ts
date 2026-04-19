import { createUserEmailCaptchaChallenge, fetchUserEmailCaptchaConfig, type UserEmailCaptchaChallenge } from '../api/userAccountApi';

function showBuiltinSliderModal(challenge: UserEmailCaptchaChallenge): Promise<number | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '99999';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const card = document.createElement('div');
    card.style.width = 'min(360px, 86vw)';
    card.style.padding = '18px';
    card.style.borderRadius = '14px';
    card.style.background = '#0f1218';
    card.style.color = '#f5f7ff';
    card.style.boxShadow = '0 10px 35px rgba(0,0,0,0.35)';

    const title = document.createElement('div');
    title.textContent = '滑块验证';
    title.style.fontWeight = '700';
    title.style.marginBottom = '8px';

    const hint = document.createElement('div');
    hint.textContent = `请将滑块拖到目标值：${challenge.targetValue}`;
    hint.style.fontSize = '13px';
    hint.style.opacity = '0.9';
    hint.style.marginBottom = '14px';

    const valueText = document.createElement('div');
    valueText.textContent = `当前值：${challenge.minValue}`;
    valueText.style.fontSize = '13px';
    valueText.style.marginBottom = '8px';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(challenge.minValue);
    slider.max = String(challenge.maxValue);
    slider.step = '1';
    slider.value = String(challenge.minValue);
    slider.style.width = '100%';
    slider.addEventListener('input', () => {
      valueText.textContent = `当前值：${slider.value}`;
    });

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '10px';
    actions.style.justifyContent = 'flex-end';
    actions.style.marginTop = '14px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.border = '1px solid #5b6475';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.color = '#d8def0';

    const okBtn = document.createElement('button');
    okBtn.textContent = '确认';
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '8px';
    okBtn.style.border = 'none';
    okBtn.style.background = '#3f7cff';
    okBtn.style.color = '#fff';

    const close = (value: number | null): void => {
      overlay.remove();
      resolve(value);
    };

    cancelBtn.onclick = () => close(null);
    okBtn.onclick = () => close(Number(slider.value));
    overlay.onclick = (event) => {
      if (event.target === overlay) close(null);
    };

    actions.append(cancelBtn, okBtn);
    card.append(title, hint, valueText, slider, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

export async function runEmailSliderCaptcha(): Promise<{ ticket: string; randstr: string } | null> {
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
  const challengeResult = await createUserEmailCaptchaChallenge();
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
