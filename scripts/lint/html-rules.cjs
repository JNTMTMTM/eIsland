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
 * @file html-rules.cjs
 * @description HTML Validate 扩展，校验文档结构、UTF-8、属性顺序与内联事件
 * @author 鸡哥
 */

const { Rule } = require('html-validate');

const ATTRIBUTE_GROUPS = [
  /^class$/u, /^(id|name)$/u, /^data-/u, /^(src|for|type|href|value)$/u,
  /^(title|alt)$/u, /^(role|aria-)/u, /^tabindex$/u, /^style$/u,
];

/** 项目规范中通用 HTML 规则未覆盖的结构约束。 */
class DocumentStandards extends Rule {
  /** 注册解析事件，在完整 DOM 上检查文档而不误判脚本内的字符串。 */
  setup() {
    this.on('attr', (event) => {
      if (/^on/iu.test(event.key)) {
        this.report({ node: event.target, location: event.location, message: '禁止 HTML 内联事件处理程序，请使用外部 JavaScript。' });
      }
    });
    this.on('element:ready', ({ target }) => {
      let previous = -1;
      target.attributes.forEach((attribute) => {
        const group = ATTRIBUTE_GROUPS.findIndex((pattern) => pattern.test(attribute.key));
        if (group < 0) return;
        if (group < previous) {
          this.report({ node: target, location: attribute.keyLocation, message: '属性顺序必须为 class → id/name → data-* → src/for/type/href/value → title/alt → role/aria-* → tabindex → style。' });
        }
        previous = group;
      });
    });
    this.on('dom:ready', ({ document }) => {
      ['html', 'head', 'body'].forEach((tag) => {
        if (!document.querySelector(tag)) {
          this.report({ node: document.root, message: `文档必须显式包含 <${tag}>。` });
        }
      });
      const charset = document.querySelector('head meta[charset]');
      if (!/^utf-8$/iu.test(charset?.getAttribute('charset')?.value ?? '')) {
        this.report({ node: charset ?? document.root, message: 'head 中必须声明 <meta charset="utf-8">。' });
      }
    });
  }
}

module.exports = { rules: { 'eisland/document-standards': DocumentStandards } };
