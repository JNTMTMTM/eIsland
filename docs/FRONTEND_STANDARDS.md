# 前端编码规范详细标准

> 作者：**JNTMTMTM**
>
> 本文档涵盖 HTML / CSS / JavaScript / TypeScript / React / Next.js 的所有编码规范细则。AI Agent 在执行前端开发任务时应严格遵循本文档中的所有条款。
>

---

## 目录

1. [HTML 规范](#1-html-规范)
2. [CSS 规范](#2-css-规范)
3. [JavaScript / TypeScript 规范](#3-javascript-typescript-规范)
4. [React 规范](#4-react-规范)
5. [Next.js 规范](#5-nextjs-规范)

---

## 1. HTML 规范

### 1.1 文档结构基础

#### 文档类型声明

所有 HTML 文档必须以 HTML5 文档类型声明开始，并保持小写格式。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>页面标题</title>
</head>
<body>
</body>
</html>
```

#### 必需的文档结构元素

确保所有 HTML 文档包含必需的结构元素：`<html>`、`<head>` 和 `<body>`。

### 1.2 语言和字符编码

#### 语言属性设置

在根 HTML 元素上指定语言属性，帮助屏幕阅读器和翻译工具正确处理内容。

```html
<html lang="zh-CN">
<!-- 中文内容 -->
</html>
```

#### 字符编码声明

在文档头部明确声明 UTF-8 字符编码，确保内容正确渲染。

```html
<head>
  <meta charset="utf-8">
</head>
```

### 1.3 代码格式规范

#### 缩进和空格

使用 **2 个空格**进行缩进，嵌套元素应当缩进一次。

#### 标签命名规范

所有 HTML 标签使用小写字母，包括文档类型声明。

### 1.4 属性规范

#### 属性引号使用

所有属性值**必须使用双引号**包围。

```html
<img src="images/logo.png" alt="公司标志" class="logo">
<input type="email" placeholder="请输入邮箱地址">
```

#### 属性排序规范

HTML 属性按以下顺序排列：

1. `class`
2. `id`, `name`
3. `data-*`
4. `src`, `for`, `type`, `href`, `value`
5. `title`, `alt`
6. `role`, `aria-*`
7. `tabindex`
8. `style`

#### 布尔属性处理

布尔属性不需要声明值，属性存在即表示 `true`。

```html
<input type="checkbox" checked>
<input type="text" disabled>
<script src="app.js" defer></script>
```

#### 重复属性禁止

避免在同一元素上出现重复属性。

### 1.5 元素使用规范

#### 自闭合元素处理

HTML5 自闭合元素**不需要尾部斜杠**。

```html
<img src="image.jpg" alt="描述">
<input type="text" name="username">
<meta charset="utf-8">
<hr>
<br>
```

#### 闭合标签完整性

非空元素必须有对应的闭合标签，包括可选的闭合标签。

#### 元素嵌套规范

确保元素正确嵌套，遵循 HTML 语义化规则。块级元素不能嵌套在 `<p>` 内。

### 1.6 标题层级结构

确保标题按逻辑层级正确使用，不要跳过级别（`h1` → `h2` → `h3`）。

### 1.7 表单可访问性

所有表单输入元素必须有适当的标签关联。

```html
<label for="username">用户名：</label>
<input type="text" id="username" name="username">
```

### 1.8 图片和媒体元素

#### 图片替代文本

所有图片必须提供适当的替代文本。装饰性图片使用 `alt=""`。

```html
<img src="chart.png" alt="2023年销售额增长图表，显示同比增长15%">
<img src="decorative-border.png" alt="">
```

### 1.9 链接和引用

#### 外部资源引用

CSS 和 JavaScript 文件引用不需要指定 `type` 属性。

```html
<link rel="stylesheet" href="styles/main.css">
<script src="scripts/app.js"></script>
```

#### 子资源完整性

对于来自 CDN 的外部资源，建议添加完整性验证。

```html
<script
  src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"
  integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4="
  crossorigin="anonymous"
></script>
```

### 1.10 语义化和可访问性

#### ARIA 属性使用

适当使用 ARIA 属性增强可访问性，但不要滥用。

```html
<button aria-expanded="false" aria-controls="menu" id="menu-button">
  菜单
</button>
<ul id="menu" aria-labelledby="menu-button" hidden>
  <li><a href="/home">首页</a></li>
</ul>
```

#### 多主要内容处理

一个页面**只能有一个** `<main>` 元素，除非其他 `<main>` 元素被隐藏。

### 1.11 ID 和引用完整性

确保页面中所有 ID 值唯一，被引用的 ID 必须存在。

### 1.12 脚本和样式安全

#### 内联脚本规范

**避免在 HTML 中直接使用内联事件处理程序**，优先使用外部 JavaScript。

```html
<button id="submit-btn" class="btn-primary">提交</button>
<script src="scripts/form-handler.js"></script>
```

### 1.13 字符引用规范

对于预留的 XML 字符和特殊字符，适当使用 HTML 实体。

```html
<p>价格：&lt; 100元 &amp; 免费配送</p>
<p>版权所有 &copy; 2023 公司名称</p>
```

### 1.14 减少冗余标记

尽可能避免不必要的父元素，保持 HTML 结构简洁。

---

## 2. CSS 规范

### 2.1 Tailwind CSS

#### 2.1.1 Classname 顺序

classes 必须遵循固定顺序：先布局 → 盒模型 → 排版 → 视觉效果。

```html
<button class="flex items-center justify-center w-full p-4 font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600">
  Click me
</button>
```

#### 2.1.2 使用简写形式

当 Tailwind 提供简写形式时，应当优先使用简写。

```html
<div class="mx-4">...</div>
```

#### 2.1.3 禁止使用自定义 Classname

为贯彻 "Utility-First" 原则，应避免在组件中添加自定义的、语义化的 classname。所有样式都应通过组合原子化的 utility class 来实现。若确实需要，在 CSS 中使用 `@apply`。

#### 2.1.4 任意值的正确使用

负数任意值时，负号 `-` 应该放在方括号 `[]` 的**外面**。

```html
<div class="-top-[-10px]">...</div>
```

### 2.2 通用格式

#### 2.2.1 缩进

使用 **2 个空格**进行缩进。

#### 2.2.2 大小写

所有代码均使用**小写**，包括选择器、属性、值（字符串除外）。

#### 2.2.3 引号

统一使用**双引号**（`""`）。

#### 2.2.4 空白与换行

- 文件末尾保留一个空行
- 禁止行尾出现多余的空格
- 两个规则集之间最多保留一个空行
- 文件第一行不应为空行

### 2.3 命名规范

class、id、keyframe 动画、自定义媒体查询统一使用 **kebab-case（短横线连接式）**。

```css
.user-profile { }
#main-navigation { }
@keyframes slide-in { }
@custom-media --viewport-medium (width >= 50rem);
```

### 2.4 选择器

#### 2.4.1 属性选择器

属性选择器的值必须使用双引号包裹。

```css
[type="submit"] { }
```

#### 2.4.2 伪类与伪元素

- 伪类使用单冒号（`:`）
- 伪元素使用双冒号（`::`）
- 伪类和伪元素本身使用小写

```css
a:hover { color: #f00; }
p::first-line { font-weight: bold; }
```

#### 2.4.3 组合器

在组合器（`>`、`+`、`~`）**前后各保留一个空格**。

```css
.parent > .child { }
.item + .item { }
```

#### 2.4.4 选择器列表

- 多行书写时，每个选择器占一行
- 单行书写时，逗号后保留一个空格

#### 2.4.5 复杂度限制

为保持较低的特异性和较高的性能，对选择器的复杂度进行以下限制：

- **禁止使用 ID 选择器**
- 一个选择器中最多使用 **4 个 class 选择器**
- 一个选择器中最多使用 **2 个属性选择器**
- 一个选择器中最多使用 **4 个组合器**
- 一个选择器中最多使用 **1 个通用选择器**（`*`）
- 一个选择器中最多使用 **2 个类型选择器**（如 `div`, `p`）
- **禁止**在 class 或 id 选择器前添加类型选择器进行限定（如 `div.my-class`）

### 2.5 属性与值

#### 2.5.1 颜色

- 颜色值优先使用 3 位十六进制的缩写形式
- 颜色值必须使用**小写**
- **禁止使用颜色名称**
- 色相（Hue）值使用角度单位（`deg`）

```css
.element {
  color: #fff;
  background-color: #f0c;
  border-color: hsl(270deg 60% 70%);
}
```

#### 2.5.2 数值

- 对于值为 `0` 的长度单位，**省略单位**
- 小数值如果小于 1，**省略小数点前的 `0`**
- 禁止数值末尾出现多余的 `0`

```css
.element {
  padding: 0;
  opacity: .5;
  width: 1.5rem;
}
```

#### 2.5.3 字体权重

字体权重应使用**数值**（如 `400`, `700`），而不是关键字（`normal`, `bold`）。

#### 2.5.4 简写属性

- 避免使用冗余的值
- **禁止使用简写属性覆盖已声明的完整属性**

#### 2.5.5 厂商前缀

**禁止**为属性、值、`@`规则和媒体查询特性名称添加厂商前缀，除非有特殊需要。

```css
.element {
  display: flex;
  transition: all 4s ease;
}
```

#### 2.5.6 `!important`

**禁止使用 `!important`**。

### 2.6 注释

- 注释内容前后各保留一个空格
- 注释前通常需要一个空行（除非位于代码块的起始位置）
- SCSS 中推荐使用 `//` 进行单行注释

### 2.7 代码块

- 左花括号（`{`）与选择器在同一行，并与选择器之间保留一个空格
- 右花括号（`}`）单独占一行，且前面应有一个空行（多行模式下）
- 声明的冒号（`:`）后保留一个空格，前面没有空格
- 每条声明以分号（`;`）结尾
- 单行规则集最多只包含一条声明

### 2.8 函数

- 函数名与括号之间**不能有空格**
- 括号内的参数，逗号后保留一个空格，逗号前没有空格
- 多行函数中，括号内和参数后需要换行
- **禁止出现空的函数**

### 2.9 媒体查询

- 特性名称与冒号之间没有空格，冒号后有一个空格
- 括号内与内容之间没有空格
- 范围操作符（`=`、`<`、`>`）前后各有一个空格

```css
@media (max-width: 600px) { }
@media (width >= 50rem) { }
```

### 2.10 禁止项

- 禁止空的样式文件、代码块和注释
- 禁止重复的选择器和 `@import` 规则
- 禁止在声明块中出现重复的属性或重复的混合
- 禁止无效的十六进制颜色值
- 禁止在字符串中出现换行
- 禁止使用未知的单位、属性、函数、伪类、伪元素等

### 2.11 属性声明顺序

为提升代码的可读性和一致性，属性应按照以下分组和顺序进行声明：

1. 组合规则（CSS Modules 的 `composes`）
2. `all` 属性
3. 定位（`position`, `top`, `right`, `bottom`, `left`, `z-index` 等）
4. 显示模式（`box-sizing`, `display`）
5. 弹性盒子（`flex` 相关属性）
6. 网格布局（`grid` 相关属性）
7. 间距（`gap`, `row-gap`, `column-gap`）
8. 对齐（`align-*`, `justify-*`）
9. 顺序（`order`）
10. 盒模型（`width`, `height`, `padding`, `margin`, `overflow` 等）
11. 排版（`font-*`, `color`, `text-*`, `line-height` 等）
12. 交互（`appearance`, `cursor`, `pointer-events` 等）
13. 背景和边框（`background-*`, `border-*`, `outline` 等）
14. 遮罩（`mask` 相关属性）
15. SVG 属性
16. 过渡和动画（`transition`, `animation`, `transform` 等）
17. 分页媒体（`break-*`, `orphans`, `widows`）

### 2.12 SCSS / Sass

#### 2.12.1 命名规范

SCSS 中的变量（`$variable`）、函数（`@function`）、混合（`@mixin`）和占位符（`%placeholder`）命名统一使用 **kebab-case**。

#### 2.12.2 变量

- 变量声明时，冒号（`:`）前面**不能有空格**，冒号后必须有至少一个空格
- 在选择器或属性名中使用变量时，必须使用插值 `#{}`

```scss
$my-color: #f00;
$my-property: margin;
$my-selector: ".foo";

#{$my-selector} {
  #{$my-property}-left: 10px;
}
```

#### 2.12.3 操作符

在数学操作符（`+`, `-`, `*`, `/`）**两侧必须保留一个空格**。操作符前后禁止换行。

#### 2.12.4 混合与函数

- 定义混合和函数时，名称与括号之间**不能有空格**
- 调用无参数的混合时，必须在混合名称后加上括号 `()`
- 调用函数时，**禁止使用命名参数**

#### 2.12.5 嵌套

- **禁止使用不必要的父选择器引用** `&`
- 对于嵌套属性（如 `font`），其子属性之间**不能有空行**

#### 2.12.6 导入与继承

- 导入 SCSS 分部文件时，必须**省略文件名前的下划线**（`_`）和文件扩展名（`.scss`）
- 必须使用字符串形式导入
- **禁止** `@extend` 一个普通的 class、id 或元素选择器，只允许继承占位符选择器（`%`）

#### 2.12.7 控制流

- `@else` 语句前**不能有空行**
- `@else if` 语句的括号前必须有一个空格

---

## 3. JavaScript / TypeScript 规范

### 3.1 变量与常量

1.1 优先使用 `const` 声明常量，对于需要重新赋值的变量则使用 `let`。**避免使用 `var`**。

```typescript
const name = 'Alice';
let age = 30;
age = 31;
```

1.2 每个 `const` 或 `let` 声明**一个**变量。

1.3 在使用变量之前必须先定义。

1.4 **禁止删除变量**。

1.5 避免将变量初始化为 `undefined`。

```typescript
let name: string; // ✅ 推荐
```

### 3.2 数据类型

2.1 使用字面量创建原始类型。

```typescript
const str = 'hello';
const num = 118;
const bool = true;
```

2.2 明确类型时，使用 `as const` 来创建只读的常量。

```typescript
const config = {
  host: 'localhost',
  port: 8080,
} as const;
```

2.3 **禁止使用 `any` 类型**，除非在绝对必要的情况下。`any` 会绕过 TypeScript 的类型检查，降低代码安全性。

2.4 **禁止使用** `Function`、`Object`、`String`、`Number`、`Boolean` 等大写的基本类型。

```typescript
let name: string; // ✅
let callback: () => void; // ✅

let name: String; // ❌
let callback: Function; // ❌
```

### 3.3 对象

3.1 使用对象字面量 `{}` 创建对象。

3.2 使用对象方法的简写语法。

```typescript
const person = {
  name: 'Alice',
  sayHi() {
    console.log('Hi!');
  },
};
```

3.3 使用对象属性值的简写语法。

```typescript
const name = 'Alice';
const person = { name };
```

3.4 将简写属性放在对象声明的**开头**。

3.5 只对无效的标识符（例如包含特殊字符）使用引号。

```typescript
const obj = {
  id: 1,
  'data-test': 'value',
};
```

3.6 不要直接使用 `Object.prototype` 上的内置方法，如 `hasOwnProperty`。

```typescript
const hasProperty = Object.prototype.hasOwnProperty.call(obj, 'key');
// 更好的方式是:
const hasProp = Object.hasOwn(obj, 'key');
```

3.7 优先使用对象展开运算符 `...` 来进行浅拷贝，而不是 `Object.assign`。

### 3.4 数组

4.1 使用数组字面量 `[]` 创建数组。

4.2 使用 `Array.from()` 将类数组对象转换为数组。

4.3 数组的回调函数中必须有 `return` 语句，除非是隐式返回。

4.4 使用展开运算符 `...` 进行数组浅拷贝。

4.5 **避免使用 `for...in` 遍历数组**。

4.6 优先使用高阶函数（如 `map`, `filter`, `reduce`）**替代 `for` 循环**。

### 3.5 解构

5.1 使用对象解构来访问和使用对象的多个属性。

```typescript
function getFullName(user: { firstName: string; lastName: string }) {
  const { firstName, lastName } = user;
  return `${firstName} ${lastName}`;
}
```

5.2 对数组也使用解构。

```typescript
const numbers = [1, 2, 3, 4, 5];
const [first, second] = numbers;
```

5.3 在函数参数中，当需要对象的多个属性时，使用解构。

### 3.6 字符串

6.1 字符串统一使用**单引号** `''`。

```typescript
const name = 'Alice';
```

6.2 优先使用**模板字符串**进行字符串拼接，而不是 `+` 操作符。

```typescript
const name = 'Alice';
const message = `Hello, ${name}!`;
```

6.3 避免不必要的转义字符。

### 3.7 函数

7.1 使用函数声明或函数表达式，而不是 `new Function` 构造函数。

7.2 不要在非函数块（`if`, `while` 等）中声明函数。

7.3 为函数参数设置默认值，而不是在函数体内进行赋值。

```typescript
function greet(name = 'Guest', punctuation = '!') {
  return `Hello, ${name}${punctuation}`;
}
```

7.4 带有默认值的参数应放在参数列表的**末尾**。

7.5 避免修改函数参数。如果需要修改，请先复制一份。

7.6 优先使用剩余参数 `...` 语法，而不是 `arguments` 对象。

```typescript
function log(...args: any[]) {
  console.log(args);
}
```

7.7 函数调用的括号前**不加空格**。

### 3.8 箭头函数

8.1 当需要使用匿名函数时（例如传递内联回调），使用箭头函数。

8.2 如果函数体只有一条返回语句，并且没有副作用，可以省略花括号和 `return`。

```typescript
const square = (x: number) => x * x;
```

8.3 如果参数只有一个，可以省略括号。但为了保持一致性，推荐总是使用括号。

```typescript
const log = (message: string) => console.log(message);
```

### 3.9 类与接口

9.1 总是使用 `class`。避免直接操作 `prototype`。

9.2 使用 `extends` 来实现继承。

9.3 如果不是空的构造函数，请确保调用 `super()`。

9.4 **一个文件只定义一个类**。

9.5 类成员之间空一行以增加可读性。

9.6 优先使用**接口**（`interface`）来定义对象形状，而不是类型别名（`type`）。当需要联合类型或元组类型时，使用 `type`。

```typescript
interface User {
  name: string;
  age: number;
}
```

### 3.10 模块

10.1 始终使用 **ES6 模块**（`import`/`export`）。

```typescript
import { foo } from './foo';
export default foo;
```

10.2 不要在 `import` 路径中使用文件扩展名。

10.3 只有一个导出的模块，应使用 `export default`。

10.4 `import` 语句应放在文件的**顶部**。

10.5 按照以下顺序组织 `import`：

1. 内置模块（如 `fs`）
2. 外部模块（如 `react`）
3. 内部模块（绝对路径）
4. 父级目录相对路径（`../`）
5. 同级目录相对路径（`./`）

### 3.11 迭代器与生成器

11.1 **不要使用** `for...of` 或 `for...in` 循环，优先使用数组的高阶函数。这有助于代码的不可变性。

### 3.12 属性

12.1 访问属性时，优先使用点 `.` 操作符。

12.2 只有当属性是变量时，才使用 `[]` 访问。

### 3.13 比较操作符与相等性

13.1 始终使用 `===` 和 `!==`，而不是 `==` 和 `!=`。

13.2 条件语句中的布尔值不需要与 `true` 或 `false` 进行显式比较。

### 3.14 代码块与条件语句

14.1 如果 `if` 块中包含 `return` 语句，则后续的 `else` 块是**不必要的**。

14.2 使用大括号包裹所有的多行代码块。

14.3 避免嵌套的三元表达式。

14.4 避免不必要的三元表达式。

```typescript
const isAdult = age >= 18; // ✅
const isAdult = age >= 18 ? true : false; // ❌
```

### 3.15 代码格式化

15.1 使用 **2 个空格**进行缩进。

15.2 在代码块的 `{` 前保留一个空格。

15.3 在控制语句（`if`, `while` 等）的括号前保留一个空格。

15.4 在函数声明或表达式的参数列表括号前**不加空格**。

15.5 操作符两边各有一个空格。

15.6 文件末尾保留一个空行。

15.7 链式调用超过 3 层时，应换行并缩进。

15.8 在 `switch` 的 `case` 语句中使用花括号创建块级作用域。

15.9 使用 **Unix 风格的换行符**（`\n`）。

15.10 **语句末尾必须有分号**。

### 3.16 注释

16.1 使用 `/** ... */` 进行多行注释，特别是 JSDoc。

16.2 使用 `//` 进行单行注释。

16.3 在注释的 `//` 或 `/*` 后加一个空格。

16.4 在文件顶部使用注释来解释文件用途。

### 3.17 JSDoc

17.1 为所有可导出的函数、类和方法编写 JSDoc 注释。

```typescript
/**
 * 根据给定的名字和年龄生成问候语。
 * @param name - 用户的名字。
 * @param age - 用户的年龄。
 * @returns 返回格式化的问候字符串。
 */
function createGreeting(name: string, age: number): string {
  return `Hello ${name}, you are ${age} years old.`;
}
```

17.2 JSDoc 注释必须包含对参数（`@param`）和返回值（`@returns`）的描述和类型。

17.3 在 TypeScript 项目中，避免在 JSDoc 中重复声明类型，因为类型已经由代码本身定义。

17.4 确保 JSDoc 标签（`@param`, `@returns` 等）书写正确且对齐。

### 3.18 ESLint 注释

18.1 当需要禁用某条 ESLint 规则时，必须指定要禁用的**具体规则名称**。

```typescript
// eslint-disable-next-line no-console
console.log('Special log for debugging');
```

18.2 在禁用规则时，应提供明确的注释说明原因。

```typescript
// eslint-disable-next-line no-param-reassign -- This is a legacy API that requires parameter mutation.
acc.total += item.value;
```

18.3 仅在必要的最小范围内禁用规则，优先使用 `eslint-disable-next-line`。

18.4 **避免提交包含未使用 `eslint-disable` 注释的代码**。

### 3.19 类型转换

19.1 避免隐式类型转换。

19.2 在语句开头使用 `parseInt` 时，总是**指定基数**。

19.3 优先使用 `Number.isNaN` 而不是全局的 `isNaN`。

19.4 优先使用 `Number.isFinite` 而不是全局的 `isFinite`。

19.5 TypeScript 中，使用 `as` 进行类型断言。

```typescript
const value: unknown = 'hello world';
const len = (value as string).length;
```

### 3.20 命名规范

20.1 变量、函数名使用**小驼峰命名法**（camelCase）。

20.2 类、接口、类型别名、枚举使用**大驼峰命名法**（PascalCase）。

20.3 常量使用**全大写蛇形命名法**（UPPER_CASE_SNAKE_CASE）。

20.4 不要使用前导或后导下划线。

20.5 文件名使用小驼峰命名法或 kebab-case。

### 3.21 存取器

21.1 如果需要，请为属性提供 `get` 和 `set` 存取器。

21.2 `getter` 必须有返回值。

21.3 `setter` 不能有返回值。

### 3.22 Promise 与异步编程

22.1 优先使用 **`async/await`** 语法处理异步操作。

22.2 Promise 的 `reject` 原因应该是一个 `Error` 对象。

22.3 确保 Promise 链中**总是有** `.catch()` 或在 `async` 函数中使用 `try...catch`。

22.4 避免在 `finally` 块中使用 `return`, `throw`, `break` 或 `continue`。

22.5 避免不必要的 `await`。

```typescript
async function fetchData() {
  return fetch('/api/data'); // ✅ 直接返回
}

async function fetchData() {
  return await fetch('/api/data'); // ❌ 不必要的 await
}
```

22.6 避免在循环中 `await`。如果需要并行处理，使用 `Promise.all`。

22.7 避免 `Promise` 的嵌套。

### 3.23 正则表达式

23.1 优先使用正则表达式**字面量**，而不是 `new RegExp()`。

23.2 避免在正则表达式中使用不必要的转义。

23.3 避免在正则表达式中出现控制字符。

23.4 避免使用可能导致灾难性回溯的复杂正则表达式。

23.5 对所有非简单正则添加 `g` 标志，防止死循环。

### 3.24 安全性

24.1 **绝对禁止使用** `eval()` 和 `new Function()`。

24.2 避免使用 `javascript:` URL。

24.3 警惕 `setTimeout` 和 `setInterval` 中的字符串参数，它们等同于 `eval`。

24.4 在将用户输入的内容插入到 DOM 之前，必须进行清理或转义，以防止 **XSS 攻击**。**禁止直接使用** `innerHTML`, `outerHTML` 等属性来插入未经验证的内容。

```typescript
// ❌ 危险! 这会导致 XSS 攻击
const element = document.getElementById('container');
if (element) {
  element.innerHTML = userInput;
}
```

---

## 4. React 规范

### 4.1 基本约定

#### 4.1.1 文件扩展名

React 组件文件应使用 **`.tsx`** 扩展名。

#### 4.1.2 组件定义

- 优先使用函数声明或函数表达式来定义具名组件
- 匿名组件（例如，作为参数传递时）可以使用箭头函数表达式

```tsx
interface MyComponentProps {
  name: string;
}

function MyComponent({ name }: MyComponentProps) {
  return <div>{name}</div>;
}
```

#### 4.1.3 避免在 JSX 中引入 React

从 React 17 开始，新的 JSX 转换**不再需要** `import React from 'react'`。项目中已禁用此规则，**请勿在文件中引入未使用的 `React`**。

```tsx
function Greeting({ name }: { name: string }) {
  return <div>Hello, {name}</div>; // ✅ 无需引入 React
}
```

### 4.2 代码风格

#### 4.2.1 JSX 语法

##### 引号

JSX 属性值优先使用**双引号**（`"`）。普通 JS/TS 字符串优先使用**单引号**（`'`）。

```tsx
<Greeting name="John" message={'Hello World'} />;
```

##### 布尔属性

如果属性值为 `true`，请**省略该值**。

```tsx
<Checkbox checked />; // ✅
<Checkbox checked={true} />; // ❌
```

##### 标签闭合

- 没有子元素的组件应使用自闭合标签
- 自闭合标签的斜杠前应有**一个空格**

```tsx
<MyComponent />; // ✅
<MyComponent></MyComponent>; // ❌
<MyComponent/>; // ❌ 斜杠前无空格
```

##### 括号包裹多行 JSX

当 JSX 结构跨越多行时，**必须用括号** `()` 包裹起来。

##### 属性换行和缩进

- 当组件有多个属性时，建议每个属性占一行
- 第一个属性**不应换行**
- 属性使用**两个空格**进行缩进

#### 4.2.2 花括号间距

JSX 的花括号**内侧不应有空格**。

```tsx
<MyComponent name={userName} />; // ✅
<MyComponent name={ userName } />; // ❌
```

### 4.3 组件与 Props

#### 4.3.1 Props 解构

在函数组件的参数中直接解构 `props`。

```tsx
interface MyComponentProps {
  name: string;
  age: number;
}

function MyComponent({ name, age }: MyComponentProps) {
  return <div>{`${name} is ${age} years old.`}</div>;
}
```

#### 4.3.2 默认值

对于非必需的 props，优先使用 TypeScript 的可选链和默认参数来设置默认值。

```tsx
interface GreetingProps {
  name?: string;
}

function Greeting({ name = 'Guest' }: GreetingProps) {
  return <div>Hello, {name}</div>;
}
```

#### 4.3.3 禁止 Props 扩散

避免使用 `...` 扩展操作符传递 props。明确地列出每个 `prop` 可以让代码更清晰。

```tsx
interface UserProfileProps {
  name: string;
  avatar: string;
}

function UserAvatar({ avatar }: { avatar: string }) {
  return <img src={avatar} alt="User Avatar" />;
}

function UserProfile({ name, avatar }: UserProfileProps) {
  return (
    <div>
      <span>{name}</span>
      <UserAvatar avatar={avatar} />
    </div>
  );
}
```

#### 4.3.4 避免使用数组索引作为 `key`

在渲染列表时，应使用稳定且唯一的标识符作为 `key`，**避免使用数组的索引**。

```tsx
items.map((item) => <ListItem key={item.id} item={item} />); // ✅
items.map((item, index) => <ListItem key={index} item={item} />); // ❌
```

#### 4.3.5 组件命名

组件名称使用 **PascalCase**。

```tsx
function UserProfile() { /* ... */ } // ✅
function userProfile() { /* ... */ } // ❌
```

### 4.4 State、Hooks 与 Compiler

#### 4.4.1 核心 Hooks 使用规则

- **只在顶层调用 Hooks**：不要在循环、条件或嵌套函数中调用 Hooks
- **只在 React 函数中调用 Hooks**：只能在函数组件或自定义 Hooks 中调用 Hooks

```tsx
function MyComponent({ condition }: { condition: boolean }) {
  const [name, setName] = useState('John'); // 在顶层调用

  useEffect(() => {
    // ...
  }, [condition]); // 在顶层调用

  if (!condition) {
    return null;
  }
}
```

#### 4.4.2 `useEffect` 依赖项

`useEffect`、`useCallback`、`useMemo` 等 Hooks **必须包含所有外部依赖项**。

```tsx
useEffect(() => {
  fetchUser(userId).then(setUser).catch(console.error);
}, [userId]); // ✅ 包含 userId
```

#### 4.4.3 `useState` 命名

使用数组解构，并为 state 变量和其设置函数采用对称命名（例如 `[name, setName]`）。

```tsx
const [count, setCount] = useState(0); // ✅
const [countValue, updateCount] = useState(0); // ❌
```

#### 4.4.4 为 React Compiler 编写代码

为使代码与未来的 React Compiler（Forget）兼容，需遵循以下规则：

##### 4.4.4.1 保持组件和 Hooks 纯净

**禁止在渲染期间修改 State**：不要在组件的顶层作用域或 `render` 逻辑中调用 `setState`。

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1); // ✅ 在事件处理器中更新 state
  };

  return <button type="button" onClick={handleClick}>{count}</button>;
}
```

##### 4.4.4.2 状态和属性的不可变性

**不要直接修改 Props 或 State**。Props 和 State 都应被视为不可变的。要更新它们，请使用 `setState` 并创建新的对象或数组。

```tsx
const handleBirthday = () => {
  setUser(currentUser => ({ ...currentUser, age: currentUser.age + 1 })); // ✅ 函数式更新
};
```

### 4.5 性能优化

#### 4.5.1 避免在 Props 中创建新对象、数组或函数

在渲染过程中，每次都创建新的对象、数组或函数实例会导致子组件不必要的重新渲染。

##### 对象

```tsx
const containerStyle = { padding: '10px' }; // ✅ 在组件外部定义
```

##### 数组

```tsx
const defaultOptions = ['Option 1', 'Option 2']; // ✅ 在组件外部定义
```

##### 函数

使用 `useCallback` 来记忆化函数，或者将函数定义在组件外部。

```tsx
import { useCallback } from 'react';

function MyComponent() {
  const handleClick = useCallback(() => {
    console.log('Clicked!');
  }, []);

  return <MyButton onClick={handleClick} />;
}
```

#### 4.5.2 避免定义不稳定的嵌套组件

不要在另一个组件的渲染函数内部定义组件。这会导致嵌套组件在每次父组件渲染时都被重新创建，从而丢失其所有状态。

```tsx
// ✅ 正确：组件定义在外部
function ListItem({ item }: { item: { id: string; name: string } }) {
  return <li>{item.name}</li>;
}

function MyList({ items }: { items: { id: string; name: string }[] }) {
  return (
    <ul>
      {items.map((item) => <ListItem key={item.id} item={item} />)}
    </ul>
  );
}
```

### 4.6 可访问性（a11y）

#### 4.6.1 图像 `alt` 属性

所有 `<img>` 标签必须有 `alt` 属性。对于装饰性图片，可以设置为空字符串 `alt=""`。

```tsx
<img src="avatar.png" alt="User's avatar" />; // ✅
<img src="divider.png" alt="" />; // ✅ 装饰性图片
<img src="avatar.png" />; // ❌
```

#### 4.6.2 锚点 `<a>` 标签

- `<a>` 标签**必须有内容**
- `<a>` 标签必须具有有效的 `href` 属性，或者用 `<button>` 代替

#### 4.6.3 ARIA 属性

- 使用有效的 ARIA 属性
- **不要使用不支持的 ARIA 属性**

#### 4.6.4 交互元素

具有点击事件的可见非交互元素（如 `<div>`、`<span>`）应具有 `role` 属性，并处理键盘事件。**通常，最好直接使用 `<button>` 或 `<a>`**。

### 4.7 数据请求（TanStack Query）

#### 4.7.1 Hooks 依赖

`useQuery` 和 `useMutation` 的 `queryKey` 和其他依赖项**必须是稳定的**。避免在 `queryKey` 中使用非序列化的值，如函数或非稳定对象。

```tsx
function TodoList({ listId }: { listId: string }) {
  const { data } = useQuery({
    queryKey: ['todos', listId], // ✅ 稳定的 queryKey
    queryFn: () => fetchTodos(listId),
  });
}
```

#### 4.7.2 `queryClient` 稳定性

`QueryClient` 实例**应该是稳定的**，通常在应用顶层创建一次，并通过 React Context 提供。

```tsx
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

#### 4.7.3 查询函数 `queryFn`

查询函数 `queryFn` **必须返回一个 `Promise`**。不要使用返回 `void` 的函数。

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos, // ✅ fetchTodos 返回一个 Promise
});
```

### 4.8 安全性

#### 4.8.1 警惕 XSS 攻击

避免使用可能导致跨站脚本（XSS）攻击的属性和函数，如 `dangerouslySetInnerHTML`。**如果必须使用，请确保内容是经过严格清理和消毒的**。

```tsx
function SafeComponent({ content }: { content: string }) {
  return <div>{content}</div>; // ✅ 直接渲染文本，React 会自动转义
}
```

#### 4.8.2 `javascript:` URL

**禁止**在 `href` 等属性中使用 `javascript:` 协议的 URL。

#### 4.8.3 `target="_blank"`

当使用 `target="_blank"` 打开新标签页时，**必须同时添加** `rel="noopener noreferrer"` 以防止安全漏洞。

```tsx
<a href={url} target="_blank" rel="noopener noreferrer">Open in new tab</a>; // ✅
<a href={url} target="_blank">Open in new tab</a>; // ❌
```

---

## 5. Next.js 规范

### 5.1 服务端组件与客户端组件

Next.js App Router 默认组件为 **Server Components**。

- **默认服务端**：页面（`page.tsx`）、布局（`layout.tsx`）和无交互的展示型组件应保留为 Server Component
- **按需客户端**：仅在组件需要使用 React Hooks（`useState`, `useEffect`）、浏览器 API 或事件监听（`onClick`）时，才在文件顶部添加 `'use client'`
- **异步限制**：Client Components **不能是** `async` 函数

```tsx
// ✅ 只有交互组件才标记为 client
'use client';

import { useState } from 'react';

export default function SubmitButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button onClick={() => setLoading(true)}>
      {loading ? 'Loading...' : 'Submit'}
    </button>
  );
}
```

```tsx
// ✅ 默认是 Server Component，无需标记
import SubmitButton from './components/SubmitButton';

