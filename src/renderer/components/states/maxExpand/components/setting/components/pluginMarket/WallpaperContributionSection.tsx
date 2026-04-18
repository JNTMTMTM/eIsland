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
 * @file WallpaperContributionSection.tsx
 * @description 插件市场壁纸贡献组件，支持图片与视频壁纸
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadUserWallpaper } from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';
import { TagInput } from './TagInput';

interface PreviewEntry {
  label: string;
  url: string;
  width: number;
  height: number;
  file?: File;
}

interface VideoMeta {
  durationMs: number;
  frameRate: number | null;
  width: number;
  height: number;
}

interface WallpaperContributionSectionProps {
  onGoWallpaper: () => void;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

async function createThumbnailFile(sourceFile: File, maxWidth: number): Promise<File> {
  const imageUrl = URL.createObjectURL(sourceFile);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image load failed'));
      image.src = imageUrl;
    });
    const targetWidth = Math.max(1, Math.min(maxWidth, img.width));
    const targetHeight = Math.max(1, Math.round((img.height * targetWidth) / img.width));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('thumbnail encode failed'));
      }, 'image/jpeg', 0.9);
    });
    return new File([blob], `thumb-${maxWidth}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function createThumbnailFromImageElement(img: HTMLImageElement, maxWidth: number): Promise<File> {
  const targetWidth = Math.max(1, Math.min(maxWidth, img.width));
  const targetHeight = Math.max(1, Math.round((img.height * targetWidth) / img.width));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('thumbnail encode failed'));
    }, 'image/jpeg', 0.9);
  });
  return new File([blob], `thumb-${maxWidth}.jpg`, { type: 'image/jpeg' });
}

/**
 * 基于浏览器 HTMLVideoElement 测量实际帧率
 *
 * 使用 requestVideoFrameCallback 在短时间静音试播内采样若干帧，
 * 以 mediaTime 差作为分母计算 fps。若浏览器不支持则返回 null。
 */
async function measureFrameRate(video: HTMLVideoElement): Promise<number | null> {
  interface VideoFrameCallbackMeta {
    mediaTime: number;
    expectedDisplayTime: number;
    presentationTime: number;
  }
  type RequestVideoFrameCallback = (cb: (now: number, meta: VideoFrameCallbackMeta) => void) => number;
  const rvfc = (video as HTMLVideoElement & { requestVideoFrameCallback?: RequestVideoFrameCallback }).requestVideoFrameCallback;
  if (typeof rvfc !== 'function') return null;

  return new Promise<number | null>((resolve) => {
    let settled = false;
    let firstMedia = 0;
    let lastMedia = 0;
    let firstTime = 0;
    let count = 0;
    const MAX_WALL_MS = 1500;
    const TARGET_FRAMES = 20;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      try { video.pause(); } catch { /* ignore */ }
      const mediaElapsed = lastMedia - firstMedia;
      if (count >= 2 && mediaElapsed > 0) {
        const fps = (count - 1) / mediaElapsed;
        resolve(Number.isFinite(fps) && fps > 0 ? Number(fps.toFixed(2)) : null);
      } else {
        resolve(null);
      }
    };
    const fallbackTimer = window.setTimeout(finish, MAX_WALL_MS + 200);
    const tick = (now: number, meta: VideoFrameCallbackMeta): void => {
      if (settled) return;
      if (count === 0) {
        firstTime = now;
        firstMedia = meta.mediaTime;
      }
      lastMedia = meta.mediaTime;
      count += 1;
      if (count >= TARGET_FRAMES || now - firstTime >= MAX_WALL_MS) {
        window.clearTimeout(fallbackTimer);
        finish();
        return;
      }
      rvfc.call(video, tick);
    };
    try {
      video.muted = true;
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          window.clearTimeout(fallbackTimer);
          finish();
        });
      }
      rvfc.call(video, tick);
    } catch {
      window.clearTimeout(fallbackTimer);
      resolve(null);
    }
  });
}

async function createVideoPosterAndMeta(file: File): Promise<{ poster: File; width: number; height: number; durationMs: number; frameRate: number | null }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      const onLoaded = (): void => resolve();
      const onError = (): void => reject(new Error('video load failed'));
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.src = url;
    });

    const width = Math.max(1, Math.round(video.videoWidth || 1));
    const height = Math.max(1, Math.round(video.videoHeight || 1));
    const durationMs = Math.max(1, Math.round((video.duration || 0) * 1000));
    const seekTarget = Math.min(Math.max(0.05, video.duration * 0.05), Math.max(0.05, video.duration - 0.05));

    await new Promise<void>((resolve) => {
      const onSeeked = (): void => resolve();
      video.addEventListener('seeked', onSeeked, { once: true });
      try {
        video.currentTime = Number.isFinite(seekTarget) ? seekTarget : 0;
      } catch {
        resolve();
      }
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.drawImage(video, 0, 0, width, height);
    const posterBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('poster encode failed'));
      }, 'image/jpeg', 0.9);
    });
    const poster = new File([posterBlob], 'video-poster.jpg', { type: 'image/jpeg' });

    const frameRate = await measureFrameRate(video);

    return { poster, width, height, durationMs, frameRate };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 壁纸贡献内容区
 */
export function WallpaperContributionSection({ onGoWallpaper }: WallpaperContributionSectionProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVideoMeta, setUploadVideoMeta] = useState<VideoMeta | null>(null);
  const [copyrightDeclared, setCopyrightDeclared] = useState(false);
  const [previews, setPreviews] = useState<PreviewEntry[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewsRef = useRef<PreviewEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => () => {
    previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  const clearPreviews = (): void => {
    previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
  };

  const handleOpenFilePicker = (): void => {
    if (uploading || previewBusy) {
      return;
    }
    fileInputRef.current?.click();
  };

  const loadImageDimensions = (file: File): Promise<{ width: number; height: number }> => (
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.width, height: image.height });
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法读取图片尺寸'));
      };
      image.src = url;
    })
  );

  const handleFilePick = async (file: File | null): Promise<void> => {
    clearPreviews();
    setUploadFile(file);
    setUploadVideoMeta(null);
    if (!file) return;

    if (uploadType === 'video') {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.mp4')) {
        setMessage(t('settings.pluginMarket.wallpaper.feedback.videoTypeInvalid', { defaultValue: '仅支持 mp4 视频文件' }));
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setMessage(t('settings.pluginMarket.wallpaper.feedback.videoTooLarge', { defaultValue: '视频不能超过 100MB' }));
        return;
      }
    } else if (file.size > MAX_IMAGE_SIZE) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.fileTooLarge', { defaultValue: '图片不能超过 20MB' }));
      return;
    }

    setPreviewBusy(true);
    try {
      if (uploadType === 'video') {
        const info = await createVideoPosterAndMeta(file);
        const { poster: posterFile, width, height, durationMs, frameRate } = info;

        const posterUrl = URL.createObjectURL(posterFile);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('poster load failed'));
          image.src = posterUrl;
        });

        const thumb320 = await createThumbnailFromImageElement(img, 320);
        const thumb720 = await createThumbnailFromImageElement(img, 720);
        const thumb1280 = await createThumbnailFromImageElement(img, 1280);
        const next: PreviewEntry[] = [
          { label: '320w', url: URL.createObjectURL(thumb320), width: 320, height: Math.round(height * 320 / Math.max(1, width)), file: thumb320 },
          { label: '720w', url: URL.createObjectURL(thumb720), width: 720, height: Math.round(height * 720 / Math.max(1, width)), file: thumb720 },
          { label: '1280w', url: URL.createObjectURL(thumb1280), width: 1280, height: Math.round(height * 1280 / Math.max(1, width)), file: thumb1280 },
          { label: `${width}w`, url: posterUrl, width, height },
        ];
        setUploadVideoMeta({ durationMs, frameRate, width, height });
        setPreviews(next);
      } else {
        const dimensions = await loadImageDimensions(file);
        const thumb320 = await createThumbnailFile(file, 320);
        const thumb720 = await createThumbnailFile(file, 720);
        const thumb1280 = await createThumbnailFile(file, 1280);
        const next: PreviewEntry[] = [
          { label: '320w', url: URL.createObjectURL(thumb320), width: 320, height: Math.round(dimensions.height * 320 / dimensions.width), file: thumb320 },
          { label: '720w', url: URL.createObjectURL(thumb720), width: 720, height: Math.round(dimensions.height * 720 / dimensions.width), file: thumb720 },
          { label: '1280w', url: URL.createObjectURL(thumb1280), width: 1280, height: Math.round(dimensions.height * 1280 / dimensions.width), file: thumb1280 },
          { label: `${dimensions.width}w`, url: URL.createObjectURL(file), width: dimensions.width, height: dimensions.height },
        ];
        setPreviews(next);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
    } finally {
      setPreviewBusy(false);
    }
  };

  const handleUpload = async (): Promise<void> => {
    const token = readLocalToken();
    if (!token) return;
    if (!uploadTitle.trim()) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.titleRequired', { defaultValue: '请填写标题' }));
      return;
    }
    if (!uploadFile) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.fileRequired', { defaultValue: '请选择图片文件' }));
      return;
    }
    if (!copyrightDeclared) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.copyrightRequired', { defaultValue: '请先勾选版权声明' }));
      return;
    }
    if (uploadType === 'video' && uploadFile.size > MAX_VIDEO_SIZE) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.videoTooLarge', { defaultValue: '视频不能超过 100MB' }));
      return;
    }
    if (uploadType === 'image' && uploadFile.size > MAX_IMAGE_SIZE) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.fileTooLarge', { defaultValue: '图片不能超过 20MB' }));
      return;
    }
    const thumb320 = previews[0]?.file;
    const thumb720 = previews[1]?.file;
    const thumb1280 = previews[2]?.file;
    const originalPreview = previews[3];
    if (!thumb320 || !thumb720 || !thumb1280 || !originalPreview) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
      return;
    }
    setMessage('');
    setUploadProgress(0);
    setUploading(true);
    try {
      const result = await uploadUserWallpaper(token, {
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        tags: uploadTags.trim(),
        type: uploadType,
        copyrightDeclared,
        width: originalPreview.width,
        height: originalPreview.height,
        durationMs: uploadType === 'video' ? uploadVideoMeta?.durationMs : undefined,
        frameRate: uploadType === 'video' ? uploadVideoMeta?.frameRate ?? undefined : undefined,
        original: uploadFile,
        thumb320,
        thumb720,
        thumb1280,
      }, {
        onUploadProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
        return;
      }

      setMessage(t('settings.pluginMarket.wallpaper.feedback.uploadSuccess', { defaultValue: '上传成功，等待审核' }));
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadType('image');
      setUploadFile(null);
      setUploadVideoMeta(null);
      setCopyrightDeclared(false);
      clearPreviews();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="settings-plugin-market-wallpaper">
      <div className="settings-plugin-market-top-actions">
        <button className="settings-hotkey-btn" type="button" onClick={onGoWallpaper}>
          {t('settings.pluginMarket.contribution.actions.backToWallpaper', { defaultValue: '返回壁纸市场' })}
        </button>
      </div>

      <div className="settings-plugin-market-upload">
        <div className="settings-plugin-market-contribution-title">
          {t('settings.pluginMarket.contribution.title', { defaultValue: '贡献你的壁纸' })}
        </div>
        <div className="settings-plugin-market-upload-grid">
          <div className="settings-plugin-market-top-actions" style={{ gridColumn: '1 / -1' }}>
            <button
              className="settings-hotkey-btn"
              type="button"
              onClick={() => {
                if (uploading || previewBusy) return;
                setUploadType('image');
                setUploadFile(null);
                setUploadVideoMeta(null);
                clearPreviews();
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={uploading || previewBusy}
            >
              {t('settings.pluginMarket.wallpaper.upload.typeImage', { defaultValue: '图片' })}
            </button>
            <button
              className="settings-hotkey-btn"
              type="button"
              onClick={() => {
                if (uploading || previewBusy) return;
                setUploadType('video');
                setUploadFile(null);
                setUploadVideoMeta(null);
                clearPreviews();
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={uploading || previewBusy}
            >
              {t('settings.pluginMarket.wallpaper.upload.typeVideo', { defaultValue: '视频' })}
            </button>
          </div>
          <input
            className="settings-field-input"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.titlePlaceholder', { defaultValue: '标题' })}
          />
          <TagInput
            value={uploadTags}
            onChange={setUploadTags}
            placeholder={t('settings.pluginMarket.wallpaper.upload.tagsPlaceholder', { defaultValue: '标签（逗号分隔）' })}
            disabled={uploading}
          />
          <textarea
            className="settings-field-input"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.descriptionPlaceholder', { defaultValue: '描述' })}
          />
          <div className="settings-plugin-market-upload-file-row">
            <input
              ref={fileInputRef}
              className="settings-plugin-market-upload-file-input"
              type="file"
              accept={uploadType === 'video' ? 'video/mp4,.mp4' : 'image/jpeg,image/png,image/webp'}
              onChange={(e) => { handleFilePick(e.target.files?.[0] || null).catch(() => {}); }}
            />
            <button
              className="settings-hotkey-btn settings-plugin-market-upload-file-btn"
              type="button"
              onClick={handleOpenFilePicker}
              disabled={uploading || previewBusy}
            >
              {uploadType === 'video'
                ? t('settings.pluginMarket.wallpaper.upload.chooseVideoFile', { defaultValue: '选择视频文件' })
                : t('settings.pluginMarket.wallpaper.upload.chooseFile', { defaultValue: '选择图片文件' })}
            </button>
            <span className="settings-plugin-market-upload-file-name">
              {uploadFile?.name || t('settings.pluginMarket.wallpaper.upload.noFile', { defaultValue: '未选择文件' })}
            </span>
          </div>
          {uploadType === 'video' && uploadVideoMeta && (
            <div className="settings-plugin-market-upload-previews-hint">
              {t('settings.pluginMarket.wallpaper.upload.videoMeta', {
                defaultValue: `时长 ${Math.max(1, Math.round(uploadVideoMeta.durationMs / 1000))}s / 帧率 ${uploadVideoMeta.frameRate ? uploadVideoMeta.frameRate.toFixed(2) : '-'} fps / 分辨率 ${uploadVideoMeta.width}x${uploadVideoMeta.height}`,
                seconds: Math.max(1, Math.round(uploadVideoMeta.durationMs / 1000)),
                fps: uploadVideoMeta.frameRate ? uploadVideoMeta.frameRate.toFixed(2) : '-',
                width: uploadVideoMeta.width,
                height: uploadVideoMeta.height,
              })}
            </div>
          )}
          {previewBusy && (
            <div className="settings-plugin-market-upload-previews-hint">
              {t('settings.pluginMarket.wallpaper.upload.previewGenerating', { defaultValue: '正在生成预览…' })}
            </div>
          )}
          {previews.length > 0 && (
            <div className="settings-plugin-market-upload-previews">
              {previews.map((p) => (
                <div
                  key={p.label}
                  className="settings-plugin-market-upload-preview"
                  style={{ flex: `${p.width} 1 0%` }}
                >
                  <img src={p.url} alt={p.label} className="settings-plugin-market-upload-preview-img" />
                  <div className="settings-plugin-market-upload-preview-label">{p.label}</div>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div className="settings-plugin-market-upload-progress">
              <div className="settings-plugin-market-upload-progress-text">
                {t('settings.pluginMarket.wallpaper.upload.progress', { defaultValue: '上传进度' })}
                {' '}
                {Math.max(0, Math.min(100, uploadProgress))}%
              </div>
              <div className="settings-plugin-market-upload-progress-track">
                <div
                  className="settings-plugin-market-upload-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }}
                />
              </div>
            </div>
          )}
          <div className="settings-plugin-market-copyright-row">
            <label className="settings-plugin-market-checkbox">
              <input
                type="checkbox"
                checked={copyrightDeclared}
                onChange={(e) => setCopyrightDeclared(e.target.checked)}
              />
              <span>{t('settings.pluginMarket.wallpaper.upload.copyright', { defaultValue: '我确认拥有该图片版权或已获授权' })}</span>
            </label>
            {message && <div className="settings-plugin-market-message">{message}</div>}
          </div>
          <button
            className="settings-hotkey-btn settings-plugin-market-upload-btn"
            type="button"
            onClick={() => { handleUpload().catch(() => {}); }}
            disabled={uploading || previewBusy}
          >
            {uploading
              ? t('settings.pluginMarket.wallpaper.actions.uploading', { defaultValue: '上传中…' })
              : t('settings.pluginMarket.wallpaper.actions.upload', { defaultValue: '上传壁纸' })}
          </button>
        </div>
      </div>
    </div>
  );
}
