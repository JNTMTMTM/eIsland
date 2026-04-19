import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type LanguageSettingsPageProps = Pick<AppSettingsSectionProps, 'appLanguage' | 'applyAppLanguage'>;

export function LanguageSettingsPage(props: LanguageSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const { appLanguage, applyAppLanguage } = props;

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.language.title', { defaultValue: '显示语言' })}</div>
            <div className="settings-card-subtitle">{t('settings.language.hint', { defaultValue: '切换后将立即应用到支持多语言的界面文案' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {([
              { value: 'zh-CN', label: t('settings.language.options.zh-CN', { defaultValue: '简体中文' }) },
              { value: 'en-US', label: t('settings.language.options.en-US', { defaultValue: 'English' }) },
            ] as Array<{ value: 'zh-CN' | 'en-US'; label: string }>).map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${appLanguage === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => applyAppLanguage(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="settings-music-hint">
            {appLanguage === 'zh-CN'
              ? t('settings.language.current.zh-CN', { defaultValue: '当前语言：简体中文' })
              : t('settings.language.current.en-US', { defaultValue: 'Current language: English' })}
          </div>
        </div>
      </div>
    </div>
  );
}
