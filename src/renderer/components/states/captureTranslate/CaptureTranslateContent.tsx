/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file CaptureTranslateContent.tsx
 * @description 图片翻译灵动岛状态入口组件。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { CaptureTranslatePanel } from './components/CaptureTranslatePanel';
import '../../../styles/captureTranslate/captureTranslate.css';

/** 图片翻译灵动岛状态。 */
export function CaptureTranslateContent(): ReactElement {
  return (
    <div className="capture-translate-state" onClick={(event) => event.stopPropagation()}>
      <CaptureTranslatePanel />
    </div>
  );
}