import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';
import type { AppSettingsSectionProps } from './types';

type BehaviorSettingsPageProps = Pick<
  AppSettingsSectionProps,
  'expandLeaveIdle' | 'setExpandLeaveIdle' | 'maxExpandLeaveIdle' | 'setMaxExpandLeaveIdle'
>;

export function BehaviorSettingsPage(props: BehaviorSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const { expandLeaveIdle, setExpandLeaveIdle, maxExpandLeaveIdle, setMaxExpandLeaveIdle } = props;
  const setNotification = useIslandStore((s) => s.setNotification);

  const [standaloneWindowMode, setStandaloneWindowMode] = useState<'integrated' | 'standalone'>('integrated');

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('standalone-window-mode').then((data) => {
      if (cancelled) return;
      if (data === 'standalone') {
        setStandaloneWindowMode('standalone');
        return;
      }
      window.api.storeRead('countdown-window-mode').then((legacyData) => {
        if (cancelled) return;
        if (legacyData === 'standalone') setStandaloneWindowMode('standalone');
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStandaloneWindowModeChange = (mode: 'integrated' | 'standalone'): void => {
    setStandaloneWindowMode(mode);
    window.api.storeWrite('standalone-window-mode', mode).catch(() => {});

    const restartRequiredNotification = {
      title: t('settings.app.notifications.configChanged.title', { defaultValue: '配置变更' }),
      body: t('settings.app.notifications.configChanged.body', { defaultValue: '待办事项/倒数日/设置打开方式已变更，是否立即重启生效？' }),
      icon: SvgIcon.SETTING,
      type: 'restart-required',
    } as const;

    setNotification(restartRequiredNotification);
    window.api.settingsPreview('notification:show', restartRequiredNotification).catch(() => {});
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.springTitle', { defaultValue: '灵动岛弹性动画 (立即生效)' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.springHint', { defaultValue: '关闭后，展开和收起动画将变得更加平滑内敛，消除弹跳感' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={useIslandStore.getState().springAnimation}
                onChange={(e) => {
                  const next = e.target.checked;
                  useIslandStore.getState().setSpringAnimation(next);
                  window.api.springAnimationSet(next).catch(() => {});
                }}
              />
              {t('settings.app.behavior.springToggle', { defaultValue: '启用弹性动画' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.mouseLeaveTitle', { defaultValue: '鼠标移开自动收回 (重启后生效)' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.mouseLeaveHint', { defaultValue: '启用后，鼠标离开灵动岛时将自动回到空闲状态（若正在播放音乐则切到歌词态）' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={expandLeaveIdle}
                onChange={(e) => {
                  setExpandLeaveIdle(e.target.checked);
                  window.api.expandMouseleaveIdleSet(e.target.checked).catch(() => {});
                }}
              />
              {t('settings.app.behavior.expandLeaveToggle', { defaultValue: '展开态（Expand）鼠标移开后自动收回' })}
            </label>
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={maxExpandLeaveIdle}
                onChange={(e) => {
                  setMaxExpandLeaveIdle(e.target.checked);
                  window.api.maxexpandMouseleaveIdleSet(e.target.checked).catch(() => {});
                }}
              />
              {t('settings.app.behavior.maxExpandLeaveToggle', { defaultValue: '最大展开态（MaxExpand）鼠标移开后自动收回' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.windowModeTitle', { defaultValue: '待办事项 / 倒数日 / 设置 打开方式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.windowModeHint', { defaultValue: '选择点击导航时，在灵动岛内显示还是打开独立窗口（重启后生效）' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="radio"
                name="standalone-window-mode"
                checked={standaloneWindowMode === 'integrated'}
                onChange={() => {
                  handleStandaloneWindowModeChange('integrated');
                }}
              />
              {t('settings.app.behavior.integratedMode', { defaultValue: '集成在灵动岛中' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="standalone-window-mode"
                checked={standaloneWindowMode === 'standalone'}
                onChange={() => {
                  handleStandaloneWindowModeChange('standalone');
                }}
              />
              {t('settings.app.behavior.standaloneMode', { defaultValue: '独立窗口' })}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
