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
 */

/**
 * @file CliProviderSwitch.tsx
 * @description Claude Code 与 Codex 活动源切换控件。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { CliProvider } from '../../../../../../store/types';

interface CliProviderSwitchProps {
  provider: CliProvider;
  onChange: (provider: CliProvider) => void;
  compact?: boolean;
}

/**
 * 渲染 CLI 活动提供方切换控件
 * @param props - 当前提供方、切换回调和紧凑模式
 * @returns 提供方切换 React 元素
 */
export function CliProviderSwitch({ provider, onChange, compact = false }: CliProviderSwitchProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div
      className={`cli-provider-switch${compact ? ' cli-provider-switch--compact' : ''}`}
      role="group"
      aria-label={t('maxExpand.cli.provider.label')}
    >
      {(['claude', 'codex'] as const).map((item) => (
        <button
          className={`cli-provider-switch-btn${provider === item ? ' active' : ''}`}
          type="button"
          aria-pressed={provider === item}
          key={item}
          onClick={() => onChange(item)}
        >
          {t(`maxExpand.cli.provider.${item}`)}
        </button>
      ))}
    </div>
  );
}