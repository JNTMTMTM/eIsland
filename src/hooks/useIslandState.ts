/**
 * @file useIslandState.ts
 * @description 灵动岛状态管理 Hook，封装展开/收起、窗口尺寸更新、内容设置等操作
 * @author 鸡哥
 */

import { useCallback } from 'react';
import { useIslandStore } from '../stores/useIslandStore';
import type { IslandView, IslandContent } from '../types/island';

/**
 * 灵动岛状态管理 Hook，封装展开/收起、窗口尺寸更新、内容设置等操作
 * @returns 状态值、setter 方法及快捷操作函数（expand / collapse / toggle）
 */
export function useIslandState() {
  const {
    view,
    expanded,
    height,
    width,
    position,
    opacity,
    content,
    setView,
    setExpanded,
    setHeight,
    setWidth,
    setPosition,
    setOpacity,
    setContent,
    clearContent,
  } = useIslandStore();

  const expand = useCallback(async () => {
    const newHeight = 400;
    setExpanded(true);
    setView('expanded');
    setHeight(newHeight);
    setWidth(600);

    try {
      if (window.electronAPI) {
        await window.electronAPI.updateIslandState({ expanded: true, height: newHeight });
      }
    } catch (error) {
      console.error('Failed to update island state:', error);
    }
  }, [setExpanded, setView, setHeight, setWidth]);

  const collapse = useCallback(async () => {
    const compactHeight = 80;
    setExpanded(false);
    setView('compact');
    setHeight(compactHeight);
    setWidth(300);

    try {
      if (window.electronAPI) {
        await window.electronAPI.updateIslandState({ expanded: false, height: compactHeight });
      }
    } catch (error) {
      console.error('Failed to update island state:', error);
    }
  }, [setExpanded, setView, setHeight, setWidth]);

  const toggle = useCallback(() => {
    if (expanded) {
      collapse();
    } else {
      expand();
    }
  }, [expanded, expand, collapse]);

  const setIslandContent = useCallback(
    (newContent: IslandContent) => {
      setContent(newContent);
      if (newContent.type !== 'notification') {
        expand();
      }
    },
    [setContent, expand],
  );

  const minimizeToTray = useCallback(async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.minimizeToTray();
      }
    } catch (error) {
      console.error('Failed to minimize to tray:', error);
    }
  }, []);

  return {
    view,
    expanded,
    height,
    width,
    position,
    opacity,
    content,
    setView,
    setExpanded,
    setHeight,
    setWidth,
    setPosition,
    setOpacity,
    setIslandContent,
    clearContent,
    expand,
    collapse,
    toggle,
    minimizeToTray,
  };
}
