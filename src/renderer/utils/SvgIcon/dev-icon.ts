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
 * @file dev-icon.ts
 * @description devicon 图标映射与解析工具
 * @author 鸡哥
 */

const javascriptOriginalIcon = '../svg/devicons/javascript-original.svg';
const typescriptOriginalIcon = '../svg/devicons/typescript-original.svg';
const reactOriginalIcon = '../svg/devicons/react-original.svg';
const pythonOriginalIcon = '../svg/devicons/python-original.svg';
const javaOriginalIcon = '../svg/devicons/java-original.svg';
const cOriginalIcon = '../svg/devicons/c-original.svg';
const cplusplusOriginalIcon = '../svg/devicons/cplusplus-original.svg';
const csharpOriginalIcon = '../svg/devicons/csharp-original.svg';
const goOriginalIcon = '../svg/devicons/go-original.svg';
const rustOriginalIcon = '../svg/devicons/rust-original.svg';
const phpOriginalIcon = '../svg/devicons/php-original.svg';
const rubyOriginalIcon = '../svg/devicons/ruby-original.svg';
const swiftOriginalIcon = '../svg/devicons/swift-original.svg';
const kotlinOriginalIcon = '../svg/devicons/kotlin-original.svg';
const dartOriginalIcon = '../svg/devicons/dart-original.svg';
const htmlOriginalIcon = '../svg/devicons/html5-original.svg';
const cssOriginalIcon = '../svg/devicons/css3-original.svg';
const sassOriginalIcon = '../svg/devicons/sass-original.svg';
const lessFallbackIcon = '../svg/devicons/less-plain-wordmark.svg';
const vueOriginalIcon = '../svg/devicons/vuejs-original.svg';
const svelteOriginalIcon = '../svg/devicons/svelte-original.svg';
const angularOriginalIcon = '../svg/devicons/angularjs-original.svg';
const jsonOriginalIcon = '../svg/devicons/json-original.svg';
const yamlOriginalIcon = '../svg/devicons/yaml-original.svg';
const xmlOriginalIcon = '../svg/devicons/xml-original.svg';
const bashOriginalIcon = '../svg/devicons/bash-original.svg';
const powershellOriginalIcon = '../svg/devicons/powershell-original.svg';
const dockerOriginalIcon = '../svg/devicons/docker-original.svg';
const sqlOriginalIcon = '../svg/devicons/azuresqldatabase-original.svg';
const markdownOriginalIcon = '../svg/devicons/markdown-original.svg';

export const DEVICON_LANGUAGE_ALIASES: Record<string, string> = {
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
  txt: 'plaintext',
  log: 'plaintext',
  csv: 'plaintext',
  ini: 'plaintext',
  cfg: 'plaintext',
  conf: 'plaintext',
  env: 'plaintext',
  toml: 'plaintext',
  diff: 'plaintext',
  patch: 'plaintext',
};

export const DevIcon = {
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
} as const;

export type DevIconKey = keyof typeof DevIcon;

/** 将原始语言名称解析为标准化的 DevIcon 语言标识。 */
export function resolveDevIconLanguage(rawLanguage: string): string {
  const raw = (rawLanguage ?? '').toLowerCase();
  if (!raw) return 'plaintext';
  return DEVICON_LANGUAGE_ALIASES[raw] ?? raw;
}

/** 根据语言名称解析对应的 DevIcon SVG 资源路径。 */
export function resolveDevIconByLanguage(rawLanguage: string): string | undefined {
  const language = resolveDevIconLanguage(rawLanguage);
  return DevIcon[language as DevIconKey];
}

/** 根据文件名解析对应的 DevIcon SVG 资源路径。 */
export function resolveDevIconByFileName(fileName: string): string | undefined {
  const extMatch = /\.([a-zA-Z0-9#+-]+)$/.exec(fileName ?? '');
  const raw = extMatch?.[1] ?? '';
  if (!raw) return undefined;
  return resolveDevIconByLanguage(raw);
}
