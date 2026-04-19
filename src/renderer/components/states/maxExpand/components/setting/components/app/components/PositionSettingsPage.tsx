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
 * @file PositionSettingsPage.tsx
 * @description 设置页面 - 软件设置位置偏移子界面
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type PositionSettingsPageProps = Pick<
  AppSettingsSectionProps,
  | 'islandPositionOffset'
  | 'applyIslandPositionOffset'
  | 'islandPositionInput'
  | 'setIslandPositionInput'
  | 'applyIslandPositionInput'
  | 'islandPositionInputChanged'
  | 'cancelIslandPositionInput'
>;

/**
 * 渲染灵动岛位置设置页面
 * @param islandPositionOffset - 当前灵动岛偏移量
 * @param applyIslandPositionOffset - 按偏移量立即应用位置
 * @param islandPositionInput - 输入框中的偏移量草稿
 * @param setIslandPositionInput - 更新偏移量草稿方法
 * @param applyIslandPositionInput - 应用输入框偏移量
 * @param islandPositionInputChanged - 输入是否有未保存变更
 * @param cancelIslandPositionInput - 取消输入变更
 * @returns 位置设置页面
 */
export function PositionSettingsPage({
  islandPositionOffset,
  applyIslandPositionOffset,
  islandPositionInput,
  setIslandPositionInput,
  applyIslandPositionInput,
  islandPositionInputChanged,
  cancelIslandPositionInput,
}: PositionSettingsPageProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.position.quickAdjustTitle', { defaultValue: '快速微调' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.position.quickAdjustHint', { defaultValue: '每次按钮点击以 10px 步进移动灵动岛位置，立即生效并自动保存。' })}</div>
          </div>
          <div className="settings-hotkey-row">
            <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x - 10, islandPositionOffset.y)}>{t('settings.app.position.moveLeft', { defaultValue: '左移 10' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x + 10, islandPositionOffset.y)}>{t('settings.app.position.moveRight', { defaultValue: '右移 10' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y - 10)}>{t('settings.app.position.moveUp', { defaultValue: '上移 10' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y + 10)}>{t('settings.app.position.moveDown', { defaultValue: '下移 10' })}</button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.position.preciseTitle', { defaultValue: '精确偏移' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.position.preciseHint', { defaultValue: '手动输入水平 / 垂直偏移量（单位 px），回车或点击“应用”后生效。' })}</div>
          </div>
          <div className="settings-hotkey-row">
            <label className="settings-field" style={{ flex: 1 }}>
              <span className="settings-field-label">{t('settings.app.position.xLabel', { defaultValue: '水平偏移 X（px）' })}</span>
              <input
                className="settings-field-input"
                type="number"
                min={-2000}
                max={2000}
                value={islandPositionInput.x}
                onChange={(e) => {
                  setIslandPositionInput((prev) => ({ ...prev, x: e.target.value }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyIslandPositionInput();
                  }
                }}
              />
            </label>
            <label className="settings-field" style={{ flex: 1 }}>
              <span className="settings-field-label">{t('settings.app.position.yLabel', { defaultValue: '垂直偏移 Y（px）' })}</span>
              <input
                className="settings-field-input"
                type="number"
                min={-1200}
                max={1200}
                value={islandPositionInput.y}
                onChange={(e) => {
                  setIslandPositionInput((prev) => ({ ...prev, y: e.target.value }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyIslandPositionInput();
                  }
                }}
              />
            </label>
          </div>
          <div className="settings-hotkey-row">
            <button className="settings-hotkey-btn" type="button" onClick={applyIslandPositionInput} disabled={!islandPositionInputChanged}>{t('settings.app.position.apply', { defaultValue: '应用' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={cancelIslandPositionInput} disabled={!islandPositionInputChanged}>{t('settings.app.position.cancel', { defaultValue: '取消' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(0, 0)}>{t('settings.app.position.resetDefault', { defaultValue: '重置为默认位置' })}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
