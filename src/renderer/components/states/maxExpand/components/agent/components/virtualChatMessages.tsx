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
 * @file virtualChatMessages.tsx
 * @description 按可视区域渲染变高消息，测量真实高度并保持阅读锚点及底部跟随。
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 聊天页面使用共享语义 CSS 类。 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ChatMessage from './chatMessage';
import type { ComponentProps, ReactElement, ReactNode, WheelEvent } from 'react';
import type { AiChatMessage } from '../../../../../../store/types';

const ESTIMATED_ROW_HEIGHT = 120;
const OVERSCAN = 600;
const BOTTOM_THRESHOLD = 48;

/** 消息渲染属性沿用缓存行的接口，虚拟列表自行管理绝对索引。 */
interface VirtualChatMessagesProps extends Omit<ComponentProps<typeof ChatMessage>, 'msg' | 'absoluteIndex' | 'isLatest'> {
  messages: AiChatMessage[];
  emptyContent: ReactNode;
  hasActiveTextSelection?: () => boolean;
}

/** 测量包装层保留稳定 ref，避免每个流式分片重新注册全部可见行。 */
interface MeasuredRowProps {
  index: number;
  observe: (index: number, node: HTMLDivElement | null) => void;
  children: ReactNode;
}

/**
 * 包装一条消息并登记尺寸观察。
 * @param props - 绝对索引、观察回调与消息内容。
 * @returns 可测量的消息行。
 */
function MeasuredRow(props: MeasuredRowProps): ReactElement {
  const { index, observe, children } = props;
  const attach = useCallback((node: HTMLDivElement | null): void => observe(index, node), [index, observe]);
  return <div className="max-expand-chat-virtual-row" data-chat-index={index} ref={attach}>{children}</div>;
}

/**
 * 二分定位指定滚动偏移所在的消息，消息边界使用右侧区间。
 * @param offsets - 包含末尾总高度的前缀偏移。
 * @param position - 容器内纵向位置。
 * @returns 有效的消息索引；空列表返回 0。
 */
function findIndex(offsets: number[], position: number): number {
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (offsets[middle] <= position) low = middle;
    else high = middle - 1;
  }
  return Math.max(0, Math.min(low, offsets.length - 2));
}

/**
 * 连续浏览长会话，只挂载视口及预留区域；父级按会话 key 隔离尺寸缓存。
 * @param props - 完整消息与稳定的消息交互回调。
 * @returns 具有完整滚动范围的消息列表。
 */
