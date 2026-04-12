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
import { setThemeMode as applyThemeMode, getThemeMode, type ThemeMode } from '../../../utils/theme';

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
  interactive?: 'basic' | 'music' | 'tools' | 'settings';
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

/** 迷你工具岛演示模式 */
type MiniToolDemo = 'todo' | 'ai' | 'timer' | 'pomodoro';

/** 工具卡片配置 */
interface ToolCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniToolDemo;
}

/** 迷你设置岛演示模式 */
type MiniSettingDemo = 'theme' | 'opacity' | 'position' | 'autostart';

/** 设置卡片配置 */
interface SettingCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniSettingDemo;
}

/** 设置引导卡片数据 */
const SETTING_CARDS: SettingCard[] = [
  {
    iconSrc: SvgIcon.THEME,
    title: '主题切换',
    desc: '在深色、浅色和跟随系统之间自由切换。',
    demo: 'theme',
  },
  {
    iconSrc: SvgIcon.LAYOUT,
    title: '透明度调整',
    desc: '自定义灵动岛的背景透明度。',
    demo: 'opacity',
  },
  {
    iconSrc: SvgIcon.MOVE,
    title: '位置微调',
    desc: '微调灵动岛在屏幕顶部的水平与垂直偏移。',
    demo: 'position',
  },
  {
    iconSrc: SvgIcon.SHORTCUT_KEY,
    title: '开机自启',
    desc: '设置灵动岛是否随系统启动自动运行。',
    demo: 'autostart',
  },
];

/** 工具引导卡片数据 */
const TOOL_CARDS: ToolCard[] = [
  {
    iconSrc: SvgIcon.TASK_MANAGER,
    title: '待办事项',
    desc: '在扩展面板中管理你的待办任务清单。',
    demo: 'todo',
  },
  {
    iconSrc: SvgIcon.AI,
    title: 'AI 对话助手',
    desc: '内置 AI 对话，随时获取智能回答与建议。',
    demo: 'ai',
  },
  {
    iconSrc: SvgIcon.TIMER,
    title: '倒数日与计时器',
    desc: '设置倒计时或倒数日，精准跟踪重要时刻。',
    demo: 'timer',
  },
  {
    iconSrc: SvgIcon.POMODORO,
    title: '番茄钟专注',
    desc: '番茄工作法，帮助你保持高效专注。',
    demo: 'pomodoro',
  },
];

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
    interactive: 'tools',
    title: '实用工具',
    desc: '扩展面板中集成了多种实用功能。',
  },
  {
    interactive: 'settings',
    title: '个性化设置',
    desc: '在扩展面板的设置中自定义你的灵动岛体验。',
  },
];

