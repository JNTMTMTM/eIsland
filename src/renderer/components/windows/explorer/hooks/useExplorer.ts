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
 * @file useExplorer.ts
 * @description 协调文件管理器的导航历史、目录快照和操作。
 * @author 鸡哥
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EXPLORER_PAGE_SIZE from '../config/explorerConfig';
import type { DialogAction, ExplorerDirectory, ExplorerEntry, ExplorerPlace, ExplorerTransfer, TransferAction, UseExplorerReturn } from '../types/explorerTypes';

/**
 * 只在目录读取成功后提交路径和历史，失败时可继续使用先前的目录。
 * @returns 当前窗口的文件管理状态。
 */
export default function useExplorer(): UseExplorerReturn {
  const { i18n } = useTranslation();
  const [places, setPlaces] = useState<ExplorerPlace[]>([]);
  const [directory, setDirectory] = useState<ExplorerDirectory | null>(null);
  const [address, setAddress] = useState('');
  const [history, setHistory] = useState({ paths: [] as string[], index: -1 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const writing = useRef(false);
  const revision = useRef(0);
  const currentPath = useRef('');
  const [error, setError] = useState('');
  const [selection, select] = useState<ExplorerEntry | null>(null);
  const [query, updateQuery] = useState('');
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const [name, setName] = useState('');
  const [transfer, setTransfer] = useState<ExplorerTransfer | null>(null);
  const [page, changePage] = useState(0);

  const read = useCallback(async (path: string, historyIndex?: number, preserveQuery = false) => {
    const id = ++revision.current;
    setLoading(true);
    setError('');
    try {
      const next = await window.desktop.invoke<ExplorerDirectory>('explorer:list', path);
      if (id !== revision.current) return;
      currentPath.current = next.path;
      setDirectory(next);
      setAddress(next.path);
      select(null);
      changePage(0);
      if (!preserveQuery) updateQuery('');
      setHistory((previous) => {
        if (historyIndex !== undefined) return { ...previous, index: historyIndex };
        if (previous.paths[previous.index] === next.path) return previous;
        const paths = [...previous.paths.slice(0, previous.index + 1), next.path];
        return { paths, index: paths.length - 1 };
      });
    } catch (reason) {
      if (id === revision.current) {
        if (currentPath.current) setAddress(currentPath.current);
        setError(String(reason));
      }
    } finally {
      if (id === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialRevision = revision.current;
    async function start() {
      try {
        const available = await window.desktop.invoke<ExplorerPlace[]>('explorer:locations');
        if (!active) return;
        setPlaces(available);
        if (revision.current === initialRevision) {
          if (available[0]) await read(available[0].path);
          else setLoading(false);
        }
      } catch (reason) {
        if (active) { setError(String(reason)); setLoading(false); }
      }
    }
    // eslint-disable-next-line promise/prefer-await-to-then -- React 效果同步返回清理函数。
    start().catch((reason: unknown) => { if (active) setError(String(reason)); });
    return () => { active = false; revision.current += 1; };
  }, [read]);

  const busy = working || loading;
  const filtered = useMemo(() => {
    const collator = new Intl.Collator(i18n.language, { numeric: true, sensitivity: 'base' });
    const term = query.trim().toLocaleLowerCase();
    return (directory?.entries ?? []).filter((e) => e.name.toLocaleLowerCase().includes(term))
      .sort((a, b) => Number(b.directory) - Number(a.directory) || collator.compare(a.name, b.name));
  }, [directory, query, i18n.language]);

  async function navigate(path: string) {
    if (writing.current || dialog || !path.trim()) return;
    await read(path.trim());
  }
  async function travel(offset: number) {
    const index = history.index + offset;
    if (!busy && !dialog && history.paths[index]) await read(history.paths[index], index);
  }
  async function refresh() {
    if (!busy && !dialog && directory) await read(directory.path, history.index, true);
  }
  async function open(entry: ExplorerEntry) {
    if (busy || dialog) return;
    if (entry.directory) { await navigate(entry.path); return; }
    try { setError(''); await window.api.openFile(entry.path); }
    catch (reason) { setError(String(reason)); }
  }
  function showDialog(action: DialogAction | null) {
    if (busy || (action && !directory) || ((action === 'rename' || action === 'trash') && !selection)) return;
    setName(action === 'rename' && selection ? selection.name : '');
    setError('');
    setDialog(action);
  }
  async function apply(channel: string, source: string, arg?: string) {
    if (writing.current || !directory || loading) return;
    writing.current = true;
    setWorking(true);
    setError('');
    try {
      await window.desktop.invoke(channel, source, ...(arg === undefined ? [] : [arg]));
      setDialog(null);
      if (channel === 'explorer:move' || (transfer?.entry.path === source && (channel === 'explorer:trash' || channel === 'explorer:rename'))) setTransfer(null);
      await read(directory.path, history.index, true);
    } catch (reason) {
      setError(String(reason));
    } finally {
      writing.current = false;
      setWorking(false);
    }
  }
  async function confirm() {
    if (dialog === 'create' && directory && name.trim()) await apply('explorer:create', directory.path, name);
    if (dialog === 'rename' && selection && name.trim()) await apply('explorer:rename', selection.path, name);
    if (dialog === 'trash' && selection) await apply('explorer:trash', selection.path);
  }
  function prepare(action: TransferAction) {
    if (!busy && selection && !dialog) { setTransfer({ action, entry: selection }); setError(''); }
  }
  async function paste() {
    if (transfer && directory && !busy && !dialog) await apply(`explorer:${transfer.action}`, transfer.entry.path, directory.path);
  }
  // DOM 事件同步返回，统一收敛未预期的异步失败。
  function action<T extends unknown[]>(handler: (...args: T) => Promise<void>) {
    return (...args: T) => {
      // eslint-disable-next-line promise/prefer-await-to-then -- 事件回调不能把拒绝泄露给 WebView。
      handler(...args).catch((reason: unknown) => setError(String(reason)));
    };
  }
  return {
    places, directory, address, setAddress, busy, error, selection, select, query, dialog,
    showDialog, name, setName, transfer, prepare, page,
    navigate: action(navigate),
    travel: action(travel),
    refresh: action(refresh),
    open: action(open),
    confirm: action(confirm),
    paste: action(paste),
    back: history.index > 0,
    forward: history.index + 1 < history.paths.length,
    entries: filtered.slice(page * EXPLORER_PAGE_SIZE, (page + 1) * EXPLORER_PAGE_SIZE),
    pages: Math.ceil(filtered.length / EXPLORER_PAGE_SIZE),
    total: filtered.length,
    setQuery(value) { updateQuery(value); changePage(0); select(null); },
    changePage(value) { changePage(value); select(null); },
  };
}
