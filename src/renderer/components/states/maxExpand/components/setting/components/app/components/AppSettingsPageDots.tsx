import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsPageKey } from '../../../utils/settingsConfig';

interface AppSettingsPageDotsProps {
  appSettingsPage: AppSettingsPageKey;
  appSettingsPages: AppSettingsPageKey[];
  settingsTabLabels: Record<string, string>;
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
}

export function AppSettingsPageDots(props: AppSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();
  const { appSettingsPage, appSettingsPages, settingsTabLabels, setAppSettingsPage } = props;

  return (
    <div className="settings-app-page-dots" aria-label={t('settings.app.pagination', { defaultValue: '软件设置分页' })}>
      {appSettingsPages.map((page) => (
        <button
          key={page}
          className={`settings-app-page-dot ${appSettingsPage === page ? 'active' : ''}`}
          data-label={settingsTabLabels[page]}
          type="button"
          onClick={() => setAppSettingsPage(page)}
          title={settingsTabLabels[page]}
          aria-label={settingsTabLabels[page]}
        />
      ))}
    </div>
  );
}
