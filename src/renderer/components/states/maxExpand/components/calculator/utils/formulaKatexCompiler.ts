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
 */

/**
 * @file formulaKatexCompiler.ts
 * @description 将结构化公式编译为 KaTeX TeX 与可交互锚点。
 * @author 鸡哥
 */

import type {
  FormulaCursor,
  FormulaDocument,
  FormulaPathStep,
  FormulaSegment,
  FormulaSlotName,
  FormulaStructure,
} from '../types/calculatorTypes';
import { getStructureSlotOrder } from './formulaDocumentUtils';
import { readFunctionOpenToken } from './formulaCursorUtils';

export interface FormulaKatexAnchor {
  id: string;
  kind: 'token' | 'slot';
  start: FormulaCursor;
  end: FormulaCursor;
}

export interface FormulaKatexCompilation {
  tex: string;
  anchors: FormulaKatexAnchor[];
}

const FUNCTION_COMMANDS: Record<string, string> = {
  abs: '\\operatorname{abs}',
  arccos: '\\arccos',
  arctan: '\\arctan',
  arcsin: '\\arcsin',
  cos: '\\cos',
  exp: '\\exp',
  ln: '\\ln',
  log: '\\log',
  sin: '\\sin',
  sqrt: '\\operatorname{sqrt}',
  tan: '\\tan',
};

function emptyDocument(): FormulaDocument {
  return { segments: [{ type: 'text', value: '' }] };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '\\$&')
    .replace(/([#$%&_])/g, '\\$1')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/π/g, '\\pi ');
}

function cursorAt(path: FormulaPathStep[], segmentIndex: number, offset: number): FormulaCursor {
  return { path, segmentIndex, offset };
}

class FormulaKatexCompiler {
  private nextAnchorId = 1;

  private readonly anchors: FormulaKatexAnchor[] = [];

  compile(document: FormulaDocument): FormulaKatexCompilation {
    return { tex: this.compileDocument(document, []), anchors: this.anchors };
  }

  private compileDocument(document: FormulaDocument, path: FormulaPathStep[]): string {
    return document.segments.map((segment, segmentIndex) => this.compileSegment(segment, segmentIndex, path)).join('');
  }

  private compileSegment(segment: FormulaSegment, segmentIndex: number, path: FormulaPathStep[]): string {
    if (segment.type === 'text') {
      if (segment.value.length === 0) {
        const cursor = cursorAt(path, segmentIndex, 0);
        return this.withAnchor('token', cursor, cursor, '\\phantom{\\square}');
      }
      return this.compileText(segment.value, path, segmentIndex, 0);
    }
    return this.compileStructure(segment.value, segmentIndex, path);
  }

  private compileStructure(structure: FormulaStructure, structureIndex: number, path: FormulaPathStep[]): string {
    const slot = (name: FormulaSlotName): string => this.compileSlot(structure, structureIndex, path, name);
    switch (structure.kind) {
      case 'logn': return `\\log_{${slot('base')}}\\left(${slot('value')}\\right)`;
      case 'fraction': return `\\frac{${slot('numerator')}}{${slot('denominator')}}`;
      case 'sum': return `\\sum_{${slot('lower')}}^{${slot('upper')}} ${slot('body')}`;
      case 'integral': return `\\int_{${slot('lower')}}^{${slot('upper')}} ${slot('body')}\\,dx`;
      case 'derivative': return `\\frac{d}{dx}\\left(${slot('body')}\\right)\\bigg|_{x=${slot('point')}}`;
      case 'sqrt': return `\\sqrt{${slot('radicand')}}`;
      case 'root': return `\\sqrt[${slot('index')}]{${slot('radicand')}}`;
    }
  }

  private compileSlot(
    structure: FormulaStructure,
    structureIndex: number,
    path: FormulaPathStep[],
    name: FormulaSlotName,
  ): string {
    const slotPath = [...path, { segmentIndex: structureIndex, slot: name }];
    const document = structure.slots[name] ?? emptyDocument();
    if (this.isEmpty(document)) {
      const cursor = cursorAt(slotPath, 0, 0);
      return this.withAnchor('slot', cursor, cursor, '\\square');
    }
    return this.compileDocument(document, slotPath);
  }

  private compileText(value: string, path: FormulaPathStep[], segmentIndex: number, baseOffset: number): string {
    let result = '';
    let offset = 0;
    while (offset < value.length) {
      const token = readFunctionOpenToken(value, offset);
      if (token) {
        const start = cursorAt(path, segmentIndex, baseOffset + offset);
        const end = cursorAt(path, segmentIndex, baseOffset + offset + token.length);
        const command = FUNCTION_COMMANDS[token.slice(0, -1)];
        const functionTex = command ?? `\\operatorname{${escapeText(token.slice(0, -1))}}`;
        result += this.withAnchor('token', start, end, `${functionTex}(`);
        offset += token.length;
        continue;
      }

      if (value[offset] === '^') {
        const next = value[offset + 1];
        if (next === '(') {
          const close = value.indexOf(')', offset + 2);
          if (close >= 0) {
            const exponent = value.slice(offset + 2, close);
            const exponentTex = exponent
              ? this.compileText(exponent, path, segmentIndex, baseOffset + offset + 2)
              : this.withAnchor(
                'slot',
                cursorAt(path, segmentIndex, baseOffset + offset + 2),
                cursorAt(path, segmentIndex, baseOffset + offset + 2),
                '\\square',
              );
            result += `^{${exponentTex}}`;
            offset = close + 1;
            continue;
          }
        }
        if (next) {
          const start = cursorAt(path, segmentIndex, baseOffset + offset + 1);
          const end = cursorAt(path, segmentIndex, baseOffset + offset + 2);
          result += `^{${this.withAnchor('token', start, end, escapeText(next))}}`;
          offset += 2;
          continue;
        }
      }

      const start = cursorAt(path, segmentIndex, baseOffset + offset);
      const end = cursorAt(path, segmentIndex, baseOffset + offset + 1);
      result += this.withAnchor('token', start, end, escapeText(value[offset]));
      offset += 1;
    }
    return result;
  }

  private withAnchor(kind: FormulaKatexAnchor['kind'], start: FormulaCursor, end: FormulaCursor, tex: string): string {
    const id = String(this.nextAnchorId++);
    this.anchors.push({ id, kind, start, end });
    return `\\htmlData{formula-anchor=${id}}{${tex}}`;
  }

  private isEmpty(document: FormulaDocument): boolean {
    return document.segments.length === 1
      && document.segments[0].type === 'text'
      && document.segments[0].value.length === 0;
  }
}

/**
 * 将公式文档编译为 KaTeX TeX 和源光标锚点。
 * @param document - 结构化公式文档
 * @returns KaTeX TeX 字符串与可交互锚点
 */
export function compileFormulaToKatex(document: FormulaDocument): FormulaKatexCompilation {
  return new FormulaKatexCompiler().compile(document);
}

/**
 * 获取结构节点的 KaTeX 槽位编译顺序。
 * @param structure - 结构节点
 * @returns 结构节点的逻辑槽位名称
 */
export function getKatexSlotOrder(structure: FormulaStructure): FormulaSlotName[] {
  return getStructureSlotOrder(structure.kind);
}