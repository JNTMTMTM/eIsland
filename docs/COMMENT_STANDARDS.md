# 注释规范

> 本项目遵循统一的企业级注释规范，使用 JSDoc 风格。

---

## 1. 文件级注释

每个 TypeScript/TSX 文件开头必须包含文件级注释，使用 `@file`、`@description`、`@author` 标签：

并且在文件最顶部必须包含版权声明注释块（`/* ... */`），至少应包含：

- 项目名称与仓库地址
- `Copyright (C)` 版权行
- 许可证声明（GPL-3.0）

```typescript
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
 */

/**
 * @file effects.ts
 * @description Three.js 动画效果辅助函数
 * @description 提供颜色插值、数值插值、呼吸效果、彩虹光效等计算函数
 * @author 鸡哥
 */
```

**配置**：项目默认作者为 **鸡哥**，所有 `@author` 统一填写此名称。

**说明**：
- `@description` 可以有多行，用于详细描述文件功能
- `@author` 标注文件作者
- 文件级注释是**必须**的
- 版权声明注释块是**必须**的，且应位于文件最顶部

---

## 2. 函数/方法/类注释

每个导出函数、类方法必须包含完整的 JSDoc 注释：

```typescript
/**
 * 在两个颜色之间进行线性插值
 * @param from - 起始颜色
 * @param to - 目标颜色
 * @param t - 插值因子（0~1）
 * @returns 插值后的颜色
 */
export function lerpColor(from: Color, to: Color, t: number): Color {
  // ...
}
```

### 标签使用规范

| 标签 | 用途 | 示例 |
|------|------|------|
| `@description` | 补充说明（非必填） | `@description 使用 Hermite 插值实现 ease-in-out 效果` |
| `@param` | 参数说明 | `@param t - 插值因子（0~1）` |
| `@returns` | 返回值说明 | `@returns 插值后的颜色` |
| `@example` | 使用示例 | `@example lerpColor(c1, c2, 0.5)` |

### 参数描述规则

- `@param` 描述紧跟在 `-` 后面
- 说明参数含义和有效范围
- 布尔值说明 `true`/`false` 的区别
- 对象参数逐字段说明

**示例**：

```typescript
/**
 * 获取呼吸动画因子
 * @param time - 当前时间（秒）
 * @param speed - 呼吸速度
 * @param phase - 相位偏移
 * @param squared - 是否平方（使结果始终为正）
 * @returns 呼吸因子（-1~1 或 0~1）
 */
export function getBreathFactor(
  time: number,
  speed: number,
  phase: number = 0,
  squared: boolean = false
): number {
  // ...
}
```

---

## 3. 注释原则

### 必填场景

- ✅ 所有导出函数
- ✅ 所有类方法
- ✅ 每个文件开头（文件级注释）
- ✅ 复杂业务逻辑代码块
- ✅ 类型定义（复杂类型需说明）

### 禁止场景

- ❌ 简单 getter/setter
- ❌ 自解释的变量赋值
- ❌ 模板代码（如简单的 React 组件骨架）
- ❌ 行内注释解释 `// 设置宽度为 100px` → `// 设置宽度`

### 注释质量

- **清晰简洁**：用最少的文字表达核心含义
- **中文为主**：项目以中文为主，英文仅用于代码标识符
- **说明"为什么"**：解释业务逻辑和设计决策，而非"做了什么"
- **参数要具体**：说明有效范围、默认值、含义

---

## 4. 注释格式模板

### 文件开头模板

```typescript
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
 */

/**
 * @file [filename].ts
 * @description [文件功能描述]
 * @author [开发者名称]
 */
```

### 函数模板

```typescript
/**
 * [函数功能简述]
 * @description [详细说明，非必填]
 * @param [paramName] - [参数说明]
 * @returns [返回值说明]
 */
export function [functionName](...): [ReturnType] {
  // ...
}
```

---

## 5. 违规示例

```typescript
// ❌ 错误：缺少版权声明注释块

// ❌ 错误：缺少文件级 JSDoc

// ❌ 错误：参数无说明
export function lerp(a, b, t) { }

// ❌ 错误：注释解释"做了什么"而非"为什么"
const width = 100; // 设置宽度为 100px

// ❌ 错误：简单函数过度注释
/**
 * 获取用户名称
 * @param user - 用户对象
 * @returns 用户名称
 */
export function getName(user: User): string {
  return user.name; // 返回名称
}
```

---

## 6. 正确示例

```typescript
/**
 * @file effects.ts
 * @description Three.js 动画效果辅助函数
 * @description 提供颜色插值、数值插值、呼吸效果、彩虹光效等计算函数
 * @author 鸡哥
 */

import * as THREE from 'three';

/**
 * 在两个 THREE.Color 之间进行线性插值
 * @param from - 起始颜色
 * @param to - 目标颜色
 * @param t - 插值因子（0~1）
 * @returns 插值后的颜色
 */
export function lerpColor(from: THREE.Color, to: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(from, to, t);
}

/**
 * 使用正弦波计算平滑呼吸因子
 * @description 用于实现光效的呼吸动画效果
 * @param time - 当前时间（秒）
 * @param speed - 呼吸速度
 * @param phase - 相位偏移
 * @param squared - 是否平方（使结果始终为正）
 * @returns 呼吸因子（-1~1 或 0~1）
 */
export function getBreathFactor(
  time: number,
  speed: number,
  phase: number = 0,
  squared: boolean = false
): number {
  const value = Math.sin(time * speed + phase);
  return squared ? Math.pow(value, 2) : value;
}
```

---

## 7. 工具支持

在 VS Code / Cursor 中，可安装 JSDoc 相关插件获得自动补全支持：
- `ESLint` - 自动检查注释完整性
- `JSDoc Template` - 快速生成注释模板

---

*文档版本：v1.0.0*  
*最后更新：2026-03-30*
