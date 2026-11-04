# Tauri 原生系统服务

`npm run dev` 继续启动 Electron；`npm run dev:tauri` 启动 Tauri。

## 构建和运行

Windows 开发环境需要 Rust MSVC 工具链、C++ Build Tools、.NET 10 SDK 和 WebView2。`dev:tauri` 与 `build:tauri` 会先运行 `native:tauri`，然后构建页面和 Rust 宿主。

`npm run native:tauri` 发布现有插件到忽略提交的 `src-tauri/resources/native/<RID>`。音量和亮度采用自包含发布，必须携带完整的发布目录；SMTC 只携带发布后的 Native AOT DLL，不能替换为构建中间目录的托管 DLL。Tauri 的资源映射将这些目录打包到 `native/<RID>`。开发调试允许回退到源码工作区生成目录，release 只读取应用资源目录。

已实测 Windows x64。ARM64/x86 的发布和设备兼容性需要对应平台验证。其他平台本阶段未接入这些 Windows 插件。

## 接入方式

- `services/smtc.rs` 通过 C ABI 加载现有 SMTC DLL，使用 DLL 自身的释放函数回收返回字符串。库保持加载到进程退出，避免在 Native AOT 线程存活时卸载。
- SMTC 监听在独立线程等待原生变化，消费增量队列；初次读取完整快照。时间线更新不复制和发送封面，初始读取、元数据/封面变化、源切换及恢复播放时携带封面。保留秒到毫秒的转换、采样时间、白名单与切源确认。
- 播放、暂停、切歌及跳转在线程池执行，源选择和命令调用串行化。限制排队数量，并拒绝超时或来源已经变化的排队命令。FFI 调用超时不能硬终止已经进入 DLL 的操作；DLL 自身的调用超时仍是最终边界。
- 音量/静音与亮度通过既有 JSON EXE 协议调用。查询/写入使用后台异步进程、5 秒超时及输出限制；滑块合并未发送目标，同一设备控制串行写入。事件监听进程在有效时更新读取缓存，错误时使缓存失效；监听异常重启有次数限制。
- 系统调用与窗口调用使用独立的桥接执行路径。慢速查询不会占用窗口过渡命令的顺序队列。
- 应用退出发出服务停止信号；辅助进程使用管道生命周期和 kill-on-drop，父进程退出后 stdin 关闭，监听程序结束。

沿用原 React/preload 方法、返回结构和 `nowplaying:info` / `media:source-switch-request` 事件。`media:get-volume` / `media:set-volume` 继续保持旧 SMTC 的应用级音量占位语义；默认设备音量使用 `getVolume` / `setVolume`。系统功能仍包含两个 .NET 辅助进程及其运行时，尚未迁为纯 Rust。

本阶段不迁移歌词网络请求、音乐平台登录、性能监控等其他服务。服务端 Agent 已有音量/亮度能力和工具协议没有变化；未新增 UI 文案或翻译键，也未修改原生插件源码。

## 验证

```powershell
npm run native:tauri
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
node --test scripts/tauri/bridge.test.mjs
```

构建内嵌页面版本后，`node scripts/tauri/smoke.mjs --packaged --system` 会在真实 WebView2 中验证 DLL 监听、辅助进程查询、白名单选择、时间戳及无效输入，并写回原音量/亮度值验证设置链路，不主动切歌或改变播放状态。结束后检查辅助进程退出。测试数据位于忽略提交的 `target/smoke`。

可以用 `EISLAND_SMOKE_BINARY` 指向独立测试二进制；测试构建使用不同的 Tauri identifier，避免与运行中的开发实例争抢单实例锁。`debug:system-services` 仅存在于 debug 构建，用于确认加载路径、监听就绪状态和错误。
