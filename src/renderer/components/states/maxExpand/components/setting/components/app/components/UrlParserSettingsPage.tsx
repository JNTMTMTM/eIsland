import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type UrlParserSettingsPageProps = Pick<
  AppSettingsSectionProps,
  | 'clipboardUrlMonitorEnabled'
  | 'setClipboardUrlMonitorEnabled'
  | 'clipboardUrlDetectMode'
  | 'setClipboardUrlDetectMode'
  | 'clipboardUrlBlacklist'
  | 'setClipboardUrlBlacklist'
  | 'clipboardUrlSuppressInFavorites'
  | 'setClipboardUrlSuppressInFavorites'
>;

const normalizeBlacklistDomain = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
};

export function UrlParserSettingsPage(props: UrlParserSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const {
    clipboardUrlMonitorEnabled,
    setClipboardUrlMonitorEnabled,
    clipboardUrlDetectMode,
    setClipboardUrlDetectMode,
    clipboardUrlBlacklist,
    setClipboardUrlBlacklist,
    clipboardUrlSuppressInFavorites,
    setClipboardUrlSuppressInFavorites,
  } = props;
  const [clipboardBlacklistDraft, setClipboardBlacklistDraft] = useState<string>('');
  const [clipboardBlacklistError, setClipboardBlacklistError] = useState<string>('');

  const addDomain = (): void => {
    const domain = normalizeBlacklistDomain(clipboardBlacklistDraft);
    if (!domain) {
      setClipboardBlacklistError(t('settings.app.urlParser.errors.invalidDomain', { defaultValue: '请输入有效域名' }));
      return;
    }
    const exists = clipboardUrlBlacklist.some((item) => item === domain);
    if (exists) {
      setClipboardBlacklistError(t('settings.app.urlParser.errors.domainExists', { defaultValue: '该域名已在黑名单中' }));
      return;
    }
    const prev = clipboardUrlBlacklist;
    const next = [...prev, domain];
    setClipboardUrlBlacklist(next);
    setClipboardBlacklistDraft('');
    window.api.clipboardUrlBlacklistSet(next).catch(() => {
      setClipboardUrlBlacklist(prev);
      setClipboardBlacklistError(t('settings.app.urlParser.errors.saveFailed', { defaultValue: '保存失败，请稍后重试' }));
    });
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.urlParser.title', { defaultValue: '剪贴板 URL 监听' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.urlParser.hint', { defaultValue: '启用后，检测到剪贴板含链接时会弹出询问通知' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={clipboardUrlMonitorEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setClipboardUrlMonitorEnabled(next);
                  window.api.clipboardUrlMonitorSet(next).catch(() => {
                    setClipboardUrlMonitorEnabled(!next);
                  });
                }}
              />
              {t('settings.app.urlParser.enableToggle', { defaultValue: '启用剪贴板 URL 监听' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.urlParser.detectModes', { defaultValue: '识别项目' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.urlParser.detectModesHint', { defaultValue: '选择剪贴板中被识别为 URL 的匹配范围，并可在收藏界面临时静音通知。' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {([
              { value: 'https-only', label: t('settings.app.urlParser.modeHttpsOnly', { defaultValue: '强制包含 https 头' }) },
              { value: 'http-https', label: t('settings.app.urlParser.modeHttpHttps', { defaultValue: '包含 http 头' }) },
              { value: 'domain-only', label: t('settings.app.urlParser.modeDomainOnly', { defaultValue: '仅含有域名' }) },
            ] as Array<{ value: 'https-only' | 'http-https' | 'domain-only'; label: string }>).map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${clipboardUrlDetectMode === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setClipboardUrlDetectMode(opt.value);
                  window.api.clipboardUrlDetectModeSet(opt.value).catch(() => {});
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={clipboardUrlSuppressInFavorites}
                onChange={(e) => {
                  const next = e.target.checked;
                  const prev = clipboardUrlSuppressInFavorites;
                  setClipboardUrlSuppressInFavorites(next);
                  try {
                    localStorage.setItem('clipboard-url-suppress-in-url-favorites', next ? '1' : '0');
                  } catch {
                    // noop
                  }
                  window.api.storeWrite('clipboard-url-suppress-in-url-favorites', next).catch(() => {
                    setClipboardUrlSuppressInFavorites(prev);
                    try {
                      localStorage.setItem('clipboard-url-suppress-in-url-favorites', prev ? '1' : '0');
                    } catch {
                      // noop
                    }
                  });
                }}
              />
              {t('settings.app.urlParser.suppressInFavorites', { defaultValue: '在 URL 收藏界面时不弹通知' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.urlParser.blacklistTitle', { defaultValue: 'URL 黑名单（按域名）' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.urlParser.blacklistHint', { defaultValue: '命中黑名单域名时：单个链接不弹窗，多链接自动剔除' })}</div>
          </div>
          <div className="settings-hotkey-row" style={{ gap: 8 }}>
            <input
              className="settings-whitelist-input"
              type="text"
              placeholder={t('settings.app.urlParser.blacklistPlaceholder', { defaultValue: '输入域名，如 example.com' })}
              value={clipboardBlacklistDraft}
              onChange={(e) => {
                setClipboardBlacklistDraft(e.target.value);
                setClipboardBlacklistError('');
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                addDomain();
              }}
            />
            <button className="settings-whitelist-add-btn" type="button" onClick={addDomain}>
              {t('settings.app.urlParser.addDomain', { defaultValue: '添加域名' })}
            </button>
          </div>
          {clipboardBlacklistError && <div className="settings-hotkey-error">{clipboardBlacklistError}</div>}

          <div className="settings-hide-selected">
            {clipboardUrlBlacklist.length === 0 ? (
              <span className="settings-hide-selected-empty">{t('settings.app.urlParser.emptyBlacklist', { defaultValue: '暂无黑名单域名' })}</span>
            ) : clipboardUrlBlacklist.map((domain) => (
              <button
                key={domain}
                className="settings-hide-selected-item"
                type="button"
                onClick={() => {
                  const next = clipboardUrlBlacklist.filter((item) => item !== domain);
                  const prev = clipboardUrlBlacklist;
                  setClipboardUrlBlacklist(next);
                  window.api.clipboardUrlBlacklistSet(next).catch(() => {
                    setClipboardUrlBlacklist(prev);
                    setClipboardBlacklistError(t('settings.app.urlParser.errors.saveFailed', { defaultValue: '保存失败，请稍后重试' }));
                  });
                }}
                title={t('settings.app.urlParser.removeDomain', { defaultValue: '移除该域名' })}
              >
                {domain} ×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
