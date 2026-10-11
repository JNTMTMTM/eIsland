# eisland-macos-media-helper

基于 Swift + Node-API 的 macOS 当前播放源插件，版本 **26.1.4**。提供媒体信息、封面、播放时间戳、监听事件及异步媒体控制。

支持 macOS 13+、Apple Silicon / Intel 和 Node-API 8。运行时不需要安装 Xcode、Swift 或 npm 原生构建工具；开发时需要 Xcode Command Line Tools。最低系统版本是构建目标，仍需在对应系统上实际验证。当前仓库以独立插件交付，尚未替换 eIsland 主应用中的 Windows 插件导入。

## 构建与验证

```sh
cd plugins/macos/eisland-macos-media-helper
npm ci
npm run build       # 当前架构
npm test            # Vitest，JS 单元测试 + 真实 Swift / Node-API 的隔离 Perl 测试源
npm run test:coverage        # V8：插件运行时 JS 覆盖率
npm run test:coverage:native # LLVM：Swift / C 原生覆盖率，仅 macOS
npm run smoke       # 输出歌曲元数据、封面 Base64 截取预览、播放状态、时长和位置
npm run build:all   # arm64 和 x64
npm pack            # 自动构建两种架构并打包
```

测试使用与主仓库一致的 Vitest 4.1，开发与 CI 建议使用 Node.js 22.12+。57 项测试包含 33 项 JS/API/加载器用例和 24 项真实原生测试，覆盖媒体查询、时间线、控制参数、监听、超时和 Worker 退出清理；所有用例在非 macOS 上跳过。新增用例覆盖默认客户端、顶层 API、ASAR、监听回调停止、错误去重、资源缺失、直接 Node-API 参数校验、封面保留与大小限制、异常输出等边界。在仓库根目录执行 `npm run test:plugins` 也会发现这些测试，macOS 上需先构建本插件。`npm run smoke` 保留为独立的真实系统读取脚本。

JS 报告位于 `coverage/js/index.html`，Swift / C 报告位于 `coverage/native/html/index.html`。原生覆盖率脚本需要先运行 `npm run build` 准备当前架构预编译文件和 Node 头文件；插桩产物写入 `build/native-coverage/`，不改写生产 prebuilds。覆盖率只统计插件拥有的运行时 JS、Swift 与 C 源码，不包含构建脚本、vendor 或系统框架。Git 已忽略报告和插桩产物。本机 arm64 上 JS 语句、函数和行覆盖率均为 100%，分支覆盖率为 99.11%；剩余一条分支是时间线更新时缓存缺失的防御性检查。Swift / C 合并行覆盖率为 92.21%，其中媒体 Swift 核心为 97.31%。原生剩余缺口包含进程启动失败、分配/Node-API 底层失败等路径。测试同时修复并验证了监听子进程退出时 stderr 读取尚未完成导致错误详情丢失的时序问题。

可通过 `NODE_INCLUDE_DIR` 指定包含 `node_api.h` 的头文件目录。未发现本机头文件时，构建脚本通过 node-gyp 下载当前 Node 版本的头文件。

## 使用

```js
const media = require('eisland-macos-media-helper');

async function main() {
  const status = await media.refresh();
  console.log(status.title, status.artist);

  const monitor = new media.MediaMonitor();
  monitor.on('error', (error) => console.error(error));
  monitor.on('session-added', (sourceAppId, properties) => {
    console.log(sourceAppId, properties);
  });
  monitor.on('session-media-changed', (sourceAppId, properties) => {
    console.log(sourceAppId, properties.title);
  });
  monitor.start();

  // 控制方法返回 Promise，调用方应等待结果并处理失败。
  const result = await media.seek(30);
  if (!result.success) console.error(result.error);

  // 在应用或 Worker 的正常退出路径释放资源。
  monitor.stop();
  media.shutdown();
}

main().catch((error) => console.error(error));
```

`SmtcMonitor` 是 `MediaMonitor` 的兼容别名。`getStatus()`、`getTimestamp()`、`getMediaSessions()` 同步读取缓存；首次 `refresh()` 或监听更新到达前，缓存为不可用。多个默认监控器共享一个监听进程，最后一个监控器停止后会释放进程并清空缓存。停止不会删除 JS 监听器，可以再次启动。

需要独立缓存时，使用 `new MediaClient(options)` 和 `new MediaMonitor(client)`，并在使用结束后调用 `client.close()`。每个 Node 环境分别拥有客户端，不能跨 Worker 传递实例。

## 查询与控制接口

| 接口 | 返回值 / 参数 |
| --- | --- |
| `refresh()` | `Promise<MediaStatus>`，主动查询；桥接失败时拒绝 Promise |
| `getStatus()` | `MediaStatus`，缓存状态 |
| `getTimestamp()` | `TimestampInfo`，不含封面与元数据 |
| `getMediaSessions()` | `SessionSnapshot[]`，长度为零或一 |
| `play()`、`pause()`、`next()`、`previous()`、`stop()` | `Promise<CommandResult>` |
| `seek(seconds)` | 非负、有限的秒单位位置 |
| `setShuffle(active)` | 布尔值；开启时使用曲目随机 |
| `setRepeatMode(mode)` | `0` 关闭、`1` 单曲、`2` 列表 |
| `setPlaybackRate(rate)` | 当前上游桥接只支持正整数速率；不支持 `1.25` 等小数 |
| `shutdown()` / `client.close()` | 关闭监听并取消后台查询 |

