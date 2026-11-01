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
 * @file actionMenu.tsx
 * @description 操作区的操作列表
 * @author 鸡哥
 */

import { Text } from 'ink';

import { t } from '../../core/i18n';

import type { ActionMenuProps } from '../types/uiTypes';

/**
 * 操作列表
 * @param props - 操作列表入参
 * @param props.actions - 当前可用的操作
 * @param props.activeIndex - 光标所在操作的下标
 * @returns 操作列表与按键提示
 */
export default function ActionMenu({ actions, activeIndex }: ActionMenuProps): React.JSX.Element {
  return (
    <>
      {actions.map((action, index) => (
        <Text key={action} color={index === activeIndex ? 'cyan' : undefined}>
          {`${index === activeIndex ? '❯ ' : '  '}${t(`devCli.dashboard.actions.${action}`)}`}
        </Text>
      ))}
      <Text dimColor wrap="truncate-end">{t('devCli.dashboard.actionsHint')}</Text>
    </>
  );
}
