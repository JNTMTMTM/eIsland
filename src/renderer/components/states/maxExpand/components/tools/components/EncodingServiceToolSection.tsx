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
 * @file EncodingServiceToolSection.tsx
 * @description 工具箱编码服务模块（JSON / Base64 编解码）
 * @author 鸡哥
 */

import { useCallback, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 编码服务模块主视图。
 */
export function EncodingServiceToolSection(): ReactElement {
  const { t } = useTranslation();

  const [jsonInput, setJsonInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState('');

  const [base64Input, setBase64Input] = useState('');
  const [base64Output, setBase64Output] = useState('');
  const [base64Error, setBase64Error] = useState('');

  const handleJsonEncode = useCallback((): void => {
    setJsonError('');
    setJsonOutput(JSON.stringify(jsonInput));
  }, [jsonInput]);

  const handleJsonDecode = useCallback((): void => {
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonInput);
      if (typeof parsed === 'string') {
        setJsonOutput(parsed);
        return;
      }
      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch {
      setJsonError(t('maxExpand.toolbox.encodingService.json.decodeError'));
    }
  }, [jsonInput, t]);

  const handleBase64Encode = useCallback((): void => {
    setBase64Error('');
    try {
      setBase64Output(encodeBase64Utf8(base64Input));
    } catch {
      setBase64Error(t('maxExpand.toolbox.encodingService.base64.encodeError'));
    }
  }, [base64Input, t]);

  const handleBase64Decode = useCallback((): void => {
    setBase64Error('');
    try {
      setBase64Output(decodeBase64Utf8(base64Input.trim()));
    } catch {
      setBase64Error(t('maxExpand.toolbox.encodingService.base64.decodeError'));
    }
  }, [base64Input, t]);

  return (
    <div className="settings-cards">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('maxExpand.toolbox.encodingService.json.title')}</div>
          <div className="settings-card-subtitle">{t('maxExpand.toolbox.encodingService.json.subtitle')}</div>
        </div>
        <div className="settings-card-body">
          <div className="translate-text-area-group">
            <div className="translate-text-area-wrapper">
              <textarea
                className="translate-textarea"
                placeholder={t('maxExpand.toolbox.encodingService.json.inputPlaceholder')}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={5}
              />
            </div>
            <div className="translate-text-area-wrapper translate-result-wrapper">
              <textarea
                className="translate-textarea translate-textarea-result"
                placeholder={t('maxExpand.toolbox.encodingService.json.outputPlaceholder')}
                value={jsonOutput}
                readOnly
                rows={5}
              />
            </div>
          </div>
          {jsonError && <div className="download-status-text">{jsonError}</div>}
          <div className="settings-hotkey-row">
            <button
              className="settings-lyrics-source-btn download-start-btn-full"
              type="button"
              onClick={handleJsonEncode}
            >
              {t('maxExpand.toolbox.encodingService.json.encodeBtn')}
            </button>
            <button
              className="settings-lyrics-source-btn download-start-btn-full"
              type="button"
              onClick={handleJsonDecode}
            >
              {t('maxExpand.toolbox.encodingService.json.decodeBtn')}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('maxExpand.toolbox.encodingService.base64.title')}</div>
          <div className="settings-card-subtitle">{t('maxExpand.toolbox.encodingService.base64.subtitle')}</div>
        </div>
        <div className="settings-card-body">
          <div className="translate-text-area-group">
            <div className="translate-text-area-wrapper">
              <textarea
                className="translate-textarea"
                placeholder={t('maxExpand.toolbox.encodingService.base64.inputPlaceholder')}
                value={base64Input}
                onChange={(e) => setBase64Input(e.target.value)}
                rows={5}
              />
            </div>
            <div className="translate-text-area-wrapper translate-result-wrapper">
              <textarea
                className="translate-textarea translate-textarea-result"
                placeholder={t('maxExpand.toolbox.encodingService.base64.outputPlaceholder')}
                value={base64Output}
                readOnly
                rows={5}
              />
            </div>
          </div>
          {base64Error && <div className="download-status-text">{base64Error}</div>}
          <div className="settings-hotkey-row">
            <button
              className="settings-lyrics-source-btn download-start-btn-full"
              type="button"
              onClick={handleBase64Encode}
            >
              {t('maxExpand.toolbox.encodingService.base64.encodeBtn')}
            </button>
            <button
              className="settings-lyrics-source-btn download-start-btn-full"
              type="button"
              onClick={handleBase64Decode}
            >
              {t('maxExpand.toolbox.encodingService.base64.decodeBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
