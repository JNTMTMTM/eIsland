import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type AutostartSettingsPageProps = Pick<AppSettingsSectionProps, 'autostartMode' | 'setAutostartMode'>;

export function AutostartSettingsPage(props: AutostartSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const { autostartMode, setAutostartMode } = props;
  const [clearLogsStatus, setClearLogsStatus] = useState<'idle' | 'clearing' | string>('idle');
  const clearLogsResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearLogsResetTimerRef.current) {
        clearTimeout(clearLogsResetTimerRef.current);
        clearLogsResetTimerRef.current = null;
      }
    };
  }, []);

  const scheduleClearLogsStatusReset = (): void => {
    if (clearLogsResetTimerRef.current) {
      clearTimeout(clearLogsResetTimerRef.current);
    }
    clearLogsResetTimerRef.current = setTimeout(() => {
      setClearLogsStatus('idle');
      clearLogsResetTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.labels.autostart', { defaultValue: '实用工具' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.autostart.toolsHint', { defaultValue: '常用应用操作与日志工具' })}</div>
          </div>
          <div className="settings-hotkey-row" style={{ gap: 8 }}>
            <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.quitApp(); }}>{t('settings.app.autostart.quit', { defaultValue: '关闭灵动岛' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.restartApp().catch(() => {}); }}>{t('settings.app.autostart.restart', { defaultValue: '重启灵动岛' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.openLogsFolder().catch(() => {}); }}>{t('settings.app.autostart.openLogs', { defaultValue: '打开日志文件夹' })}</button>
            <button
              className="settings-hotkey-btn"
              type="button"
              disabled={clearLogsStatus === 'clearing'}
              onClick={() => {
                setClearLogsStatus('clearing');
                window.api.clearLogsCache().then((res) => {
                  if (res.success) {
                    const kb = (res.freedBytes / 1024).toFixed(1);
                    setClearLogsStatus(t('settings.app.autostart.logsCleared', { defaultValue: '已清理 {{kb}} KB', kb }));
                  } else {
                    setClearLogsStatus(t('settings.app.autostart.logsClearFailed', { defaultValue: '清理失败' }));
                  }
                  scheduleClearLogsStatusReset();
                }).catch(() => {
                  setClearLogsStatus(t('settings.app.autostart.logsClearFailed', { defaultValue: '清理失败' }));
                  scheduleClearLogsStatusReset();
                });
              }}
            >
              {clearLogsStatus === 'clearing'
                ? t('settings.app.autostart.logsClearing', { defaultValue: '清理中…' })
                : clearLogsStatus === 'idle'
                  ? t('settings.app.autostart.clearLogs', { defaultValue: '清理日志缓存' })
                  : clearLogsStatus}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.autostart.title', { defaultValue: '开机自启' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.autostart.hint', { defaultValue: '设置系统启动时是否自动运行灵动岛' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {([
              { value: 'disabled', label: t('settings.app.autostart.options.disabled', { defaultValue: '禁用' }) },
              { value: 'enabled', label: t('settings.app.autostart.options.enabled', { defaultValue: '启用' }) },
              { value: 'high-priority', label: t('settings.app.autostart.options.highPriority', { defaultValue: '高优先级' }) },
            ] as Array<{ value: 'disabled' | 'enabled' | 'high-priority'; label: string }>).map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${autostartMode === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setAutostartMode(opt.value);
                  window.api.autostartSet(opt.value).catch(() => {});
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="settings-music-hint">
            {autostartMode === 'disabled' && t('settings.app.autostart.status.disabled', { defaultValue: '当前已禁用开机自启。' })}
            {autostartMode === 'enabled' && t('settings.app.autostart.status.enabled', { defaultValue: '系统登录后将自动启动灵动岛。' })}
            {autostartMode === 'high-priority' && t('settings.app.autostart.status.highPriority', { defaultValue: '以高优先级启动，更早完成加载。' })}
          </div>
        </div>
      </div>
    </div>
  );
}
