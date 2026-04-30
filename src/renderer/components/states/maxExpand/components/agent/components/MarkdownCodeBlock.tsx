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
