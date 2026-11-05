# 测试收集与 Windows 插件集成测试

根目录 `npm test` 执行共享代码、渲染层、开发 CLI 和插件单元测试，以及原生 Tauri API 契约测试和 Rust 服务单元测试。在 Windows 上，插件测试分为两个项目：

- `plugins`：不依赖真实设备的单元测试，包括 Runtime fixture、FFI loader、打包路径和模拟轮询测试。
- `plugins-integration`：加载真实 Windows 插件的测试，串行执行，并在单元测试阶段结束后开始。需要 Windows x64、Node.js 24.22.1、.NET 10 SDK 和 Visual Studio 2022 C++ 构建工具。

首次执行真实插件测试前，先构建所需依赖：

```powershell
npm ci --ignore-scripts
npm run test:plugins:build
npm run test:plugins
```

构建命令会编译测试使用的 13 个插件，并检查 DLL、EXE 和 `.node` 文件是否出现在加载器要求的路径。缺少产物会直接报错。

```powershell
npm run test:plugins:unit         # 仅运行不依赖设备的插件测试
npm run test:plugins:integration  # 仅运行真实 Windows 插件测试
npm run test:discovery            # 检查源码和插件测试是否全部收集，且每个文件只执行一次
```

CI 的 `plugins` 矩阵任务安装 .NET SDK、构建原生依赖、检查收集完整性，并运行以上两个 Vitest 项目。其他平台仅运行 `plugins` 项目；真实 Windows 插件测试和完整收集检查由 Windows CI 执行。

真实插件测试会查询设备、截图和调用系统媒体控制；亮度测试会在结束时恢复初始亮度。设备相关断言由各测试负责处理。

通知测试每次读取前都会检查访问权限。未授权时，原生 API 的 `Failed to get Windows notifications.` 错误记为不可读取（通知数量为 `null`），测试仍会验证权限和监听状态。已授权时的读取失败、其他异常及无效返回结构仍会使测试失败；CI 不弹出授权对话框。

原生桌面端到端测试通过 `npm run test:e2e` 执行，先构建 `npm run plugins:build` 和 `npm run build:e2e`。该测试连接真实 WebView2，覆盖窗口、音乐、AI 流式响应和工具幂等。运行下载与本地资源范围请求测试前，必须设置 `EISLAND_SMOKE_BINARY` 指向启用 custom-protocol 的 Tauri 可执行文件；未设置时该服务测试会跳过。CI 已显式设置此变量。

所有原生桌面套件共用 `scripts/native/cdp.mjs`：等待 WebView2 冷启动最多 60 秒，每次 CDP 连接最多 1 秒，进程退出或启动失败会提前终止。失败信息包含端点、PID、退出状态和启动阶段；冒烟输出目录中的 `native-stderr.log` 会随 CI 诊断产物保存。端口拒绝只表示调试端点尚未就绪，不能仅凭同一日志中的硬件枚举错误认定应用崩溃。连接等待、退出及错误契约包含在 `npm run test:api` 中。

性能采样验收通过调试接口确认后台采样已完成，并在采样期间检查普通 IPC 响应。最大频率、温度及 GPU 负载属于可选读数，在虚拟机或不支持的设备上允许为 `null`；可用数值仍须满足范围约束。轮询超时会保留最后结果，以区分后台任务未完成与硬件读数不可用。

文件图标验收检查并发后台请求返回有效 PNG、缺失文件返回 `null`，Rust 测试覆盖新线程与调用方已有 STA/MTA 的 COM 生命周期。有效图标提取失败会使图标子测试失败，并保留 Shell 返回空句柄和绘制失败的回归覆盖。

`npm run test:api` 验证原生前端 API、运行入口和原生发布工具；`npm run test:rust` 验证 Rust 原生服务。`scripts/lint` 中的 `node:test` 测试通过 `npm run lint:config:test` 执行，测试收集检查通过 `npm run test:discovery` 执行。
