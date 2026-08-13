---
name: eisland-dev-add-empty-state
description: >
  为 eIsland 灵动岛添加一个新的空白状态机（IslandState）。当用户要求创建新状态、新页面、
  新界面（如登录页、设置子页面、独立面板）时使用此 skill。即使用户只说"加个新状态"或
  "创建一个 XX 页面"，也应触发。此 skill 覆盖从类型注册、窗口尺寸、CSS 样式到鼠标交互
  行为的全部 12 个修改点，确保状态机完整可用。
---

# eIsland: 添加空白状态机

为灵动岛添加一个新的空白 IslandState，使其具备正确的窗口大小、样式和交互行为。

## 前置确认

在开始前，向用户确认以下信息：

1. **状态名称** — kebab-case 标识符（如 `musicProvidersLogin`、`settings wizard`）
2. **窗口大小** — 选择一种预设：
   - `maxExpand`（860x400）— 全展开大面板，适合设置、表单、内容页
   - `expanded`（860x150）— 单击展开面板
   - `hover`（500x60）— 悬停小面板
   - `notification`（500x88）— 通知面板
   - `lyrics`（500x42）— 歌词条
   - 自定义尺寸
3. **鼠标移出后是否收回？** — **必须主动询问**：
   > "鼠标移出灵动岛后，是否自动收回至待机状态？（大多数独立页面如登录、注册、支付页面选择不收回）"
   - **不收回**（推荐用于独立页面）→ 需要额外修改 `AUTH_STATES`、`useIslandHoverInteraction.ts`、`useIslandSettingsSync.ts`
   - **收回** → 无需额外修改
4. **是否为认证/登录类页面？** — 如果是，需要导入 `auth.css` 并使用 `auth-state-content` 类名

## 实现步骤

### Step 1: 注册类型

**文件：** `src/renderer/store/types/index.ts`

1a. 在 `IslandState` 联合类型末尾添加新状态名：
```typescript
export type IslandState = '...' | 'newStateName';
```

1b. 在 `IslandSlice` 接口中添加 setter 方法签名：
```typescript
setNewStateName: () => void;
```

### Step 2: 实现 setter

**文件：** `src/renderer/store/slices/islandSlice.ts`

在已有的 setter 群（如 `setBindEmail` 之后）添加新 setter：
```typescript
setNewStateName: () => set((prev) => {
  if (prev.uiStateLocked && prev.state !== 'newStateName') return prev;
  const standalone = isStandaloneRenderer();
  if (!standalone) {
    window.api?.expandWindowSettings();
    window.api?.disableMousePassthrough();
  }
  const nextAuthReturnState = (/* 已有 auth 状态列表 */ || prev.state === 'newStateName')
    ? prev.authReturnState
    : (standalone ? 'maxExpand' : prev.state);
  return { state: 'newStateName' as never, authReturnState: nextAuthReturnState };
}),
```

2b. 在 `setIdle` 的守卫条件中添加新状态（防止被强制收回）：
```typescript
if (!force && (... || prev.state === 'newStateName')) return prev;
```

2c. 在 `returnFromAuth` 中：
- 窗口展开分支（`else if (target === ...)`）添加新状态
- `authStates` 数组中添加新状态

### Step 3: 窗口面积配置

**文件：** `src/renderer/store/constants/islandTransition.ts`

在 `ISLAND_STATE_AREA` 中添加条目（值与所选窗口大小一致）：
```typescript
newStateName: 860 * 400,  // maxExpand 尺寸
```

### Step 4: 状态行为配置

**文件：** `src/renderer/components/config/dynamicIslandStateConfig.ts`

在 `STATE_CONFIGS` 中添加条目：
```typescript
newStateName: {
  name: 'newStateName',
  mousePassthrough: false,
  expanded: true,
  enterDelay: 0,
  leaveDelay: 0,
},
```

### Step 5: 创建状态组件

