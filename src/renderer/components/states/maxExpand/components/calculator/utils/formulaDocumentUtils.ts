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
 * @file formulaDocumentUtils.ts
 * @description 结构化公式文档的创建、编辑、导航与 DSL 序列化。
 * @author 鸡哥
 */

import type {
  FormulaCursor,
  FormulaDocument,
  FormulaPathStep,
  FormulaSegment,
  FormulaSlotName,
  FormulaStructure,
  FormulaStructureKind,
} from '../types/calculatorTypes';
import { snapFormulaCursor } from './formulaCursorUtils';

const SLOT_ORDER: Record<FormulaStructureKind, FormulaSlotName[]> = {
  logn: ['base', 'value'],
  fraction: ['numerator', 'denominator'],
  sum: ['lower', 'upper', 'body'],
  integral: ['lower', 'upper', 'body'],
  derivative: ['body', 'point'],
  sqrt: ['radicand'],
  root: ['index', 'radicand'],
};

let nextStructureId = 1;

function createTextDocument(value = ''): FormulaDocument {
  return { segments: [{ type: 'text', value }] };
}

function updateDocumentAtPath(
  document: FormulaDocument,
  path: FormulaPathStep[],
  updater: (target: FormulaDocument) => FormulaDocument,
): FormulaDocument {
  if (path.length === 0) return updater(document);
  const [step, ...rest] = path;
  const segment = document.segments[step.segmentIndex];
  if (segment?.type !== 'structure') return document;
  const slotDocument = segment.value.slots[step.slot];
  if (!slotDocument) return document;
  const nextSlot = updateDocumentAtPath(slotDocument, rest, updater);
  const nextStructure: FormulaStructure = {
    ...segment.value,
    slots: { ...segment.value.slots, [step.slot]: nextSlot },
  };
  const segments = [...document.segments];
  segments[step.segmentIndex] = { type: 'structure', value: nextStructure };
  return { segments };
}

/**
 * 创建初始公式文档。
 * @returns 内容为 0 的公式文档与末尾光标
 */
export function createInitialFormula(): { document: FormulaDocument; cursor: FormulaCursor } {
  return {
    document: createTextDocument('0'),
    cursor: { path: [], segmentIndex: 0, offset: 1 },
  };
}

/**
 * 获取结构节点的可编辑槽位顺序。
 * @param kind - 结构节点类型
 * @returns 从第一个输入槽到最后一个输入槽的顺序
 */
export function getStructureSlotOrder(kind: FormulaStructureKind): FormulaSlotName[] {
  return SLOT_ORDER[kind];
}

/**
 * 创建包含空槽位的公式结构。
 * @param kind - 结构节点类型
 * @returns 可插入公式文档的结构节点
 */
export function createFormulaStructure(kind: FormulaStructureKind): FormulaStructure {
  const slots = Object.fromEntries(SLOT_ORDER[kind].map((slot) => [slot, createTextDocument()])) as Partial<
    Record<FormulaSlotName, FormulaDocument>
  >;
  return { id: `formula-${nextStructureId++}`, kind, slots };
}

/**
 * 将结构化公式序列化为求值器使用的规范 DSL。
 * @param document - 结构化公式文档
 * @returns 线性 DSL 公式
 */
export function serializeFormulaDocument(document: FormulaDocument): string {
  return document.segments.map((segment) => {
    if (segment.type === 'text') return segment.value;
    const read = (slot: FormulaSlotName): string => serializeFormulaDocument(segment.value.slots[slot] ?? createTextDocument());
    switch (segment.value.kind) {
      case 'logn': return `logn(${read('base')},${read('value')})`;
      case 'fraction': return `frac(${read('numerator')},${read('denominator')})`;
      case 'sum': return `sum(${read('body')},${read('lower')},${read('upper')})`;
      case 'integral': return `integral(${read('body')},${read('lower')},${read('upper')})`;
      case 'derivative': return `derivative(${read('body')},${read('point')})`;
      case 'sqrt': return `sqrt(${read('radicand')})`;
      case 'root': return `root(${read('index')},${read('radicand')})`;
    }
  }).join('');
}

