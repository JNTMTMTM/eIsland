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
 * @file useSettingsNetwork.ts
 * @description 网络超时与静态资源节点配置状态
 * @author 鸡哥
 */

import { useMemo, useState } from 'react';
import {
  DEFAULT_NETWORK_TIMEOUT_MS,
  DEFAULT_STATIC_ASSET_NODE_FREE,
  type StaticAssetNode,
} from '../../../../../../store/utils/storage';

/**
 * 网络超时与静态资源节点配置状态。
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsNetwork() {
  /** 网络配置相关状态 */
  const [networkTimeoutMs, setNetworkTimeoutMs] = useState<number>(DEFAULT_NETWORK_TIMEOUT_MS);
  const [customTimeoutInput, setCustomTimeoutInput] = useState<string>('');
  const [staticAssetNode, setStaticAssetNode] = useState<StaticAssetNode>(DEFAULT_STATIC_ASSET_NODE_FREE);
  const staticAssetNodeOptions = useMemo<Array<{ label: string; value: StaticAssetNode; proOnly?: boolean; }>>(() => ([
    { label: 'Cloudflare R2', value: 'r2' },
    { label: 'Tencent COS', value: 'cos', proOnly: true },
    { label: 'Aliyun OSS', value: 'oss', proOnly: true },
  ]), []);

  return {
    networkTimeoutMs,
    setNetworkTimeoutMs,
    customTimeoutInput,
    setCustomTimeoutInput,
    staticAssetNode,
    setStaticAssetNode,
    staticAssetNodeOptions,
  };
}