/** 迷你设置岛演示组件 — 带实际生效的设置切换按钮 */
function MiniSettingIsland({ demo }: { demo: MiniSettingDemo }): React.ReactElement {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemeMode);
  const [opacity, setOpacity] = useState(100);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autostart, setAutostart] = useState<string>('disabled');

  useEffect(() => {
    if (demo === 'opacity') {
      window.api.islandOpacityGet().then((v) => {
        const safe = typeof v === 'number' ? Math.max(10, Math.min(100, Math.round(v))) : 100;
        setOpacity(safe);
      }).catch(() => {});
    }
    if (demo === 'position') {
      window.api.getIslandPositionOffset().then(setOffset).catch(() => {});
    }
    if (demo === 'autostart') {
      window.api.autostartGet().then((v) => setAutostart(v || 'disabled')).catch(() => {});
    }
  }, [demo]);

  const handleTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyThemeMode(mode);
  };

  const handleOpacity = (delta: number) => {
    setOpacity((prev) => {
      const next = Math.max(10, Math.min(100, prev + delta));
      document.documentElement.style.setProperty('--island-opacity', String(next));
      window.api.islandOpacitySet(next).catch(() => {});
      return next;
    });
  };

  const handleOffset = (dx: number, dy: number) => {
    setOffset((prev) => {
      const next = { x: prev.x + dx, y: prev.y + dy };
      window.api.setIslandPositionOffset(next).catch(() => {});
      return next;
    });
  };

  const handleAutostart = (mode: string) => {
    setAutostart(mode);
    window.api.autostartSet(mode).catch(() => {});
  };

  const renderDemo = () => {
    switch (demo) {
      case 'theme': {
        const visual = themeMode === 'system' ? 'auto' : themeMode;
        return (
          <div className="ms-theme">
            <div className={`ms-theme-preview ms-theme-${visual}`}>
              <div className="ms-theme-island" />
              <div className="ms-theme-label">{visual === 'dark' ? '深色' : visual === 'light' ? '浅色' : '自动'}</div>
            </div>
          </div>
        );
      }
      case 'opacity':
        return (
          <div className="ms-opacity">
            <div className="ms-opacity-preview" style={{ opacity: opacity / 100 }}>
              <div className="ms-opacity-island" />
            </div>
            <span className="ms-opacity-val">{opacity}%</span>
          </div>
        );
      case 'position':
        return (
          <div className="ms-position">
            <div className="ms-position-preview">
              <div
                className="ms-position-island"
                style={{ transform: `translate(${offset.x * 0.3}px, ${offset.y * 0.3}px)` }}
              />
            </div>
            <span className="ms-position-val">x:{offset.x} y:{offset.y}</span>
          </div>
        );
      case 'autostart': {
        const label = autostart === 'enabled' ? '已开启' : autostart === 'high-priority' ? '高优先级' : '已关闭';
        const isOn = autostart !== 'disabled';
        return (
          <div className="ms-autostart">
            <div className={`ms-autostart-indicator${isOn ? ' on' : ''}${autostart === 'high-priority' ? ' elevated' : ''}`} />
            <span className="ms-autostart-label">{label}</span>
          </div>
        );
      }
    }
  };

  const renderControls = () => {
    switch (demo) {
      case 'theme':
        return (
          <div className="ms-controls">
            {(['dark', 'light', 'system'] as ThemeMode[]).map((m) => (
              <button
                key={m}
                className={`ms-ctrl-btn${themeMode === m ? ' active' : ''}`}
                onClick={() => handleTheme(m)}
              >
                {m === 'dark' ? '深色' : m === 'light' ? '浅色' : '系统'}
              </button>
            ))}
          </div>
        );
      case 'opacity':
        return (
          <div className="ms-controls">
            <button className="ms-ctrl-btn" onClick={() => handleOpacity(-10)}>−10</button>
            <button className="ms-ctrl-btn" onClick={() => handleOpacity(-5)}>−5</button>
            <button className="ms-ctrl-btn" onClick={() => handleOpacity(5)}>+5</button>
            <button className="ms-ctrl-btn" onClick={() => handleOpacity(10)}>+10</button>
          </div>
        );
      case 'position':
        return (
          <div className="ms-controls ms-controls-grid">
            <button className="ms-ctrl-btn" onClick={() => handleOffset(0, -10)}>↑</button>
            <button className="ms-ctrl-btn" onClick={() => handleOffset(-10, 0)}>←</button>
            <button className="ms-ctrl-btn ms-ctrl-reset" onClick={() => handleOffset(-offset.x, -offset.y)}>●</button>
            <button className="ms-ctrl-btn" onClick={() => handleOffset(10, 0)}>→</button>
            <button className="ms-ctrl-btn" onClick={() => handleOffset(0, 10)}>↓</button>
          </div>
        );
      case 'autostart':
        return (
          <div className="ms-controls">
            {(['disabled', 'enabled', 'high-priority'] as string[]).map((m) => (
              <button
                key={m}
                className={`ms-ctrl-btn${autostart === m ? ' active' : ''}`}
                onClick={() => handleAutostart(m)}
              >
                {m === 'disabled' ? '关闭' : m === 'enabled' ? '开启' : '高优先级'}
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="mini-island-wrapper">
      <div className="mini-marquee-frame marquee-active">
        <div className="mini-island mini-setting-expanded">
          {renderDemo()}
        </div>
      </div>
      {renderControls()}
    </div>
  );
}

/** 迷你工具岛演示组件 — 布局与样式参照各实际功能面板 */
function MiniToolIsland({ demo }: { demo: MiniToolDemo }): React.ReactElement {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const renderContent = () => {
    switch (demo) {
      /* ── 待办事项：参照 TodoTab / ov-dash-todo ── */
      case 'todo': {
        const items: { text: string; priority?: string; pColor?: string; done?: boolean }[] = [
          { text: '完成设计稿', priority: 'P0', pColor: '#ff5252' },
          { text: '发送周报邮件', priority: 'P1', pColor: '#ffab40' },
          { text: '整理项目笔记', priority: 'P2', pColor: '#69c0ff' },
        ];
        return (
          <div className="mt-todo">
            <div className="mt-todo-header">
              <span className="mt-todo-title">待办事项</span>
              <span className="mt-todo-stats">
                <span className="mt-todo-stat done">✓ {tick % 4}</span>
                <span className="mt-todo-stat undone">○ {3 - (tick % 4)}</span>
              </span>
            </div>
            <div className="mt-todo-list">
              {items.map((item, i) => {
                const checked = tick % 4 > i;
                return (
                  <div key={i} className={`mt-todo-item${checked ? ' done' : ''}`}>
                    <span className="mt-todo-check">{checked ? '✓' : '○'}</span>
                    <span className="mt-todo-text">{item.text}</span>
                    {item.priority && (
                      <span className="mt-todo-badge" style={{ background: item.pColor }}>{item.priority}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      /* ── AI 对话：参照 AiChatTab 消息气泡 ── */
      case 'ai':
        return (
          <div className="mt-chat">
            <div className="mt-chat-header">AI 对话</div>
            <div className="mt-chat-messages">
              <div className="mt-chat-bubble user">你好</div>
              <div className="mt-chat-bubble ai">
                <span className="mt-chat-dot" />
                <span className="mt-chat-dot" />
                <span className="mt-chat-dot" />
              </div>
            </div>
          </div>
        );
      /* ── 倒数日：参照 CountdownTab 卡片 ── */
      case 'timer': {
        const days = 42 - (tick % 30);
        return (
          <div className="mt-countdown">
            <div className="mt-cd-card">
              <div className="mt-cd-overlay" />
              <div className="mt-cd-content">
                <span className="mt-cd-badge">倒数日</span>
                <span className="mt-cd-name">重要截止日</span>
                <div className="mt-cd-bottom">
                  <span className="mt-cd-date">2026-05-01</span>
                  <span className="mt-cd-days" style={{ color: '#69c0ff' }}>
                    {days > 0 ? `${days}天` : '已到期'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      }
      /* ── 番茄钟：参照 PomodoroWidget 环形进度 ── */
      case 'pomodoro': {
        const total = 25 * 60;
        const remaining = total - (tick % total);
        const progress = 1 - remaining / total;
        const r = 16;
        const circ = 2 * Math.PI * r;
        const offset = circ * (1 - progress);
        const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
        const ss = String(remaining % 60).padStart(2, '0');
        const phaseColor = '#ff6b6b';
        return (
          <div className="mt-pomo">
            <div className="mt-pomo-ring-wrap">
              <svg className="mt-pomo-ring" viewBox="0 0 36 36">
                <circle className="mt-pomo-ring-bg" cx="18" cy="18" r={r} />
                <circle
                  className="mt-pomo-ring-progress"
                  cx="18" cy="18" r={r}
                  style={{ stroke: phaseColor, strokeDasharray: circ, strokeDashoffset: offset }}
                />
              </svg>
              <div className="mt-pomo-inner">
                <span className="mt-pomo-time">{mm}:{ss}</span>
                <span className="mt-pomo-phase" style={{ color: phaseColor }}>专注中</span>
              </div>
            </div>
            <div className="mt-pomo-info">
              <img src={SvgIcon.POMODORO} alt="" className="mt-pomo-icon" />
              <span className="mt-pomo-count">× 0</span>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="mini-island-wrapper">
      <div className="mini-marquee-frame marquee-active">
        <div className="mini-island mini-tool-expanded">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

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
    else if (p.interactive === 'tools') cardCountRef.current = TOOL_CARDS.length;
    else if (p.interactive === 'settings') cardCountRef.current = SETTING_CARDS.length;
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
        const isMusic = current.interactive === 'music';
        const isTools = current.interactive === 'tools';
        const isSettings = current.interactive === 'settings';
        const cards: Array<{ iconSrc: string; title: string; desc: string }> =
          isBasic ? INTERACTION_CARDS : isMusic ? MUSIC_CARDS : isTools ? TOOL_CARDS : SETTING_CARDS;
        const safeIdx = Math.min(cardIndex, cards.length - 1);
        const card = cards[safeIdx];
        const hint = isBasic
          ? '在此区域附近滚动滚轮可切换灵动岛状态'
          : isMusic ? '滚动查看更多音乐功能'
          : isTools ? '滚动查看更多实用工具'
          : '滚动查看个性化设置';
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
              {isBasic && <MiniIsland demo={INTERACTION_CARDS[safeIdx].demo} />}
              {isMusic && <MiniMusicIsland demo={MUSIC_CARDS[safeIdx].demo} />}
              {isTools && <MiniToolIsland demo={TOOL_CARDS[safeIdx].demo} />}
              {isSettings && <MiniSettingIsland demo={SETTING_CARDS[safeIdx].demo} />}
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
