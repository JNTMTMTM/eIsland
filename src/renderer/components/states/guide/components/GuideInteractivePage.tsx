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
 * @file GuideInteractivePage.tsx
 * @description 引导页互动卡片子组件
 * @author 鸡哥
 */

import type { ReactElement, WheelEvent } from 'react';
import { SvgIcon } from '../../../../utils/SvgIcon';

interface DisplayCard {
  iconSrc: string;
  title: string;
  desc: string;
}

interface GuideInteractivePageProps {
  page: number;
  cards: DisplayCard[];
  cardIndex: number;
  hint: string;
  animDir: 'up' | 'down';
  onWheel: (event: WheelEvent) => void;
  renderMini: (safeIndex: number) => ReactElement;
}

/**
 * 渲染引导页互动卡片内容。
 * @param props - 互动卡片页面参数。
 * @param props.page - 当前引导页索引。
 * @param props.cards - 互动卡片列表，空列表不渲染页面。
 * @param props.cardIndex - 卡片索引，小数向下取整，NaN 使用首张，越界值限制到有效范围。
 * @param props.hint - 卡片上方的互动提示。
 * @param props.animDir - 卡片切换动画的方向。
 * @param props.onWheel - 页面滚轮事件处理函数。
 * @param props.renderMini - 使用规范化索引渲染互动演示。
 * @returns 互动卡片页面，卡片列表为空时返回 null。
 */
export function GuideInteractivePage({
  page,
  cards,
  cardIndex,
  hint,
  animDir,
  onWheel,
  renderMini,
}: GuideInteractivePageProps): ReactElement | null {
  if (cards.length === 0) return null;
  const normalizedIdx = Number.isNaN(cardIndex) ? 0 : Math.floor(cardIndex);
  const safeIdx = Math.max(0, Math.min(normalizedIdx, cards.length - 1));
  const card = cards[safeIdx];

  return (
    <div className="guide-page guide-page-interactive" key={`page-${page}`}>
      <div className="guide-interact-zone" onWheel={onWheel}>
        <span className="guide-interact-hint">{hint}</span>
        <div className="guide-interact-dots">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`guide-interact-dot${safeIdx === i ? ' active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div
        className={`guide-interact-card ${animDir === 'down' ? 'guide-slide-up' : 'guide-slide-down'}`}
        key={`card-${safeIdx}`}
      >
        <div className="guide-interact-card-text">
          <img className={`guide-interact-icon${card.iconSrc === SvgIcon.POMODORO ? ' no-invert' : ''}`} src={card.iconSrc} alt="" aria-hidden="true" />
          <div className="guide-title">{card.title}</div>
          <div className="guide-desc">{card.desc}</div>
        </div>
        {renderMini(safeIdx)}
      </div>
    </div>
  );
}
