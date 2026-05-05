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
 * @file getWindowsSoftwares.ts
 * @description 本地测试脚本：读取并打印 Windows 已安装软件列表。
 * @author 鸡哥
 */

const { getAllInstalledSoftware } = require('fetch-installed-software') as {
  getAllInstalledSoftware: () => Promise<Array<Record<string, string>>>;
};

interface InstalledApp {
  name: string;
  version: string;
  publisher: string;
  installDate: string;
  installLocation: string;
}

async function main(): Promise<void> {
  console.log('[test] 正在获取已安装程序列表...\n');
  const startedAt = Date.now();

  const rawList: Array<Record<string, string>> = await getAllInstalledSoftware();

  const apps: InstalledApp[] = rawList
    .filter((item) => item.DisplayName)
    .map((item) => ({
      name: item.DisplayName || '',
      version: item.DisplayVersion || '',
      publisher: item.Publisher || '',
      installDate: item.InstallDate || '',
      installLocation: item.InstallLocation || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const elapsed = Date.now() - startedAt;
  console.log(`[test] 共找到 ${apps.length} 个已安装程序 (耗时 ${elapsed}ms)\n`);

  // 打印前 20 个
  apps.slice(0, 20).forEach((app, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${app.name} ${app.version ? `(${app.version})` : ''} ${app.publisher ? `- ${app.publisher}` : ''}`);
  });

  if (apps.length > 20) {
    console.log(`  ... 还有 ${apps.length - 20} 个程序未显示`);
  }

  // 测试过滤
  const filter = 'Microsoft';
  const filtered = apps.filter((a) => a.name.includes(filter) || a.publisher.includes(filter));
  console.log(`\n[test] 过滤 "${filter}": 匹配 ${filtered.length} 个程序`);
  filtered.slice(0, 10).forEach((app, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${app.name} (${app.version})`);
  });
}

main().catch((err) => {
  console.error('[test] 失败:', err);
  process.exit(1);
});
