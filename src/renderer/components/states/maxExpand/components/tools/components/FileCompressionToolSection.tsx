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
 * @file FileCompressionToolSection.tsx
 * @description 工具箱文件压缩模块（界面入口）
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FILE_COMPRESSION_PAGES,
  type FileCompressionPageKey,
} from '../config/fileCompressionToolConfig';

interface FileCompressionToolSectionProps {
  fileCompressionPage: FileCompressionPageKey;
  setFileCompressionPage: (page: FileCompressionPageKey) => void;
}

interface ImageCompressionTask {
  id: string;
  fileName: string;
  inputPath: string;
  outputPath: string;
  quality: number;
  status: 'completed' | 'failed';
  success: boolean;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFileName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * 文件压缩模块主视图。
 */
export function FileCompressionToolSection({
  fileCompressionPage,
  setFileCompressionPage,
}: FileCompressionToolSectionProps): ReactElement {
  const { t } = useTranslation();
  const pageRef = useRef<FileCompressionPageKey>(fileCompressionPage);
  pageRef.current = fileCompressionPage;
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [outputDir, setOutputDir] = useState('');
  const [quality, setQuality] = useState(80);
  const [compressing, setCompressing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [tasks, setTasks] = useState<ImageCompressionTask[]>([]);

  const pageLabels: Record<FileCompressionPageKey, string> = {
    imageCompression: t('maxExpand.toolbox.fileCompression.pages.imageCompression'),
    history: t('maxExpand.toolbox.fileCompression.pages.history'),
  };

  const successfulCount = useMemo(() => tasks.filter((item) => item.success).length, [tasks]);

  useEffect(() => {
    let disposed = false;
    window.api.imageCompressionList().then((list) => {
      if (disposed) return;
      setTasks((list || []).slice().sort((a, b) => b.createdAt - a.createdAt));
    }).catch(() => {});

    const off = window.api.onImageCompressionTaskUpdated((task) => {
      setTasks((prev) => {
        const exists = prev.some((item) => item.id === task.id);
        const next = exists
          ? prev.map((item) => (item.id === task.id ? task : item))
          : [task, ...prev];
        return next.slice().sort((a, b) => b.createdAt - a.createdAt);
      });
    });

    return () => {
      disposed = true;
      off();
    };
  }, []);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.settings-app-page-dots')) return;
      const idx = FILE_COMPRESSION_PAGES.indexOf(pageRef.current);
      if (idx < 0) return;
      const next = e.deltaY > 0
        ? Math.min(idx + 1, FILE_COMPRESSION_PAGES.length - 1)
        : Math.max(idx - 1, 0);
      if (next !== idx) {
        e.preventDefault();
        setFileCompressionPage(FILE_COMPRESSION_PAGES[next]);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setFileCompressionPage]);

  const handlePickImages = (): void => {
    window.api.imageCompressionPickImages().then((paths) => {
      if (!paths || paths.length === 0) return;
      setSelectedImages(paths);
      setStatusMessage('');
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.fileCompression.messages.pickFailed'));
    });
  };

  const handlePickOutputDir = (): void => {
    window.api.imageCompressionPickOutputDir().then((picked) => {
      if (!picked) return;
      setOutputDir(picked);
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.fileCompression.messages.pickOutputDirFailed'));
    });
  };

  const handleStartCompression = (): void => {
    if (selectedImages.length === 0 || compressing) return;
    setCompressing(true);
    setStatusMessage('');
    window.api.imageCompressionStart({
      inputPaths: selectedImages,
      outputDir: outputDir.trim() || undefined,
      quality,
    }).then((result) => {
      if (!result.ok) {
        setStatusMessage(result.message || t('maxExpand.toolbox.fileCompression.messages.startFailed'));
        return;
      }

      const nextResults = result.results || [];
      setTasks((prev) => {
        const map = new Map<string, ImageCompressionTask>();
        prev.forEach((item) => map.set(item.id, item));
        nextResults.forEach((item) => map.set(item.id, item));
        return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      });

      const successCount = nextResults.filter((item) => item.success).length;
      setStatusMessage(
        t('maxExpand.toolbox.fileCompression.messages.done', {
          success: successCount,
          total: nextResults.length,
        }),
      );
      setSelectedImages([]);
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.fileCompression.messages.startFailed'));
    }).finally(() => {
      setCompressing(false);
    });
  };

  const handleOpenPath = (path: string): void => {
    window.api.openInExplorer(path).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.fileCompression.messages.openFolderFailed'));
    });
  };

  const handleRemoveTask = (taskId: string): void => {
    window.api.imageCompressionRemove(taskId).then((ok) => {
      if (!ok) {
        setStatusMessage(t('maxExpand.toolbox.fileCompression.messages.removeFailed'));
        return;
      }
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
    }).catch(() => {
      setStatusMessage(t('maxExpand.toolbox.fileCompression.messages.removeFailed'));
    });
  };

  const statusHint = statusMessage
    ? <div className="settings-music-hint">{statusMessage}</div>
    : null;

  return (
    <div className="settings-app-pages-layout" ref={layoutRef}>
      <div className="settings-app-page-main">
        {fileCompressionPage === 'imageCompression' && (
          <div className="settings-cards settings-file-compression-page-panel">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">{t('maxExpand.toolbox.fileCompression.title')}</div>
                <div className="settings-card-subtitle">{t('maxExpand.toolbox.fileCompression.subtitle')}</div>
              </div>
              <div className="settings-card-body">
                <div className="settings-hotkey-row">
                  <button className="settings-lyrics-source-btn" type="button" onClick={handlePickImages}>
                    {t('maxExpand.toolbox.fileCompression.pickImages')}
                  </button>
                  <span className="settings-music-hint">
                    {selectedImages.length > 0
                      ? t('maxExpand.toolbox.fileCompression.selectedCount', { count: selectedImages.length })
                      : t('maxExpand.toolbox.fileCompression.noImages')}
                  </span>
                </div>

                <label className="settings-field">
                  <span className="settings-field-label">{t('maxExpand.toolbox.fileCompression.outputDir')}</span>
                  <div className="settings-hotkey-row download-path-row">
                    <input
                      className="settings-hotkey-input download-save-path-input"
                      type="text"
                      placeholder={t('maxExpand.toolbox.fileCompression.outputDirPlaceholder')}
                      value={outputDir}
                      onChange={(event) => setOutputDir(event.target.value)}
                    />
                    <button className="settings-lyrics-source-btn" type="button" onClick={handlePickOutputDir}>
                      {t('maxExpand.toolbox.fileCompression.pickOutputDir')}
                    </button>
                  </div>
                </label>

                <label className="settings-field">
                  <span className="settings-field-label">
                    {t('maxExpand.toolbox.fileCompression.quality')}: {quality}
                  </span>
                  <input
                    className="settings-slider"
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                  />
                  <span className="settings-field-hint">{t('maxExpand.toolbox.fileCompression.qualityHint')}</span>
                </label>

                <div className="settings-hotkey-row">
                  <button
                    className={`settings-lyrics-source-btn download-start-btn-full ${compressing || selectedImages.length === 0 ? 'disabled' : ''}`}
                    type="button"
                    disabled={compressing || selectedImages.length === 0}
                    onClick={handleStartCompression}
                  >
                    {compressing
                      ? t('maxExpand.toolbox.fileCompression.compressing')
                      : t('maxExpand.toolbox.fileCompression.startBtn')}
                  </button>
                </div>

                {compressing && selectedImages.length > 0 && (
                  <div className="settings-card-subgroup">
                    <div className="settings-card-subgroup-title">{t('maxExpand.toolbox.fileCompression.pendingListTitle')}</div>
                    <div className="file-compression-path-list">
                      {selectedImages.map((path) => (
                        <div key={path} className="settings-music-hint">{getFileName(path)}</div>
                      ))}
                    </div>
                  </div>
                )}

                {statusHint}
              </div>
            </div>
          </div>
        )}

        {fileCompressionPage === 'history' && (
          <div className="settings-cards settings-file-compression-page-panel">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">{t('maxExpand.toolbox.fileCompression.resultsTitle')}</div>
                <div className="settings-card-subtitle">
                  {t('maxExpand.toolbox.fileCompression.resultsSubtitle', {
                    success: successfulCount,
                    total: tasks.length,
                  })}
                </div>
              </div>
              <div className="settings-card-body">
                {tasks.length === 0 && (
                  <div className="settings-music-hint">{t('maxExpand.toolbox.fileCompression.resultsEmpty')}</div>
                )}

                {tasks.map((item) => (
                  <div key={item.id} className="settings-card-subgroup download-task-card">
                    <div className="download-task-card-header">
                      <div className="settings-card-subgroup-title">{item.fileName || getFileName(item.inputPath)}</div>
                      <div className="settings-hotkey-row download-task-actions">
                        {item.success && (
                          <button
                            className="settings-lyrics-source-btn"
                            type="button"
                            onClick={() => handleOpenPath(item.outputPath)}
                          >
                            {t('maxExpand.toolbox.fileCompression.openOutput')}
                          </button>
                        )}
                        <button
                          className="settings-lyrics-source-btn"
                          type="button"
                          onClick={() => handleRemoveTask(item.id)}
                        >
                          {t('maxExpand.toolbox.fileCompression.removeTask')}
                        </button>
                      </div>
                    </div>
                    <div className="settings-music-hint">
                      {item.success
                        ? t('maxExpand.toolbox.fileCompression.resultSuccess', {
                          before: formatBytes(item.originalBytes),
                          after: formatBytes(item.compressedBytes),
                          ratio: `${(item.ratio * 100).toFixed(1)}%`,
                        })
                        : t('maxExpand.toolbox.fileCompression.resultFailed', {
                          reason: item.error || '-',
                        })}
                    </div>
                    <div className="settings-music-hint">
                      {t('maxExpand.toolbox.fileCompression.taskMeta', {
                        status: item.status === 'completed'
                          ? t('maxExpand.toolbox.fileCompression.status.completed')
                          : t('maxExpand.toolbox.fileCompression.status.failed'),
                        quality: item.quality,
                      })}
                    </div>
                    {!!item.outputPath && <div className="settings-music-hint">{item.outputPath}</div>}
                  </div>
                ))}
                {statusHint}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-app-page-dots">
        {FILE_COMPRESSION_PAGES.map((page) => (
          <button
            key={page}
            className={`settings-app-page-dot ${fileCompressionPage === page ? 'active' : ''}`}
            data-label={pageLabels[page]}
            type="button"
            onClick={() => setFileCompressionPage(page)}
            title={pageLabels[page]}
            aria-label={pageLabels[page]}
          />
        ))}
      </div>
    </div>
  );
}
