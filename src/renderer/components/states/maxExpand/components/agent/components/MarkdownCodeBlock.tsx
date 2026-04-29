import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import 'devicon/devicon.min.css';
import javascriptOriginalIcon from 'devicon/icons/javascript/javascript-original.svg';
import typescriptOriginalIcon from 'devicon/icons/typescript/typescript-original.svg';
import reactOriginalIcon from 'devicon/icons/react/react-original.svg';
import pythonOriginalIcon from 'devicon/icons/python/python-original.svg';
import javaOriginalIcon from 'devicon/icons/java/java-original.svg';
import cOriginalIcon from 'devicon/icons/c/c-original.svg';
import cplusplusOriginalIcon from 'devicon/icons/cplusplus/cplusplus-original.svg';
import csharpOriginalIcon from 'devicon/icons/csharp/csharp-original.svg';
import goOriginalIcon from 'devicon/icons/go/go-original.svg';
import rustOriginalIcon from 'devicon/icons/rust/rust-original.svg';
import phpOriginalIcon from 'devicon/icons/php/php-original.svg';
import rubyOriginalIcon from 'devicon/icons/ruby/ruby-original.svg';
import swiftOriginalIcon from 'devicon/icons/swift/swift-original.svg';
import kotlinOriginalIcon from 'devicon/icons/kotlin/kotlin-original.svg';
import dartOriginalIcon from 'devicon/icons/dart/dart-original.svg';
import htmlOriginalIcon from 'devicon/icons/html5/html5-original.svg';
import cssOriginalIcon from 'devicon/icons/css3/css3-original.svg';
import sassOriginalIcon from 'devicon/icons/sass/sass-original.svg';
import lessFallbackIcon from 'devicon/icons/less/less-plain-wordmark.svg';
import vueOriginalIcon from 'devicon/icons/vuejs/vuejs-original.svg';
import svelteOriginalIcon from 'devicon/icons/svelte/svelte-original.svg';
import angularOriginalIcon from 'devicon/icons/angularjs/angularjs-original.svg';
import jsonOriginalIcon from 'devicon/icons/json/json-original.svg';
import yamlOriginalIcon from 'devicon/icons/yaml/yaml-original.svg';
import xmlOriginalIcon from 'devicon/icons/xml/xml-original.svg';
import bashOriginalIcon from 'devicon/icons/bash/bash-original.svg';
import powershellOriginalIcon from 'devicon/icons/powershell/powershell-original.svg';
import dockerOriginalIcon from 'devicon/icons/docker/docker-original.svg';
import sqlOriginalIcon from 'devicon/icons/azuresqldatabase/azuresqldatabase-original.svg';
import markdownOriginalIcon from 'devicon/icons/markdown/markdown-original.svg';

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

const CODE_LANGUAGE_ICON_SRC: Record<string, string> = {
  javascript: javascriptOriginalIcon,
  typescript: typescriptOriginalIcon,
  react: reactOriginalIcon,
  python: pythonOriginalIcon,
  java: javaOriginalIcon,
  c: cOriginalIcon,
  cplusplus: cplusplusOriginalIcon,
  csharp: csharpOriginalIcon,
  go: goOriginalIcon,
  rust: rustOriginalIcon,
  php: phpOriginalIcon,
  ruby: rubyOriginalIcon,
  swift: swiftOriginalIcon,
  kotlin: kotlinOriginalIcon,
  dart: dartOriginalIcon,
  html: htmlOriginalIcon,
  css: cssOriginalIcon,
  sass: sassOriginalIcon,
  less: lessFallbackIcon,
  vue: vueOriginalIcon,
  svelte: svelteOriginalIcon,
  angular: angularOriginalIcon,
  json: jsonOriginalIcon,
  yaml: yamlOriginalIcon,
  xml: xmlOriginalIcon,
  bash: bashOriginalIcon,
  powershell: powershellOriginalIcon,
  dockerfile: dockerOriginalIcon,
  docker: dockerOriginalIcon,
  sql: sqlOriginalIcon,
  markdown: markdownOriginalIcon,
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
  const iconSrc = CODE_LANGUAGE_ICON_SRC[language];
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
