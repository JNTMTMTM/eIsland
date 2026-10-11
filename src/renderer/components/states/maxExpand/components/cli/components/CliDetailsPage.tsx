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
/** @file CliDetailsPage.tsx
 * @description 仅在展开期间读取一页外部详情，翻页替换正文而不累积大输出。
 * @author 鸡哥
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { TFunction } from '../types/types';
type CliDetailPage = Awaited<ReturnType<Window['api']['codexEventDetail']>>;

/** 展开一条事件时装载 64 KiB 页面；关闭后组件卸载并释放正文。 */
export function CliDetailsPage({ id, provider, revision = 0, t }: { id: string; revision?: number; provider: 'claude' | 'codex'; t: TFunction }): ReactElement {
  const [offsets, setOffsets] = useState([0]);
  const [page, setPage] = useState<CliDetailPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const offset = offsets[offsets.length - 1];
  useEffect(() => {
    let cancelled = false;
    setPage(null); setFailed(false);
    const read = provider === 'codex' ? window.api.codexEventDetail : window.api.claudeCodeEventDetail;
    void read(id, offset).then((result) => { if (!cancelled) setPage(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [id, provider, revision, offset, retry]);
  return (
    <div className="cli-event-card-detail-item">
      {page ? <pre>{page.text}</pre> : <span>{t(failed ? 'maxExpand.cli.detailUnavailable' : 'maxExpand.cli.detailLoading')}</span>}
      {failed && <button type="button" onClick={() => setRetry((value) => value + 1)}>{t('maxExpand.cli.detailRetry')}</button>}
      <div>
        <button type="button" disabled={offsets.length === 1} onClick={() => setOffsets((values) => values.slice(0, -1))}>{t('maxExpand.cli.detailPrevious')}</button>
        <span> {offsets.length} </span>
        <button type="button" disabled={!page || page.nextOffset === null} onClick={() => {
          if (page?.nextOffset !== null && page?.nextOffset !== undefined) setOffsets((values) => [...values, page.nextOffset!]);
        }}>{t('maxExpand.cli.detailNext')}</button>
      </div>
    </div>
  );
}