/**
 * 在当前槽位光标处插入文本。
 * @param document - 当前公式文档
 * @param cursor - 当前槽位光标
 * @param text - 插入文本
 * @param replaceInitial - 是否用输入替换初始 0
 * @param cursorOffset - 插入后向左回退的字符数
 * @returns 更新后的文档与光标
 */
export function insertFormulaText(
  document: FormulaDocument,
  cursor: FormulaCursor,
  text: string,
  replaceInitial = true,
  cursorOffset = 0,
): { document: FormulaDocument; cursor: FormulaCursor } {
  let nextOffset = cursor.offset;
  const nextDocument = updateDocumentAtPath(document, cursor.path, (target) => {
    const segment = target.segments[cursor.segmentIndex];
    if (segment?.type !== 'text') return target;
    const replaceZero = replaceInitial
      && cursor.path.length === 0
      && target.segments.length === 1
      && segment.value === '0'
      && cursor.offset === 1;
    const value = replaceZero ? '' : segment.value;
    const offset = replaceZero ? 0 : cursor.offset;
    const nextValue = `${value.slice(0, offset)}${text}${value.slice(offset)}`;
    nextOffset = offset + text.length - cursorOffset;
    const segments = [...target.segments];
    segments[cursor.segmentIndex] = { type: 'text', value: nextValue };
    return { segments };
  });
  return { document: nextDocument, cursor: { ...cursor, offset: nextOffset } };
}

/**
 * 在当前文本槽位插入结构节点并激活其第一个槽位。
 * @param document - 当前公式文档
 * @param cursor - 当前槽位光标
 * @param kind - 要插入的结构类型
 * @returns 更新后的文档与第一个结构槽位光标
 */
export function insertFormulaStructure(
  document: FormulaDocument,
  cursor: FormulaCursor,
  kind: FormulaStructureKind,
): { document: FormulaDocument; cursor: FormulaCursor } {
  const structure = createFormulaStructure(kind);
  let structureIndex = cursor.segmentIndex;
  const nextDocument = updateDocumentAtPath(document, cursor.path, (target) => {
    const segment = target.segments[cursor.segmentIndex];
    if (segment?.type !== 'text') return target;
    const replaceZero = cursor.path.length === 0
      && target.segments.length === 1
      && segment.value === '0'
      && cursor.offset === 1;
    const before = replaceZero ? '' : segment.value.slice(0, cursor.offset);
    const after = replaceZero ? '' : segment.value.slice(cursor.offset);
    const replacement: FormulaSegment[] = [
      { type: 'text', value: before },
      { type: 'structure', value: structure },
      { type: 'text', value: after },
    ];
    structureIndex = cursor.segmentIndex + 1;
    return {
      segments: [
        ...target.segments.slice(0, cursor.segmentIndex),
        ...replacement,
        ...target.segments.slice(cursor.segmentIndex + 1),
      ],
    };
  });
  const firstSlot = SLOT_ORDER[kind][0];
  return {
    document: nextDocument,
    cursor: {
      path: [...cursor.path, { segmentIndex: structureIndex, slot: firstSlot }],
      segmentIndex: 0,
      offset: 0,
    },
  };
}

interface EditableLeaf {
  cursor: FormulaCursor;
  value: string;
}

function collectEditableLeaves(
  document: FormulaDocument,
  path: FormulaPathStep[] = [],
  leaves: EditableLeaf[] = [],
): EditableLeaf[] {
  document.segments.forEach((segment, segmentIndex) => {
    if (segment.type === 'text') {
      leaves.push({ cursor: { path, segmentIndex, offset: 0 }, value: segment.value });
      return;
    }
    SLOT_ORDER[segment.value.kind].forEach((slot) => {
      const slotDocument = segment.value.slots[slot];
      if (slotDocument) collectEditableLeaves(slotDocument, [...path, { segmentIndex, slot }], leaves);
    });
  });
  return leaves;
}

function cursorMatches(left: FormulaCursor, right: FormulaCursor): boolean {
  return left.segmentIndex === right.segmentIndex
    && left.path.length === right.path.length
    && left.path.every((step, index) => step.segmentIndex === right.path[index].segmentIndex && step.slot === right.path[index].slot);
}

