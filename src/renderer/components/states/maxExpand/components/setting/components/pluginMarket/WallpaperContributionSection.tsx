import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadUserWallpaper } from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';

interface PreviewEntry {
  label: string;
  url: string;
  width: number;
  height: number;
  file?: File;
}

interface WallpaperContributionSectionProps {
  onGoWallpaper: () => void;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

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

export function WallpaperContributionSection({ onGoWallpaper }: WallpaperContributionSectionProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [copyrightDeclared, setCopyrightDeclared] = useState(false);
  const [previews, setPreviews] = useState<PreviewEntry[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewsRef = useRef<PreviewEntry[]>([]);

  useEffect(() => { previewsRef.current = previews; }, [previews]);
  useEffect(() => () => {
    previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  const clearPreviews = (): void => {
    previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
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
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage(t('settings.pluginMarket.wallpaper.feedback.fileTooLarge', { defaultValue: '图片不能超过 20MB' }));
      return;
    }
    setPreviewBusy(true);
    try {
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
    if (uploadFile.size > MAX_IMAGE_SIZE) {
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
    setUploading(true);
    try {
      const result = await uploadUserWallpaper(token, {
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        tags: uploadTags.trim(),
        type: 'image',
        copyrightDeclared,
        width: originalPreview.width,
        height: originalPreview.height,
        original: uploadFile,
        thumb320,
        thumb720,
        thumb1280,
      });

      if (!result.ok) {
        setMessage(result.message || t('settings.pluginMarket.wallpaper.feedback.uploadFailed', { defaultValue: '上传失败' }));
        return;
      }

      setMessage(t('settings.pluginMarket.wallpaper.feedback.uploadSuccess', { defaultValue: '上传成功，等待审核' }));
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setUploadFile(null);
      setCopyrightDeclared(false);
      clearPreviews();
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
          <input
            className="settings-field-input"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.titlePlaceholder', { defaultValue: '标题' })}
          />
          <input
            className="settings-field-input"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.tagsPlaceholder', { defaultValue: '标签（逗号分隔）' })}
          />
          <textarea
            className="settings-field-input"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            placeholder={t('settings.pluginMarket.wallpaper.upload.descriptionPlaceholder', { defaultValue: '描述' })}
          />
          <input
            className="settings-field-input settings-plugin-market-upload-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => { handleFilePick(e.target.files?.[0] || null).catch(() => {}); }}
          />
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
