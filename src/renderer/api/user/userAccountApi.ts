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
 * @file userAccountApi.ts
 * @description 用户账号网络接口兼容导出入口。
 *              具体实现已拆分到同目录下的按职责模块：
 *              - userAccountApi.client.ts（通用请求与头处理）
 *              - userAccountApi.auth.ts（登录/注册/验证码）
 *              - userAccountApi.profile.ts（资料/密码/头像）
 *              - userAccountApi.feedback.ts（问题反馈）
 *              - userAccountApi.wallpaper.ts（壁纸市场）
 *              - userAccountApi.types.ts（类型定义）
 * @author 鸡哥
 */

export * from './userAccountApi.types';
export { USER_ACCOUNT_API_BASE } from './userAccountApi.client';
export * from './userAccountApi.auth';
export * from './userAccountApi.profile';
export * from './userAccountApi.feedback';
export * from './userAccountApi.wallpaper';
export * from './userAccountApi.payment';
