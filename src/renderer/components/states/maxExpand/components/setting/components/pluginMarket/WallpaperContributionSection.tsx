import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadUserWallpaper } from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';

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
    setUploading(true);
    try {
      const thumb320 = await createThumbnailFile(uploadFile, 320);
      const thumb720 = await createThumbnailFile(uploadFile, 720);
      const thumb1280 = await createThumbnailFile(uploadFile, 1280);

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const url = URL.createObjectURL(uploadFile);
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
      });

      const result = await uploadUserWallpaper(token, {
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        tags: uploadTags.trim(),
        type: 'image',
        copyrightDeclared,
        width: dimensions.width,
        height: dimensions.height,
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
            className="settings-field-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <label className="settings-plugin-market-checkbox">
            <input
              type="checkbox"
              checked={copyrightDeclared}
              onChange={(e) => setCopyrightDeclared(e.target.checked)}
            />
            <span>{t('settings.pluginMarket.wallpaper.upload.copyright', { defaultValue: '我确认拥有该图片版权或已获授权' })}</span>
          </label>
          <button className="settings-hotkey-btn" type="button" onClick={() => { handleUpload().catch(() => {}); }} disabled={uploading}>
            {uploading
              ? t('settings.pluginMarket.wallpaper.actions.uploading', { defaultValue: '上传中…' })
              : t('settings.pluginMarket.wallpaper.actions.upload', { defaultValue: '上传壁纸' })}
          </button>
        </div>
      </div>

      {message && <div className="settings-plugin-market-message">{message}</div>}
    </div>
  );
}
