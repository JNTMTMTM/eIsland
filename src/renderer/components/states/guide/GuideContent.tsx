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
 * @file GuideContent.tsx
 * @description 引导页组件，首次启动或更新后展示，帮助用户了解灵动岛功能
 * @author 鸡哥
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/guide/guide.css';
import { SvgIcon } from '../../../utils/SvgIcon';

/** 单个引导页配置 */
interface GuidePage {
  icon?: string;
  imageSrc?: string;
  interactive?: boolean;
  title: string;
  desc: string;
  tips?: { icon: string; text: string }[];
}

/** 交互卡片配置 */
interface InteractionCard {
  iconSrc: string;
  title: string;
  desc: string;
}

/** 交互引导卡片数据 */
const INTERACTION_CARDS: InteractionCard[] = [
  {
    iconSrc: SvgIcon.INTERACTION,
    title: '基本交互',
    desc: '在灵动岛顶部滚动鼠标滚轮，切换灵动岛状态。',
  },
  {
    iconSrc: SvgIcon.LAYOUT,
    title: '悬停展开',
    desc: '将鼠标悬停在灵动岛上方，即可展开预览面板。',
  },
  {
    iconSrc: SvgIcon.SCREENSHOT,
    title: '单击操作',
    desc: '单击灵动岛，打开完整的操作面板。',
  },
  {
    iconSrc: SvgIcon.MOVE,
    title: '滚轮扩展',
    desc: '在灵动岛上向上滚动滚轮，进入最大扩展面板。',
  },
  {
    iconSrc: SvgIcon.HIDE,
    title: '自动收回',
    desc: '将鼠标移开灵动岛，自动收回至待机状态。',
  },
];

/** 引导页数据 */
const GUIDE_PAGES: GuidePage[] = [
  {
    imageSrc: './svg/eisland.svg',
    title: '欢迎使用 eIsland',
    desc: '一款灵感来自 Apple 灵动岛的 Windows 桌面浮窗小组件，\n让你的桌面更加灵动、高效。',
  },
  {
    interactive: true,
    title: '基本交互',
    desc: '通过鼠标与灵动岛进行交互，解锁不同状态。',
  },
  {
    icon: '🎵',
    title: '音乐与歌词',
    desc: '自动识别正在播放的音乐，实时显示同步歌词。',
    tips: [
      { icon: '🎶', text: '自动检测 SMTC 播放源' },
      { icon: '📝', text: '多源歌词匹配与同步' },
      { icon: '🎤', text: '支持卡拉 OK 逐字模式' },
    ],
  },
  {
    icon: '🛠️',
    title: '实用工具',
    desc: '扩展面板中集成了多种实用功能。',
    tips: [
      { icon: '✅', text: '待办事项管理' },
      { icon: '🤖', text: 'AI 对话助手' },
      { icon: '📅', text: '倒数日与计时器' },
      { icon: '🍅', text: '番茄钟专注模式' },
    ],
  },
  {
    icon: '⚙️',
    title: '个性化设置',
    desc: '在扩展面板的设置中自定义你的灵动岛体验。',
    tips: [
      { icon: '🎨', text: '主题切换 / 透明度调整' },
      { icon: '📌', text: '位置微调 / 隐藏进程名单' },
      { icon: '⌨️', text: '自定义全局快捷键' },
      { icon: '🔄', text: '自动检查更新' },
    ],
  },
];

/**
 * 引导页内容组件
 * @description 分页导航点展示，完成后标记当前版本并切回 idle
 */
export function GuideContent(): React.ReactElement {
  const [page, setPage] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const animDirRef = useRef<'up' | 'down'>('down');
  const wheelCooldownRef = useRef(false);
  const { setIdle } = useIslandStore();

  const isLast = page === GUIDE_PAGES.length - 1;

  useEffect(() => { setCardIndex(0); }, [page]);

  const handleCardWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    if (wheelCooldownRef.current) return;
    wheelCooldownRef.current = true;
    setTimeout(() => { wheelCooldownRef.current = false; }, 400);
    if (e.deltaY > 0) {
      animDirRef.current = 'down';
      setCardIndex((prev) => Math.min(prev + 1, INTERACTION_CARDS.length - 1));
    } else if (e.deltaY < 0) {
      animDirRef.current = 'up';
      setCardIndex((prev) => Math.max(prev - 1, 0));
    }
  }, []);

  const handleFinish = useCallback(() => {
    window.api?.updaterVersion?.().then((v) => {
      if (v) window.api?.storeWrite?.('guide-shown-version', v);
    }).catch(() => {});
    setIdle(true);
  }, [setIdle]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleFinish();
    } else {
      setPage((p) => p + 1);
    }
  }, [isLast, handleFinish]);

  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const current = GUIDE_PAGES[page];

  return (
    <div className="guide-content" onClick={(e) => e.stopPropagation()}>
      {current.interactive ? (
        <div className="guide-page guide-page-interactive" key={`page-${page}`}>
          <div className="guide-interact-zone" onWheel={handleCardWheel}>
            <span className="guide-interact-hint">您可以在此区域尝试</span>
            <div className="guide-interact-dots">
              {INTERACTION_CARDS.map((_, i) => (
                <span
                  key={i}
                  className={`guide-interact-dot${cardIndex === i ? ' active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div
            className={`guide-interact-card ${animDirRef.current === 'down' ? 'guide-slide-up' : 'guide-slide-down'}`}
            key={`card-${cardIndex}`}
          >
            <img className="guide-interact-icon" src={INTERACTION_CARDS[cardIndex].iconSrc} alt="" aria-hidden="true" />
            <div className="guide-title">{INTERACTION_CARDS[cardIndex].title}</div>
            <div className="guide-desc">{INTERACTION_CARDS[cardIndex].desc}</div>
          </div>
        </div>
      ) : (
        <div className={`guide-page${page === 0 ? ' guide-page-welcome' : ''}`} key={page}>
          <div className="guide-hero">
            {current.imageSrc
              ? <img className="guide-page-logo" src={current.imageSrc} alt="" aria-hidden="true" />
              : <div className="guide-page-icon" aria-hidden="true">{current.icon}</div>
            }
            <div className="guide-title">{current.title}</div>
          </div>
          <div className="guide-desc">{current.desc}</div>

          {current.tips && (
            <div className="guide-tips" aria-label="要点">
              {current.tips.map((tip, i) => (
                <div className="guide-tip" key={i}>
                  <span className="guide-tip-icon" aria-hidden="true">{tip.icon}</span>
                  <span className="guide-tip-text">{tip.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="guide-footer">
        <div className="guide-nav-dots">
          {GUIDE_PAGES.map((_, i) => (
            <button
              key={i}
              className={`guide-nav-dot ${page === i ? 'active' : ''}`}
              onClick={() => setPage(i)}
              aria-label={`第 ${i + 1} 页`}
            />
          ))}
        </div>

        <div className="guide-actions">
          {page > 0 && (
            <button type="button" className="guide-btn guide-btn-secondary" onClick={handlePrev}>
              上一步
            </button>
          )}

          <button type="button" className="guide-btn guide-btn-primary" onClick={handleNext}>
            {isLast ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
