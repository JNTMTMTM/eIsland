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
 * @file qweatherTest.ts
 * @description QWeather Pro 接口联调脚本
 * @author 鸡哥
 */

import fs from 'node:fs';
import path from 'node:path';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface ApiResponse {
  code?: number;
  message?: string;
  data?: JsonValue;
}

const APP_NAME_HEADER = 'X-App-Name';
const CLIENT_VERSION_HEADER = 'X-Client-Version';

function loadDotEnv(filePath: string): void {
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function resolveClientVersion(baseUrl: string, appName: string): Promise<string> {
  const fromEnv = process.env.CLIENT_VERSION?.trim();
  if (fromEnv) return fromEnv;

  const versionUrl = `${baseUrl}/v1/version?appName=${encodeURIComponent(appName)}`;
  const res = await fetch(versionUrl, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch latest version: HTTP ${res.status}. You can set CLIENT_VERSION in .env`);
  }
  const payload = await res.json() as { code?: number; data?: { version?: string } };
  const version = payload?.code === 200 ? payload?.data?.version : undefined;
  if (!version || typeof version !== 'string') {
    throw new Error('Failed to parse latest version from /v1/version. You can set CLIENT_VERSION in .env');
  }
  return version.trim();
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

async function requestJson(url: string, token: string, headers?: Record<string, string>): Promise<{ status: number; body: ApiResponse | string }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(headers ?? {}),
    },
  });

  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) as ApiResponse };
  } catch {
    return { status: res.status, body: text };
  }
}

async function main(): Promise<void> {
  loadDotEnv(path.resolve(process.cwd(), '.env'));
  loadDotEnv(path.resolve(process.cwd(), '..', '.env'));

  const baseUrl = optionalEnv('BASE_URL', 'http://127.0.0.1:8080/api');
  const token = requiredEnv('TOKEN');
  const appName = optionalEnv('APP_NAME', 'eisland');
  const clientVersion = await resolveClientVersion(baseUrl, appName);
  const location = optionalEnv('LOCATION', '116.41,39.92');
  const lang = optionalEnv('WEATHER_LANG', 'zh');
  const unit = optionalEnv('UNIT', 'm');

  const dailyUrl = `${baseUrl}/v1/user/weather/daily-3d?location=${encodeURIComponent(location)}&lang=${encodeURIComponent(lang)}&unit=${encodeURIComponent(unit)}`;
  const alertsUrl = `${baseUrl}/v1/user/weather/alerts?location=${encodeURIComponent(location)}&lang=${encodeURIComponent(lang)}`;

  const commonHeaders = {
    [APP_NAME_HEADER]: appName,
    [CLIENT_VERSION_HEADER]: clientVersion,
  };

  console.log('=== QWeather Pro API Test ===');
  console.log(`BASE_URL: ${baseUrl}`);
  console.log(`APP_NAME: ${appName}`);
  console.log(`CLIENT_VERSION: ${clientVersion}`);
  console.log(`LOCATION: ${location}`);
  console.log(`WEATHER_LANG: ${lang}, UNIT: ${unit}`);

  console.log('\n[1/2] Test daily-3d');
  const daily = await requestJson(dailyUrl, token, commonHeaders);
  console.log(`HTTP ${daily.status}`);
  console.log(typeof daily.body === 'string' ? daily.body : JSON.stringify(daily.body, null, 2));

  console.log('\n[2/2] Test alerts');
  const alerts = await requestJson(alertsUrl, token, commonHeaders);
  console.log(`HTTP ${alerts.status}`);
  console.log(typeof alerts.body === 'string' ? alerts.body : JSON.stringify(alerts.body, null, 2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[test] failed:', message);
  process.exitCode = 1;
});

