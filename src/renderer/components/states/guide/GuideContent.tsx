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
import albumArt from '../../../assets/avatar/T.jpg';

/** 从图片提取主题色（canvas 1×1 缩放取均值） */
function extractDominantColor(src: string): Promise<[number, number, number]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve([100, 100, 100]); return; }
      ctx.drawImage(img, 0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      resolve([d[0], d[1], d[2]]);
    };
    img.onerror = () => resolve([100, 100, 100]);
    img.src = src;
  });
}

/** 单个引导页配置 */
interface GuidePage {
  icon?: string;
  imageSrc?: string;
  interactive?: 'basic' | 'music';
  title: string;
  desc: string;
  tips?: { icon: string; text: string }[];
}

/** 迷你灵动岛演示模式 */
type MiniIslandDemo = 'scroll' | 'hover' | 'click' | 'retract';

/** 交互卡片配置 */
interface InteractionCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniIslandDemo;
}

/** 迷你音乐岛演示模式 */
type MiniMusicDemo = 'smtc' | 'lyrics' | 'karaoke';

/** 音乐卡片配置 */
interface MusicCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniMusicDemo;
}

const SAMPLE_LYRICS = ['这是一句歌词示例', '音乐在空中飘荡', '旋律轻轻回响'];

/** 音乐引导卡片数据 */
const MUSIC_CARDS: MusicCard[] = [
  {
    iconSrc: SvgIcon.SMTC,
    title: 'SMTC 自动检测',
    desc: '自动识别正在播放的音乐源，实时同步播放信息。',
    demo: 'smtc',
  },
  {
    iconSrc: SvgIcon.LRC,
    title: '歌词匹配与同步',
    desc: '多源歌词自动匹配，实时滚动显示当前歌词。',
    demo: 'lyrics',
  },
  {
    iconSrc: SvgIcon.MUSIC,
    title: '逐字扫光模式',
    desc: '支持逐字高亮的卡拉 OK 歌词显示模式。',
    demo: 'karaoke',
  },
];

