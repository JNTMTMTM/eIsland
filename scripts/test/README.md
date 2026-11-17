# 测试收集与原生桌面测试

根目录 `npm test` 执行共享代码、渲染层和开发 CLI 测试，以及原生 Tauri API 契约测试和 Rust 服务测试。Windows CI 的 CLI 任务通过 `npm run test:discovery` 检查桌面和 CLI 源码测试是否都被 Vitest 收集一次。

原生桌面端到端测试通过 `npm run test:e2e` 执行，先构建 `npm run plugins:build` 和 `npm run build:e2e`。该测试连接真实 WebView2，覆盖窗口、音乐、AI 流式响应和工具幂等。运行下载与本地资源范围请求测试前，必须设置 `EISLAND_SMOKE_BINARY` 指向启用 custom-protocol 的 Tauri 可执行文件；未设置时该服务测试会跳过。CI 已显式设置此变量。

所有原生桌面套件共用 `scripts/native/cdp.mjs`：等待 WebView2 冷启动最多 60 秒，每次 CDP 连接最多 1 秒，进程退出或启动失败会提前终止。失败信息包含端点、PID、退出状态和启动阶段；冒烟输出目录中的 `native-stderr.log` 会随 CI 诊断产物保存。端口拒绝只表示调试端点尚未就绪，不能仅凭同一日志中的硬件枚举错误认定应用崩溃。连接等待、退出及错误契约包含在 `npm run test:api` 中。

性能采样验收通过调试接口确认后台采样已完成，并在采样期间检查普通 IPC 响应。最大频率、温度及 GPU 负载属于可选读数，在虚拟机或不支持的设备上允许为 `null`；可用数值仍须满足范围约束。轮询超时会保留最后结果，以区分后台任务未完成与硬件读数不可用。

文件图标验收检查并发后台请求返回有效 PNG、缺失文件返回 `null`，Rust 测试覆盖新线程与调用方已有 STA/MTA 的 COM 生命周期。有效图标提取失败会使图标子测试失败，并保留 Shell 返回空句柄和绘制失败的回归覆盖。

COM 生命周期断言同时检查 apartment 类型和限定符：释放本线程的显式初始化后，允许未初始化或其他线程维持的隐式 MTA，仍拒绝残留的显式 STA/MTA。回归测试会主动保持另一线程的 MTA，验证图标提取与调用方初始化计数的平衡；无需串行化整套 Rust 测试。

`npm run test:api` 验证原生前端 API、运行入口和原生发布工具；`npm run test:rust` 验证 Rust 原生服务。`scripts/lint` 中的 `node:test` 测试通过 `npm run lint:config:test` 执行，测试收集检查通过 `npm run test:discovery` 执行。