export default async function Page() {
  const data = await getData(); // ✅ Server Component 可以是 async
  return (
    <main>
      <h1>{data.title}</h1>
      <SubmitButton />
    </main>
  );
}
```

### 5.2 图片优化

为了优化 LCP（Largest Contentful Paint）和防止 CLS（Cumulative Layout Shift），**必须使用 `next/image`**。

- **强制使用 `<Image />`**：禁止使用 HTML `<img>` 标签
- **首屏图片优先级**：对于页面顶部可见区域（LCP 元素）的图片，**必须**添加 `priority` 属性
- **尺寸占位**：必须指定 `width` 和 `height`（或使用 `fill`），以防止布局偏移

```tsx
import Image from 'next/image';
import heroImage from '../public/hero.png';

export default function Hero() {
  return (
    <section>
      {/* ✅ LCP 元素添加 priority */}
      <Image
        src={heroImage}
        alt="Hero Banner"
        priority
        width={1200}
        height={600}
        placeholder="blur"
      />
      {/* ✅ 非首屏图片自动懒加载 */}
      <Image
        src="/icon.png"
        alt="Icon"
        width={50}
        height={50}
      />
    </section>
  );
}
```

### 5.3 脚本加载

第三方脚本（如 Google Analytics，广告 SDK）**必须使用 `next/script`** 优化加载时机。

- **禁止同步脚本**：禁止使用普通的 `<script src="...">` 标签
- **内联脚本 ID**：内联脚本必须包含 `id` 属性
- **位置控制**：不要将 `<Script>` 组件放在 `<head>` 或 `Metadata` 中

```tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <>
      {/* ✅ 策略加载，不阻塞 UI */}
      <Script
        src="https://example.com/analytics.js"
        strategy="lazyOnload"
      />

      {/* ✅ 内联脚本必须带 id */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        `}
      </Script>
      {children}
    </>
  );
}
```

### 5.4 Metadata 与 SEO

在 App Router 中，**废弃**传统的 `<head>` 标签管理方式。

- **使用 Metadata API**：使用导出的 `metadata` 对象或 `generateMetadata` 函数来定义 `<title>`、`<meta>` 等标签
- **禁止手动 Head**：禁止使用 `<head>` 标签或 `next/head`

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | My App',
    default: 'My App Home',
  },
  description: 'Application description',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 5.5 字体优化