**5a.** 创建目录 `src/renderer/components/states/newStateName/`

**5b.** 创建 `NewStateNameContent.tsx`：
```tsx
import type { ReactElement } from 'react';
// 如果是认证类页面，导入 auth.css：
// import '../../../styles/auth/auth.css';

export function NewStateNameContent(): ReactElement {
  // 认证类页面使用 auth-state-content 类
  // return <div className="auth-state-content" />;
  return <div />;
}
```

**5c.** 创建 `index.ts`：
```ts
export { NewStateNameContent } from './NewStateNameContent';
```

### Step 6: 注册渲染

**6a.** `src/renderer/components/components/DynamicIslandStateContent.tsx`：
```tsx
import { NewStateNameContent } from '../states/newStateName';
// 在状态判断链中添加：
if (state === 'newStateName') return <NewStateNameContent />;
```

**6b.** `src/renderer/components/components/StandaloneWindowViewport.tsx`：
```tsx
import { NewStateNameContent } from '../states/newStateName';
// 在 SettingsTab 守卫前添加：
{activeTab === 'settings' && state === 'newStateName' && <NewStateNameContent />}
// 更新 SettingsTab 排除条件：
{activeTab === 'settings' && state !== '...' && state !== 'newStateName' && <SettingsTab />}
```

### Step 7: CSS 窗口尺寸

**文件：** `src/renderer/styles/shell/shell.css`

将新状态添加到对应尺寸的选择器组中。例如 maxExpand 尺寸：
```css
.island-shell.login,
.island-shell.register,
/* ... */
.island-shell.newStateName {
  width: 860px;
  height: 400px;
  background: var(--color-island-bg);
  border-radius: 0 0 22px 22px;
  box-shadow: none;
}
```

同时添加 `::before` 伪元素规则（隐藏光泽层）：
```css
.island-shell.login::before,
/* ... */
.island-shell.newStateName::before {
  opacity: 0;
  pointer-events: none;
}
```

### Step 8: 认证类页面样式（如适用）

**文件：** `src/renderer/styles/auth/auth.css`

将新状态添加到 auth 动画选择器组：
```css
.island-shell.login .auth-state-content,
/* ... */
.island-shell.newStateName .auth-state-content {
  align-items: center;
  padding: 14px 22px;
}
```

### Step 9: 鼠标移出不收回（如适用）

如果用户确认需要"鼠标移出后不收回"，修改以下 3 个文件：

**9a.** `src/renderer/components/hooks/useIslandHoverInteraction.ts`：
- `AUTH_STATES` 集合添加新状态
- 第 134 行的状态检查列表添加新状态

**9b.** `src/renderer/components/hooks/useIslandSettingsSync.ts`：
- 第 398 行的窗口展开分支添加新状态

### Step 10: 验证

```bash
npx tsc --noEmit --skipLibCheck
```

## 文件清单

完成所有步骤后，验证以下文件已被修改：

- [ ] `store/types/index.ts` — IslandState + IslandSlice
- [ ] `store/slices/islandSlice.ts` — setter + setIdle 守卫 + returnFromAuth
- [ ] `store/constants/islandTransition.ts` — ISLAND_STATE_AREA
- [ ] `components/config/dynamicIslandStateConfig.ts` — STATE_CONFIGS
- [ ] `components/states/<name>/index.ts` — 新文件
- [ ] `components/states/<name>/<Name>Content.tsx` — 新文件
- [ ] `components/components/DynamicIslandStateContent.tsx` — 渲染注册
- [ ] `components/components/StandaloneWindowViewport.tsx` — 独立窗口渲染
- [ ] `styles/shell/shell.css` — 窗口尺寸
- [ ] `styles/auth/auth.css` — 如为认证页面
- [ ] `components/hooks/useIslandHoverInteraction.ts` — 如需不收回
- [ ] `components/hooks/useIslandSettingsSync.ts` — 如需不收回
