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
 * @file FileServiceToolSection.tsx
 * @description 工具箱文件服务模块 - 文件哈希校验
 * @author 鸡哥
 */

import { useCallback, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const HASH_ALGORITHMS = ['md5', 'sha1', 'sha256', 'sha512'] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 文件服务模块主视图。
 */
export function FileServiceToolSection(): ReactElement {
  const { t } = useTranslation();
  const [algorithm, setAlgorithm] = useState<string>('sha256');
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [computing, setComputing] = useState(false);
  const [resultHash, setResultHash] = useState('');
  const [resultFileSize, setResultFileSize] = useState<number | null>(null);
  const [expectedHash, setExpectedHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<'match' | 'mismatch' | null>(null);
  const generationRef = useRef(0);
  const expectedHashRef = useRef(expectedHash);
  expectedHashRef.current = expectedHash;

  const handlePickFile = useCallback(async (): Promise<void> => {
    try {
      const picked = await window.api?.pickFileForHash?.();
      if (picked) {
        generationRef.current += 1;
        setFilePath(picked);
        const parts = picked.replace(/\\/g, '/').split('/');
        setFileName(parts[parts.length - 1] || picked);
        setResultHash('');
        setResultFileSize(null);
        setVerifyResult(null);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleCompute = useCallback(async (): Promise<void> => {
    if (!filePath || computing) return;
    const generation = generationRef.current;
    setComputing(true);
    setResultHash('');
    setResultFileSize(null);
    setVerifyResult(null);
    try {
      const result = await window.api?.computeFileHash?.(filePath, algorithm);
      if (result && generation === generationRef.current) {
        setResultHash(result.hash);
        setResultFileSize(result.fileSize);
        const expected = expectedHashRef.current.trim();
        if (expected) {
          setVerifyResult(
            result.hash.toLowerCase() === expected.toLowerCase() ? 'match' : 'mismatch',
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setComputing(false);
    }
  }, [filePath, algorithm, computing]);

  const handleCopyHash = useCallback((): void => {
    navigator.clipboard.writeText(resultHash).catch(() => {});
  }, [resultHash]);

  return (
    <div className="settings-cards file-service-panel">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('maxExpand.toolbox.fileService.hash.title')}</div>
          <div className="settings-card-subtitle">{t('maxExpand.toolbox.fileService.hash.subtitle')}</div>
        </div>
        <div className="settings-card-body">
          <div className="file-hash-row">
            <div className="file-hash-algo-group">
              {HASH_ALGORITHMS.map((algo) => (
                <button
                  key={algo}
                  type="button"
                  className={`file-hash-algo-btn ${algorithm === algo ? 'active' : ''}`}
                  onClick={() => {
                    generationRef.current += 1;
                    setAlgorithm(algo);
                    setResultHash('');
                    setResultFileSize(null);
                    setVerifyResult(null);
                  }}
                >
                  {algo.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="file-hash-filename" title={filePath}>
              {fileName || t('maxExpand.toolbox.fileService.hash.noFile')}
            </span>
          </div>

          <div className="file-hash-row">
            <button
              type="button"
              className="file-hash-pick-btn"
              onClick={handlePickFile}
            >
              {t('maxExpand.toolbox.fileService.hash.pickFile')}
            </button>
          </div>

          <div className="file-hash-row">
            <input
              type="text"
              className="file-hash-input"
              placeholder={t('maxExpand.toolbox.fileService.hash.expectedPlaceholder')}
              value={expectedHash}
              onChange={(e) => {
                setExpectedHash(e.target.value);
                setVerifyResult(null);
              }}
            />
          </div>

          <div className="settings-hotkey-row">
            <button
              className={`settings-lyrics-source-btn download-start-btn-full ${(!filePath || computing) ? 'disabled' : ''}`}
              type="button"
              disabled={!filePath || computing}
              onClick={handleCompute}
            >
              {computing
                ? t('maxExpand.toolbox.fileService.hash.computing')
                : t('maxExpand.toolbox.fileService.hash.computeBtn')}
            </button>
          </div>

          {resultHash && (
            <div className="file-hash-result">
              <div className="file-hash-result-header">
                <span className="file-hash-result-algo">{algorithm.toUpperCase()}</span>
                {resultFileSize !== null && (
                  <span className="file-hash-result-size">{formatFileSize(resultFileSize)}</span>
                )}
                <button type="button" className="file-hash-copy-btn" onClick={handleCopyHash}>
                  {t('maxExpand.toolbox.fileService.hash.copy')}
                </button>
              </div>
              <div className="file-hash-result-value">{resultHash}</div>
              {verifyResult && (
                <div className={`file-hash-verify ${verifyResult}`}>
                  {verifyResult === 'match'
                    ? t('maxExpand.toolbox.fileService.hash.match')
                    : t('maxExpand.toolbox.fileService.hash.mismatch')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