输入参数错误拒绝 Promise；有效请求的桥接失败返回 `{ success: false, error }`。`success: true` 只表示桥接成功发送命令，播放器是否执行需要通过后续状态验证。无当前播放源时不发送控制命令。技术错误文本用于诊断；主应用接入时应转换为本地化 UI 反馈。

`sourceAppId` 使用 Bundle ID，优先使用媒体宿主的 `parentApplicationBundleIdentifier`。`sourceAppUserModelId` 是兼容字段名，其值同样为 Bundle ID。播放事件使用 Windows 兼容状态值：`4` 播放、`5` 暂停；未知媒体类型为 `0`。不支持或未知的状态字段保持 `null`，目前 `controls` 为 `null`。

## 监控事件

- `session-added(sourceAppId, media)`
- `session-removed(sourceAppId)`
- `session-media-changed(sourceAppId, media)`
- `session-playback-changed(sourceAppId, playback)`
- `session-timeline-changed(sourceAppId, timeline)`
- `error(error)`

移除事件表示该源不再是当前可观测源，不表示播放器退出。此插件不会把历史缓存伪装成仍活跃的媒体会话，也不提供 Windows 式全会话枚举或指定源控制。所有控制命令作用于系统当前播放源。

原生监听更新 Swift 缓存。JS 每 100ms 检查版本号，仅在版本改变时读取包含封面的完整快照；播放位置另以轻量查询采样，变化至少 0.5 秒时发布。位置根据上游时间戳与单调时钟推算，暂停时冻结、超过时长时截断。实际精度仍取决于播放器报告的快照，不能承诺逐帧歌词同步。

单次请求默认超时 4000ms，可用 `timeoutMs` 设置为 100–30000ms。封面最多 8 MiB，桥接标准输出最多 12 MiB。异常退出清空监听缓存并报告错误，不无限重启；调用方可处理错误后重新启动监控。Node 环境退出时的原生清理钩子会取消子进程，强制 Worker 终止也包含清理。

## 媒体后端与分发限制

Apple 的公开 `MPNowPlayingInfoCenter` 用于发布自身应用的媒体信息，不能替代跨应用读取接口。本插件使用私有 MediaRemote，通过系统 `/usr/bin/perl` 加载固定版本的 [MediaRemote Adapter](https://github.com/ungive/mediaremote-adapter)。它解决了上游记录的 macOS 15.4 起直接从普通进程访问失效的问题；未来系统仍可能改变该行为。无播放源的 `null` 返回不能独立证明权限可用，应手动播放媒体后验证。

桥接源码及 BSD-3-Clause 许可证保留在 `vendor/`，版本信息见 `vendor/VENDORED.md`；构建出的框架与许可证随 npm 包交付。eIsland 自有代码使用 GPL-3.0-or-later。私有接口方案按站外分发规划，不能作为 Mac App Store 发布方案。

## Electron 打包

将此插件整个 `prebuilds` 目录解包，例如：

```json
{
  "asarUnpack": [
    "node_modules/eisland-macos-media-helper/prebuilds/**/*"
  ]
}
```

仅解包 `.node` 不够：Swift `.dylib`、桥接框架和 Perl 脚本都需要真实路径。加载器自动转换 `app.asar` 路径。也可以通过 `new MediaClient({ resourceDirectory })` 指定额外资源目录；目录中必须包含 `mediaremote-adapter.pl` 与 `MediaRemoteAdapter.framework`，原生模块仍从插件自带预编译目录加载。

构建脚本执行临时 ad-hoc 签名。发布 Electron 应用时，应使用自己的 Developer ID 重新签名插件原生代码与框架，再进行应用签名和公证。必须分别验证最终安装包中的资源定位、动态库加载、监听与退出清理；开发模式通过并不代表签名分发通过。桥接通过系统 `arch` 工具显式选择与原生模块一致的 Perl 架构，避免 Rosetta 下加载不同架构的框架；Rosetta 场景仍需实际验证。

## 后续主应用接入

当前实现没有改变主应用的用户功能或界面。接入时需增加平台适配入口，替换 `src/main/index.ts`、`src/main/ipc/media/media.ts`、`src/main/smtcWorker.ts` 的 Windows 插件导入，等待异步控制结果，并调整单当前播放源下的音源选择语义。根依赖及音量 IPC 中仍有其他 Windows 插件，需要独立处理平台加载。

涉及用户功能的接入还应按根 `AGENTS.md` 同步 `eisland-server/server` 的 agent prompts，以及新增 UI 的中英文翻译。当前 checkout 不包含该服务端目录，接入任务需先定位对应仓库。
