# Python-island 社区贡献指南

**项目地址**：[https://github.com/Python-island/Python-island](https://github.com/Python-island/Python-island)

**项目名称**：Pyisland - 现代Windows灵动岛控制中心

**开源协议**：

**行为准则**：Contributor Covenant Code of Conduct

欢迎加入 Python-island 开源社区！Pyisland 是基于 PySide6 开发的 Windows 专属灵动岛控制中心，你的每一次代码修复、功能优化、文档完善、资源改进，都能让这个轻量化桌面工具变得更易用、更强大。

本指南将明确社区协作规范、贡献流程和开发要求，帮助你高效、顺畅地参与项目共建，无论你是Python新手、PySide6开发爱好者，还是开源贡献老手，都能找到适合自己的贡献方式。

**贡献前必读**：

1. 请先阅读并遵守项目的 [开源协议]() 和已添加的 Contributor Covenant Code of Conduct；

2. 确保你的贡献符合项目定位：**Windows 平台轻量化桌面灵动岛工具**，暂不接受非 Windows 平台适配、过度臃肿的功能开发；

3. 保持友好协作的社区氛围，尊重不同的技术观点和开发背景。

## 目录

- [可贡献的内容类型](#可贡献的内容类型)

- [贡献前准备](#贡献前准备)

- [标准贡献流程](#标准贡献流程)

- [Issue 提交规范](#issue-提交规范)

- [Pull Request (PR) 提交规范](#pull-request-pr-提交规范)

- [开发与代码规范](#开发与代码规范)

- [文档与资源贡献规范](#文档与资源贡献规范)

- [代码评审与合并规则](#代码评审与合并规则)

- [常见问题与故障排除](#常见问题与故障排除)

- [致谢](#致谢)

## 可贡献的内容类型

Python-island 欢迎多维度的贡献，无需深厚的开发功底也能参与，核心贡献类型如下：

### 🔧 代码类贡献

适合有 Python/PySide6 开发基础的贡献者，优先选择标注 `good first issue`/`help wanted` 的任务：

- 修复已知 Bug（如系统状态显示异常、动画卡顿、托盘功能失效、URL检测不灵敏等）；

- 优化现有功能（如提升亮度调节流畅度、优化灵动岛拖动体验、降低后台运行资源占用等）；

- 开发符合项目定位的新功能（需先通过 Issue 与维护者确认需求合理性）；

- 重构代码、补充单元测试，提升项目可维护性和测试覆盖率；

- 优化 Windows 版本兼容性（适配 Win10/Win11 不同子版本的 API 差异）。

### 📝 文档类贡献

适合所有开发者，是新手入门的最佳选择：

- 完善 [README.md](README.md)、安装运行教程、功能使用手册；

- 修复文档错别字、语法错误、格式问题，补充代码示例和注释；

- 编写项目开发指南（如 PySide6 组件开发、QSS 样式修改、模块扩展方法）；

- 补充故障排除案例，更新常见问题解答；

- 翻译文档（适配英文等多语言版本，便于海外开发者参与）。

### 🎨 资源类贡献

适合有UI/设计基础的贡献者：

- 优化项目图标资源（`resources/icons/`），保证图标风格统一、清晰度达标、适配灵动岛胶囊设计；

- 优化 QSS 样式（`resources/styles/style.qss`），提升界面视觉效果和交互体验；

- 补充缺失的资源文件，规范资源文件命名和存放路径。

### 💡 其他贡献

所有开发者均可参与，助力社区成长：

- 反馈 Bug、提出合理的功能建议、分享使用体验；

- 帮助审核 Issue、回复社区提问、整理重复问题；

- 推广项目、分享使用案例，吸引更多开发者加入；

- 参与代码评审，为其他贡献者的 PR 提供改进建议。

## 贡献前准备

### 1. 前提条件

- 注册 GitHub 账号，熟悉 Git 基础操作（克隆、分支、提交、推送、拉取、解决冲突）；

- 开发环境为 **Windows 10/11**（项目依赖 Windows 专属 API，暂不支持其他系统）；

- 具备基础的 **Python 3.7+** 开发能力，了解 PySide6 基础使用（GUI 开发、信号与槽机制）优先；

- 安装项目所需依赖，确保本地能正常运行项目。

### 2. 本地环境搭建步骤

#### 步骤1：Fork 项目

点击项目主页右上角 **Fork** 按钮，将项目复制到你的个人 GitHub 仓库，后续所有开发均基于个人 Fork 仓库进行。

#### 步骤2：克隆仓库到本地

```Bash

# 克隆个人 Fork 仓库
git clone https://github.com/你的GitHub用户名/Python-island.git
# 进入项目目录
cd Python-island
```

#### 步骤3：配置上游仓库

关联原项目仓库，便于及时同步最新代码，避免开发时出现代码滞后和冲突：

```Bash

git remote add upstream https://github.com/Python-island/Python-island.git
# 验证上游仓库配置
git remote -v
```

#### 步骤4：安装项目依赖

项目核心依赖为 PySide6，扩展依赖用于系统交互，执行以下命令安装：

```Bash

# 核心GUI依赖（必装）
pip install PySide6
# 系统交互依赖（必装，亮度控制/系统状态检测）
pip install comtypes screen_brightness_control
```

#### 步骤5：验证本地运行

执行主程序，确保项目能正常启动，无报错，功能可正常使用：

```Bash

python main.py
```

#### 步骤6：熟悉项目结构

项目采用**模块化分层设计**，所有开发需遵循既定的目录规范，核心结构见项目 [README.md](README.md)，关键目录作用：

- `app/`：核心源码目录，包含核心配置、UI 组件、系统服务、动画效果等子模块；

- `resources/`：资源目录，存放图标、QSS 样式文件；

- `main.py`：项目应用入口；

- `island.spec`：PyInstaller 打包配置文件；

- `requirements.txt`：项目依赖清单。

## 标准贡献流程

为避免无效贡献、减少代码冲突，提升协作效率，所有贡献请遵循以下标准化流程：

### 步骤1：查找/提交 Issue

1. 浏览项目现有 **Open** 状态的 Issue，选择未被认领的任务进行开发，优先选择 `good first issue`（新手友好）、`help wanted`（急需协助）标签的任务；

2. 若你发现新 Bug、有新功能建议，先**提交新 Issue**，清晰描述问题/需求，等待项目维护者确认后再开始开发，避免开发方向与项目定位不符；

3. 认领 Issue 后，可在 Issue 下留言告知，便于维护者跟踪开发进度。

### 步骤2：同步最新代码

每次开始开发前，务必同步原项目主分支的最新代码，确保本地代码为最新版本：

```Bash

# 切换到主分支
git checkout main
# 从上游仓库拉取最新代码
git pull upstream main
# 将最新代码推送到个人 Fork 仓库主分支
git push origin main
```

### 步骤3：创建功能分支

基于最新的主分支，创建独立的功能分支，**一个分支仅对应一个 Issue/一个功能/一个 Bug 修复**，分支名遵循[分支命名规范](#分支命名规范)：

```Bash

git checkout -b 分支名
# 示例：git checkout -b fix/wifi-status-display
# 示例：git checkout -b feat/add-position-memory
```

### 步骤4：开发与本地测试

1. 按照项目[开发与代码规范](#开发与代码规范)编写代码，遵循模块化设计，新增文件放到对应目录；

2. 开发完成后，**本地充分测试**：确保功能正常、无 Bug、不破坏原有功能，适配 Win10/Win11 基础版本；

3. 若修改了 QSS 样式/图标资源，需验证界面显示正常、交互流畅；若调用了 Windows API，需验证 API 调用稳定，增加异常捕获；

4. 格式化代码，遵循 PEP8 规范，删除无用代码、注释，保证代码整洁。

### 步骤5：提交代码并推送到个人仓库

遵循[Commit 提交规范](#commit-提交规范)撰写提交信息，多次小提交优于一次大提交，提交后推送到个人 Fork 仓库的对应分支：

```Bash

# 添加修改的文件
git add .
# 提交代码，撰写规范的 Commit 信息
git commit -m "类型(作用域): 描述信息"
# 推送到个人 Fork 仓库
git push origin 你的分支名
```

### 步骤6：提交 Pull Request (PR)

1. 进入个人 Fork 仓库的 Python-island 项目页面，切换到开发分支，点击 **Compare & pull request**；

2. 按照[PR 提交规范](#pull-request-pr-提交规范)填写 PR 标题和描述，关联对应的 Issue 号；

3. 确认 PR 无合并冲突、提交的文件与修改内容匹配，点击 **Create pull request** 提交；

4. 提交后等待项目维护者的评审，期间可关注 PR 评论区，及时回复问题。

### 步骤7：参与评审与修改

1. 项目维护者会在 1-3 个工作日内评审你的 PR，提出改进建议；

2. 根据评审意见在本地修改代码，修改完成后重新提交并推送到原分支，PR 会自动更新；

3. 若 PR 出现合并冲突，需按照[冲突解决方法](#常见问题与故障排除)自行解决后重新推送。

### 步骤8：PR 合并与后续操作

1. 当 PR 满足合并标准后，维护者会将其合并到原项目主分支；

2. PR 合并后，你可以删除本地的开发分支和个人 Fork 仓库的对应开发分支；

3. 及时同步原项目主分支的最新代码到个人 Fork 仓库，为后续贡献做准备。

## Issue 提交规范

Issue 是社区沟通、任务管理的核心载体，清晰、规范的 Issue 能大幅提升处理效率，提交前请确保已搜索现有 Issue，避免重复提交。

### 1. Issue 分类

项目支持以下4类 Issue，提交时请选择对应类型，按模板填写内容：

#### 🐛 Bug 反馈

**必含信息**：问题描述、复现步骤、预期结果、实际结果、环境信息（Windows 版本/ Python 版本/ PySide6 版本）、控制台报错日志/截图；

**示例**：Win11 22H2，Python 3.9，PySide6 6.5.0，点击灵动岛亮度滑块无反应，控制台报错 `ModuleNotFoundError: No module named 'screen_brightness_control'`。

#### ✨ 功能建议

**必含信息**：需求背景、功能描述、实现思路（可选）、Windows 平台适配性说明、是否符合项目轻量化定位；

**示例**：希望新增灵动岛位置记忆功能，关闭应用后再次打开保留上次位置，可基于 PySide6 的 QSettings 实现，适配 Win10/Win11，无额外资源占用。

#### 📚 文档/资源问题

**必含信息**：问题位置（如 [README.md](README.md) 某章节/`resources/icons/light.png`/`resources/styles/style.qss`）、错误内容/优化建议、具体修改方案（可选）。

#### 💬 其他问题

如开发咨询、合作建议、使用体验反馈等，清晰描述诉求，避免模糊表述。

### 2. Issue 标签说明

项目使用以下标签对 Issue 进行分类，维护者会自动添加，你也可以自行申请添加：

- `good first issue`：新手友好任务，难度低、指引清晰，适合首次贡献；

- `help wanted`：急需社区协助的任务；

- `bug`：程序缺陷、功能异常；

- `enhancement`：功能优化、新需求；

- `documentation`：文档相关问题；

- `resource`：图标/样式等资源问题；

- `compatibility`：Windows 版本兼容性问题；

- `duplicate`：重复 Issue，将被关闭；

- `wontfix`：暂不修复/不采纳的 Issue，会说明原因。

## Pull Request (PR) 提交规范

### 1. PR 基础要求

1. **单一性**：一个 PR 只解决一个 Issue/实现一个功能/修复一个 Bug，禁止大包大揽（如同时修复 WiFi Bug + 优化 QSS 样式 + 新增功能，需拆分为多个 PR）；

2. **无冲突**：确保 PR 基于原项目最新主分支开发，与主分支无合并冲突；

3. **可运行**：PR 提交前，本地已充分测试，功能正常、无 Bug、不破坏原有功能；

4. **关联 Issue**：所有 PR 必须关联对应的 Issue 号，无 Issue 的 PR （如文档错别字修改）除外；

5. **最小修改**：仅修改与需求相关的代码/文件，禁止删除无用代码、修改无关配置。

### 2. PR 标题规范

格式：`[类型] 简短描述（关联 Issue 号）`

类型与 Commit 类型一致（Feat/Fix/Docs/Resource/Style 等），描述简洁直白，结尾无标点。

**示例**：

- `[Fix] 修复Win11蓝牙状态显示异常 #12`

- `[Feat] 新增灵动岛位置记忆功能 #23`

- `[Docs] 补充PySide6安装排错步骤 #34`

- `[Resource] 优化亮度控制图标清晰度 #45`

### 3. PR 描述模板

提交 PR 时，请按照以下模板填写描述，信息完整能加快评审速度：

```Markdown

## 变更说明
（简要描述本次修改内容、实现逻辑、修改的文件，示例：基于PySide6的QSettings实现灵动岛位置记忆，修改了app/core/config.py和app/island.py）

## 关联 Issue
Fix #xxx （替换为实际 Issue 号，会自动关闭对应 Issue）

## 测试验证
- 测试环境：Windows 版本/ Python 版本/ PySide6 版本
- 测试步骤：xxx
- 测试结果：功能正常/ Bug 已修复/ 样式优化完成，无兼容性问题
- 是否通过本地全量运行：是/否

## 其他说明
（如是否修改依赖、是否涉及破坏性变更、是否需要同步更新文档/资源、Windows 版本适配情况等，无则写无）
```

### 4. PR 拒绝场景

若 PR 满足以下任一条件，将被拒绝或要求修改：

- 未遵循本指南的规范，Commit 信息混乱、分支命名不规范、PR 描述不完整；

- 存在 Bug、未通过本地测试、破坏原有功能；

- 与项目定位不符（如非 Windows 平台适配、过度臃肿的功能开发）；

- 未同步最新代码，存在严重合并冲突且未自行解决；

- 新增功能未考虑 Windows 版本兼容性，仅在单一版本测试；

- 修改图标/资源后，存在版权问题、风格不统一或资源文件损坏；

- 代码格式混乱，未遵循 PEP8 规范，存在大量无用代码/注释。

## 开发与代码规范

为保证项目代码的可读性、可维护性和一致性，所有代码开发请严格遵循以下规范，结合项目 **Python/PySide6/Windows 平台** 的特性定制。

### 1. Python 基础规范

- 严格遵循 **PEP8 规范**：4个空格缩进、行宽不超过80字符、变量/函数命名语义化；

- 可使用 Pylint/Black/Autopep8 工具格式化代码后再提交，避免格式问题；

- 禁止使用中文变量/函数名，禁止无意义命名（如 `a1`、`f1`、`temp`）。

### 2. PySide6 开发规范

1. **UI 与业务逻辑分离**：遵循 MVVM 思想，UI 组件（`app/ui/`）仅负责界面展示，业务逻辑放到对应服务模块（`app/services/`），通过信号与槽实现交互；

2. **避免阻塞 UI 主线程**：耗时操作（如系统状态检测、Windows API 调用）必须放到后台工作线程（`app/core/worker.py`），避免灵动岛界面卡顿；

3. **QSS 样式统一管理**：所有界面样式均维护在 `resources/styles/style.qss`，禁止在代码中内联样式，新增样式需添加清晰注释，与现有样式风格统一；

4. **配置常量集中存放**：所有可配置的常量（如防抖时间、状态更新频率、尺寸参数）均放到 `app/core/config.py`，使用**全大写+下划线**命名（如 `DEBOUNCE_DELAY`），禁止在代码中硬编码；

5. **图标资源统一管理**：所有图标通过 `app/core/icons.py` 中的 `IslandIcon` 枚举类管理，参考 `FluentIcon` 实现方式。使用示例：
   ```python
   from app.core.icons import IslandIcon
   
   # 获取图标路径
   icon_path = IslandIcon.LIGHT.path()
   
   # 获取 QIcon 对象
   qicon = IslandIcon.TRAY.qicon()
   ```

6. **异常捕获**：调用 Windows API、PowerShell 命令、文件操作时，必须增加 try/except 异常捕获，给出清晰的错误提示，避免程序崩溃。

### 3. 模块化开发规范

严格遵循项目既定的模块化结构，**新增文件必须放到对应目录**，不允许随意创建根目录文件，确保项目结构清晰：

- 核心配置/后台线程 → `app/core/`

- UI 组件/界面 → `app/ui/`

- 系统服务/与 Windows 交互 → `app/services/`

- 动画效果/视觉交互 → `app/animations/`

- 图标资源 → `resources/icons/`

- QSS 样式 → `resources/styles/`

- 应用入口 → 根目录 `main.py`

新增模块后，需在对应目录的 `__init__.py` 中做导出，与现有模块保持一致的调用方式。

### 4. 命名规范

#### 变量/函数

- 小驼峰式命名：`systemStatus`、`getBrightness()`、`checkClipboardUrl()`；

- 语义化命名，直接体现变量/函数的作用，避免缩写（除非是通用缩写，如 `url`、`api`）。

#### 类

- 大驼峰式命名：`SystemStatusService`、`UrlDialog`、`TrayService`；

- 类名与模块功能匹配，后缀可增加标识（如 Service/Dialog/Widget）。

#### 常量

- 全大写+下划线：`DEBOUNCE_DELAY`、`STATUS_UPDATE_INTERVAL`、`ICON_PATH`；

- 存放于 `app/core/config.py`，添加注释说明含义和单位。

#### 文件/目录

- 小写+下划线：`system_status.py`、`url_dialog.py`、`style_qss`；

- 与功能匹配，禁止无意义命名（如 `func1.py`、`ui2.py`）。

### 5. 分支命名规范

格式：`类型/功能/问题描述`，使用英文小写+连字符，描述简洁直白，**一个分支仅对应一个任务**：

- 功能开发：`feat/position-memory`、`feat/shortcut-wake`

- Bug 修复：`fix/wifi-status-display`、`fix/tray-icon-not-show`

- 文档修改：`docs/update-install-guide`、`docs/add-module-explain`

- 资源优化：`resource/optimize-light-icon`、`resource/adjust-qss-style`

- 代码重构：`refactor/system-status-service`、`refactor/ui-component`

- 格式调整：`style/format-code-pep8`

### 6. Commit 提交规范

采用 **Conventional Commits** 规范，格式：`类型(作用域): 描述信息`，提交信息简洁明了，使用中文表述，结尾无标点。

#### 类型说明

|类型|含义|适用场景|
|---|---|---|
|`feat`|新功能开发|新增灵动岛功能、新增服务模块等|
|`fix`|Bug 修复|修复系统状态显示异常、托盘功能失效等|
|`docs`|文档修改|完善README、补充开发指南、修复文档错别字等|
|`resource`|资源/图标修改|替换图标、优化QSS样式、补充资源文件等|
|`refactor`|代码重构|无功能新增/删除，仅优化代码结构、命名等|
|`style`|代码格式/界面样式调整|按PEP8格式化代码、调整QSS样式细节等|
|`chore`|构建/依赖/配置修改|更新requirements.txt、修改打包配置island.spec等|
|`test`|测试代码添加/优化|为核心模块补充单元测试、优化测试用例等|
#### 作用域说明

可选，为项目核心模块/目录，便于快速识别修改范围，主要包括：

`core`/`ui`/`services`/`animations`/`island`/`tray`/`system_status`/`brightness`/`qss`/`icon`/`readme`

#### 合规示例

```Plain Text

feat(tray): 新增托盘右键退出菜单
fix(system_status): 修复Win10 WiFi状态检测失败
docs(readme): 补充Windows11兼容性说明
resource(icon): 替换蓝牙状态显示图标
refactor(services): 优化系统状态检测调用频率
style(qss): 调整灵动岛展开动画过渡效果
chore(requirements): 升级PySide6到6.6.0
test(brightness): 为亮度控制模块添加单元测试
```

#### 禁止示例

```Plain Text

fix: 修复Bug （描述模糊，无作用域）
update: 更新代码 （类型不规范，描述模糊）
feat: 新增功能并修复Bug （一个Commit对应多个任务）
```

## 文档与资源贡献规范

### 1. 文档贡献规范

项目文档均采用 **Markdown 格式**编写，遵循 GitHub 通用 Markdown 规范，同时满足以下要求：

1. **排版统一**：标题层级清晰（一级 `#`、二级 `##`）、列表/代码块格式统一，代码块添加语言标识（`python/`bash）；

2. **内容准确**：技术文档（如开发指南、模块说明）的代码示例可运行、注释清晰，与实际代码保持同步；

3. **信息完整**：安装/运行教程需明确 Windows 系统要求、Python 版本要求、依赖安装命令，补充常见排错方案；

4. **术语统一**：与项目代码中的术语保持一致，如“灵动岛主窗口”“系统托盘”“QSS 样式”“信号与槽”，避免歧义；

5. **简洁易懂**：使用直白的语言，避免过度专业的术语，便于新手理解，复杂操作搭配步骤说明/截图。

### 2. 资源贡献规范

#### 图标资源（`resources/icons/`）

1. **格式与尺寸**：统一使用 **PNG 格式**，透明背景，尺寸与现有图标保持一致，适配灵动岛胶囊设计；

2. **风格统一**：简约扁平化风格，与现有图标视觉效果匹配，避免花哨的设计；

3. **命名规范**：小写+下划线，与代码中的引用一致（如 `light.png`、`bluetooth.png`），禁止重名；

4. **版权合规**：确保图标资源为自己开发或使用开源无版权的资源，禁止提交侵权图标。

#### QSS 样式资源（`resources/styles/style.qss`）

1. **注释清晰**：新增/修改样式后，添加清晰的注释，说明样式对应的界面组件（如 `#IslandContainer` 灵动岛主体）；

2. **风格统一**：与现有样式的配色、圆角、字体保持一致，避免视觉冲突；

3. **轻量化**：避免过度复杂的样式效果，防止灵动岛界面渲染卡顿。

## 代码评审与合并规则

1. **评审时效**：项目维护者会在 **1-3 个工作日内** 评审提交的 PR，复杂需求（如 Windows API 深度适配、核心功能重构）会适当延长评审时间；

2. **评审重点**：代码规范（PEP8/项目专属规范）、PySide6 开发规范、Windows 兼容性、功能完整性、是否破坏原有功能、文档/资源是否同步更新；

3. **沟通协作**：评审过程中，若对评审意见有疑问，可在 PR 评论区友好沟通，维护者会耐心解答；

4. **合并标准**：PR 需满足**所有**以下条件，方可合并：

    - 代码符合本指南的开发与代码规范；

    - 本地运行测试通过，无 Bug、无崩溃，适配 Win10/Win11 基础版本；

    - 与原项目最新主分支无合并冲突；

    - PR 描述完整、关联对应 Issue，符合提交规范；

    - 至少 1 名项目维护者批准；

5. **后续操作**：PR 合并后，维护者会同步更新相关文档（如需要），贡献者可删除本地和远程的开发分支，并及时同步原项目主分支的最新代码；

6. **贡献记录**：所有有效贡献者的信息会被 GitHub 自动统计到项目贡献者列表，你的贡献会被永久记录在项目中。

## 常见问题与故障排除

### 1. 首次贡献不知道从何入手？

优先筛选标签为 `good first issue` 的任务，这类任务难度低、指引清晰，适合新手入门，例如：

- 文档错别字修改、安装教程补充；

- 图标资源优化、QSS 样式简单调整；

- 简单的 Bug 修复（如控制台小报错、文字显示错位）。

### 2. 提交 PR 后出现合并冲突怎么办？

同步原项目主分支代码到本地开发分支，手动解决冲突后重新提交推送：

```Bash

# 切换到你的开发分支
git checkout 你的分支名
# 拉取原项目主分支最新代码
git pull upstream main
# 手动解决代码冲突（标记为<<<<<<<的部分），保留核心逻辑
git add .
# 提交冲突解决
git commit -m "chore: resolve conflicts with main branch"
# 推送到个人 Fork 仓库，PR 会自动更新
git push origin 你的分支名
```

### 3. 本地运行项目时出现 ModuleNotFoundError？

该问题为**环境依赖未安装**，按以下步骤排查：

1. 确认使用的 Python 版本为 3.7+；

2. 按项目要求重新安装核心依赖：`pip install PySide6`；

3. 安装扩展依赖：`pip install comtypes screen_brightness_control`；

4. 确保在**项目根目录**执行 `python main.py`，避免直接运行子模块文件。

### 4. 开发时修改了代码，本地运行无效果？

常见原因及解决方法：

1. 未重启项目：PySide6 的 UI/代码修改后，需重启项目才能生效；

2. 缓存问题：删除项目根目录的 `__pycache__` 目录后，重新运行；

3. 路径错误：新增/修改的文件使用了绝对路径，改为**相对路径**后重试；

4. 分支错误：确认当前运行的是开发分支，而非主分支。

### 5. 托盘图标不显示/系统状态检测失败？

1. **托盘图标不显示**：检查 `resources/icons/controls/tray.png` 是否存在，图标文件是否损坏，路径是否正确；

2. **系统状态检测失败**：检查系统是否安装 PowerShell，以管理员身份运行项目，验证 PowerShell 命令是否能正常执行；

3. **亮度调节无反应**：以**管理员身份**运行项目，检查 `screen_brightness_control` 依赖是否安装成功。

### 6. 贡献的代码/资源有版权要求吗？

所有提交的代码、图标、文档等资源，必须**拥有合法版权**：

- 代码为自己开发，或基于 MIT 协议的开源代码修改；

- 图标/资源为自己开发，或使用开源无版权、可商用的资源；

禁止提交任何侵权内容，若因版权问题产生纠纷，由贡献者自行承担责任。

### 7. 可以为项目新增非 Windows 平台的适配代码吗？

目前项目的核心定位是**Windows 平台轻量化灵动岛控制中心**，依赖大量 Windows 专属 API（如 PowerShell 调用、Windows 托盘服务），暂不接受非 Windows 平台（如 Linux/Mac）的适配代码。

后续若有跨平台计划，会在项目 Issue 中公告，欢迎届时参与。

## 致谢

感谢每一位为 Python-island 项目做出贡献的开发者！开源的价值在于协作，项目的成长离不开你的每一次代码提交、每一个 Bug 反馈、每一份文档完善。

你的贡献会让 Python-island 变得更易用、更强大，为更多 Windows 用户提供优秀的灵动岛桌面体验。

如果有任何疑问，可在项目 Issue 中提问，或联系项目维护者，我们会尽力为你解答。

**Python-island 社区**

**2026**
> （注：文档部分内容可能由 AI 生成）
