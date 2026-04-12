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

import React, { useState, useCallback } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/guide/guide.css';

/** 单个引导页配置 */
interface GuidePage {
  icon?: string;
  imageSrc?: string;
  title: string;
  desc: string;
  tips?: { icon: string; text: string }[];
}

/** 引导页数据 */
const GUIDE_PAGES: GuidePage[] = [
  {
    imageSrc: './svg/eisland.svg',
    title: '欢迎使用 eIsland',
    desc: '一款灵感来自 Apple 灵动岛的 Windows 桌面浮窗小组件，\n让你的桌面更加灵动、高效。',
  },
  {
    icon: '🖱️',
    title: '基本交互',
    desc: '通过鼠标与灵动岛进行交互，解锁不同状态。',
    tips: [
      { icon: '👆', text: '悬停 — 展开预览信息' },
      { icon: '🖱️', text: '单击 — 打开操作面板' },
      { icon: '⬆️', text: '向上滚轮 — 进入扩展面板' },
      { icon: '🔙', text: '移开鼠标 — 自动收回' },
    ],
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
  const { setIdle } = useIslandStore();

  const isLast = page === GUIDE_PAGES.length - 1;

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
