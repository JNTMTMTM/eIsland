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
 * @file MarkdownCodeBlock.tsx
 * @description AI 对话 Markdown 代码块渲染组件，支持语言图标、语言标签与一键复制。
 * @author 鸡哥
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveDevIconByLanguage } from '../../../../../../utils/SvgIcon';

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'react',
  ts: 'typescript',
  tsx: 'react',
  py: 'python',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  csharp: 'csharp',
  cs: 'csharp',
  'c++': 'cplusplus',
  cpp: 'cplusplus',
  md: 'markdown',
};

function resolveCodeLanguage(className?: string): string {
  const match = /language-([a-zA-Z0-9#+-]+)/.exec(className ?? '');
  const raw = (match?.[1] ?? 'plaintext').toLowerCase();
  return CODE_LANGUAGE_ALIASES[raw] ?? raw;
}

function codeLanguageLabel(language: string): string {
  if (language === 'plaintext') {
    return 'TEXT';
  }
  return language.toUpperCase();
}

/** Markdown 代码块渲染组件，支持语言图标、语言标签与一键复制。 */
export function MarkdownCodeBlock(props: { className?: string; children: React.ReactNode }): React.ReactElement {
  const { t } = useTranslation();
  const language = resolveCodeLanguage(props.className);
  const iconSrc = resolveDevIconByLanguage(language);
  const code = String(props.children ?? '').replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    }).catch(() => {});
  }, [code]);

  return (
    <div className="max-expand-chat-code-block">
      <div className="max-expand-chat-code-block-head">
        <span className="max-expand-chat-code-lang">
          {iconSrc ? (
            <img className="max-expand-chat-code-lang-icon" src={iconSrc} alt="" aria-hidden="true" />
          ) : (
            <span className="max-expand-chat-code-lang-dot" aria-hidden="true" />
          )}
          <span>{codeLanguageLabel(language)}</span>
        </span>
        <button
          type="button"
          className="max-expand-chat-code-copy-btn"
          onClick={handleCopy}
        >
          {copied
            ? t('aiChat.codeBlock.copied', { defaultValue: '已复制' })
            : t('aiChat.codeBlock.copy', { defaultValue: '复制' })}
        </button>
      </div>
      <pre>
        <code className={props.className}>{code}</code>
      </pre>
    </div>
  );
}