/**
 * 将光标按视觉槽位顺序向左或向右移动。
 * @param document - 当前公式文档
 * @param cursor - 当前槽位光标
 * @param direction - -1 向左，1 向右
 * @returns 移动后的槽位光标
 */
export function moveFormulaCursor(
  document: FormulaDocument,
  cursor: FormulaCursor,
  direction: -1 | 1,
): FormulaCursor {
  const leaves = collectEditableLeaves(document);
  const leafIndex = leaves.findIndex((leaf) => cursorMatches(leaf.cursor, cursor));
  if (leafIndex < 0) return cursor;
  const leaf = leaves[leafIndex];
  const requested = cursor.offset + direction;
  if (requested >= 0 && requested <= leaf.value.length) {
    return { ...cursor, offset: snapFormulaCursor(leaf.value, requested, cursor.offset) };
  }
  const nextLeaf = leaves[leafIndex + direction];
  if (!nextLeaf) return cursor;
  return {
    ...nextLeaf.cursor,
    offset: direction > 0 ? 0 : nextLeaf.value.length,
  };
}

/**
 * 将光标移动到整个公式的首个或末个槽位。
 * @param document - 当前公式文档
 * @param boundary - 目标边界
 * @returns 边界槽位光标
 */
export function moveFormulaCursorBoundary(document: FormulaDocument, boundary: 'start' | 'end'): FormulaCursor {
  const leaves = collectEditableLeaves(document);
  const leaf = boundary === 'start' ? leaves[0] : leaves.at(-1);
  if (!leaf) return { path: [], segmentIndex: 0, offset: 0 };
  return { ...leaf.cursor, offset: boundary === 'start' ? 0 : leaf.value.length };
}

/**
 * 删除光标前方或后方的字符，空槽边界处按结构原子删除。
 * @param document - 当前公式文档
 * @param cursor - 当前槽位光标
 * @param direction - -1 表示退格，1 表示向前删除
 * @returns 更新后的文档与光标
 */
export function deleteFormulaContent(
  document: FormulaDocument,
  cursor: FormulaCursor,
  direction: -1 | 1,
): { document: FormulaDocument; cursor: FormulaCursor } {
  let nextOffset = cursor.offset;
  let nextSegmentIndex = cursor.segmentIndex;
  let changed = false;
  const nextDocument = updateDocumentAtPath(document, cursor.path, (target) => {
    const segment = target.segments[cursor.segmentIndex];
    if (segment?.type !== 'text') return target;
    const deleteIndex = direction < 0 ? cursor.offset - 1 : cursor.offset;
    if (deleteIndex >= 0 && deleteIndex < segment.value.length) {
      const value = `${segment.value.slice(0, deleteIndex)}${segment.value.slice(deleteIndex + 1)}`;
      nextOffset = direction < 0 ? cursor.offset - 1 : cursor.offset;
      const segments = [...target.segments];
      segments[cursor.segmentIndex] = { type: 'text', value };
      changed = true;
      return { segments };
    }

    const structureIndex = direction < 0 ? cursor.segmentIndex - 1 : cursor.segmentIndex + 1;
    if (target.segments[structureIndex]?.type !== 'structure') return target;
    const segments = target.segments.filter((_, index) => index !== structureIndex);
    const mergeIndex = Math.max(0, structureIndex - 1);
    const left = segments[mergeIndex];
    const right = segments[mergeIndex + 1];
    if (left?.type === 'text' && right?.type === 'text') {
      const value = left.value + right.value;
      nextOffset = left.value.length;
      nextSegmentIndex = mergeIndex;
      segments.splice(mergeIndex, 2, { type: 'text', value });
    } else {
      nextSegmentIndex = Math.min(cursor.segmentIndex, Math.max(0, segments.length - 1));
    }
    changed = true;
    return { segments };
  });
  if (!changed && direction < 0 && cursor.offset === 0 && cursor.path.length > 0) {
    const structureStep = cursor.path.at(-1)!;
    return deleteFormulaContent(
      document,
      {
        path: cursor.path.slice(0, -1),
        segmentIndex: structureStep.segmentIndex + 1,
        offset: 0,
      },
      -1,
    );
  }
  if (!changed) return { document, cursor };
  return { document: nextDocument, cursor: { ...cursor, segmentIndex: nextSegmentIndex, offset: nextOffset } };
}