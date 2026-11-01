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
 * @file welcome.tsx
 * @description 交互模式的欢迎界面：居中展示 eIsland 字符画，Enter 进入任务界面
 * @author 鸡哥
 */

import { Box, Text, useInput, useWindowSize } from 'ink';

import pkg from '../../package.json';
import { t } from '../core/i18n';

/** 欢迎界面属性 */
interface WelcomeProps {
  /** 按 Enter 进入任务界面 */
  onEnter: () => void;
  /** 按 Esc 或 Ctrl+C 退出 */
  onQuit: () => void;
}

/** 字符画行与对应颜色，自上而下渐变 */
export const LOGO_LINES = [
  { id: 'top', color: 'cyanBright', text: '███████╗██╗███████╗██╗      █████╗ ███╗   ██╗██████╗ ' },
  { id: 'upper', color: 'cyanBright', text: '██╔════╝██║██╔════╝██║     ██╔══██╗████╗  ██║██╔══██╗' },
  { id: 'middle', color: 'cyan', text: '█████╗  ██║███████╗██║     ███████║██╔██╗ ██║██║  ██║' },
  { id: 'lower', color: 'cyan', text: '██╔══╝  ██║╚════██║██║     ██╔══██║██║╚██╗██║██║  ██║' },
  { id: 'base', color: 'blueBright', text: '███████╗██║███████║███████╗██║  ██║██║ ╚████║██████╔╝' },
  { id: 'shadow', color: 'blue', text: '╚══════╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ' },
] as const;
const LOGO_WIDTH = LOGO_LINES[0].text.length;
// ink-testing-library 等非终端输出流不提供 rows。
const FALLBACK_ROWS = 24;

/**
 * 欢迎界面
 * @description 终端宽度不足以容纳字符画时退化为纯文本标题，避免折行错位
 * @param props - 欢迎界面属性
 * @param props.onEnter - 进入任务界面回调
 * @param props.onQuit - 退出回调
 * @returns 全屏居中的欢迎界面
 */
export default function Welcome({ onEnter, onQuit }: WelcomeProps): React.JSX.Element {
  const { columns, rows } = useWindowSize();

  useInput((input, key) => {
    if (key.return) {
      onEnter();
    } else if (key.escape || (key.ctrl && input === 'c')) {
      onQuit();
    }
  });

  return (
    <Box flexDirection="column" width={columns} height={rows || FALLBACK_ROWS} alignItems="center" justifyContent="center">
      {columns > LOGO_WIDTH ? (
        LOGO_LINES.map((line) => <Text key={line.id} color={line.color}>{line.text}</Text>)
      ) : (
        <Text bold color="cyan">eIsland</Text>
      )}
      <Box marginTop={1}>
        <Text>
          <Text bold>{t('welcome.subtitle')}</Text>
          <Text dimColor>{`  v${pkg.version}`}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="cyan">{t('welcome.hint')}</Text>
      </Box>
    </Box>
  );
}
