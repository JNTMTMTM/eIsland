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
