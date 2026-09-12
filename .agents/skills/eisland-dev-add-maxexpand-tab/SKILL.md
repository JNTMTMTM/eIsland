---
name: eisland-dev-add-maxexpand-tab
description: >
  为 eIsland 灵动岛的 MaxExpand（全展开）模式添加一个新的 Tab 页面。当用户要求创建新的
  MaxExpand 页面、添加全展开界面组件（如计算器、时钟、天气面板、便签、日历等）时使用此 skill。
  即使用户只说"新建一个 maxexpand 界面"、"加个全展开页面"、"在 maxexpand 里加个 XX"，
  也应触发。此 skill 覆盖从类型注册、设置配置、懒加载/即时加载渲染到 i18n 国际化的全部 8 个
  修改点，确保新 Tab 完整可用且可在设置中拖拽排序与切换可见性。
---

# eIsland: 添加 MaxExpand Tab 页面

为灵动岛的全展开（MaxExpand）模式添加一个新的 Tab 页面。

## 前置确认

在开始前，向用户确认以下信息：

1. **Tab 名称** — kebab-case 目录名（如 `calculator`、`weather`、`calendar`）
2. **Tab 显示名** — 中文标签（如 `计算器`、`天气`、`日历`），用于设置界面和 i18n
3. **内容策略** — 选择一种：
   - `placeholder`（默认）— 创建空占位组件，后续填充
   - `skeleton` — 带基本骨架布局的占位组件

## 目录结构

每个 MaxExpand Tab 遵循统一的模块结构：

```
src/renderer/components/states/maxExpand/components/<tabName>/
├── index.ts                          # 模块入口，导出 Tab 组件
└── components/
    └── <TabName>Tab.tsx              # Tab 主组件
```

## 实现步骤

### Step 1: 创建 Tab 组件

**1a.** 创建目录和组件文件：

`src/renderer/components/states/maxExpand/components/<tabName>/components/<TabName>Tab.tsx`

```tsx
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
 * @file <TabName>Tab.tsx
 * @description 最大展开模式 — <中文描述> Tab — 占位组件（内容留白）
 * @author 鸡哥
 */

import type { ReactElement } from 'react';

/**
 * <TabName> Tab — 最大展开模式下的<中文描述>面板（占位）
 */
export function <TabName>Tab(): ReactElement {
  return <div className="max-expand-tab-panel <tabName>-panel" />;
}
```

**1b.** 创建模块入口 `index.ts`：

```ts
/*
 * eIsland - ...（标准 GPL-3.0 头部）
 */

/**
 * @file index.ts
 * @description <中文描述>模块入口，导出 <TabName>Tab 组件
 * @author 鸡哥
 */

export { <TabName>Tab } from './components/<TabName>Tab';
```

### Step 2: 注册类型

**文件：** `src/renderer/store/types/index.ts`

在 `MaxExpandTab` 联合类型中添加新 Tab ID（放在 `'settings'` 之前）：

```typescript
export type MaxExpandTab = '...' | '<tabName>' | 'settings';
```

### Step 3: 注册设置配置

**文件：** `src/renderer/components/states/maxExpand/components/setting/utils/settingsConfig.ts`

**3a.** 在 `MAXEXPAND_CONFIGURABLE_TABS` 数组末尾添加：
```typescript
export const MAXEXPAND_CONFIGURABLE_TABS: string[] = [
  // ... 已有项
  '<tabName>',
];
```

**3b.** 在 `MAXEXPAND_TAB_LABELS` 对象中添加：
```typescript
export const MAXEXPAND_TAB_LABELS: Record<string, string> = {
  // ... 已有项
  <tabName>: '<中文标签>',
};
```

### Step 4: 注册懒加载渲染

**文件：** `src/renderer/components/states/maxExpand/MaxExpandContentLazy.tsx`

**4a.** 添加 lazy import（与其他 Tab 放在一起）：
```typescript
const <TabName>Tab = lazy(() => import('./components/<tabName>').then((module) => ({ default: module.<TabName>Tab })));
```

**4b.** 在 `renderLazyActiveTab` 函数的条件链中添加（放在 `settings` 之前）：
```typescript
if (activeTab === '<tabName>') content = <<TabName>Tab />;
```

### Step 5: 注册即时加载渲染

**文件：** `src/renderer/components/states/maxExpand/MaxExpandContentEager.tsx`

**5a.** 添加 import：
```typescript
import { <TabName>Tab } from './components/<tabName>';
```

**5b.** 在 `renderEagerActiveTab` 函数的条件链中添加（放在 `settings` 之前）：
```typescript
if (activeTab === '<tabName>') return <<TabName>Tab />;
```

### Step 6: 添加 i18n 翻译

在两个语言文件的 `settings.app.maxExpandLayout.tabLabels` 对象中添加条目：

**`i18n/zh-CN.json`：**
```json
"<tabName>": "<中文标签>"
```

**`i18n/en-US.json`：**
```json
"<tabName>": "<English Label>"
```

### Step 7: 验证

```bash
npx tsc --noEmit --skipLibCheck
```

## 文件清单

完成所有步骤后，验证以下文件已被修改：

- [ ] `components/states/maxExpand/components/<tabName>/index.ts` — **新文件**
- [ ] `components/states/maxExpand/components/<tabName>/components/<TabName>Tab.tsx` — **新文件**
- [ ] `store/types/index.ts` — MaxExpandTab 类型
- [ ] `components/states/maxExpand/components/setting/utils/settingsConfig.ts` — CONFIGURABLE_TABS + TAB_LABELS
- [ ] `components/states/maxExpand/MaxExpandContentLazy.tsx` — 懒加载注册
- [ ] `components/states/maxExpand/MaxExpandContentEager.tsx` — 即时加载注册
- [ ] `i18n/zh-CN.json` — 中文翻译
- [ ] `i18n/en-US.json` — 英文翻译

## 注意事项

- Tab ID 必须放在 `MaxExpandTab` 联合类型的 `'settings'` 之前，因为渲染逻辑中 `settings` 通常作为兜底条件。
- `MAXEXPAND_CONFIGURABLE_TABS` 中的顺序决定了默认导航排列顺序，新 Tab 默认追加到末尾。
- 懒加载和即时加载两种模式都必须注册，否则在对应性能模式下新页面不会渲染。
- 组件使用 `max-expand-tab-panel` 作为通用容器类名，与已有 Tab 保持一致。
