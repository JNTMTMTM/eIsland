# 测试收集与 Windows 插件集成测试

根目录 `npm test` 收集 `src` 与 `plugins` 的 Vitest 测试。在 Windows 上，插件测试分为两个项目：

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

Playwright E2E 测试通过 `npm run test:e2e:run` 执行。`scripts/lint` 中的 `node:test` 测试通过 `npm run lint:config:test` 执行；它们使用独立运行器。