// eslint-disable-next-line import-x/prefer-default-export -- 页面与测试共用同一个命名组件入口。
export function VirtualChatMessages(props: VirtualChatMessagesProps): ReactElement {
  const { messages, emptyContent, hasActiveTextSelection, ...rowProps } = props;
  const container = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<number, HTMLDivElement>());
  const heights = useRef(new Map<number, number>());
  const disclosures = useRef(new Map<number, boolean[]>());
  const observer = useRef<ResizeObserver | null>(null);
  const frame = useRef<number | null>(null);
  const measureFrame = useRef<number | null>(null);
  const followFrame = useRef<number | null>(null);
  const writtenScrollTop = useRef<number | null>(null);
  const previousMessageCount = useRef(-1);
  const containerSize = useRef({ width: 0, height: 0 });
  const followBottom = useRef(true);
  const selection = useRef(hasActiveTextSelection);
  selection.current = hasActiveTextSelection;
  const anchor = useRef<{ index: number; offset: number } | null>(null);
  const [measurement, setMeasurement] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [viewport, setViewport] = useState({ top: Number.POSITIVE_INFINITY, height: 400 });
  const previousRange = useRef({ start: 0, end: 0 });
  const offsets = useMemo(() => {
    // 尺寸测量版本变化时才重建偏移，普通 token 更新不扫描历史。
    void measurement;
    const result = [0];
    for (let index = 0; index < messages.length; index++) {
      result.push(result[index] + (heights.current.get(index) ?? ESTIMATED_ROW_HEIGHT));
    }
    return result;
  }, [messages.length, measurement]);
  const layout = useRef(offsets);

  const syncViewport = useCallback((): void => {
    const element = container.current;
    if (!element) return;
    const { scrollTop: top, clientHeight: height } = element;
    setViewport((previous) => previous.top === top && previous.height === height ? previous : { top, height });
  }, []);

  const observe = useCallback((index: number, node: HTMLDivElement | null): void => {
    const previous = nodes.current.get(index);
    if (previous) {
      observer.current?.unobserve(previous);
      const openStates = Array.from(previous.querySelectorAll('details'), (details) => details.open);
      if (openStates.some(Boolean)) disclosures.current.set(index, openStates);
      else disclosures.current.delete(index);
      nodes.current.delete(index);
    }
    if (node) {
      disclosures.current.get(index)?.forEach((open, detailIndex) => {
        const details = node.querySelectorAll('details')[detailIndex];
        if (details) details.open = open;
      });
      nodes.current.set(index, node);
      observer.current?.observe(node);
    }
  }, []);

  const stopFollowing = useCallback((): void => {
    followBottom.current = false;
    if (followFrame.current !== null) window.cancelAnimationFrame(followFrame.current);
    followFrame.current = null;
    writtenScrollTop.current = null;
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>): void => {
    if (event.deltaY < 0) stopFollowing();
  }, [stopFollowing]);

  const followLatest = useCallback((): void => {
    if (followFrame.current !== null) return;
    let previousTime: number | null = null;
    const advance = (time: number): void => {
      const element = container.current;
      if (!element || !followBottom.current || selection.current?.()) {
        followFrame.current = null;
        return;
      }
      const target = Math.max(0, element.scrollHeight - element.clientHeight);
      const remaining = target - element.scrollTop;
      const elapsed = previousTime === null ? 16 : Math.min(32, time - previousTime);
      previousTime = time;
      const next = remaining <= 0.5 ? target
        : element.scrollTop + Math.min(remaining, Math.max(1, remaining * (1 - Math.exp(-elapsed / 65))));
      writtenScrollTop.current = next;
      element.scrollTop = next;
      // 使用浏览器取整后的真实位置识别自动滚动事件。
      writtenScrollTop.current = element.scrollTop;
      syncViewport();
      followFrame.current = remaining <= 0.5 ? null : window.requestAnimationFrame(advance);
    };
    followFrame.current = window.requestAnimationFrame(advance);
  }, [syncViewport]);

  const handleScroll = useCallback((): void => {
    const element = container.current;
    if (!element) return;
    const automatic = writtenScrollTop.current !== null && Math.abs(element.scrollTop - writtenScrollTop.current) < 1;
    if (!automatic) {
      const distance = element.scrollHeight - element.clientHeight - element.scrollTop;
      followBottom.current = distance <= 2 || (followBottom.current && distance <= BOTTOM_THRESHOLD);
      if (!followBottom.current) stopFollowing();
      // 用户滚动优先于尚未提交的尺寸补偿。
      anchor.current = null;
    }
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      // 一帧只提交一次可见区更新，避免高速滚动时先绘制离屏占位。
      flushSync(syncViewport);
    });
  }, [stopFollowing, syncViewport]);

  const measureRows = useCallback((): void => {
    const element = container.current;
    if (!element || element.clientWidth === 0) return;
    const oldOffsets = layout.current;
    const index = findIndex(oldOffsets, Math.max(0, element.scrollTop - 12));
    const savedAnchor = { index, offset: element.scrollTop - oldOffsets[index] };
    const oldHeight = oldOffsets[index + 1] - oldOffsets[index];
    const widthChanged = containerSize.current.width > 0 && containerSize.current.width !== element.clientWidth;
    let changed = containerSize.current.height !== element.clientHeight || widthChanged;
    containerSize.current = { width: element.clientWidth, height: element.clientHeight };
    if (widthChanged) heights.current.clear();
    nodes.current.forEach((node, rowIndex) => {
      // 使用未受窗口缩放影响的 CSS 高度，保留 Markdown 行高的小数像素。
      const measuredHeight = Math.max(8, Number.parseFloat(window.getComputedStyle(node).height) || node.offsetHeight);
      if (Math.abs((heights.current.get(rowIndex) ?? ESTIMATED_ROW_HEIGHT) - measuredHeight) < 0.5) return;
      heights.current.set(rowIndex, measuredHeight);
      changed = true;
    });
    if (!changed) return;
    if (widthChanged && oldHeight > 0 && savedAnchor.offset > 12) {
      // 换行缩短长消息时按内容比例恢复，避免旧像素偏移越过该消息。
      const newHeight = heights.current.get(index) ?? ESTIMATED_ROW_HEIGHT;
      savedAnchor.offset = 12 + Math.min(0.99, (savedAnchor.offset - 12) / oldHeight) * newHeight;
    }
    if (!followBottom.current && !anchor.current) anchor.current = savedAnchor;
    setMeasurement((value) => value + 1);
  }, []);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = new ResizeObserver((entries) => {
      const needsMeasurement = entries.some((entry) => {
        if (entry.target === element) {
          return containerSize.current.width !== element.clientWidth || containerSize.current.height !== element.clientHeight;
        }
        const node = entry.target as HTMLDivElement;
        const height = entry.borderBoxSize[0]?.blockSize ?? node.offsetHeight;
        return Math.abs((heights.current.get(Number(node.dataset.chatIndex)) ?? ESTIMATED_ROW_HEIGHT) - Math.max(8, height)) >= 0.5;
      });
      if (!needsMeasurement || measureFrame.current !== null) return;
      // 绘制前同步恢复锚点；新挂载行延后注册观察，避免同一通知周期反复交付尺寸。
      resize.disconnect();
      observer.current = null;
      flushSync(measureRows);
      measureFrame.current = window.requestAnimationFrame(() => {
        measureFrame.current = null;
        flushSync(measureRows);
        observer.current = resize;
        resize.observe(element);
        nodes.current.forEach((node) => resize.observe(node));
      });
    });
    observer.current = resize;
    resize.observe(element);
    nodes.current.forEach((node) => resize.observe(node));
    const selectionChanged = (): void => {
      setSelecting(Boolean(selection.current?.()));
      syncViewport();
    };
    document.addEventListener('selectionchange', selectionChanged);
    return (): void => {
      resize.disconnect();
      observer.current = null;
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      if (measureFrame.current !== null) window.cancelAnimationFrame(measureFrame.current);
      if (followFrame.current !== null) window.cancelAnimationFrame(followFrame.current);
      followFrame.current = null;
      document.removeEventListener('selectionchange', selectionChanged);
    };
  }, [measureRows, syncViewport]);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    layout.current = offsets;
    if (!selection.current?.()) {
      if (followBottom.current) {
        const newMessages = previousMessageCount.current !== messages.length;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!newMessages && !reducedMotion && (rowProps.isStreaming || followFrame.current !== null)) followLatest();
        else {
          if (followFrame.current !== null) window.cancelAnimationFrame(followFrame.current);
          followFrame.current = null;
          element.scrollTop = element.scrollHeight;
          writtenScrollTop.current = element.scrollTop;
        }
      } else if (anchor.current) {
        const { index, offset } = anchor.current;
        element.scrollTop = (offsets[Math.min(index, messages.length)] ?? 0) + offset;
      }
    }
    previousMessageCount.current = messages.length;
    anchor.current = null;
    syncViewport();
  }, [offsets, messages, rowProps.isStreaming, followLatest, syncViewport]);

  const total = offsets[messages.length];
  const projectedTop = anchor.current
    ? (offsets[Math.min(anchor.current.index, messages.length)] ?? 0) + anchor.current.offset
    : viewport.top;
  let top = Number.isFinite(projectedTop) ? projectedTop : 0;
  const animatedFollow = rowProps.isStreaming && previousMessageCount.current === messages.length || followFrame.current !== null;
  if (followBottom.current && !animatedFollow && !selection.current?.()) top = Math.max(0, total - viewport.height);
  let start = findIndex(offsets, Math.max(0, top - OVERSCAN));
  let end = messages.length === 0 ? 0 : Math.min(messages.length, findIndex(offsets, top + viewport.height + OVERSCAN) + 1);
  if ((selecting || selection.current?.()) && previousRange.current.end > 0) {
    // 选择期间不卸载被选中的 DOM，即使图片加载或换行改变了高度。
    start = Math.min(start, previousRange.current.start);
    end = Math.min(messages.length, Math.max(end, previousRange.current.end));
  }
  previousRange.current = { start, end };

  // 新挂载的行在首次绘制前测量，滚动不会先显示错误高度的占位。
  useLayoutEffect(() => { measureRows(); }, [start, end, messages, measureRows]);

  return (
    <div className="max-expand-chat-messages" ref={container} onScroll={handleScroll}
      onWheel={handleWheel}>
      {messages.length === 0 ? emptyContent : (
        <>
          <div className="max-expand-chat-spacer" aria-hidden="true" style={{ height: offsets[start] }} />
          {messages.slice(start, end).map((msg, index) => {
            const absoluteIndex = start + index;
            const isLatest = absoluteIndex === messages.length - 1;
            return (
              <MeasuredRow key={absoluteIndex} index={absoluteIndex} observe={observe}>
                <ChatMessage msg={msg} absoluteIndex={absoluteIndex} isLatest={isLatest} isStreaming={rowProps.isStreaming && isLatest}
                  agentMode={rowProps.agentMode} r1pxcAvatar={rowProps.r1pxcAvatar} userAvatarUrl={rowProps.userAvatarUrl}
                  showThinking={rowProps.showThinking} onQuote={rowProps.onQuote}
                  onReportIssue={rowProps.onReportIssue} navigateToSettingsTab={rowProps.navigateToSettingsTab}
                />
              </MeasuredRow>
            );
          })}
          <div className="max-expand-chat-spacer" aria-hidden="true" style={{ height: total - offsets[end] }} />
        </>
      )}
    </div>
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 结束聊天共享语义类的局部配置。 */
