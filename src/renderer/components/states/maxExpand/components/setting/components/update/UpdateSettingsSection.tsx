import type { ReactElement } from 'react';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

interface UpdateSourceOption {
  key: string;
  label: string;
}

interface DownloadProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

interface UpdateSettingsSectionProps {
  aboutVersion: string;
  updateSource: string;
  updateSources: UpdateSourceOption[];
  updateStatus: UpdateStatus;
  updateVersion: string;
  downloadProgress: DownloadProgressData | null;
  currentSourceLabel: string;
  updateError: string;
  onUpdateSourceChange: (value: string) => void;
  onCheckUpdate: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
}

export function UpdateSettingsSection({
  aboutVersion,
  updateSource,
  updateSources,
  updateStatus,
  updateVersion,
  downloadProgress,
  currentSourceLabel,
  updateError,
  onUpdateSourceChange,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
}: UpdateSettingsSectionProps): ReactElement {
  return (
    <div className="max-expand-settings-section settings-update">
      <div className="max-expand-settings-title">更新设置</div>

      <div className="settings-update-info-grid" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 0, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span><span style={{ opacity: 0.6 }}>当前版本</span> <span style={{ fontWeight: 500 }}>eIsland v{aboutVersion || '…'}</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ opacity: 0.6 }}>更新源</span>
            {updateSources.map((s) => (
              <label key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 4 }}>
                <input
                  type="radio"
                  name="update-source"
                  value={s.key}
                  checked={updateSource === s.key}
                  onChange={() => onUpdateSourceChange(s.key)}
                  style={{ margin: 0 }}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </span>
        </div>
        {(updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.6 }}>最新版本</span>
            <span style={{ fontWeight: 500, color: 'var(--accent-color, #4fc3f7)' }}>v{updateVersion}</span>
          </div>
        )}
      </div>

      <div className="settings-about-update">
        <div className="settings-about-update-row">
          {updateStatus === 'idle' && (
            <button className="settings-about-update-btn" type="button" onClick={onCheckUpdate}>检查更新</button>
          )}
          {updateStatus === 'checking' && (
            <button className="settings-about-update-btn" type="button" disabled>检查中…</button>
          )}
          {updateStatus === 'latest' && (
            <button className="settings-about-update-btn" type="button" onClick={onCheckUpdate}>已是最新版本</button>
          )}
          {updateStatus === 'available' && (
            <button className="settings-about-update-btn update-available" type="button" onClick={onDownloadUpdate}>
              下载更新
            </button>
          )}
          {updateStatus === 'downloading' && (
            <div className="settings-about-update-progress">
              <div style={{ marginBottom: 4, fontSize: 12, opacity: 0.7 }}>正在从 {currentSourceLabel} 下载更新…</div>
              <div className="settings-about-update-progress-bar">
                <div
                  className="settings-about-update-progress-fill"
                  style={{ width: `${downloadProgress?.percent ?? 0}%` }}
                />
              </div>
              <span className="settings-about-update-progress-text">
                {downloadProgress ? `${Math.round(downloadProgress.percent)}% · ${(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s` : '准备下载…'}
              </span>
            </div>
          )}
          {updateStatus === 'ready' && (
            <button className="settings-about-update-btn update-ready" type="button" onClick={onInstallUpdate}>
              安装并重启
            </button>
          )}
          {updateStatus === 'error' && (
            <button className="settings-about-update-btn" type="button" onClick={onCheckUpdate}>重试</button>
          )}
        </div>
        {updateStatus === 'error' && updateError && (
          <div className="settings-about-update-error" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{updateError.replace(/\\n/g, '\n')}</div>
        )}
      </div>
    </div>
  );
}
