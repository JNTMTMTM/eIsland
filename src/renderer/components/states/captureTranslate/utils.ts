/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file utils.ts
 * @description 图片翻译结果文本提取工具。
 * @author 鸡哥
 */

const TEXT_KEY_PATTERN = /(translat|target|text|content)/i;
const IGNORED_TEXT_PATTERN = /^(https?:\/\/|data:image\/|[a-z0-9+/=]{160,}$)/i;

function collectText(value: unknown, key: string, output: string[]): void {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized && TEXT_KEY_PATTERN.test(key) && !IGNORED_TEXT_PATTERN.test(normalized)) {
      output.push(normalized);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, key, output));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      collectText(childValue, childKey, output);
    });
  }
}

/** 从供应商结构不固定的翻译结果中提取可展示译文。 */
export function extractTranslatedText(translationResult: unknown): string {
  if (typeof translationResult === 'string') {
    return translationResult.trim();
  }
  const candidates: string[] = [];
  collectText(translationResult, 'translationResult', candidates);
  return [...new Set(candidates)].slice(0, 80).join('\n');
}