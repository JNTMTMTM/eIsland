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
 * @file islandContentTransition.tsx
 * @description 性能模式下将重页面挂载和卸载移出外壳动画，普通模式立即切换内容。
 * @author 鸡哥
 */

import { useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type CSSProperties } from 'react';
import { getIslandMorphDuration, ISLAND_STATE_AREA } from '../../store/constants/islandTransition';
import { IslandContentActivityContext } from '../hooks/islandContentActivity';
import type { IslandState } from '../../store/types';

// display:contents 保持原页面的 flex 布局；离场树完全跳过布局和绘制。
const ACTIVE_LAYER_STYLE: CSSProperties = { display: 'contents' };
const HIDDEN_LAYER_STYLE: CSSProperties = { display: 'none' };

interface IslandContentTransitionProps {
  state: IslandState;
  animationSpeed: string;
  springAnimation: boolean;
  performanceModeEnabled: boolean;
  children: ReactElement;
  fallback?: ReactNode;
}

interface ContentLayer {
  state: IslandState;
  element: ReactElement;
}

interface ContentTransition {
  target: IslandState;
  pending: boolean;
  retained: ContentLayer | null;
}

function isHeavyState(state: IslandState): boolean {
  return ISLAND_STATE_AREA[state] >= ISLAND_STATE_AREA.expanded;
}

/**
 * 按性能模式选择延迟重内容或立即切换页面，并在关闭开关时取消待完成的过渡。
 * @param props - 目标状态、动画配置和对应页面。
 * @param props.state - 当前目标状态。
 * @param props.animationSpeed - 动画速度档位。
 * @param props.springAnimation - 是否启用弹性动画。
 * @param props.performanceModeEnabled - 是否启用内容隐藏、延迟挂载和离场保留。
 * @param props.children - 目标页面节点。
 * @param props.fallback - 等待重页面挂载时显示的内容，由调用方按性能模式控制。
 * @returns 当前页面、短暂保留的离场页面及轻量加载占位。
 */
export default function IslandContentTransition({
  state, animationSpeed, springAnimation, performanceModeEnabled, children, fallback = null,
}: IslandContentTransitionProps): ReactElement {
  const visibleContentRef = useRef(children);
  const [transition, setTransition] = useState<ContentTransition>({
    target: state, pending: false, retained: null,
  });

  // 首次渲染就拦住重目标，不能等 effect 执行后才隐藏已挂载的页面。
  const changed = transition.target !== state;
  const current = useMemo<ContentTransition>(() => {
    // 普通模式直接提交目标内容；中途关闭时也立即释放旧层，避免开关恢复后复用过期状态。
    if (!performanceModeEnabled) {
      if (!changed && !transition.pending) return transition;
      return { target: state, pending: false, retained: null };
    }
    if (!changed) return transition;
    const pending = transition.pending || (
      ISLAND_STATE_AREA[transition.target] !== ISLAND_STATE_AREA[state]
      && (isHeavyState(transition.target) || isHeavyState(state))
    );
    let { retained } = transition;
    if (!transition.pending && isHeavyState(transition.target)) {
      retained = { state: transition.target, element: visibleContentRef.current };
    }
    if (!pending) retained = null;
    return { pending, retained, target: state };
  }, [changed, state, transition, performanceModeEnabled]);
  const { pending } = current;

  useLayoutEffect(() => {
    if (current !== transition) setTransition(current);
    if (!pending) visibleContentRef.current = children;
  }, [transition, current, pending, children]);

  useLayoutEffect(() => {
    if (!current.pending) return;
    let frame = 0;
    const timer = window.setTimeout(() => {
      // 让已到终点的壳层先提交一帧，再进行重页面的提交和清理。
      frame = window.requestAnimationFrame(() => {
        setTransition({ target: state, pending: false, retained: null });
      });
    }, getIslandMorphDuration(animationSpeed, springAnimation));
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [current.pending, state, animationSpeed, springAnimation]);

  const layers: ContentLayer[] = [];
  if (current.retained) layers.push(current.retained);
  const showTarget = !pending || !isHeavyState(state);
  if (showTarget) layers.push({ state, element: children });

  return (
    <>
      {layers.map((layer) => {
        const active = showTarget && layer.state === state;
        return (
          <div key={layer.state}
            style={active ? ACTIVE_LAYER_STYLE : HIDDEN_LAYER_STYLE}
            data-island-state={layer.state}
            hidden={!active}
            inert={!active}
            aria-hidden={!active || undefined}
          >
            <IslandContentActivityContext.Provider value={active}>
              {layer.element}
            </IslandContentActivityContext.Provider>
          </div>
        );
      })}
      {!showTarget && fallback}
    </>
  );
}
