/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file DownloadToolSection.tsx
 * @description 工具箱下载模块
 * @author 鸡哥
 */

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useDownloadTasks } from '../hooks/useDownloadTasks';
import {
  DOWNLOAD_PAGES,
  type DownloadPageKey,
  type DownloadTaskStatus,
} from '../config/downloadToolConfig';
import { formatBytes, formatDurationMs, inferSuggestedName } from '../utils/downloadFormatters';

interface DownloadToolSectionProps {
  downloadPage: DownloadPageKey;
  setDownloadPage: (page: DownloadPageKey) => void;
}

/**
 * 下载工具模块主视图。
 */
export function DownloadToolSection({
  downloadPage,
  setDownloadPage,
}: DownloadToolSectionProps): ReactElement {
  const { t } = useTranslation();
  const pageRef = useRef<DownloadPageKey>(downloadPage);
  pageRef.current = downloadPage;
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [url, setUrl] = useState('');
  const [savePath, setSavePath] = useState('');
  const [threads, setThreads] = useState('8');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const {
    tasks,
    setTasks,
    defaultDir,
    nowMs,
    activeTask,
  } = useDownloadTasks();

  const hasDownloadUrl = url.trim().length > 0;

  const handlePickSavePath = (): void => {
    if (!hasDownloadUrl) return;
    window.api.downloadPickSavePath(inferSuggestedName(url)).then((picked) => {
      if (!picked) return;
      setSavePath(picked);
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.download.messages.pickPathFailed'));
    });
  };

  const handleStartDownload = (): void => {
    const threadNumber = Number(threads);
    setLoading(true);
    setStatusMessage('');
    window.api.downloadStart({
      url,
      savePath: savePath.trim() || undefined,
      threads: Number.isFinite(threadNumber) ? threadNumber : 8,
    }).then((result) => {
      if (!result.ok) {
        setStatusMessage(result.message || t('maxExpand.toolbox.download.messages.startFailed'));
        return;
      }
      setStatusMessage(t('maxExpand.toolbox.download.messages.started'));
      setDownloadPage('history');
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(message || t('maxExpand.toolbox.download.messages.startFailed'));
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleCancelTask = (taskId: string): void => {
    window.api.downloadCancel(taskId).then((ok) => {
      if (ok) {
        setStatusMessage(t('maxExpand.toolbox.download.messages.cancelSuccess'));
      }
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.download.messages.cancelFailed'));
    });
  };

  const handlePauseTask = (taskId: string): void => {
    window.api.downloadPause(taskId).then((ok) => {
      if (ok) {
        setStatusMessage(t('maxExpand.toolbox.download.messages.pauseSuccess'));
      }
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.download.messages.pauseFailed'));
    });
  };

  const handleResumeTask = (taskId: string): void => {
    window.api.downloadResume(taskId).then((result) => {
      if (!result.ok) {
        setStatusMessage(result.message || t('maxExpand.toolbox.download.messages.resumeFailed'));
        return;
      }
      setStatusMessage(t('maxExpand.toolbox.download.messages.resumeSuccess'));
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.download.messages.resumeFailed'));
    });
  };

  const handleRemoveTask = (taskId: string): void => {
    window.api.downloadRemove(taskId).then((ok) => {
      if (!ok) {
        setStatusMessage(t('maxExpand.toolbox.download.messages.removeFailed'));
        return;
      }
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
      setStatusMessage(t('maxExpand.toolbox.download.messages.removeSuccess'));
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.download.messages.removeFailed'));
    });
  };

  const handleOpenTaskFolder = (taskSavePath: string): void => {
    window.api.openInExplorer(taskSavePath).then((ok) => {
      if (!ok) {
        setStatusMessage(t('maxExpand.toolbox.download.messages.openFolderFailed'));
      }
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.download.messages.openFolderFailed'));
    });
  };

  const getStatusText = (status: DownloadTaskStatus): string => {
    if (status === 'paused') return t('maxExpand.toolbox.download.status.paused');
    if (status === 'completed') return t('maxExpand.toolbox.download.status.completed');
    if (status === 'failed') return t('maxExpand.toolbox.download.status.failed');
    if (status === 'canceled') return t('maxExpand.toolbox.download.status.canceled');
    return t('maxExpand.toolbox.download.status.downloading');
  };

  const pageLabels: Record<DownloadPageKey, string> = {
    create: t('maxExpand.toolbox.download.pages.create'),
    history: t('maxExpand.toolbox.download.pages.history'),
  };

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.settings-app-page-dots')) return;
      const idx = DOWNLOAD_PAGES.indexOf(pageRef.current);
      if (idx < 0) return;
      const next = e.deltaY > 0
        ? Math.min(idx + 1, DOWNLOAD_PAGES.length - 1)
        : Math.max(idx - 1, 0);
      if (next !== idx) {
        e.preventDefault();
        setDownloadPage(DOWNLOAD_PAGES[next]);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setDownloadPage]);

  return (
    <div className="settings-app-pages-layout" ref={layoutRef}>
      <div className="settings-app-page-main">
        {downloadPage === 'create' && (
          <div className="settings-cards">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">{t('maxExpand.toolbox.download.title')}</div>
                <div className="settings-card-subtitle">{t('maxExpand.toolbox.download.subtitle')}</div>
              </div>
              <div className="settings-card-body">
                <label className="settings-field">
                  <span className="settings-field-label">{t('maxExpand.toolbox.download.form.urlLabel')}</span>
                  <input
                    className="settings-field-input"
                    type="text"
                    placeholder={t('maxExpand.toolbox.download.form.urlPlaceholder')}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </label>

                <label className="settings-field">
                  <div className="download-field-title-row">
                    <span className="settings-field-label">{t('maxExpand.toolbox.download.form.savePathLabel')}</span>
                    <span className="settings-field-label download-threads-title-inline">{t('maxExpand.toolbox.download.form.threadsLabel')}</span>
                  </div>
                  <div className="settings-hotkey-row download-path-row">
                    <input
                      className="settings-hotkey-input download-save-path-input"
                      type="text"
                      placeholder={defaultDir || t('maxExpand.toolbox.download.form.savePathPlaceholder')}
                      value={savePath}
                      disabled={!hasDownloadUrl}
                      onChange={(event) => setSavePath(event.target.value)}
                    />
                    <button
                      className={`settings-lyrics-source-btn ${!hasDownloadUrl ? 'disabled' : ''}`}
                      type="button"
                      disabled={!hasDownloadUrl}
                      onClick={handlePickSavePath}
                    >
                      {t('maxExpand.toolbox.download.form.pickPath')}
                    </button>
                    <label className="download-threads-inline">
                      <input
                        className="settings-field-input download-threads-inline-input"
                        type="number"
                        min="1"
                        max="16"
                        step="1"
                        value={threads}
                        onChange={(event) => setThreads(event.target.value)}
                      />
                    </label>
                  </div>
                  <span className="settings-field-hint">
                    {t('maxExpand.toolbox.download.form.defaultDirHint', { dir: defaultDir || '-' })}
                  </span>
                </label>

                <div className="settings-hotkey-row">
                  <button
                    className={`settings-lyrics-source-btn download-start-btn-full ${loading ? 'disabled' : ''}`}
                    type="button"
                    disabled={loading}
                    onClick={handleStartDownload}
                  >
                    {loading ? t('maxExpand.toolbox.download.form.starting') : t('maxExpand.toolbox.download.form.start')}
                  </button>
                </div>

                {activeTask && (
                  <div className="settings-hotkey-row download-cancel-row">
                    <button
                      className="settings-lyrics-source-btn download-start-btn-full"
                      type="button"
                      onClick={() => handleCancelTask(activeTask.id)}
                    >
                      {t('maxExpand.toolbox.download.form.cancelCurrent')}
                    </button>
                  </div>
                )}

                {!!statusMessage && (
                  <div className="settings-music-hint">{statusMessage}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {downloadPage === 'history' && (
          <div className="settings-cards">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">{t('maxExpand.toolbox.download.tasks.title')}</div>
                <div className="settings-card-subtitle">{t('maxExpand.toolbox.download.tasks.subtitle')}</div>
              </div>
              <div className="settings-card-body">
                {tasks.length === 0 && (
                  <div className="settings-music-hint">{t('maxExpand.toolbox.download.tasks.empty')}</div>
                )}
                {tasks.map((task) => {
                  const percentText = `${(task.progress * 100).toFixed(1)}%`;
                  const progressWidth = `${Math.max(0, Math.min(100, task.progress * 100))}%`;
                  return (
                    <div key={task.id} className="settings-card-subgroup download-task-card">
                      <div className="download-task-card-header">
                        <div className="settings-card-subgroup-title">{task.fileName || task.url}</div>
                        <div className="settings-hotkey-row download-task-actions">
                          {task.status === 'downloading' && (
                            <button
                              className="settings-lyrics-source-btn"
                              type="button"
                              onClick={() => handlePauseTask(task.id)}
                            >
                              {t('maxExpand.toolbox.download.tasks.pause')}
                            </button>
                          )}
                          {task.status === 'paused' && (
                            <button
                              className="settings-lyrics-source-btn"
                              type="button"
                              onClick={() => handleResumeTask(task.id)}
                            >
                              {t('maxExpand.toolbox.download.tasks.resume')}
                            </button>
                          )}
                          {task.status !== 'downloading' && (
                            <button
                              className="settings-lyrics-source-btn"
                              type="button"
                              onClick={() => handleRemoveTask(task.id)}
                            >
                              {t('maxExpand.toolbox.download.tasks.delete')}
                            </button>
                          )}
                          {task.status === 'completed' && (
                            <button
                              className="settings-lyrics-source-btn"
                              type="button"
                              onClick={() => handleOpenTaskFolder(task.savePath)}
                            >
                              {t('maxExpand.toolbox.download.tasks.openFolder')}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="settings-music-hint">
                        {getStatusText(task.status)} · {percentText} · {formatBytes(task.downloadedBytes)} / {task.totalBytes > 0 ? formatBytes(task.totalBytes) : '?'} · {formatBytes(task.speedBytesPerSecond)}/s · {task.threads}T
                      </div>
                      <div className="download-task-progress">
                        <div className="download-task-progress-fill" style={{ width: progressWidth }} />
                      </div>
                      <div className="settings-music-hint">
                        {(task.status === 'completed' || task.status === 'paused' || task.status === 'failed' || task.status === 'canceled')
                          ? `${t('maxExpand.toolbox.download.tasks.elapsedLabel')}: ${formatDurationMs(task.updatedAt - task.createdAt)}`
                          : `${t('maxExpand.toolbox.download.tasks.remainingLabel')}: ${formatDurationMs((task.estimatedFinishAt || 0) - nowMs)}`}
                      </div>
                      <div className="settings-music-hint">{task.savePath}</div>
                      {task.errorMessage && (
                        <div className="settings-music-hint">{task.errorMessage}</div>
                      )}
                    </div>
                  );
                })}
                {Boolean(statusMessage) && (
                  <div className="settings-music-hint">{statusMessage}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-app-page-dots">
        {DOWNLOAD_PAGES.map((page) => (
          <button
            key={page}
            className={`settings-app-page-dot ${downloadPage === page ? 'active' : ''}`}
            data-label={pageLabels[page]}
            type="button"
            onClick={() => setDownloadPage(page)}
          />
        ))}
      </div>
    </div>
  );
}
