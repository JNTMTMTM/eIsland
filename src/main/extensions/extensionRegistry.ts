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
 * @file extensionRegistry.ts
 * @description 可选扩展元数据注册表
 * @author 鸡哥
 */

import { app } from 'electron';

/** 扩展元数据 */
export interface ExtensionMeta {
  /** 扩展 ID（目录名） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** zip 文件名 */
  zipName: string;
  /** 安装目录名（userData/extensions/ 下） */
  installDir: string;
  /** 安装后是否需要重启 */
  requiredRestart: boolean;
}

/**
 * 获取扩展注册表（需要在 app ready 后调用）
 * @returns 所有可选扩展的元数据列表
 */
export function getExtensionRegistry(): ExtensionMeta[] {
  const version = app.getVersion();
  return [
    {
      id: 'volume-analyzer',
      name: '音频节拍分析器',
      description: '进程级音频频谱分析、振幅检测与 BPM 识别，用于跑马灯节拍特效',
      zipName: `volume-analyzer-v${version}.zip`,
      installDir: 'volume-analyzer',
      requiredRestart: true,
    },
    {
      id: 'volume-helper',
      name: '音量控制助手',
      description: 'Windows 默认播放设备音量查询、控制与监听（Core Audio COM）',
      zipName: `volume-helper-v${version}.zip`,
      installDir: 'volume-helper',
      requiredRestart: true,
    },
    {
      id: 'brightness-helper',
      name: '亮度控制助手',
      description: 'Windows 屏幕亮度查询与控制（WMI / DDC/CI），支持亮度事件监听',
      zipName: `brightness-helper-v${version}.zip`,
      installDir: 'brightness-helper',
      requiredRestart: true,
    },
  ];
}
