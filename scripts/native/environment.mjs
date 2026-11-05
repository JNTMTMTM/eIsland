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
 * @file environment.mjs
 * @description 限制签名私钥仅传递给签名构建子进程。
 * @author 鸡哥
 */
/** Remove updater signing secrets without mutating the caller's environment.
 * @param env - Build or test process environment.
 * @returns Child environment for native apps, verifiers and upload tools.
 */
export default function withoutSigningSecrets(env) {
  const result = { ...env };
  delete result.TAURI_SIGNING_PRIVATE_KEY;
  delete result.TAURI_SIGNING_PRIVATE_KEY_PATH;
  delete result.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  return result;
}
