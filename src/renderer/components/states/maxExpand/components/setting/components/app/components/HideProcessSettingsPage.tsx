import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type HideProcessSettingsPageProps = Pick<
  AppSettingsSectionProps,
  | 'hideProcessFilter'
  | 'setHideProcessFilter'
  | 'refreshRunningProcesses'
  | 'hideProcessLoading'
  | 'hideProcessList'
  | 'toggleHideProcess'
  | 'runningProcesses'
  | 'hideProcessKeyword'
>;

export function HideProcessSettingsPage(props: HideProcessSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const {
    hideProcessFilter,
    setHideProcessFilter,
    refreshRunningProcesses,
    hideProcessLoading,
    hideProcessList,
    toggleHideProcess,
    runningProcesses,
    hideProcessKeyword,
  } = props;

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.hideProcess.title', { defaultValue: '隐藏窗口管理' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.hideProcess.hint', { defaultValue: '当下方黑名单进程对应窗口处于焦点状态时，将立即隐藏灵动岛；失去焦点后自动显示。' })}</div>
          </div>
          <div className="settings-hide-selected">
            {hideProcessList.length === 0 ? (
              <span className="settings-hide-selected-empty">{t('settings.app.hideProcess.empty', { defaultValue: '暂无隐藏窗口' })}</span>
            ) : hideProcessList.map((name) => (
              <button
                key={name}
                className="settings-hide-selected-item"
                type="button"
                onClick={() => toggleHideProcess(name)}
                title={t('settings.app.hideProcess.removeWindow', { defaultValue: '移除该窗口' })}
              >
                {name} ×
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.hideProcess.runningTitle', { defaultValue: '当前运行的窗口' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.hideProcess.runningHint', { defaultValue: '在列表中点击可将窗口加入 / 移出黑名单，支持按进程名搜索。' })}</div>
          </div>
          <div className="settings-hide-process-toolbar">
            <input
              className="settings-whitelist-input"
              type="text"
              placeholder={t('settings.app.hideProcess.searchPlaceholder', { defaultValue: '搜索进程名' })}
              value={hideProcessFilter}
              onChange={(e) => setHideProcessFilter(e.target.value)}
            />
            <button
              className="settings-whitelist-add-btn"
              type="button"
              onClick={() => {
                refreshRunningProcesses().catch(() => {});
              }}
              disabled={hideProcessLoading}
            >
              {hideProcessLoading
                ? t('settings.app.hideProcess.refreshing', { defaultValue: '刷新中…' })
                : t('settings.app.hideProcess.refresh', { defaultValue: '刷新窗口' })}
            </button>
          </div>
          <div className="settings-hide-process-list">
            {runningProcesses
              .filter((win) => win.processName.toLowerCase().includes(hideProcessKeyword))
              .map((process) => {
                const name = process.processName;
                if (!name) return null;
                const selected = hideProcessList.some((item) => item.trim().toLowerCase() === name.trim().toLowerCase());
                const fallbackText = (process.processName || process.title).charAt(0).toUpperCase();
                return (
                  <button
                    key={`${process.id}-${name}-${process.title}`}
                    className={`settings-hide-process-item ${selected ? 'active' : ''}`}
                    type="button"
                    onClick={() => toggleHideProcess(name)}
                  >
                    <span className={`settings-hide-process-check ${selected ? 'active' : ''}`}>{selected ? '✓' : ''}</span>
                    <span className="settings-hide-process-icon" aria-hidden="true">
                      {process.iconDataUrl ? (
                        <img src={process.iconDataUrl} alt="" />
                      ) : (
                        <span>{fallbackText || '•'}</span>
                      )}
                    </span>
                    <span className="settings-hide-process-name">{name}</span>
                    {process.title && (
                      <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {process.title}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