/** 交互引导卡片数据 */
const INTERACTION_CARDS: InteractionCard[] = [
  {
    iconSrc: SvgIcon.INTERACTION,
    title: '基本交互',
    desc: '在灵动岛顶部滚动鼠标滚轮，切换灵动岛状态。',
    demo: 'scroll',
  },
  {
    iconSrc: SvgIcon.LAYOUT,
    title: '悬停展开',
    desc: '将鼠标悬停在灵动岛上方，即可展开预览面板。',
    demo: 'hover',
  },
  {
    iconSrc: SvgIcon.SCREENSHOT,
    title: '单击操作',
    desc: '单击灵动岛，打开完整的操作面板。',
    demo: 'click',
  },
  {
    iconSrc: SvgIcon.HIDE,
    title: '自动收回',
    desc: '将鼠标移开灵动岛，自动收回至待机状态。',
    demo: 'retract',
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
    interactive: 'basic',
    title: '基本交互',
    desc: '通过鼠标与灵动岛进行交互，解锁不同状态。',
  },
  {
    interactive: 'music',
    title: '音乐与歌词',
    desc: '自动识别正在播放的音乐，实时显示同步歌词。',
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

/** 迷你音乐岛演示组件 — 布局与样式完全参照 LyricsContent */
function MiniMusicIsland({ demo }: { demo: MiniMusicDemo }): React.ReactElement {
  const [state, setState] = useState<'idle' | 'hover'>(demo === 'smtc' ? 'idle' : 'hover');
  const [lyricIdx, setLyricIdx] = useState(0);
  const [rgb, setRgb] = useState<[number, number, number]>([100, 100, 100]);
  const [sweepProg, setSweepProg] = useState(0);

  useEffect(() => { extractDominantColor(albumArt).then(setRgb); }, []);

  useEffect(() => {
    if (demo === 'smtc') {
      let expanded = false;
      const id = setInterval(() => {
        expanded = !expanded;
        setState(expanded ? 'hover' : 'idle');
      }, 1500);
      return () => clearInterval(id);
    }
    if (demo === 'lyrics' || demo === 'karaoke') setState('hover');
    return undefined;
  }, [demo]);

  useEffect(() => {
    if (demo !== 'lyrics') return;
    const id = setInterval(() => {
      setLyricIdx((prev) => (prev + 1) % SAMPLE_LYRICS.length);
    }, 2000);
    return () => clearInterval(id);
  }, [demo]);

  useEffect(() => {
    if (demo !== 'karaoke') return;
    let raf: number;
    const duration = 3000;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) % duration;
      setSweepProg((elapsed / duration) * 100);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const [r, g, b] = rgb;

  return (
    <div className="mini-island-wrapper">
      <div className={`mini-marquee-frame${state === 'hover' ? ' marquee-active' : ''}`} style={{ '--marquee-rgb': `${r}, ${g}, ${b}` } as React.CSSProperties}>
        <div className={`mini-island mini-music-${state}`}>
          {/* 背景光晕 — 与 idle-glow 一致 */}
          <div
            className={`mini-music-glow${state === 'hover' ? ' active' : ''}`}
            style={{ background: `radial-gradient(ellipse at 10% 50%, rgba(${r}, ${g}, ${b}, 0.35) 0%, transparent 60%)` }}
          />

          {/* 左侧：专辑封面（仅播放状态显示） */}
          {state === 'hover' && (
            <div
              className="mini-music-cover"
              style={{
                backgroundImage: `url(${albumArt})`,
                boxShadow: `0 0 8px 2px rgba(${r}, ${g}, ${b}, 0.5)`,
              }}
            />
          )}

          {/* 右侧：歌词区 */}
          {state === 'hover' && (
            <div className="mini-music-lyrics">
              {demo === 'smtc' && (
                <span className="mini-music-text mini-music-fade">♪ 正在播放</span>
              )}
              {demo === 'lyrics' && (
                <span className="mini-music-text mini-music-fade" key={lyricIdx}>
                  {SAMPLE_LYRICS[lyricIdx]}
                </span>
              )}
              {demo === 'karaoke' && (
                <span
                  className="mini-music-text mini-music-sweep"
                  style={{ '--lrc-prog': `${sweepProg.toFixed(1)}%` } as React.CSSProperties}
                >
                  这是一句歌词
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 迷你灵动岛演示组件 */
function MiniIsland({ demo }: { demo: MiniIslandDemo }): React.ReactElement {
  const initState = demo === 'retract' ? 'expanded' : demo === 'click' ? 'hover' : 'idle';
  const [state, setState] = useState<'idle' | 'hover' | 'expanded'>(initState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (demo !== 'scroll') return;
    const seq: Array<'idle' | 'hover' | 'expanded'> = ['idle', 'hover', 'expanded'];
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % seq.length;
      setState(seq[idx]);
    }, 1200);
    return () => clearInterval(id);
  }, [demo]);

  const handleMouseEnter = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (demo === 'hover') setState('hover');
    if (demo === 'retract') setState('expanded');
  };

  const handleMouseLeave = () => {
    if (demo === 'hover') setState('idle');
    if (demo === 'retract') {
      timerRef.current = setTimeout(() => setState('idle'), 600);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (demo === 'click') {
      setState('expanded');
      timerRef.current = setTimeout(() => setState('hover'), 1500);
    }
  };

  return (
    <div className="mini-island-wrapper">
      <div className="mini-marquee-frame marquee-active">
        <div
          className={`mini-island mini-island-${state}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}

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

  const cardCountRef = useRef(INTERACTION_CARDS.length);

  useEffect(() => {
    const p = GUIDE_PAGES[page];
    if (p.interactive === 'basic') cardCountRef.current = INTERACTION_CARDS.length;
    else if (p.interactive === 'music') cardCountRef.current = MUSIC_CARDS.length;
    else cardCountRef.current = 0;
    setCardIndex(0);
  }, [page]);

  const handleCardWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    if (wheelCooldownRef.current) return;
    wheelCooldownRef.current = true;
    setTimeout(() => { wheelCooldownRef.current = false; }, 400);
    if (e.deltaY > 0) {
      animDirRef.current = 'down';
      setCardIndex((prev) => Math.min(prev + 1, cardCountRef.current - 1));
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
      {current.interactive ? (() => {
        const isBasic = current.interactive === 'basic';
        const cards: Array<{ iconSrc: string; title: string; desc: string }> =
          isBasic ? INTERACTION_CARDS : MUSIC_CARDS;
        const safeIdx = Math.min(cardIndex, cards.length - 1);
        const card = cards[safeIdx];
        const hint = isBasic
          ? '在此区域附近滚动滚轮可切换灵动岛状态'
          : '滚动查看更多音乐功能';
        return (
          <div className="guide-page guide-page-interactive" key={`page-${page}`}>
            <div className="guide-interact-zone" onWheel={handleCardWheel}>
              <span className="guide-interact-hint">{hint}</span>
              <div className="guide-interact-dots">
                {cards.map((_, i) => (
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
              <div className="guide-interact-card-text">
                <img className="guide-interact-icon" src={card.iconSrc} alt="" aria-hidden="true" />
                <div className="guide-title">{card.title}</div>
                <div className="guide-desc">{card.desc}</div>
              </div>
              {isBasic
                ? <MiniIsland demo={INTERACTION_CARDS[safeIdx].demo} />
                : <MiniMusicIsland demo={MUSIC_CARDS[safeIdx].demo} />
              }
            </div>
          </div>
        );
      })() : (
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
