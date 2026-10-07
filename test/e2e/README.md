# Electron E2E（Windows / macOS）

使用 Playwright 启动实际 Electron 主进程入口，运行构建后的 React 界面、preload、IPC 与文件存储。当前覆盖启动、独立窗口切换、待办新增/修改/完成/删除、重启恢复及跨窗口同步。

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

## 隔离边界

- `--mode e2e` 输出到 `out/e2e/`，不会覆盖常规构建；正式构建将测试开关固定为关闭，安装包也排除 `out/e2e/`。
- E2E 构建仅将直接导入的 SMTC、音量、亮度和应用图标插件替换为 `native.ts`。查询返回不可用，控制操作明确抛错；不验证真实 Windows DLL 或硬件行为。
- 实际主进程跳过托盘、引导、启动动画、剪贴板监听、Agent 状态服务、系统热键和更新初始化。其余窗口与 IPC 处理器仍使用业务代码。
- 每个测试在临时目录创建独立 `userData` 和 Chromium 会话；同一测试的重启保留数据，结束后删除目录。
- 在 Electron 默认 session 阻止 HTTP/HTTPS 请求，避免真实账号、天气或更新服务影响结果。需要联网的未来用例应使用明确的本地服务边界。
- 页面通过 URL 识别，UI 定位使用现有无障碍名称，并引用英文翻译资源。

## CI 与诊断

`.github/workflows/e2e.yml` 在 Windows 和 macOS 上串行运行同一套用例，以普通 `pull_request` 触发且仅授予仓库只读权限。

HTML 报告保存在 `playwright-report/`；每次启动的 trace、Electron 日志和失败截图保存在 `test-results/e2e/`。查看 trace：

```sh
npx playwright show-trace test-results/e2e/<test-directory>/trace-1.zip
```

这一层验证跨平台 Electron UI 和应用内部链路。原生窗口命中区域、真实屏幕光标、系统热键、媒体播放器及安装/更新仍需独立 Windows 测试。
