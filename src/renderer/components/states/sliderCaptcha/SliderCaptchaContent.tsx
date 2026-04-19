import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { UserEmailCaptchaChallenge } from '../../../api/userAccountApi';

interface SliderCaptchaContentProps {
  challenge: UserEmailCaptchaChallenge;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}

export function SliderCaptchaContent({ challenge, onCancel, onConfirm }: SliderCaptchaContentProps): ReactElement {
  const [value, setValue] = useState(challenge.minValue);

  const targetText = useMemo(() => `请将滑块拖到目标值：${challenge.targetValue}`, [challenge.targetValue]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          width: 'min(360px, 86vw)',
          padding: '18px',
          borderRadius: '14px',
          background: 'rgba(15,18,24,0.96)',
          color: '#f5f7ff',
          boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>滑块验证</div>
        <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '14px' }}>{targetText}</div>
        <div style={{ fontSize: '13px', marginBottom: '8px' }}>当前值：{value}</div>
        <input
          type="range"
          min={challenge.minValue}
          max={challenge.maxValue}
          step={1}
          value={value}
          style={{ width: '100%' }}
          onChange={(event) => setValue(Number(event.target.value))}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #5b6475',
              background: 'transparent',
              color: '#d8def0',
            }}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: '#3f7cff',
              color: '#fff',
            }}
            onClick={() => onConfirm(value)}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
