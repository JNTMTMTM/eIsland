---
name: eisland-dev-add-guide-step
description: |
  创建 eIsland 引导配置窗口的新步骤页面。当用户要求在引导界面（Guide）中新增配置步骤、引导页面、引导分页时使用此 skill。
  触发关键词：guide 步骤、引导页面、引导分页、Guide step、新建引导页、添加引导配置。
  适用于 src/renderer/components/components/ 目录下的 Guide 模块。
---

# Guide Step — 引导配置步骤创建

## 概述

eIsland 引导配置窗口采用分步架构，每个步骤是一个独立模块，位于 `src/renderer/components/components/Guide/<stepName>/`。

## 目录结构

每个步骤模块必须包含以下子目录（参考已有的 `language` 和 `smtc` 步骤）：

```
Guide/<stepName>/
├── index.ts                    # 公共导出（仅导出主组件）
├── components/<StepName>.tsx   # 步骤组件
├── config/<stepName>Config.ts  # 常量配置
├── hooks/use<StepName>.ts      # 逻辑 Hook
├── types/index.ts              # 类型定义（Props 等）
└── utils/                      # 工具函数（可为空占位）
```

## 创建步骤

### 1. 创建目录与文件

在 `src/renderer/components/components/Guide/<stepName>/` 下创建完整模块结构。

### 2. 类型定义 (`types/index.ts`)

所有步骤组件必须接受 `StepProps`，包含 `onNext` 和 `onPrev` 回调：

```typescript
export interface XxxStepProps {
  onNext: () => void;
  onPrev: () => void;
}
```

### 3. Hook (`hooks/useXxx.ts`)

将业务逻辑抽离到 Hook 中，组件只负责渲染。Hook 返回状态和操作函数。

### 4. 组件 (`components/XxxStep.tsx`)

组件使用标准布局结构：

```tsx
export function XxxStep({ onNext, onPrev }: XxxStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="guide-step">
      <div className="guide-step-header">
        <h2>{t('guide.xxx.title')}</h2>
        <p>{t('guide.xxx.subtitle')}</p>
      </div>
      {/* 步骤内容区域 */}
      <div className="guide-xxx-content">
        {/* ... */}
      </div>
      <div className="guide-step-footer">
        <button className="guide-prev-btn" onClick={onPrev}>
          {t('guide.actions.prev')}
        </button>
        <button className="guide-next-btn" onClick={onNext}>
          {t('guide.actions.next')}
        </button>
      </div>
    </div>
  );
}
```

### 5. 公共导出 (`index.ts`)

```typescript
export { XxxStep } from './components/XxxStep';
```

### 6. i18n 翻译

在 `i18n/zh-CN.json` 和 `i18n/en-US.json` 的 `guide` 对象下添加步骤翻译键：

```json
{
  "guide": {
    "xxx": {
      "title": "中文标题",
      "subtitle": "中文副标题"
    }
  }
}
```

所有用户可见文案必须使用 `t()` 包裹，禁止硬编码。

### 7. CSS 样式

在 `src/renderer/styles/guide/<stepName>.css` 中编写步骤专属样式，然后在 `src/renderer/styles/guide.css` 入口中添加 `@import`：

```css
@import './guide/<stepName>.css';
```

样式命名规范：`.guide-<stepName>-*`，按钮复用 `.guide-next-btn` 和 `.guide-prev-btn`。

### 8. 接入引导流程

在 `src/renderer/guideMain.tsx` 中：

1. 导入新步骤组件
2. 在 `GuideStep` 联合类型中添加新步骤名
3. 在 JSX 中添加条件渲染
4. 连接 `onNext` / `onPrev` 回调切换步骤

```tsx
type GuideStep = 'language' | 'smtc' | 'xxx';

// JSX 中：
{step === 'xxx' && <XxxStep onNext={handleXxxNext} onPrev={handleXxxPrev} />}
```

## 参考实现

已有步骤可作为参考：
- `Guide/language/` — 语言选择步骤（含图标、禁用态、i18n 切换）
- `Guide/smtc/` — SMTC 检查步骤（含检测状态机）

## 注意事项

- 文件头必须包含 GPL-3.0 版权声明（参考已有文件）
- 组件使用 `ReactElement` 返回类型（从 `react` 导入）
- Hook 使用 `useCallback` / `useMemo` 优化性能
- CSS 使用 rgba 白色透明色系，与 maxExpand 设置页风格一致
