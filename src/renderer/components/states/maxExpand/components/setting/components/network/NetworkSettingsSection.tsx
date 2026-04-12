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

import type { ReactElement } from 'react';

interface NetworkSettingsSectionProps {
  networkTimeoutMs: number;
  customTimeoutInput: string;
  networkTimeoutOptions: Array<{ label: string; value: number }>;
  setNetworkTimeoutMs: (v: number) => void;
  setCustomTimeoutInput: (v: string) => void;
  saveNetworkConfig: (config: { timeoutMs: number }) => void;
}

export function NetworkSettingsSection({
  networkTimeoutMs,
  customTimeoutInput,
  networkTimeoutOptions,
  setNetworkTimeoutMs,
  setCustomTimeoutInput,
  saveNetworkConfig,
}: NetworkSettingsSectionProps): ReactElement {
  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">网络配置</div>
      <div className="settings-music-section">
        <div className="settings-music-label">请求超时时间</div>
        <div className="settings-music-hint">设置网络请求的最长等待时间，网络较差时可适当增大</div>
        <div className="settings-network-timeout-row">
          <div className="settings-lyrics-source-options">
            {networkTimeoutOptions.map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${networkTimeoutMs === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setNetworkTimeoutMs(opt.value);
                  setCustomTimeoutInput(String(opt.value / 1000));
                  saveNetworkConfig({ timeoutMs: opt.value });
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className={`settings-network-custom${networkTimeoutOptions.every(o => o.value !== networkTimeoutMs) ? ' active' : ''}`}>
            <input
              className="settings-network-custom-input"
              type="number"
              min="1"
              max="120"
              value={customTimeoutInput}
              onChange={(e) => setCustomTimeoutInput(e.target.value)}
              onBlur={() => {
                const sec = parseFloat(customTimeoutInput);
                if (!isNaN(sec) && sec >= 1) {
                  const ms = Math.round(sec * 1000);
                  setNetworkTimeoutMs(ms);
                  saveNetworkConfig({ timeoutMs: ms });
                } else {
                  setCustomTimeoutInput(String(networkTimeoutMs / 1000));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
            <span className="settings-network-custom-unit">秒</span>
          </div>
        </div>
      </div>
    </div>
  );
}
