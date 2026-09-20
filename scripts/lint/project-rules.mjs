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
 * @file project-rules.mjs
 * @description 补充通用插件无法表达的项目版权、文件头和类方法注释要求
 * @author 鸡哥
 */

export default {
  rules: {
    'shorthand-first': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: { order: '§3.3：对象简写属性必须放在其他属性之前。' },
      },
      create(context) {
        return {
          ObjectExpression(node) {
            let hasLonghand = false;
            node.properties.forEach((property) => {
              if (property.shorthand && hasLonghand) {
                context.report({ node: property, messageId: 'order' });
              }
              if (!property.shorthand) hasLonghand = true;
            });
          },
        };
      },
    },
    filename: {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: { name: '§3.20：文件名使用 camelCase 或 kebab-case；允许 .config/.test/.d 等点分隔后缀。' },
      },
      create(context) {
        return {
          Program(node) {
            const name = context.filename.replaceAll('\\', '/').split('/').at(-1);
            if (!name.startsWith('<') && !name.split('.').every((part) => /^[a-z][a-zA-Z0-9]*(?:-[a-z0-9]+)*$/u.test(part))) {
              context.report({ node, messageId: 'name' });
            }
          },
        };
      },
    },
    'file-header': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          copyright: '文件最顶部必须包含 eIsland、仓库地址、Copyright (C) 和 GPL-3.0 版权声明。',
          header: '代码前缺少文件级 JSDoc，需包含 @file、@description 和 @author。',
          file: '文件级 JSDoc 必须包含非空 @file。',
          description: '文件级 JSDoc 必须包含非空 @description，允许多行说明。',
          author: '文件级 JSDoc 的每个 @author 必须统一填写 鸡哥。',
        },
      },
      create(context) {
        return {
          Program(node) {
            const { sourceCode } = context;
            const comments = sourceCode.getAllComments();
            const [first] = comments;
            if (!first || first.type !== 'Block'
              || sourceCode.text.slice(0, first.range[0]).trim()
              || !/eIsland/u.test(first.value)
              || !/https:\/\/github\.com\/JNTMTMTM\/eIsland/u.test(first.value)
              || !/Copyright \(C\)/u.test(first.value)
              || !/GPL-3\.0|GNU General Public License[\s\S]*version 3/u.test(first.value)) {
              context.report({ node, messageId: 'copyright' });
            }
            const codeStart = node.body[0]?.range[0] ?? sourceCode.text.length;
            const header = comments.find((comment) => comment.range[0] < codeStart
              && comment.type === 'Block' && comment.value.startsWith('*')
              && /^\s*\*?\s*@(file|description|author)\b/mu.test(comment.value));
            if (!header) {
              context.report({ node, messageId: 'header' });
              return;
            }
            // 去掉 JSDoc 行前缀后按标签分段，保留多行说明，避免把下一标签当成空值的内容。
            const tags = header.value
              .split(/\r?\n/u)
              .map((line) => line.replace(/^\s*\* ?/u, '').trim())
              .join('\n')
              .trim()
              .split(/\n(?=@)/u)
              .map((block) => /^@(\S+)\s*([\s\S]*)$/u.exec(block))
              .filter(Boolean);
            ['file', 'description', 'author'].forEach((tagName) => {
              const values = tags.filter(([, name]) => name === tagName).map(([, , value]) => value.trim());
              if (values.length === 0 || values.some((value) => !value || (tagName === 'author' && value !== '鸡哥'))) {
                context.report({ loc: header.loc, messageId: tagName });
              }
            });
          },
        };
      },
    },
    'method-jsdoc': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: { missing: '类方法必须具有 JSDoc；简单 getter/setter 除外。' },
      },
      create(context) {
        return {
          'MethodDefinition[kind="method"]'(node) {
            const comment = context.sourceCode.getCommentsBefore(node).at(-1);
            if (comment?.type !== 'Block' || !comment.value.startsWith('*')) {
              context.report({ node, messageId: 'missing' });
            }
          },
        };
      },
    },
  },
};
