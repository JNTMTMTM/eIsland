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
 * @file useSettingsInitialEffects.ts
 * @description 网络、邮箱账户及偏好配置初始化
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { loadNetworkConfig, normalizeStaticAssetNode, saveNetworkConfig } from '../../../../../../store/utils/storage';
import {
  MAIL_ACCOUNTS_STORE_KEY,
  MAIL_CONFIG_STORE_KEY,
  MAIL_FETCH_LIMIT_STORE_KEY,
  generateMailAccountId,
  type MailAccountConfig,
} from '../config/settingsTabConfig';
import type { useSettingsMail } from './useSettingsMail';
import type { useSettingsNavigation } from './useSettingsNavigation';
import type { useSettingsNetwork } from './useSettingsNetwork';

interface SettingsInitialEffectsOptions {
  setNetworkTimeoutMs: ReturnType<typeof useSettingsNetwork>['setNetworkTimeoutMs'];
  setCustomTimeoutInput: ReturnType<typeof useSettingsNetwork>['setCustomTimeoutInput'];
  setStaticAssetNode: ReturnType<typeof useSettingsNetwork>['setStaticAssetNode'];
  isProUser: ReturnType<typeof useSettingsNavigation>['isProUser'];
  setMailAccounts: ReturnType<typeof useSettingsMail>['setMailAccounts'];
  setActiveMailAccountId: ReturnType<typeof useSettingsMail>['setActiveMailAccountId'];
  setMailConfigLoaded: ReturnType<typeof useSettingsMail>['setMailConfigLoaded'];
  mailConfigLoaded: ReturnType<typeof useSettingsMail>['mailConfigLoaded'];
  mailAccounts: ReturnType<typeof useSettingsMail>['mailAccounts'];
  setMailFetchLimit: ReturnType<typeof useSettingsMail>['setMailFetchLimit'];
  mailFetchLimit: ReturnType<typeof useSettingsMail>['mailFetchLimit'];
  staticAssetNode: ReturnType<typeof useSettingsNetwork>['staticAssetNode'];
  networkTimeoutMs: ReturnType<typeof useSettingsNetwork>['networkTimeoutMs'];
}

/**
 * 设置页基础配置加载与子页重置，保留原有依赖数组与卸载清理。
 * @param options - 初始化与同步所需的状态和操作
 * @returns 无返回值
 */
export function useSettingsInitialEffects(options: SettingsInitialEffectsOptions): void {
  const {
    setNetworkTimeoutMs,
    setCustomTimeoutInput,
    setStaticAssetNode,
    isProUser,
    setMailAccounts,
    setActiveMailAccountId,
    setMailConfigLoaded,
    mailConfigLoaded,
    mailAccounts,
    setMailFetchLimit,
    mailFetchLimit,
    staticAssetNode,
    networkTimeoutMs,
  } = options;

  /** 加载网络配置 */
  useEffect(() => {
    const cfg = loadNetworkConfig();
    setNetworkTimeoutMs(cfg.timeoutMs);
    setCustomTimeoutInput(String(cfg.timeoutMs / 1000));
    setStaticAssetNode(normalizeStaticAssetNode(cfg.staticAssetNode, isProUser));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accountsRaw = await window.api.storeRead(MAIL_ACCOUNTS_STORE_KEY);
        if (cancelled) return;
        if (Array.isArray(accountsRaw) && accountsRaw.length > 0) {
          const loaded = (accountsRaw as Partial<MailAccountConfig>[]).map((raw) => ({
            id: typeof raw.id === 'string' && raw.id ? raw.id : generateMailAccountId(),
            label: typeof raw.label === 'string' ? raw.label : '',
            emailAddress: typeof raw.emailAddress === 'string' ? raw.emailAddress : '',
            imapHost: typeof raw.imapHost === 'string' ? raw.imapHost : '',
            imapPort: typeof raw.imapPort === 'string' ? raw.imapPort : '993',
            imapSecure: typeof raw.imapSecure === 'boolean' ? raw.imapSecure : true,
            authUser: typeof raw.authUser === 'string' ? raw.authUser : '',
            authSecret: typeof raw.authSecret === 'string' ? raw.authSecret : '',
          }));
          setMailAccounts(loaded);
          setActiveMailAccountId(loaded[0].id);
          setMailConfigLoaded(true);
          return;
        }
        const legacyRaw = await window.api.storeRead(MAIL_CONFIG_STORE_KEY);
        if (cancelled) return;
        if (legacyRaw && typeof legacyRaw === 'object' && !Array.isArray(legacyRaw)) {
          const legacy = legacyRaw as Record<string, unknown>;
          if (typeof legacy.imapHost === 'string' && legacy.imapHost.trim()) {
            const migrated: MailAccountConfig = {
              id: generateMailAccountId(),
              label: typeof legacy.emailAddress === 'string' ? legacy.emailAddress : '',
              emailAddress: typeof legacy.emailAddress === 'string' ? legacy.emailAddress : '',
              imapHost: typeof legacy.imapHost === 'string' ? legacy.imapHost : '',
              imapPort: typeof legacy.imapPort === 'string' ? legacy.imapPort : '993',
              imapSecure: typeof legacy.imapSecure === 'boolean' ? legacy.imapSecure : true,
              authUser: typeof legacy.authUser === 'string' ? legacy.authUser : '',
              authSecret: typeof legacy.authSecret === 'string' ? legacy.authSecret : '',
            };
            setMailAccounts([migrated]);
            setActiveMailAccountId(migrated.id);
            setMailConfigLoaded(true);
            return;
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setMailConfigLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mailConfigLoaded) return;
    window.api.storeWrite(MAIL_ACCOUNTS_STORE_KEY, mailAccounts).catch(() => { });
  }, [mailConfigLoaded, mailAccounts]);

  useEffect(() => {
    window.api.storeRead(MAIL_FETCH_LIMIT_STORE_KEY).then((value) => {
      if (typeof value === 'number' && value >= 1 && value <= 30) setMailFetchLimit(value);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!mailConfigLoaded) return;
    window.api.storeWrite(MAIL_FETCH_LIMIT_STORE_KEY, mailFetchLimit).catch(() => { });
  }, [mailConfigLoaded, mailFetchLimit]);

  useEffect(() => {
    const normalized = normalizeStaticAssetNode(staticAssetNode, isProUser);
    if (normalized === staticAssetNode) {
      return;
    }
    setStaticAssetNode(normalized);
    saveNetworkConfig({ timeoutMs: networkTimeoutMs, staticAssetNode: normalized });
  }, [isProUser, staticAssetNode, networkTimeoutMs]);
}
