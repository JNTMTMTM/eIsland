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
 * @file FormatFactoryToolSection.tsx
 * @description 工具箱格式工厂模块
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  convertImageInRenderer,
} from '../utils/imageConverter';
import {
  FORMAT_FACTORY_ICO_OUTPUT_SIZES,
  FORMAT_FACTORY_IMAGE_OUTPUT_FORMATS,
  FORMAT_FACTORY_AUDIO_OUTPUT_FORMATS,
  FORMAT_FACTORY_VIDEO_OUTPUT_FORMATS,
  FORMAT_FACTORY_VIDEO_EXTRACT_TRACKS,
  FORMAT_FACTORY_PAGES,
  type FormatFactoryIcoOutputSize,
  type FormatFactoryImageOutputFormat,
  type FormatFactoryAudioOutputFormat,
  type FormatFactoryVideoOutputFormat,
  type FormatFactoryVideoExtractTrack,
  type FormatFactoryPageKey,
} from '../config/formatFactoryToolConfig';

interface FormatFactoryToolSectionProps {
  formatFactoryPage: FormatFactoryPageKey;
  setFormatFactoryPage: (page: FormatFactoryPageKey) => void;
}

function getExtension(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const name = parts[parts.length - 1] || '';
  const dotIdx = name.lastIndexOf('.');
  return dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : '';
}

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estimateBytesFromDataUrl(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  if (idx < 0) return 0;
  const b64 = dataUrl.slice(idx + 1);
  const trimmed = b64.replace(/=+$/u, '');
  const padding = b64.length - trimmed.length;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function getMimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);base64,/i.exec(dataUrl);
  return match?.[1] ?? 'image/*';
}

function formatAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${Math.round(width / d)}:${Math.round(height / d)}`;
}

/**
 * 格式工厂模块主视图。
 */
export function FormatFactoryToolSection({ formatFactoryPage, setFormatFactoryPage }: FormatFactoryToolSectionProps): ReactElement {
  const { t } = useTranslation();
  const pageRef = useRef<FormatFactoryPageKey>(formatFactoryPage);
  pageRef.current = formatFactoryPage;
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const pageLabels: Record<FormatFactoryPageKey, string> = {
    image: t('maxExpand.toolbox.formatFactory.pages.image'),
    video: t('maxExpand.toolbox.formatFactory.pages.video'),
  };

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.settings-app-page-dots')) return;
      const idx = FORMAT_FACTORY_PAGES.indexOf(pageRef.current);
      if (idx < 0) return;
      const next = e.deltaY > 0
        ? Math.min(idx + 1, FORMAT_FACTORY_PAGES.length - 1)
        : Math.max(idx - 1, 0);
      if (next !== idx) {
        e.preventDefault();
        setFormatFactoryPage(FORMAT_FACTORY_PAGES[next]);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setFormatFactoryPage]);

  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [sourceExt, setSourceExt] = useState('');
  const [targetFormat, setTargetFormat] = useState<FormatFactoryImageOutputFormat>('png');
  const [targetIcoSize, setTargetIcoSize] = useState<FormatFactoryIcoOutputSize>(32);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'success' | 'error' | ''>('');
  const [resultFileSize, setResultFileSize] = useState<number | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const [imgFileSize, setImgFileSize] = useState<number | null>(null);

  const pixelCount = imgWidth > 0 && imgHeight > 0 ? imgWidth * imgHeight : 0;
  const previewMime = previewDataUrl ? getMimeFromDataUrl(previewDataUrl) : '-';

  const [videoFilePath, setVideoFilePath] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [videoSourceExt, setVideoSourceExt] = useState('');
  const [videoFileSize, setVideoFileSize] = useState<number | null>(null);
  const [extractTrack, setExtractTrack] = useState<FormatFactoryVideoExtractTrack>('audio');
  const [audioOutputFormat, setAudioOutputFormat] = useState<FormatFactoryAudioOutputFormat>('mp3');
  const [videoOutputFormat, setVideoOutputFormat] = useState<FormatFactoryVideoOutputFormat>('mp4');
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractResultMessage, setExtractResultMessage] = useState('');
  const [extractResultType, setExtractResultType] = useState<'success' | 'error' | ''>('');

  const handlePickVideoFile = useCallback(async (): Promise<void> => {
    try {
      const picked = await window.api?.pickVideoForExtract?.();
      if (picked) {
        setVideoFilePath(picked.filePath);
        setVideoFileName(getFileName(picked.filePath));
        setVideoSourceExt(getExtension(picked.filePath));
        setVideoFileSize(picked.fileSize ?? null);
        setExtractResultMessage('');
        setExtractResultType('');
        setExtractProgress(0);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleExtractTrack = useCallback(async (): Promise<void> => {
    if (!videoFilePath || extracting) return;
    setExtracting(true);
    setExtractProgress(3);
    setExtractResultMessage('');
    setExtractResultType('');
    const progressTimer = window.setInterval(() => {
      setExtractProgress((prev) => {
        if (prev >= 92) return prev;
        if (prev < 35) return prev + 5;
        if (prev < 70) return prev + 3;
        return prev + 1;
      });
    }, 200);
    try {
      const outputFmt = extractTrack === 'audio' ? audioOutputFormat : videoOutputFormat;
      const result = await window.api?.extractVideoTrack?.({
        filePath: videoFilePath,
        trackType: extractTrack,
        outputFormat: outputFmt,
      });
      if (result?.error === 'canceled') {
        // 用户取消保存对话框，静默退出
        return;
      }
      setExtractProgress(100);
      if (result?.success) {
        setExtractResultMessage(t('maxExpand.toolbox.formatFactory.video.success', { path: result.outputPath ?? '' }));
        setExtractResultType('success');
      } else {
        setExtractResultMessage(result?.error || t('maxExpand.toolbox.formatFactory.video.failed'));
        setExtractResultType('error');
      }
    } catch {
      setExtractProgress(100);
      setExtractResultMessage(t('maxExpand.toolbox.formatFactory.video.failed'));
      setExtractResultType('error');
    } finally {
      window.clearInterval(progressTimer);
      setExtracting(false);
      window.setTimeout(() => {
        setExtractProgress(0);
      }, 700);
    }
  }, [videoFilePath, extracting, extractTrack, audioOutputFormat, videoOutputFormat, t]);

  const handlePickFile = useCallback(async (): Promise<void> => {
    try {
      const picked = await window.api?.pickFileForHash?.();
      if (picked) {
        setFilePath(picked);
        setFileName(getFileName(picked));
        const ext = getExtension(picked);
        setSourceExt(ext);
        setResultMessage('');
        setResultType('');
        setResultFileSize(null);
        setConvertProgress(0);
        setImgWidth(0);
        setImgHeight(0);
        setImgFileSize(null);
        setPreviewDataUrl('');
        try {
          const dataUrl = await window.api?.loadWallpaperFile?.(picked);
          if (dataUrl) {
            setPreviewDataUrl(dataUrl);
            const estimated = estimateBytesFromDataUrl(dataUrl);
            if (estimated > 0) setImgFileSize(estimated);
          }
        } catch { /* ignore */ }
        try {
          const info = await window.api.getAlbumMediaInfo(picked);
          if (info) setImgFileSize(info.sizeBytes);
        } catch { /* ignore */ }
        if (ext && FORMAT_FACTORY_IMAGE_OUTPUT_FORMATS.includes(ext as FormatFactoryImageOutputFormat)) {
          const firstOther = FORMAT_FACTORY_IMAGE_OUTPUT_FORMATS.find((f) => f !== ext);
          if (firstOther) setTargetFormat(firstOther);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleConvert = useCallback(async (): Promise<void> => {
    if (!filePath || converting) return;
    setConverting(true);
    setConvertProgress(3);
    setResultMessage('');
    setResultType('');
    setResultFileSize(null);
    const progressTimer = window.setInterval(() => {
      setConvertProgress((prev) => {
        if (prev >= 92) return prev;
        if (prev < 35) return prev + 7;
        if (prev < 70) return prev + 4;
        return prev + 2;
      });
    }, 140);
    try {
      const result = await convertImageInRenderer({
        filePath,
        targetFormat,
        icoSize: targetIcoSize,
        quality: 1,
      });
      setConvertProgress(100);
      if (result?.success) {
        setResultMessage(t('maxExpand.toolbox.formatFactory.image.success', { path: result.outputPath ?? '' }));
        setResultType('success');
        if (result.fileSize) setResultFileSize(result.fileSize);
      } else {
        setResultMessage(result?.error || t('maxExpand.toolbox.formatFactory.image.failed'));
        setResultType('error');
      }
    } catch {
      setConvertProgress(100);
      setResultMessage(t('maxExpand.toolbox.formatFactory.image.failed'));
      setResultType('error');
    } finally {
      window.clearInterval(progressTimer);
      setConverting(false);
      window.setTimeout(() => {
        setConvertProgress(0);
      }, 700);
    }
  }, [filePath, converting, targetFormat, targetIcoSize, t]);

  const renderImagePage = (): ReactElement => (
    <div className="settings-cards format-factory-panel">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('maxExpand.toolbox.formatFactory.image.title')}</div>
          <div className="settings-card-subtitle">{t('maxExpand.toolbox.formatFactory.image.subtitle')}</div>
        </div>
        <div className="settings-card-body">
          <div className="file-hash-row">
            <button
              type="button"
              className="file-hash-pick-btn"
              onClick={handlePickFile}
            >
              {t('maxExpand.toolbox.formatFactory.image.pickFile')}
            </button>
          </div>

          {previewDataUrl && (
            <div className="ff-preview-area">
              <div className="ff-preview-thumb">
                <img
                  src={previewDataUrl}
                  alt={fileName}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImgWidth(img.naturalWidth);
                    setImgHeight(img.naturalHeight);
                  }}
                />
              </div>
              <ul className="album-meta-list ff-meta-list">
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.name')}</span>
                  <span className="album-meta-value" title={fileName}>{fileName}</span>
                </li>
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.mediaType')}</span>
                  <span className="album-meta-value">{t('maxExpand.toolbox.formatFactory.image.meta.mediaTypeImage')}</span>
                </li>
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.mime')}</span>
                  <span className="album-meta-value">{previewMime}</span>
                </li>
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.format')}</span>
                  <span className="album-meta-value">{sourceExt.toUpperCase()}</span>
                </li>
                {imgWidth > 0 && imgHeight > 0 && (
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.resolution')}</span>
                    <span className="album-meta-value">{imgWidth} × {imgHeight}</span>
                  </li>
                )}
                {imgFileSize !== null && imgFileSize !== undefined && (
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.size')}</span>
                    <span className="album-meta-value">{formatFileSize(imgFileSize)}</span>
                  </li>
                )}
                {pixelCount > 0 && (
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.pixels')}</span>
                    <span className="album-meta-value">{pixelCount.toLocaleString()} px</span>
                  </li>
                )}
                {imgWidth > 0 && imgHeight > 0 && (
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.aspectRatio')}</span>
                    <span className="album-meta-value">{formatAspectRatio(imgWidth, imgHeight)}</span>
                  </li>
                )}
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.targetFormat')}</span>
                  <span className="album-meta-value">{targetFormat.toUpperCase()}</span>
                </li>
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.image.meta.path')}</span>
                  <span className="album-meta-value" title={filePath}>{filePath}</span>
                </li>
              </ul>
            </div>
          )}

          <div className="file-hash-row">
            <span style={{ fontSize: 12, opacity: 0.6, marginRight: 8, whiteSpace: 'nowrap' }}>
              {t('maxExpand.toolbox.formatFactory.image.targetFormat')}
            </span>
            <div className="file-hash-algo-group">
              {FORMAT_FACTORY_IMAGE_OUTPUT_FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`file-hash-algo-btn ${targetFormat === fmt ? 'active' : ''} ${sourceExt === fmt ? 'disabled' : ''}`}
                  disabled={sourceExt === fmt}
                  onClick={() => setTargetFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {targetFormat === 'ico' && (
            <div className="file-hash-row">
              <span style={{ fontSize: 12, opacity: 0.6, marginRight: 8, whiteSpace: 'nowrap' }}>
                {t('maxExpand.toolbox.formatFactory.image.targetSize')}
              </span>
              <div className="file-hash-algo-group">
                {FORMAT_FACTORY_ICO_OUTPUT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`file-hash-algo-btn ${targetIcoSize === size ? 'active' : ''}`}
                    onClick={() => setTargetIcoSize(size)}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="settings-hotkey-row">
            <button
              className={`settings-lyrics-source-btn download-start-btn-full ff-convert-btn ${(!filePath || converting || sourceExt === targetFormat) ? 'disabled' : ''}`}
              type="button"
              disabled={!filePath || converting || sourceExt === targetFormat}
              onClick={handleConvert}
            >
              {converting
                ? (
                  <>
                    <span className="ff-convert-spinner" aria-hidden="true" />
                    <span>{t('maxExpand.toolbox.formatFactory.image.converting')}</span>
                  </>
                )
                : t('maxExpand.toolbox.formatFactory.image.convertBtn')}
            </button>
          </div>

          {(converting || convertProgress > 0) && (
            <div className="ff-convert-progress">
              <div className="ff-convert-progress-track">
                <div
                  className="ff-convert-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, convertProgress))}%` }}
                />
              </div>
              <span className="ff-convert-progress-text">
                {Math.max(0, Math.min(100, Math.round(convertProgress)))}%
              </span>
            </div>
          )}

          {resultMessage && (
            <div className={`file-hash-verify ${resultType === 'success' ? 'match' : 'mismatch'}`}>
              <span>{resultMessage}</span>
              {resultType === 'success' && resultFileSize !== null && (
                <span style={{ opacity: 0.7, marginLeft: 8, fontSize: 11 }}>
                  ({formatFileSize(resultFileSize)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVideoPage = (): ReactElement => (
    <div className="settings-cards format-factory-panel">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('maxExpand.toolbox.formatFactory.video.title')}</div>
          <div className="settings-card-subtitle">{t('maxExpand.toolbox.formatFactory.video.subtitle')}</div>
        </div>
        <div className="settings-card-body">
          <div className="file-hash-row">
            <button
              type="button"
              className="file-hash-pick-btn"
              onClick={handlePickVideoFile}
            >
              {t('maxExpand.toolbox.formatFactory.video.pickFile')}
            </button>
          </div>

          {videoFilePath && (
            <div className="ff-preview-area ff-video-meta-area">
              <ul className="album-meta-list ff-meta-list">
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.video.meta.name')}</span>
                  <span className="album-meta-value" title={videoFileName}>{videoFileName}</span>
                </li>
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.video.meta.format')}</span>
                  <span className="album-meta-value">{videoSourceExt.toUpperCase() || '-'}</span>
                </li>
                {videoFileSize !== null && videoFileSize !== undefined && (
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.video.meta.size')}</span>
                    <span className="album-meta-value">{formatFileSize(videoFileSize)}</span>
                  </li>
                )}
                <li className="album-meta-row">
                  <span className="album-meta-label">{t('maxExpand.toolbox.formatFactory.video.meta.path')}</span>
                  <span className="album-meta-value" title={videoFilePath}>{videoFilePath}</span>
                </li>
              </ul>
            </div>
          )}

          <div className="file-hash-row">
            <span style={{ fontSize: 12, opacity: 0.6, marginRight: 8, whiteSpace: 'nowrap' }}>
              {t('maxExpand.toolbox.formatFactory.video.trackType')}
            </span>
            <div className="file-hash-algo-group">
              {FORMAT_FACTORY_VIDEO_EXTRACT_TRACKS.map((track) => (
                <button
                  key={track}
                  type="button"
                  className={`file-hash-algo-btn ${extractTrack === track ? 'active' : ''}`}
                  onClick={() => setExtractTrack(track)}
                >
                  {t(`maxExpand.toolbox.formatFactory.video.track${track.charAt(0).toUpperCase() + track.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="file-hash-row">
            <span style={{ fontSize: 12, opacity: 0.6, marginRight: 8, whiteSpace: 'nowrap' }}>
              {t('maxExpand.toolbox.formatFactory.video.outputFormat')}
            </span>
            <div className="file-hash-algo-group">
              {extractTrack === 'audio'
                ? FORMAT_FACTORY_AUDIO_OUTPUT_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={`file-hash-algo-btn ${audioOutputFormat === fmt ? 'active' : ''}`}
                      onClick={() => setAudioOutputFormat(fmt)}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))
                : FORMAT_FACTORY_VIDEO_OUTPUT_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={`file-hash-algo-btn ${videoOutputFormat === fmt ? 'active' : ''}`}
                      onClick={() => setVideoOutputFormat(fmt)}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
            </div>
          </div>

          <div className="settings-hotkey-row">
            <button
              className={`settings-lyrics-source-btn download-start-btn-full ff-convert-btn ${(!videoFilePath || extracting) ? 'disabled' : ''}`}
              type="button"
              disabled={!videoFilePath || extracting}
              onClick={handleExtractTrack}
            >
              {extracting
                ? (
                  <>
                    <span className="ff-convert-spinner" aria-hidden="true" />
                    <span>{t('maxExpand.toolbox.formatFactory.video.extracting')}</span>
                  </>
                )
                : t('maxExpand.toolbox.formatFactory.video.extractBtn')}
            </button>
          </div>

          {(extracting || extractProgress > 0) && (
            <div className="ff-convert-progress">
              <div className="ff-convert-progress-track">
                <div
                  className="ff-convert-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, extractProgress))}%` }}
                />
              </div>
              <span className="ff-convert-progress-text">
                {Math.max(0, Math.min(100, Math.round(extractProgress)))}%
              </span>
            </div>
          )}

          {extractResultMessage && (
            <div className={`file-hash-verify ${extractResultType === 'success' ? 'match' : 'mismatch'}`}>
              <span>{extractResultMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-app-pages-layout" ref={layoutRef}>
      <div className="settings-app-page-main">
        {formatFactoryPage === 'image' && renderImagePage()}
        {formatFactoryPage === 'video' && renderVideoPage()}
      </div>
      <div className="settings-app-page-dots">
        {FORMAT_FACTORY_PAGES.map((page) => (
          <button
            key={page}
            className={`settings-app-page-dot ${formatFactoryPage === page ? 'active' : ''}`}
            data-label={pageLabels[page]}
            type="button"
            onClick={() => setFormatFactoryPage(page)}
            title={pageLabels[page]}
            aria-label={pageLabels[page]}
          />
        ))}
      </div>
    </div>
  );
}