使用 `next/font` 自动托管和优化字体文件，消除布局偏移（CLS）。

- **Google Fonts**：使用 `next/font/google`，**严禁**通过 `<link rel="stylesheet">` 引入 Google Fonts

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### 5.6 链接与路由

- **内部跳转**：**必须**使用 Next.js 提供的 `<Link>` 组件进行页面间跳转，以实现单页应用体验（避免全页刷新）。**禁止**使用 `<a>` 标签跳转内部页面
- **外部链接**：跳转外部网站时使用普通的 `<a>` 标签。如果使用 `target="_blank"`，**必须**添加 `rel="noopener noreferrer"`
- **编程式导航**：
  - 在 Client Components 中，使用 `useRouter` hook
  - **注意**：App Router 中**禁止导入** `next/router`
- **服务端重定向**：在 Server Components、Server Actions 或 Route Handlers 中，使用 `redirect` 函数
- **预加载**：`<Link>` 组件在视口可见时会自动预加载目标路由。如果目标页面数据更新非常频繁或资源消耗极大，可视情况设置 `prefetch={false}`

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation'; // ✅ App Router 正确导入

export default function NavigationBar() {
  const router = useRouter();

  return (
    <nav>
      {/* ✅ 内部跳转 */}
      <Link href="/dashboard">Dashboard</Link>

      {/* ✅ 外部链接带安全属性 */}
      <a href="https://example.com" target="_blank" rel="noopener noreferrer">
        External Site
      </a>

      {/* ✅ 编程式跳转 */}
      <button onClick={() => router.push('/settings')}>
        Go to Settings
      </button>
    </nav>
  );
}
```

---

## 附录：禁用模式速查

以下模式在所有前端代码中**严格禁止**：

| 模式 | 禁止原因 | 替代方案 |
|------|----------|----------|
| `var` | 函数作用域，容易引发 bug | `const` / `let` |
| `any` | 绕过类型检查 | 明确类型或 `unknown` |
| `==` / `!=` | 隐式类型转换 | `===` / `!==` |
| `eval()` | XSS 安全风险 | `Function()` 或重新设计 |
| `javascript:` URL | 安全风险 | `onClick` 或 `Link` |
| 内联事件处理器 | 难以维护 | 外部 JS 或事件委托 |
| HTML `<img>` | 性能问题 | `next/image` |
| 普通 `<script>` | 阻塞渲染 | `next/script` |
| `<a>` 跳转内部页面 | 全页刷新 | `<Link>` 组件 |
| CSS `!important` | 破坏样式优先级 | 重新组织选择器 |
| 数组索引作为 `key` | 列表更新出错 | 稳定的唯一 ID |
| Props 扩散 `...props` | 不可维护 | 显式传递每个 prop |
| `innerHTML` / `outerHTML` | XSS 风险 | 直接渲染文本或消毒库 |
