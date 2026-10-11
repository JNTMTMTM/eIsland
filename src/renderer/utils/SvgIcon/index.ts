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
 * @file index.ts
 * @description SvgIcon 统一入口
 * @author 鸡哥
 */

export { SvgIcon, normalizeSvgIconPath } from './eisland-icon';
export type { SvgIconKey } from './eisland-icon';

export {
  DevIcon,
  DEVICON_LANGUAGE_ALIASES,
  resolveDevIconLanguage,
  resolveDevIconByLanguage,
  resolveDevIconByFileName,
} from './dev-icon';
export type { DevIconKey } from './dev-icon';

export { AgentIcon } from './agent-icon';
export type { AgentIconKey } from './agent-icon';

export { PlayerIcon } from './player-icon';
export type { PlayerIconKey } from './player-icon';

export { ServiceIcon } from './service-icon';
export type { ServiceIconKey } from './service-icon';

export { CalculatorIcon } from './calculator-icon';
export type { CalculatorIconKey } from './calculator-icon';
