# Electron E2E（Windows / macOS）

源码、Playwright 配置、类型检查配置以及构建和报告产物均位于根目录 `e2e/`。

使用 Playwright 启动实际 Electron 主进程入口，运行构建后的 React 界面、preload、IPC 与文件存储。覆盖启动、独立窗口切换与重开、待办 CRUD、倒数日编辑/删除、重启恢复及跨窗口同步。

```sh
# 首次安装：本地 Windows 插件的 os/cpu 声明需要 force，测试不会加载这些插件。
npm ci --ignore-scripts --force
node node_modules/electron/install.js
npm run test:e2e
```

只运行指定用例或调试已经构建的版本：

```sh
npm run build:e2e
npm run test:e2e:run -- --grep "restores"
npm run test:e2e:run -- --debug
npm run typecheck:e2e
```

Electron 自带 Chromium，无需运行 `playwright install`。本地运行需要已登录的图形桌面会话；Electron 始终会显示窗口。

## Windows 专用测试

Windows x64 安装 .NET 10 SDK、Native AOT 所需的 Visual Studio C++ 工具链后，运行：

```sh
npm run test:e2e:windows
```

此命令先编译真实插件，再以 `--mode e2e-windows` 构建隔离的 Electron 应用，运行全部 12 个用例。

| 文件 | 覆盖 |
|------|------|
| `desktop.spec.ts` | 5 个跨平台业务 UI 用例：启动、待办生命周期、跨窗口同步、独立窗口重开、倒数日生命周期 |
| `windows.spec.ts` | 原生 HWND 裁剪区域随展开/收缩变化、真实桌面光标触发 hover/离开、全局快捷键隐藏/恢复与注销 |
| `windows-native.spec.ts` | 真实 DLL 提取 PNG 图标与不存在路径、SMTC 状态查询、设备音量和屏幕亮度读写 |

Windows 输入探针使用系统自带的 Windows PowerShell 5.1 调用 Win32 `GetWindowRgn`、`SetCursorPos` 和 `SendInput`，并进行 DPI 坐标转换，无需安装 PowerShell 7。脚本以 UTF-8 BOM 保存，确保 5.1 正确解析中文注释。测试串行执行，结束后恢复光标；快捷键在 `finally` 中注销。

音量/亮度测试写回当前值。有 helper 启动或构建错误时测试失败；仅设备查询明确返回不可用时，控制用例带原因跳过，并在报告中保存设备探针结果。有音频和亮度设备的机器可以要求这两个用例必须通过：

```powershell
$env:EISLAND_E2E_REQUIRE_DEVICES = '1'
npm run test:e2e:windows
```

SMTC 用例只查询当前会话，不控制正在播放的个人媒体。媒体播放/暂停、安装和更新仍需专门的受控测试场景。

## 隔离边界

- `--mode e2e` 与 `--mode e2e-windows` 均输出到 `e2e/out/`；正式构建将测试开关固定为关闭；安装包只收集常规 `out/` 产物。
- 普通 E2E 构建将直接导入的 SMTC、音量、亮度和应用图标插件替换为 `native.ts`。Windows 原生构建保留真实插件；原生用例检查应用构建标记，避免把替身结果当成原生验证。
- 实际主进程跳过托盘、引导、启动动画、剪贴板监听、Agent 状态服务、默认系统热键和更新初始化。Windows 快捷键用例通过实际 IPC 显式注册专用测试快捷键。
- 每个测试在临时目录创建独立 `userData` 和 Chromium 会话；同一测试的重启保留数据，结束后删除目录。
- 在 Electron 默认 session 阻止 HTTP/HTTPS 请求，避免真实账号、天气或更新服务影响结果。需要联网的未来用例应使用明确的本地服务边界。
- 页面通过 URL 识别，UI 定位使用现有无障碍名称，并引用英文翻译资源。

## CI 与诊断

`.github/workflows/e2e.yml` 在 Windows 和 macOS 上分别以单 worker 串行运行，以普通 `pull_request` 触发且仅授予仓库只读权限。插件变更也会触发 E2E。Windows 使用 .NET 10 编译真实插件并运行全部用例；macOS 使用替身构建，仅运行 5 个业务 UI 用例，跳过 7 个 Windows 专用用例。

HTML 报告保存在 `e2e/playwright-report/`；每次启动的 trace、Electron 日志和失败截图保存在 `e2e/test-results/`。查看 trace：

```sh
npx playwright show-trace e2e/test-results/<test-directory>/trace-1.zip
```

Windows 托管 runner 缺少音频/亮度设备时，对应 2 个控制用例会明确跳过。原生窗口区域、光标、快捷键、图标和 SMTC 查询不以缺少这些设备为由跳过。
