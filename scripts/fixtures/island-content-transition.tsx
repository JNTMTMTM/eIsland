/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file island-content-transition.tsx
 * @description 使用合成页面验证内容挂载、离场清理、尺寸布局及形变期间的帧间隔。
 * @author 鸡哥
 */

import { useLayoutEffect, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import IslandContentTransition from '../../src/renderer/components/components/islandContentTransition';
import { getIslandMorphDuration, ISLAND_STATE_AREA } from '../../src/renderer/store/constants/islandTransition';
import { beginIslandWindowTransition, completeIslandWindowTransition } from '../../src/renderer/utils/islandWindowTransition';
import type { IslandState } from '../../src/renderer/store/types';
import '../../src/renderer/styles/shell/shell.css';

interface FixtureOptions {
  state: IslandState;
  animationSpeed?: string;
  springAnimation?: boolean;
  performanceModeEnabled?: boolean;
  deferred?: boolean;
  rows?: number;
}

interface LifecycleEvent {
  state: IslandState;
  type: 'mount' | 'unmount';
  time: number;
}

const events: LifecycleEvent[] = [];
const checks: string[] = [];
let livePages = 0;
let root = createRoot(document.getElementById('root')!);

const fixtureStyle = document.createElement('style');
fixtureStyle.textContent = `
  * { box-sizing: border-box; }
  body { margin: 0; --color-island-bg: #111; --color-text-rgb: 255, 255, 255; }
  [data-fixture-state] { width: 100%; height: 100%; min-width: 0; overflow: hidden; color: #fff; }
  [data-fixture-row] { display: flex; gap: 8px; padding: 2px; }
  [data-fixture-row] > span { flex: 1; }
`;
document.head.append(fixtureStyle);

/**
 * 记录真实 React 提交和清理时间，DOM 数据全部合成。
 * @param props - 页面状态与合成行数。
 * @param props.state - 需要记录生命周期的状态。
 * @param props.rows - 合成 DOM 的行数。
 * @returns 合成页面。
 */
function Page(props: { state: IslandState; rows: number }): ReactElement {
  const { state, rows } = props;
  useLayoutEffect(() => {
    const nodes = document.querySelectorAll(`[data-fixture-state="${state}"] [data-fixture-row]`);
    const listener = (event: Event): void => event.preventDefault();
    nodes.forEach((node) => node.addEventListener('click', listener));
    livePages += 1;
    events.push({ state, type: 'mount', time: performance.now() });
    return () => {
      // 模拟重页面逐行资源释放，确保退出采样覆盖真实清理而非空 effect。
      nodes.forEach((node) => node.removeEventListener('click', listener));
      livePages -= 1;
      events.push({ state, type: 'unmount', time: performance.now() });
    };
  }, [state]);
  return (
    <div data-fixture-state={state}>
      {Array.from({ length: rows }, (value, index) => (
        <div data-fixture-row={index} key={`row-${index}`}>
          <span>{state}</span><span>{index}</span><span>{`synthetic event ${index}`}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 以实际壳层 CSS 和业务调度器驱动测试。
 * @param options - 目标状态及动画选项。
 * @returns 独立的测试界面。
 */
function Fixture(options: FixtureOptions): ReactElement {
  const { state, animationSpeed = 'medium', springAnimation = true, performanceModeEnabled = true, deferred = true, rows = 40 } = options;
  const content = <Page key={state} state={state} rows={rows} />;
  return (
    <div className={`island-shell ${state} speed-${animationSpeed}${springAnimation ? ' spring-animation' : ''}`}>
      {deferred ? (
        <IslandContentTransition state={state} animationSpeed={animationSpeed} springAnimation={springAnimation}
          performanceModeEnabled={performanceModeEnabled} fallback={<div data-fixture-loading="true" />}>
          {content}
        </IslandContentTransition>
      ) : content}
    </div>
  );
}

/**
 * 确保 React 提交已完成，以明确区分动画前与动画后的生命周期。
 * @param options - 本次渲染选项。
 * @returns 无返回值。
 */
function render(options: FixtureOptions): void {
  flushSync(() => root.render(<Fixture state={options.state} animationSpeed={options.animationSpeed} springAnimation={options.springAnimation} performanceModeEnabled={options.performanceModeEnabled} deferred={options.deferred} rows={options.rows} />));
}

/**
 * 校验行为，不使用机器相关的帧率作为通过条件。
 * @param condition - 待验证条件。
 * @param message - 失败原因。
 * @returns 无返回值。
 */
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/**
 * 等待浏览器计时器。
 * @param milliseconds - 等待时长。
 * @returns 到期后的 Promise。
 */
function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * 等待样式与布局实际提交。
 * @returns 下一次绘制后的 Promise。
 */
function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * 重置实例，验证每个场景结束后确实释放页面。
 * @returns 无返回值。
 */
function reset(): void {
  flushSync(() => root.unmount());
  assert(livePages === 0, 'Unmount must release every page, including retained outgoing content.');
  root = createRoot(document.getElementById('root')!);
  events.length = 0;
}

/**
 * 检查当前树及其祖先是否参与可见内容绘制。
 * @param element - 页面内容节点。
 * @returns 是否可见。
 */
function visible(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.contentVisibility === 'hidden' || style.opacity === '0') return false;
  }
  return true;
}

/**
 * 检查新增包裹层是否改变页面填充尺寸。
 * @param state - 当前应可见的页面。
 * @returns 无返回值。
 */
function assertLayout(state: IslandState): void {
  const page = document.querySelector(`[data-fixture-state="${state}"]`);
  const shell = document.querySelector('.island-shell');
  assert(Boolean(page && shell), `Missing final ${state} content or shell.`);
  const pageBounds = page!.getBoundingClientRect();
  const shellBounds = shell!.getBoundingClientRect();
  assert(visible(page!), `${state} remains hidden after transition.`);
  assert(Math.abs(pageBounds.width - shellBounds.width) < 2, `${state} width must fill shell (${pageBounds.width} vs ${shellBounds.width}).`);
  assert(Math.abs(pageBounds.height - shellBounds.height) < 2, `${state} height must fill shell (${pageBounds.height} vs ${shellBounds.height}).`);
}

/**
 * 覆盖进入和退出重内容的三个速度档位及关闭弹性。
 * @returns 场景完成后的 Promise。
 */
async function testLifecycle(): Promise<void> {
  const cases = [
    { animationSpeed: 'fast', springAnimation: true },
    { animationSpeed: 'medium', springAnimation: true },
    { animationSpeed: 'slow', springAnimation: true },
    { animationSpeed: 'medium', springAnimation: false },
  ];
  await cases.reduce(async (previous, item) => {
    await previous;
    const duration = getIslandMorphDuration(item.animationSpeed, item.springAnimation);
    reset();
    render({ state: 'expanded', ...item });
    assert(events.some((event) => event.state === 'expanded' && event.type === 'mount'), 'Initial heavy content must mount immediately.');
    await frame();
    const start = performance.now();
    render({ state: 'maxExpand', ...item });
    assert(!events.some((event) => event.state === 'maxExpand'), 'MaxExpand mounted during the shell transition commit.');
    await wait(duration / 2);
    assert(!events.some((event) => event.state === 'maxExpand'), 'MaxExpand mounted before shell dimensions settled.');
    await wait(duration / 2 + 100);
    await frame();
    const mount = events.find((event) => event.state === 'maxExpand' && event.type === 'mount');
    assert(Boolean(mount && mount.time - start >= duration - 45), 'Heavy page mounted before the protected interval.');
    assert(livePages === 1, 'Expanded content must be released after MaxExpand finishes entering.');
    assertLayout('maxExpand');

    const exitStart = performance.now();
    render({ state: 'cli', ...item });
    assert(Boolean(document.querySelector('[data-fixture-state="cli"]')), 'Light CLI target should appear immediately.');
    const outgoing = document.querySelector('[data-fixture-state="maxExpand"]');
    assert(Boolean(outgoing && !visible(outgoing)), 'Heavy outgoing content should be retained but hidden during shrink.');
    assert(!events.some((event) => event.state === 'maxExpand' && event.type === 'unmount'), 'Heavy cleanup ran in the shrink animation commit.');
    await wait(duration + 100);
    await frame();
    const unmount = events.find((event) => event.state === 'maxExpand' && event.type === 'unmount');
    assert(Boolean(unmount && unmount.time - exitStart >= duration - 45), 'Outgoing cleanup ran before the shrink protection ended.');
    assert(livePages === 1 && !document.querySelector('[data-fixture-state="maxExpand"]'), 'Heavy page must not remain cached after collapse.');
    assertLayout('cli');
    checks.push(`lifecycle: ${item.animationSpeed}, spring=${item.springAnimation}`);
  }, Promise.resolve());
}

/**
 * 验证反向切换、同尺寸跳转和未完成目标取消。
 * @returns 场景完成后的 Promise。
 */
async function testInterruptions(): Promise<void> {
  reset();
  render({ state: 'maxExpand', animationSpeed: 'fast' });
  await frame();
  const retainedPage = document.querySelector('[data-fixture-state="maxExpand"]');
  render({ state: 'notification', animationSpeed: 'fast' });
  await wait(60);
  render({ state: 'maxExpand', animationSpeed: 'fast' });
  assert(Boolean(retainedPage && visible(retainedPage)), 'Reversing to retained content must make it visible in the same commit.');
  assert(document.querySelector('[data-fixture-state="maxExpand"]') === retainedPage, 'Reversing must preserve the retained DOM and its local state.');
  assert(!document.querySelector('[data-fixture-loading]'), 'Reversing must not delay an already mounted page behind a loading fallback.');
  await wait(480);
  await frame();
  assert(livePages === 1 && Boolean(document.querySelector('[data-fixture-state="maxExpand"]')), 'A stale collapse timer removed the reversed target.');
  assert(events.filter((event) => event.state === 'maxExpand' && event.type === 'mount').length === 1, 'Rapid reversal should reuse the retained heavy page.');
  assertLayout('maxExpand');
  checks.push('rapid reverse: maxExpand → notification → maxExpand restores the same DOM immediately');

  render({ state: 'login', animationSpeed: 'fast' });
  assert(Boolean(document.querySelector('[data-fixture-state="login"]')), 'Equal-size heavy pages should switch immediately.');
  await wait(450);
  assert(livePages === 1 && !document.querySelector('[data-fixture-state="maxExpand"]'), 'Equal-size navigation retained an obsolete page.');
  assertLayout('login');
  checks.push('equal-size heavy navigation');

  reset();
  render({ state: 'cli', animationSpeed: 'fast' });
  await frame();
  render({ state: 'maxExpand', animationSpeed: 'fast' });
  await wait(50);
  render({ state: 'cli', animationSpeed: 'fast' });
  await wait(480);
  assert(!events.some((event) => event.state === 'maxExpand'), 'Canceled pending target must never mount.');
  assert(livePages === 1, 'Canceled transition left extra content mounted.');
  checks.push('cancel entering heavy target');
  reset();

  render({ state: 'cli', animationSpeed: 'slow' });
  await frame();
  render({ state: 'maxExpand', animationSpeed: 'slow' });
  await wait(50);
  render({ state: 'maxExpand', animationSpeed: 'fast', springAnimation: false });
  await wait(340);
  await frame();
  assertLayout('maxExpand');
  await wait(800);
  assert(livePages === 1 && events.filter((event) => event.state === 'maxExpand' && event.type === 'mount').length === 1, 'Changing speed or spring left a stale completion callback.');
  checks.push('change speed and disable spring while entering');
  reset();

  render({ state: 'cli', animationSpeed: 'fast' });
  render({ state: 'maxExpand', animationSpeed: 'fast' });
  reset();
  await wait(480);
  assert(livePages === 0 && events.length === 0, 'Unmount must cancel pending target timers and frames.');
  checks.push('dispose a pending transition');
}

/**
 * 确保关闭性能模式时同步切换页面，不保留隐藏树或显示加载占位。
 * @param state - 当前目标状态。
 * @returns 当前目标页面节点。
 */
function assertImmediateContent(state: IslandState): Element {
  const pages = document.querySelectorAll('[data-fixture-state]');
  assert(pages.length === 1 && pages[0].getAttribute('data-fixture-state') === state, `Disabled performance mode must immediately show only ${state}.`);
  assert(visible(pages[0]), `${state} must remain visible while performance mode is disabled.`);
  assert(!document.querySelector('[data-island-state][hidden], [data-island-state][inert], [data-island-state][aria-hidden="true"]'), 'Disabled performance mode retained a hidden or inert page layer.');
  assert(!document.querySelector('[data-fixture-loading]'), 'Disabled performance mode displayed the transition loading fallback.');
  assert(livePages === 1, 'Disabled performance mode did not immediately release the outgoing page.');
  return pages[0];
}

/**
 * 验证性能模式关闭和动画中切换设置时的页面生命周期。
 * @returns 场景完成后的 Promise。
 */
async function testPerformanceMode(): Promise<void> {
  reset();
  const states: IslandState[] = ['cli', 'expanded', 'maxExpand', 'cli'];
  states.forEach((state, index) => {
    render({ state, animationSpeed: 'fast', performanceModeEnabled: false });
    assertImmediateContent(state);
    assert(events.filter((event) => event.type === 'mount').length === index + 1, 'Disabled performance mode delayed a target mount.');
    assert(events.filter((event) => event.type === 'unmount').length === index, 'Disabled performance mode delayed outgoing cleanup.');
  });
  await wait(480);
  assertImmediateContent('cli');
  checks.push('performance mode off: cli → expanded → maxExpand → cli switches synchronously');

  reset();
  render({ state: 'expanded', animationSpeed: 'fast' });
  await frame();
  render({ state: 'maxExpand', animationSpeed: 'fast' });
  assert(Boolean(document.querySelector('[data-fixture-loading]')), 'Enabled performance mode must show the supplied loading fallback for pending heavy content.');
  await wait(50);
  render({ state: 'maxExpand', animationSpeed: 'fast', performanceModeEnabled: false });
  const enteredPage = assertImmediateContent('maxExpand');
  render({ state: 'maxExpand', animationSpeed: 'fast', performanceModeEnabled: true });
  assert(assertImmediateContent('maxExpand') === enteredPage, 'Re-enabling performance mode unnecessarily remounted the current page.');
  await wait(480);
  assert(assertImmediateContent('maxExpand') === enteredPage, 'A stale enter timer replaced the page after the setting changed.');
  assert(events.filter((event) => event.state === 'maxExpand' && event.type === 'mount').length === 1, 'Disabling a pending enter must mount its target exactly once.');
  checks.push('disable performance mode during enter, then re-enable without remounting');

  render({ state: 'cli', animationSpeed: 'fast' });
  const outgoing = document.querySelector('[data-fixture-state="maxExpand"]');
  assert(Boolean(outgoing && !visible(outgoing)), 'Re-enabled performance mode must retain and hide outgoing heavy content until shrink completes.');
  const compactPage = document.querySelector('[data-fixture-state="cli"]');
  await wait(50);
  render({ state: 'cli', animationSpeed: 'fast', performanceModeEnabled: false });
  assert(assertImmediateContent('cli') === compactPage, 'Disabling performance mode during shrink must preserve the visible light target.');
  render({ state: 'cli', animationSpeed: 'fast', performanceModeEnabled: true });
  await wait(480);
  assert(assertImmediateContent('cli') === compactPage, 'A stale shrink timer changed the target after the setting changed.');
  assert(events.filter((event) => event.state === 'maxExpand' && event.type === 'unmount').length === 1, 'Disabling a pending shrink must release its source exactly once.');
  checks.push('disable performance mode during shrink immediately releases retained content');
  reset();
}

/**
 * 采样实际浏览器帧间隔；性能数据仅用于比较，不作为不稳定的测试门槛。
 * @param deferred - 是否启用业务内容调度器。
 * @param direction - 展开或收起重内容。
 * @returns 该次合成负载的动画帧统计。
 */
async function benchmark(deferred: boolean, direction: 'enter' | 'exit'): Promise<Record<string, number | boolean | string>> {
  reset();
  render({ deferred, state: direction === 'enter' ? 'expanded' : 'maxExpand', rows: direction === 'enter' ? 20 : 6000 });
  await frame();
  const gaps: number[] = [];
  let active = true;
  let previous = performance.now();
  const sample = (time: number): void => {
    gaps.push(time - previous);
    previous = time;
    if (active) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  await frame();
  const started = performance.now();
  render({ deferred, state: direction === 'enter' ? 'maxExpand' : 'cli', rows: direction === 'enter' ? 6000 : 20 });
  const commitMilliseconds = performance.now() - started;
  await wait(650);
  active = false;
  await frame();
  const animationGaps = gaps.filter((gap) => gap > 0);
  await wait(350);
  assertLayout(direction === 'enter' ? 'maxExpand' : 'cli');
  return {
    deferred,
    direction,
    syntheticRows: 6000,
    commitMilliseconds: Number(commitMilliseconds.toFixed(1)),
    maxAnimationFrameGapMilliseconds: Number(Math.max(...animationGaps).toFixed(1)),
    animationFramesOver32Milliseconds: animationGaps.filter((gap) => gap > 32).length,
    sampledFrames: animationGaps.length,
  };
}

declare global {
  interface Window {
    runIslandTransitionTests: () => Promise<Record<string, unknown>>;
  }
}

/**
 * 在真实 Chromium 中并行检查所有通知双向切换和中途反转的形变边界。
 * @returns 覆盖的组合数及实际采样帧数。
 */
async function testShellTransitions(): Promise<{ cases: number; frames: number }> {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;width:1000px;pointer-events:none;';
  document.body.append(host);
  const paths: IslandState[][] = Object.keys(ISLAND_STATE_AREA)
    .filter((state) => state !== 'notification')
    .flatMap((state) => [['notification', state], [state, 'notification']] as IslandState[][]);
  paths.push(['notification', 'idle', 'hover'], ['maxExpand', 'idle', 'notification'], ['idle', 'maxExpand', 'idle']);
  const variants = ['pill', 'notch'].flatMap((shape) => ['slow', 'medium', 'fast'].flatMap((speed) => (
    [true, false].map((spring) => ({ shape, speed, spring }))
  )));
  let caseCount = 0;
  let frames = 0;
  try {
    // 每种配置内并行采样全部路径，避免数百个动画同时布局干扰真实的帧时序。
    await variants.reduce(async (previous, { shape, speed, spring }) => {
      await previous;
      host.replaceChildren();
      const cases = paths.map((path) => {
        const row = document.createElement('div');
        row.style.cssText = 'position:absolute;left:0;top:0;width:1000px;';
        const element = document.createElement('div');
        row.append(element); host.append(row);
        const classes = `island-shell shape-${shape} speed-${speed}${spring ? ' spring-animation' : ''}`;
        element.style.cssText = 'transition:none;animation:none;';
        let width = 0;
        let height = 0;
        let finalWidth = 0;
        let finalHeight = 0;
        path.forEach((state) => {
          element.className = `${classes} ${state}`;
          const bounds = element.getBoundingClientRect();
          width = Math.max(width, bounds.width); height = Math.max(height, bounds.height);
          finalWidth = bounds.width; finalHeight = bounds.height;
          if (shape === 'pill' && state === 'musicProvidersLogin') {
            assert(bounds.height === 416, 'Pill music provider login must share the 416px settings canvas.');
            assert(getComputedStyle(element).borderRadius === '26px', 'Pill music provider login must keep the rounded settings shape.');
          }
        });
        element.className = `${classes} ${path[0]}`;
        element.getBoundingClientRect();
        return { element, path, shape, speed, spring, width, height, finalWidth, finalHeight,
          step: 1, start: 0, guard: getIslandMorphDuration(speed, spring) };
      });
      cases.forEach((item) => {
        const { element } = item;
        element.style.cssText = '';
        element.className = `island-shell shape-${item.shape} speed-${item.speed}${item.spring ? ' spring-animation' : ''} ${item.path[1]} morphing from-${item.path[0]}`;
        const style = getComputedStyle(element);
        assert(parseFloat(style.animationDuration) * 1000 <= item.guard,
          `${item.shape}/${item.speed}/${item.path.join('→')}: animation outlasts the native canvas guard.`);
        if (ISLAND_STATE_AREA[item.path[1]] > ISLAND_STATE_AREA[item.path[0]]) {
          assert(!style.animationName.startsWith('shellShrink'), `${item.path.join('→')}: expanding target received a shrinking keyframe.`);
        }
      });
      await frame();
      const started = performance.now();
      cases.forEach((item) => Object.assign(item, { start: started }));
      const sample = async (): Promise<void> => {
        await frame();
        frames += 1;
        let active = false;
        cases.forEach((item) => {
          const now = performance.now();
          const { element } = item;
          if (item.path.length > 2 && item.step === 1 && now - item.start >= 80) {
            element.className = `island-shell shape-${item.shape} speed-${item.speed}${item.spring ? ' spring-animation' : ''} ${item.path[2]} morphing from-${item.path[1]}`;
            element.getBoundingClientRect();
            Object.assign(item, { step: 2, start: performance.now() });
          }
          const bounds = element.getBoundingClientRect();
          const label = `${item.shape}/${item.speed}/${item.spring}/${item.path.join('→')}`;
          assert(bounds.width <= item.width + 0.5 && bounds.height <= item.height + 0.5,
            `${label}: shell ${bounds.width}×${bounds.height} exceeds ${item.width}×${item.height} native envelope.`);
          assert(bounds.top >= -0.5, `${label}: shell extends above the native window.`);
          if (now - item.start < item.guard + 60) active = true;
          else {
            assert(Math.abs(bounds.width - item.finalWidth) < 0.5 && Math.abs(bounds.height - item.finalHeight) < 0.5,
              `${label}: shell ${bounds.width}×${bounds.height} did not reach ${item.finalWidth}×${item.finalHeight} before canvas protection expired.`);
          }
        });
        if (active) await sample();
      };
      await sample();
      caseCount += cases.length;
    }, Promise.resolve());
    checks.push('all notification directions, animation speeds, spring modes, shapes and interrupted shell envelopes');
    return { frames, cases: caseCount };
  } finally {
    host.remove();
  }
}

/**
 * 模拟目标 class 提交后主线程阻塞，确认真实 CSS 完成后才允许原生画布收缩。
 * @returns 每个忙帧场景在实际确认时的尺寸和耗时。
 */
async function testBusyShellAcknowledgements(): Promise<Record<string, unknown>[]> {
  const previousApi = Object.getOwnPropertyDescriptor(window, 'api');
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;width:1000px;';
  document.body.append(host);
  let acknowledge: ((id: number) => void) | undefined;
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { beginWindowTransition: () => {}, completeWindowTransition: (id: number) => acknowledge?.(id) },
  });
  const scenarios = [true, false].flatMap((spring) => [
    { spring, busyMs: 180, reverse: false },
    { spring, busyMs: 500, reverse: false },
    { spring, busyMs: 500, reverse: true },
  ]);
  const results: Record<string, unknown>[] = [];
  try {
    await scenarios.reduce(async (previous, { spring, busyMs, reverse }) => {
      await previous;
      host.replaceChildren();
      const shell = document.createElement('div');
      const classes = `island-shell shape-notch speed-fast${spring ? ' spring-animation' : ''}`;
      shell.className = `${classes} notification`;
      host.append(shell);
      await frame();
      const guard = getIslandMorphDuration('fast', spring);
      const oldId = beginIslandWindowTransition('notification', 'idle');
      let expectedId = oldId;
      let started = 0;
      const acknowledgements: number[] = [];
      const result = await new Promise<{ id: number; width: number; height: number; elapsedMs: number }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Busy shell acknowledgement did not settle.')), 3000);
        acknowledge = (id) => {
          const bounds = shell.getBoundingClientRect();
          acknowledgements.push(id);
          clearTimeout(timeout);
          resolve({ id, width: bounds.width, height: bounds.height, elapsedMs: Math.round(performance.now() - started) });
        };
        requestAnimationFrame(() => {
          started = performance.now();
          shell.className = `${classes} idle morphing from-notification`;
          if (reverse) {
            completeIslandWindowTransition(oldId);
            expectedId = beginIslandWindowTransition('idle', 'hover');
            shell.className = `${classes} hover morphing from-idle`;
          }
          setTimeout(() => {
            shell.classList.remove('morphing', 'from-notification', 'from-idle');
            requestAnimationFrame(() => completeIslandWindowTransition(expectedId));
          }, guard);
          // 不读取中途尺寸；布局读取会提前刷新 CSS 起点，掩盖真实忙帧问题。
          while (performance.now() - started < busyMs) { /* 模拟不可中断的重页面提交。 */ }
        });
      });
      const label = `spring=${spring}, busy=${busyMs}, reverse=${reverse}`;
      assert(result.id === expectedId, `${label}: stale transition released the native canvas.`);
      assert(Math.abs(result.width - (reverse ? 500 : 260)) < 0.5 && Math.abs(result.height - (reverse ? 60 : 42)) < 0.5,
        `${label}: native acknowledgement arrived before final shell geometry (${result.width}×${result.height}).`);
      await frame();
      assert(acknowledgements.length === 1, `${label}: an interrupted transition emitted a stale or duplicate acknowledgement.`);
      results.push({ spring, busyMs, reverse, ...result });
    }, Promise.resolve());
    checks.push('busy 180/500ms: spring on/off and cancelled transitions acknowledge only settled geometry');
    return results;
  } finally {
    host.remove();
    if (previousApi) Object.defineProperty(window, 'api', previousApi);
    else Reflect.deleteProperty(window, 'api');
  }
}

window.runIslandTransitionTests = async () => {
  const shellTransitions = await testShellTransitions();
  const busyShellAcknowledgements = await testBusyShellAcknowledgements();
  await testLifecycle();
  await testInterruptions();
  await testPerformanceMode();
  const baselineEnter = await benchmark(false, 'enter');
  const scheduledEnter = await benchmark(true, 'enter');
  const baselineExit = await benchmark(false, 'exit');
  const scheduledExit = await benchmark(true, 'exit');
  reset();
  return { checks, livePages, shellTransitions, busyShellAcknowledgements, passed: checks.length, benchmark: { baselineEnter, scheduledEnter, baselineExit, scheduledExit } };
};
