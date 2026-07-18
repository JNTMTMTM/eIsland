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
 * @file mailConfig.ts
 * @description Mail 模块常量定义：存储键、超时、邮件 HTML 注入模板等。
 * @author 鸡哥
 */

/** 设置页 Tab 切换存储键 */
export const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';

/** 旧版单账户配置存储键 */
export const MAIL_CONFIG_STORE_KEY = 'mail-account-config';

/** 多账户配置存储键 */
export const MAIL_ACCOUNTS_STORE_KEY = 'mail-accounts-config';

/** 拉取数量配置存储键 */
export const MAIL_FETCH_LIMIT_STORE_KEY = 'mail-fetch-limit';

/** 收件箱拉取超时时间（毫秒） */
export const MAIL_INBOX_REFRESH_TIMEOUT_MS = 20000;

/** IMAP 帮助文档地址 */
export const MAIL_HELP_URL = 'https://docs.pyisland.com/guide/eisland.html';

/** 默认拉取数量 */
export const DEFAULT_MAIL_FETCH_LIMIT = 10;

/** 最小拉取数量 */
export const MIN_MAIL_FETCH_LIMIT = 1;

/** 最大拉取数量 */
export const MAX_MAIL_FETCH_LIMIT = 30;

/** 邮件正文内链接点击拦截脚本 */
export const MAIL_LINK_SCRIPT = [
  '<script>',
  'document.addEventListener("click",function(e){',
  'var a=e.target;while(a&&a.tagName!=="A")a=a.parentElement;',
  'if(!a||!a.href)return;',
  'var h=a.href;if(h.startsWith("mailto:")||h.startsWith("javascript:"))return;',
  'e.preventDefault();e.stopPropagation();',
  'window.parent.postMessage({type:"mail-open-url",url:h},"*");',
  '});',
  '</script>',
].join('');

/** 邮件正文自定义滚动条样式 */
export const MAIL_SCROLLBAR_CSS = [
  '::-webkit-scrollbar{width:6px;}',
  '::-webkit-scrollbar-track{background:rgba(0,0,0,0.04);}',
  '::-webkit-scrollbar-thumb{border-radius:999px;background:rgba(0,0,0,0.18);}',
  'html{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.18) rgba(0,0,0,0.04);}',
].join('');

/** 注入到 HTML 邮件 <head> 的内容（base + 样式 + 脚本） */
export const MAIL_INJECT_HEAD = [
  '<base target="_blank">',
  '<meta charset="utf-8">',
  '<style>',
  'img{max-width:100%;height:auto;}',
  'a{color:#58a6ff;text-decoration:underline;cursor:pointer;}',
  MAIL_SCROLLBAR_CSS,
  '</style>',
  MAIL_LINK_SCRIPT,
].join('');

/** 纯文本 / 无 <html> 标签时的外层包裹模板 */
export const MAIL_WRAP_STYLE = [
  '<!DOCTYPE html><html><head>',
  '<base target="_blank">',
  '<meta charset="utf-8">',
  '<style>',
  'body{margin:0;padding:8px;font-size:13px;line-height:1.6;',
  'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  'color:#222;background:#fff;word-break:break-word;overflow-wrap:break-word;}',
  'a{color:#1a73e8;text-decoration:underline;}',
  'img{max-width:100%;height:auto;}',
  'table{border-collapse:collapse;max-width:100%;}',
  MAIL_SCROLLBAR_CSS,
  'a{cursor:pointer;}',
  '</style>',
  MAIL_LINK_SCRIPT,
  '</head><body>',
].join('');
