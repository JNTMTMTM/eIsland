import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type LayoutPreviewSettingsPageProps = Pick<AppSettingsSectionProps, 'layoutConfig' | 'OverviewPreviewComponent' | 'overviewWidgetOptions' | 'updateLayout'>;

export function LayoutPreviewSettingsPage(props: LayoutPreviewSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const { layoutConfig, OverviewPreviewComponent, overviewWidgetOptions, updateLayout } = props;
  const OverviewPreview = OverviewPreviewComponent;

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.previewTitle', { defaultValue: '总览布局预览' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.previewHint', { defaultValue: '实时显示左右控件组合后的 Expand 态灵动岛样式，切换下方控件可即时预览。' })}</div>
          </div>
          <div className="settings-island-preview-wrap">
            <div className="settings-island-shell" key={`${layoutConfig.left}-${layoutConfig.right}`}>
              <OverviewPreview layoutConfig={layoutConfig} />
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.widgetPickerTitle', { defaultValue: '控件组合' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.widgetPickerHint', { defaultValue: '分别选择左右两侧展示的控件，切换后立即生效并自动保存。' })}</div>
          </div>
          <div className="settings-layout-controls">
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.leftWidget', { defaultValue: '左侧控件' })}</span>
              <div className="settings-layout-options">
                {overviewWidgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.left === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateLayout('left', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.rightWidget', { defaultValue: '右侧控件' })}</span>
              <div className="settings-layout-options">
                {overviewWidgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.right === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateLayout('right', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
