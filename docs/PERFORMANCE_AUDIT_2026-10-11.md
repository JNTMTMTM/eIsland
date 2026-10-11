# eIsland CPU 和内存性能审计与修复方案

审计日期：2026年10月11日。代码基线：017107a965080a80fd0b6dc247b3f2d47b6432be，package.json 版本 27.0.0。

F01–F18 的修复覆盖重复采集、隐藏界面更新、CLI 日志、聊天历史、媒体与大文件资源。每项使用独立的 `fix:` 提交，提交正文记录对应 F 编号。下面先列出实施结果，再保留基线问题和原始修复方案供复核。实际 CPU 百分比和内存 MB 收益仍需同条件发布版测量。

## 范围与证据

本次是客户端全链路静态审计，加局部真实代码的合成验证，覆盖 main、preload、renderer、shared、Windows 原生插件、窗口生命周期、打包入口和已有测试。源码清单包含 main 141、preload 22、renderer 1010、shared 5、Windows 插件 135 个源码或样式文件；这是检索覆盖清单，不代表每个文件都进行了同等深度的逐行审查。Windows 14 个插件均核对入口及当前接入情况。eisland-server、Mineradio 和 macOS 插件不属于本次 Windows 客户端运行负载。

- 已确认问题：源码调用链能证明重复工作、同步阻塞、无界集合或缺少应用级资源门控。
- 待实测收益：实际 CPU、Private Bytes、GPU 内存、卡顿和电量改善，需要修改前后的同条件发布版测量。
- 环境限制：检查时没有运行中的 eisland/Electron 客户端；没有启动真实用户配置，也没有改变设备音量等系统设置。
- npm/npx 启动器受到 NVM4306 信任检查限制；没有修改信任设置。实施阶段使用已安装 Node 直接运行项目内 Vitest、TypeScript 和 electron-vite 入口。
- 后续章节中的问题描述、原始行号和旧产物体积均对应审计基线；实施结果以本节后的修复表为准。

## 修复实施结果

| 编号 | 已实施变化 | 验证重点 |
| --- | --- | --- |
| F01 | 每轮共享一份 tasklist 快照，去重名称，停用后丢弃迟到结果 | 一轮一次查询，多 Agent 启停及并发共享 |
| F02 | 移除全局反节流参数；隐藏、透明背景暂停视频和 CSS 动画，恢复时同步播放状态 | 隐藏及透明度变化、循环视频恢复、业务提醒独立调度 |
| F03 | 窄字段订阅，时钟移到叶组件；无人使用或不可见时停止进度插值 | 无关状态不触发提交，日历仅跨日更新 |
| F04 | 配置读一次并订阅变更；主进程维护到期唤醒；TODO 事件同步，自动淡出停用时不轮询 | 到期、取消、休眠恢复、时区变化及清理 |
| F05 | Codex 日志在专用 Worker 按文件身份与偏移增量解析 | 10 MB 日志追加只读尾部，截断、轮转及停止 |
| F06 | CLI 热状态与通知只含摘要，正文落盘并以 64 KiB 分页读取；限制 HTTP、写队列和权限输入 | 大行、迟到详情、增量修订补齐、迁移备份、权限完整性 |
| F07 | 聊天索引与正文分离，首次打开 AI 页时迁移，按当前/运行会话加载正文 | 真实 Electron IndexedDB 迁移、失败重试及跨窗口切换 |
| F08 | 每会话最多每秒检查点，完成/取消立即保存，退出保存脏数据恢复日志 | 并行生产者、写入期间继续流式更新、最后 owner 释放 |
| F09 | 独立窗口按当前页面 React.lazy 加载 | 仅加载选中页面，加载提示四语言键校验 |
| F10 | 相册按可视行虚拟化；预取并发 4；缓存上限 128 张及 8 MiB 字符串内存 | 万项 DOM 首尾/resize、隐藏暂停、过期请求、时长排序 |
| F11 | 下载保留活动任务及最近 200 条结束记录；共享 8 个连接额度 | 连续完成、暂停、删除、分片失败后释放 |
| F12 | SMTC 原生事件发送版本化增量，时间线不重复携带封面 | 3000 次时间线事件零封面，真实 C# 构建 |
| F13 | 音量/亮度辅助进程异步执行，超时 5 秒，共享进行中读取与短缓存，合并写入末值 | 超时与失败、快速滑块、微任务边界末值不丢失 |
| F14 | SMTC 控制经 Worker 和按需子进程执行；4 秒硬截止，5 秒闲置退出，原生复用 STA | 真实卡死进程杀停/重建、100 次控制复用线程 |
| F15 | WebGPU 按需 configure，30 FPS，可见性门控，退出销毁资源并取消迟到初始化 | 600 帧一次 configure、240 Hz 输入限 30 FPS、100 轮释放 |
| F16 | 标题请求 3 秒覆盖响应头及正文，8 KiB 实际字节预算，替换/停用主动取消 | 正文不结束、超大 chunk、取消后不广播 |
| F17 | 壁纸/字体异步 I/O，受控 URL 流式读取；下载 30 秒/64 MiB；静态预览 2048 px、队列最多 4 项；背景导入串行且替换前校验；截图独立进程二进制返回 | 流式超限/旧背景保留，字体无 base64 复制，真实 Canvas 导出、截图硬杀/取消及 PNG 像素往返 |
| F18 | 邮件列表只取 envelope/flags/size；打开时拉取正文 MIME 部分并跳过附件，详情缓存 8 MiB | 列表不下载 source，UIDVALIDITY、并发去重与过期选择 |

全部 18 项修复合入后的最终全项目验证：1052 个测试文件通过，12572 项测试通过；5 个文件、82 项测试按仓库设置跳过，进程退出码为 0。生产构建退出码为 0。TypeScript 对照干净基线的 node/web 检查，无新增诊断；基线 node 93 条、web 167 条现有类型诊断仍导致该检查非零退出。四语言键对齐、插值变量和源码翻译引用检查通过。原生编译结果见下一节。

本次没有运行真实用户配置、修改实际系统音量/亮度或执行截图。原生检查使用编译、FFI 装载和合成像素；万项相册、IndexedDB、本地字体和 Canvas 图片转换使用隔离的 Electron 测试。8 小时浸泡、锁屏后的真实提醒、完整发布安装包及整棵进程树 CPU/Private Bytes A/B 尚待实机验收。

边界：活动 AI/CLI 生成、下载及提醒继续工作；旧 Claude 索引超过 64 MiB 时不自动整文件迁移，保留原件并禁止用空摘要覆盖；GIF、SVG、WebP 保留原始格式，压缩文件字节上限不代表这些格式全部解码后的像素内存上限；超大邮件正文按需打开且不进入缓存，单次展示仍占用正文自身的内存。未采用强制 GC 或清工作集来制造占用下降。

### 原生运行产物

根工作区的 node_modules 链接到本地 plugins，已直接重建这些实际加载的产物并校验新导出；编译生成的 DLL/EXE 不加入 Git。SMTC 两次修复版本从 26.0.1 升到 26.0.3，截图、音量、亮度从 26.0.3 升到 26.0.4，插件锁文件与根锁文件一致。

在各插件目录内执行：

| 插件 | 验证命令 |
| --- | --- |
| SMTC | `dotnet publish src/eIslandSmtcHelper.csproj -c Release -r win-x64` |
| SMTC ctypes | `dotnet publish smtc-ctypes/eIslandSmtcCtypes.csproj -c Release -r win-x64` |
| 截图 | `dotnet publish src/eIslandScreenshotHelper.csproj -c Release -r win-x64` |
| 音量 | `dotnet build src/eIslandVolumeHelper.csproj -c Release -r win-x64 -p:AppendRuntimeIdentifierToOutputPath=false` |
| 亮度 | `dotnet build src/eIslandBrightnessReader.csproj -c Release -r win-x64 -p:AppendRuntimeIdentifierToOutputPath=false` |

现有音量、亮度构建脚本的 RID 输出子目录与加载器搜索目录不一致，上述 override 确保更新实际使用目录；这个原有构建路径差异没有混入性能修复。五份产物构建均成功，新增 SMTC、截图导出及两个 EXE 的无硬件操作启动验证通过。

## 基线产物记录

审计时 out 目录的 HTML 产物时间为 2026年10月9日，以下只统计入口直接 script/modulepreload 和 stylesheet 引用，不是本次重新构建，也不是运行内存：

| 入口 | 直接 JS 文件数 | JS 字节数 | CSS 字节数 |
| --- | ---: | ---: | ---: |
| 主窗口 | 6 | 3,156,070 | 1,038,650 |
| 独立窗口 | 23 | 4,554,499 | 731,480 |
| 启动动画 | 4 | 1,242,432 | 1,624 |
| 引导 | 6 | 1,350,435 | 33,545 |

这些体积用于定位加载边界。磁盘体积、JS 堆、进程工作集和 GPU 内存不能互相等同。

## 修复优先顺序

P1 表示优先处理的结构性开销；P2 表示具体场景或长期运行问题。CPU 和内存列是影响方向，不是已测量的收益。

| 编号 | 优先级 | 问题 | 主要影响 |
| --- | --- | --- | --- |
| F01 | P1 | 外部 Agent 每轮重复启动 9 次 tasklist | 空闲 CPU、进程创建 |
| F02 | P1 | 全局关闭后台节流，背景视频缺少显式暂停策略 | 隐藏状态 CPU、GPU |
| F03 | P1 | 音乐进度整库订阅和根级秒钟更新 | renderer CPU |
| F04 | P2 | 闹钟、TODO、自动淡出重复读取和唤醒 | 空闲 CPU、IPC、I/O |
| F05 | P1 | 活跃 Codex 日志每次变更同步全量解析 | 主线程 CPU、卡顿 |
| F06 | P1 | CLI 详情无字节预算且重复编码和传输 | 主进程及界面内存、CPU |
| F07 | P1 | 每个 renderer 初始化全部 AI 聊天正文 | 冷启动及常驻内存 |
| F08 | P1 | 后台 AI 会话流式更新反复保存全历史 | CPU、主线程阻塞 |
| F09 | P1 | 独立窗口静态引入多种页面 | 冷启动及基础内存 |
| F10 | P1 | 相册全量预览、DOM 和排序 | 大相册 CPU、内存 |
| F11 | P2 | 下载引擎内部历史 Map 没有同步淘汰 | 长期运行内存 |
| F12 | P1 | SMTC 时间线变化仍在原生边界搬运封面 | 播放时 CPU、分配和 GC |
| F13 | P1 | 音量亮度在主线程同步启动辅助进程 | 交互卡顿、进程启动 |
| F14 | P1 | SMTC 控制在主线程同步建线程并等待 | 卡顿、线程创建 |
| F15 | P1 | WebGPU 每帧重配且卸载清理不完整 | 动画 CPU、GPU、资源滞留 |
| F16 | P2 | 剪贴板标题请求读取正文无完整超时 | 请求及引用累积 |
| F17 | P2 | 大壁纸和字体同步 I/O、base64 复制 | 峰值内存、卡顿 |
| F18 | P2 | 邮件列表下载并解析完整邮件 | 邮件场景 CPU、峰值内存 |

## 空闲和持续运行的 CPU

### F01 每轮只采集一份系统进程快照

[externalAgentWatcher.ts](E:/projects/eisland_p/eIsland/src/main/system/externalAgentWatcher.ts:31) 中有 9 个监控名称，包含大小写重复；默认每 4 秒执行一轮，第 81 行逐名称串行调用 hasAnyRunningProcess，没有命中后短路。[runningProcesses.ts](E:/projects/eisland_p/eIsland/src/main/system/runningProcesses.ts:413) 每次都重新执行 tasklist 并解析、排序全部结果。

当前每轮 9 次查询；如果每轮能在 4 秒内完成，约 135 次/分钟。已有 checkInFlight，慢轮次会跳过 tick。改成每轮一次查询可减少该路径 88.9% 的查询调用数，这不是总 CPU 降幅。

修复：一次获取 names snapshot，统一小写并去重后计算所有 Agent 的启停差集；共享进行中的查询。后续再按功能开关停止采集、闲置时适度退避，或基于实测采用原生进程快照。不要先给 9 次查询各加一个长期缓存来掩盖重复采集。

验收：同时启动或退出多个 Agent，事件正确且每轮仅一次进程枚举；ETW/Process Monitor 记录 tasklist 启动数量。

### F02 让隐藏界面和透明背景真正停工

[chromiumFlags.ts](E:/projects/eisland_p/eIsland/src/main/services/chromiumFlags.ts:39) 全局关闭 renderer backgrounding、后台计时器节流和被遮挡窗口的后台处理，第 58 行还关闭原生遮挡计算。[DynamicIslandBackground.tsx](E:/projects/eisland_p/eIsland/src/renderer/components/components/DynamicIslandBackground.tsx:59) 的视频默认 autoPlay；[useIslandBackgroundMediaController.ts](E:/projects/eisland_p/eIsland/src/renderer/components/hooks/useIslandBackgroundMediaController.ts:103) canplay 后播放，opacity 为 0 时也未显式暂停。独立窗口有相同的循环播放路径。实际隐藏时 Chromium 是否额外暂停仍应实测，不能仅凭源码断言每种隐藏场景都持续解码。

修复分两步：先由主进程提供窗口隐藏、最小化、屏幕锁定/解锁事件，结合当前标签、透明度和动画开关，显式暂停装饰视频及动画；再逐项 A/B 移除全局反节流开关。长时间隐藏可释放视频 src，仅保留 poster 与恢复所需状态。确需播放的音频独立保留。

闹钟和计时提醒必须先迁到主进程的到期调度，或提供可靠的后台调度路径，再允许 renderer 自由节流；不能只删开关后接受漏提醒。Electron 官方说明后台节流会影响动画、定时器及 Page Visibility，适合用作底层保障，而非替代业务生命周期管理。[WebPreferences](https://www.electronjs.org/docs/latest/api/structures/web-preferences)

验收：透明度为 0、隐藏、最小化、锁屏时装饰视频帧数停止增长；恢复后可继续播放；闹钟、下载、正在进行的 AI 回复和快捷键保持正确。

### F03 缩小音乐进度与时钟的更新范围

[useIslandNowPlayingSync.ts](E:/projects/eisland_p/eIsland/src/renderer/components/hooks/useIslandNowPlayingSync.ts:316) 播放时每 66ms 更新全局 currentPositionMs；[useIdle.ts](E:/projects/eisland_p/eIsland/src/renderer/components/states/idle/hooks/useIdle.ts:37) 整库订阅，idle 即使不显示进度也收到约 15Hz 更新。检索还发现多处仅取 actions 的无 selector 订阅。

另有 [useIslandTimeStrings.ts](E:/projects/eisland_p/eIsland/src/renderer/components/hooks/useIslandTimeStrings.ts:60) 每秒更新含秒时间并重新计算农历，[DynamicIsland.tsx](E:/projects/eisland_p/eIsland/src/renderer/components/DynamicIsland.tsx:108) 将其传入当前页面，形成根级秒更新。

修复：按需 selector/useShallow；只用 action 的组件保持稳定订阅。播放位置保存“基准位置、基准时刻、播放状态”，可见歌词/进度组件局部插值，隐藏后停止高频写 store。时钟下沉到叶子，HH:mm 按分钟边界刷新，农历按日期或时区变化刷新，只有显示秒的组件每秒刷新。

验收：音乐播放、歌词不可见时，idle 不再因位置更新产生约 900 次/分钟的提交；静态设置页面不再被根级时钟每分钟触发 60 次更新。验证跨日、时区变化、系统休眠和播放跳转。

已有主壳 selector 已排除 currentPositionMs，暂停及播放结束也会停止进度计时器；不能说整个主窗口每 66ms 全量重绘。

### F04 配置变化用事件，提醒用到期调度

[useIslandTimerAndAlarm.ts](E:/projects/eisland_p/eIsland/src/renderer/components/hooks/useIslandTimerAndAlarm.ts:125) 每秒读全部闹钟，有条目还读声音和通知设置；[useIdle.ts](E:/projects/eisland_p/eIsland/src/renderer/components/states/idle/hooks/useIdle.ts:48) 每两秒读取并解析全部 TODO 以统计 P0。[useIslandAutoDim.ts](E:/projects/eisland_p/eIsland/src/renderer/components/hooks/useIslandAutoDim.ts:74) 关闭功能后仍有每秒早退的计时器。

修复：配置只在启动和变更通知时读取；TODO 变更时更新计数；主进程维护最早到期闹钟，单个 timeout 唤醒，到期、修改和系统恢复时重新排程。自动淡出优先由交互事件与单次 timeout 驱动。保留跨窗口配置同步和明确的唤醒补偿语义。

验收：没有配置变化时不反复读闹钟/TODO；功能关闭后无对应 timer；隐藏、跨日、修改闹钟和休眠恢复都不漏提醒。

### F05 Codex 日志采用增量读取

[codexStatusService.ts](E:/projects/eisland_p/eIsland/src/main/system/codexStatusService.ts:172) 默认每 5 秒扫描，文件 mtime/size 改变后从头解析。[codexSessionParser.ts](E:/projects/eisland_p/eIsland/src/main/system/codexSessionParser.ts:305) 先遍历所有事件，再于第 370 行遍历全文件补详情。日志不断追加时，少量新增内容仍引起两遍完整 JSON 解析和历史排序。

修复：缓存文件身份、字节偏移和未完成尾行；只处理追加部分；截断、轮换时重建。监听文件变更并保留低频兜底；热力图增量累计。把重解析放到按需 worker，限定单批工作量，避免阻塞 Electron 主线程。worker 本身也占内存，应共享/按需使用。

验收：1、10、100MB 合成日志分别追加 1KB，读取量和工作量应主要跟追加内容相关；回归半行、轮换、乱序、去重和热力图。

已有 40 会话上限、mtime/size 缓存和分块读取；问题是变化文件反复全量解析，不是每轮重读所有文件。

## 内存驻留和数据复制

### F06 CLI 同时限制条数和字节

[codexSessionParser.ts](E:/projects/eisland_p/eIsland/src/main/system/codexSessionParser.ts:96) 详情 stringify 没有字节截断；事件同时保留正文、rawEvent 和 raw。[codexStatusService.ts](E:/projects/eisland_p/eIsland/src/main/system/codexStatusService.ts:222) 每轮对包含 sessions/events 的全快照 stringify/hash，变化后发送全部详情。

Claude 的 [claudeCodeStatusService.ts](E:/projects/eisland_p/eIsland/src/main/system/claudeCodeStatusService.ts:327) 也保存重复详情，第 809 行保留 raw，第 863 行累加 HTTP body 没有大小上限，第 463 行同步保存历史。限制 40 个会话或 40 条事件不足以约束大工具输出和 base64 图片。

修复：常驻只保留摘要、时间、状态及日志定位信息；详情点击后读取。移除 raw 的重复表示；设置单请求、单行、单详情、总缓存的字节预算，超限内容放外部存储或保留可展开引用。普通详情可截断，但权限请求的决策必要信息不能悄悄丢失。用版本号/脏标记替代全快照哈希，订阅者只收增量，持久化异步合并。

验收：大工具输出/base64 负载下 heap 与 IPC 字节量受预算约束；CLI 面板未打开时不广播完整详情；权限操作仍准确。

### F07 聊天正文按会话加载

[store/slices/index.ts](E:/projects/eisland_p/eIsland/src/renderer/store/slices/index.ts:34) 创建 store 时立即初始化 AI slice。[aiSlice.ts](E:/projects/eisland_p/eIsland/src/renderer/store/slices/aiSlice.ts:322) 解析所有 sessions 和 messages；第 373 行还读取旧 active messages。主窗口和独立窗口都导入该 store，所以 TODO 独立窗口也可能载入全部聊天正文。

修复：启动仅加载会话 id、标题、时间等索引；选择会话时异步读正文；只保留当前、运行中及少量最近会话，缓存按字节而非条数封顶。大工具结果、图片和附件使用引用。迁移到按会话的 IndexedDB 或主进程文件存储，迁移验证成功后清理 legacy 副本，保证恢复与导出能力。

验收：大量历史存在时，冷启动和 TODO 独立窗口的内存增长主要来自索引；退出聊天后非运行会话正文可回收。这里是提前加载和驻留，不是已证明的永久泄漏。

### F08 后台流式会话不能每次保存全库

[aiSlice.ts](E:/projects/eisland_p/eIsland/src/renderer/store/slices/aiSlice.ts:506) 只要目标会话不是当前会话，就会调用 saveAiChatSessions；[useChatSend.ts](E:/projects/eisland_p/eIsland/src/renderer/components/states/maxExpand/components/agent/hooks/useChatSend.ts:327) 的 think 增量能进入此路径。切换会话还会把全局 aiChatStreaming 设为 false，进一步放大同步持久化。

真实 createAiSlice 加内存 localStorage 替身、初始40会话/2000条合成消息的局部验证显示：当前会话 streaming 更新 0 次写入；10 次后台会话更新触发 30 次 setItem、累计处理 21,284,910 个写入字符串字符。替身不包含真实磁盘 I/O，该结果证明放大路径，不代表实机 CPU 百分比。

修复：复用已有 SESSION_STREAMING_IDS，将每会话的 streaming 状态正确传递到持久化层；chunk 只更新内存；按会话合并，500–1000ms checkpoint，并在结束、中止、退出时 flush；落盘只写变化会话，避免重复写 active messages。与 F07 合并实施。

验收：A 会话生成中切到 B，再以 100 chunks/s 更新 A，持久化频率有上限，单次保存量不随所有历史增长，A/B 的状态与恢复正确。

### F09 独立窗口按页面拆分加载

[StandaloneWindowViewport.tsx](E:/projects/eisland_p/eIsland/src/renderer/components/components/StandaloneWindowViewport.tsx:28) 静态导入 TODO、倒数日、相册、邮件、设置、工具箱及多个登录页面。虽然只挂载 activeTab，启动时仍需加载静态依赖。现有产物的独立入口直接预加载 23 个 JS 文件是同方向的证据。

修复：独立窗口按 activeTab 使用 lazy/import 和轻量 Suspense；登录流程仅在需要时加载；公共工具文件不要反向引入完整业务页。主窗口状态路由也可逐步拆分低频页面，但优先保留 idle/hover 的即时响应。

验收：打开 TODO 独立窗口时，邮件、相册、设置大模块不进入初始执行图；测冷启动私有内存和可交互时间。动态 import 只延迟加载，已加载模块通常仍被缓存，不能承诺关闭标签后自动卸载所有代码。

MaxExpand 已默认启用性能模式并提供 lazy 页面，且 eager/lazy 都只挂载当前页，不能误报为“所有标签后台运行”。

### F10 相册只处理可视区

[useAlbumItems.ts](E:/projects/eisland_p/eIsland/src/renderer/components/states/maxExpand/components/album/hooks/useAlbumItems.ts:323) 将所有 items 的预览入队；有并发限制但无可视区筛选。每张缩略图完成都更新 metaCache；[AlbumOverview.tsx](E:/projects/eisland_p/eIsland/src/renderer/components/states/maxExpand/components/album/components/AlbumOverview.tsx:63) 全量创建条目 DOM；[useAlbumGridConfig.ts](E:/projects/eisland_p/eIsland/src/renderer/components/states/maxExpand/components/album/hooks/useAlbumGridConfig.ts:77) 随 metaCache 变化重新排序。

修复：虚拟网格加少量 overscan，仅可视区入队；移出区域取消未执行任务；缩略图磁盘缓存，受控协议 URL 传递，避免全部 base64 留在 JS；设置缓存字节上限；批量提交 metadata；名称/日期排序不要依赖所有缩略图状态。

验收：1万图片只渲染视口附近条目，首次打开不发1万次缩略图 IPC；滚动稳定后内存可封顶，首屏完成后 CPU 回落。

原图已只保留当前一张，关闭 viewer 会释放；已有队列并发控制、视频 IntersectionObserver 和卸载清理。需要补的是全量预览和 DOM 的规模问题。

### F11 下载任务的内外存储统一淘汰

[downloadEngine.ts](E:/projects/eisland_p/eIsland/src/main/core/downloadEngine.ts:89) 内部 tasks Map 在完成后仍保留任务。[download.ts](E:/projects/eisland_p/eIsland/src/main/ipc/app/download.ts:178) 仅把外层快照裁至 200，没有通知 engine；第 253 行对已被外层淘汰的 id 直接返回，无法再经删除 IPC 清理内部对象。

修复：engine 只保留活动/暂停任务；终态历史统一进入有界存储，明确重试与恢复所需字段。删除和淘汰同时处理两层所有权，不能淘汰尚在下载的任务。分片下载任一失败时，也应 abort 同组请求并等待句柄关闭；约束全局任务和连接并发。

验收：完成 1000 个小文件后集合及 retained heap 不随累计下载数继续增长；失败分片不留下网络请求或文件句柄。文件已流式落盘、进度已节流，不是整文件常驻内存问题。

## 原生调用和动画

### F12 SMTC 原生边界改为增量消息

[smtc-monitor.js](E:/projects/eisland_p/eIsland/plugins/windows/eisland-windows-smtc-helper/smtc-monitor.js:108) 检测到变化后调用 get_all_sessions；[SmtcSessionMonitor.cs](E:/projects/eisland_p/eIsland/plugins/windows/eisland-windows-smtc-helper/src/SmtcSessionMonitor.cs:175) 序列化所有会话，包含完整封面。timeline 每会话 200ms 节流，播放中仍可反复复制未变化封面。[smtcWorker.ts](E:/projects/eisland_p/eIsland/src/main/smtcWorker.ts:79) 在新增/媒体变化时还会再读全部会话补信息。

修复：按会话和变化类型传版本化 delta；timeline 只传位置、时间与状态；封面仅变化时读取，提供封面 ID 或本地资源 URL，下采样并限制总缓存字节；首次事件带齐信息，消除二次查询。白名单过滤尽量下推，但保留轻量的会话发现。

验收：同一封面播放10分钟，封面跨原生边界的传输次数不随 timeline 增长；记录 native JSON 字节数、Worker CPU 和 GC。100ms 的变化计数检查本身较轻，不等同于每100ms重新读取全部系统媒体。

封面已有8MiB单图上限，timeline 已复用 metadata，Worker→main 的纯时间线消息已省略封面。修复点是更上游的 native→FFI 边界。

### F13 亮度和音量不在主线程同步启动 EXE

[brightness index.js](E:/projects/eisland_p/eIsland/plugins/windows/eisland-windows-brightness-helper/index.js:53) 和 [volume index.js](E:/projects/eisland_p/eIsland/plugins/windows/eisland-windows-volume-helper/index.js:43) 每次调用同步启动 helper，超时为5秒；[system.ts](E:/projects/eisland_p/eIsland/src/main/ipc/system/system.ts:376) 直接在主进程处理。切静音需要先 get 再 set，可能两次启动。

修复先用异步 execFile 或 worker，加 single-flight、短期读取缓存、只保留最后目标值的设置队列。再用实测决定是否采用 native API 或按需启动且空闲退出的 broker。不要无条件新增永久 .NET 子进程，否则可能增加静置内存。

验收：helper 故障/超时时主窗口仍响应；滑块不排队执行过期值；统计每次操作的辅助进程启动次数。现有滑块已 debounce，不能说每个 pointermove 都启动进程。

### F14 SMTC 控制复用 Worker 和 STA 调度线程

[media.ts](E:/projects/eisland_p/eIsland/src/main/ipc/media/media.ts:98) 的控制和时间戳查询走同步 FFI；[SmtcExports.cs](E:/projects/eisland_p/eIsland/plugins/windows/eisland-windows-smtc-helper/src/SmtcExports.cs:52) 每次 new Thread，再 Join 等待 WinRT 调用完成，没有等待超时。

修复：所有控制路由到已有 SMTC Worker，使用 requestId、deadline、取消/丢弃过期回应；复用 STA 线程和 session manager；seek 合并末值；时间戳优先使用可靠的现有状态，需校准时异步刷新。超时设计应允许故障 worker 重建，单靠 Promise 超时不能终止卡死的原生操作。

验收：播放器接口不返回时，窗口仍响应且请求有截止时间；100次操作后线程数回落；切换播放器不会套用旧响应。时间戳当前用于校准，并非高频轮询。

### F15 WebGPU 只在必要时配置并完整释放

[webgpu.ts](E:/projects/eisland_p/eIsland/src/renderer/components/components/DynamicIslandAgentInputBall/utils/webgpu.ts:129) 每帧 unconfigure/configure；[useWebGPURenderer.ts](E:/projects/eisland_p/eIsland/src/renderer/components/components/DynamicIslandAgentInputBall/hooks/useWebGPURenderer.ts:85) 异步初始化后不验证 effect 是否仍有效，第147行卸载只取消 rAF，没有明确销毁 buffer/device。

修复：初始化或配置变化时才 configure，尺寸变化按 ResizeObserver 处理；可见时设置30fps省电档/60fps质量档；停止渲染与真正卸载分别管理，卸载 dispose GPU 资源。使用 generation token，迟到的初始化结果立即释放；初始化中途失败也清理已创建资源。

验收：同尺寸600帧 configure 次数保持常数；进入/退出100次后设备、buffer、GPU内存回落；初始化期间关闭不会留下渲染循环。当前证据支持资源滞留/竞态风险，尚不能宣称永久 GPU 泄漏。

## 网络和大资源场景

### F16 剪贴板标题请求设置完整生命周期上限

[urlWatcher.ts](E:/projects/eisland_p/eIsland/src/main/clipboard/urlWatcher.ts:54) 超时在收到响应头后就清除，随后 reader.read 可能长期等待；新 URL 可继续产生请求，stop 只清 timer。

修复：超时覆盖响应头和正文，finally 清理 timer/reader；限制进行中的请求，新请求替代旧请求或有限排队；stop abort 所有请求并清引用；通过请求版本号或启用状态检查丢弃取消后的迟到结果；按实际 chunk 截取剩余字节预算。进一步可通过剪贴板序列号或事件避免每秒读取不变的大文本。

验收：本地测试服务器只发响应头、不发正文，3秒左右结束请求；连续复制URL后停用功能，无残留请求或迟到通知。原有8192字节循环目标不是单个大chunk的严格截断，应一并修复。

### F17 大资源用异步流和受控本地 URL

[wallpaper.ts](E:/projects/eisland_p/eIsland/src/main/ipc/window/wallpaper.ts:233) 视频用 copyFileSync；第251、267、286行读取完整字体/图片并转base64；第94行网络壁纸 arrayBuffer 没有实际接收字节上限。

修复：异步流式复制与下载；使用校验过路径和权限边界的本地资源协议，IPC传URL；图片限制像素和压缩字节，并按显示尺寸生成版本；解码/转码放受控 worker。限制任务并发，保证取消后关闭流和删除未完成临时文件。

截图另有 [screenshotHelper.ts](E:/projects/eisland_p/eIsland/src/main/window/screenshotHelper.ts:118) 同步FFI，以及整虚拟桌面位图、PNG、base64转换的瞬时峰值；适合移至worker、二进制传输、并发限制为1。不要把截图峰值当作闲置负载。

验收：大视频、大字体和多显示器截图时，主线程不因同步复制/压缩冻结，IPC不再搬运无必要的整文件base64。相册视频已有Range流式读取，不需要重写成全量缓存。

### F18 邮件列表只获取摘要

[mail.ts](E:/projects/eisland_p/eIsland/src/main/ipc/app/mail.ts:241) 列表逐封 fetchOne(source:true)，第162行对完整source进行simpleParser；附件也可能进入下载/解析峰值，缓存正文再经IPC。200封是条数预算，不能约束字节规模。

修复：列表只取envelope、flags、size与必要preview；打开邮件才取正文，附件按需流式保存。索引与详情缓存分离，详情按字节LRU；分页读取，异步原子落盘。

验收：含20–100MB附件的合成邮件，打开列表不下载附件/完整正文；详情打开峰值受预算约束。库已动态import、请求串行、连接finally logout，所以不是未使用邮件时的常驻开销。

## 生命周期与缓存的统一规则

最大程度降占用需要明确每类工作的所有者，避免仅把轮询周期拉长。

| 状态或数据 | 建议规则 |
| --- | --- |
| 可见且正在交互 | 仅当前页动画和数据采集；交互事件合并，设并发上限 |
| 可见idle | 保留必要状态发现；时钟按显示精度更新；无消费者不写高频进度 |
| 窗口隐藏或屏幕锁定 | 停装饰动画、预览生成、无订阅者的硬件查询和详情广播 |
| 正在下载、生成回复、等待闹钟 | 业务任务继续；只暂停无必要UI刷新，完成状态可恢复 |
| 长时间无使用 | 释放OCR、GPU资源、非当前会话正文及大媒体缓存；按需helper退出 |
| 缓存 | 同时有条数、总字节、TTL/淘汰和dispose；活动任务不被普通LRU淘汰 |
| 异步初始化 | generation token；取消后迟到结果也释放；同一任务共享in-flight |
| 跨窗口 | 主进程采集一次；按窗口订阅发送最小变更，避免各自解析完整历史 |

保留硬件加速作为默认基线，通过减少帧数和解码量降耗。迁到worker主要解决卡顿，不自动降低总CPU；新增常驻worker/helper可能增加内存。清工作集、强制频繁GC、限制V8堆等办法不应替代消除引用和重复工作。

## 已有优化与低优先级事项

- MaxExpand 默认性能模式为true，已有按页lazy；两种内容模式都只挂载当前页。
- OCR已有共享初始化、取消/退出清理、空闲60秒terminate。
- 性能面板当前使用systeminformation，手动开始、2秒轮询、有in-flight和document.hidden暂停；GPU/温度15秒、文件系统10秒、磁盘60秒缓存已存在。查询失败的null结果可补短期失败退避，避免故障机器连续重量查询。
- SMTC有事件解绑、native字符串释放和封面上限；图标与截图都有GDI finally清理。本次未确认当前启用路径存在持续的原生句柄硬泄漏。
- 进程图标缓存已有240条上限；相册原图释放、媒体队列并发和视频可视区控制已存在。
- 汽水音频已有128MB输入、串行解密、队列/token/TTL/磁盘预算；同步解密可移worker减少卡顿，CPU总量是否下降需另测。
- 同步store读写和逐条appendFileSync日志适合在确认高频调用后批量化，避免一次性重构所有I/O。
- 两个WAV闹钟资源合计59,754,936字节，约57MiB磁盘体积。音频在使用时才创建，不能算作默认启动就占57MiB内存。可评估压缩格式、短循环片段和停止后空闲释放src；需要比较解码CPU、响铃延迟和实际内存。
- Claude transcript补全可按文件版本合并读取；会话淘汰时同时清cwd/transcript索引，防止小对象长期积累。

Windows插件当前接入检查：

| 插件 | 当前运行归因 |
| --- | --- |
| smtc-helper | 正常启动的核心媒体路径，优先F12/F14 |
| brightness-helper、volume-helper | 页面/控制操作按需调用，优先F13 |
| application-icon-helper、screenshot-helper | 图标及截图按需路径，优化冷加载和瞬时峰值 |
| fullscreen-detector | 自动全屏隐藏启用后按需检测，已有门控 |
| bluetooth-helper、wifi-helper、power-helper、toast-listener | 当前src无直接调用，不能归因于默认闲置占用 |
| performance-monitor、hardware-info-helper | 当前src无直接调用；避免把同步温度EXE重新接入高频面板 |
| processes-attacker | 当前src无调用、按需动作，没有为审计执行它 |
| volume-analyzer | 存在扩展打包路径，当前src无直接调用；启用场景另测 |

音频分析扩展日后启用时，应检查10ms采集唤醒、FFT数组分配及全排序；停止等待超时后还可能有线程访问待关闭句柄。此项不作为基础客户端现有常驻负载的结论。

## 原始分阶段方案与后续实机验收

### 第一阶段 建立基线并修复低风险重复工作

先恢复受信任的构建工具链，再建立发布版基线。实施F01、F03的selector和时钟拆分、F04配置缓存、F08每会话保存节流、F11淘汰一致性、F16请求取消。分别提交以便A/B和回滚，不把功能重写捆绑进同一变更。

验收优先使用确定性指标：每轮进程枚举从9变1、无关进度提交为0、未变化配置不重复读取、后台流式保存频率有上限、下载集合有界、标题请求可取消。

### 第二阶段 压低常驻与历史数据内存

实施F05/F06增量日志和详情预算、F07按会话加载、F09独立入口lazy、F10相册虚拟化。迁移历史数据时保留备份与幂等版本标记，确认迁移成功再删除旧格式。限制详情与缓存不会改变原始用户数据的完整性。

验收：空闲内存不跟历史正文总量线性增长；小幅日志追加不重解析完整文件；大相册只处理视口附近数据；第二个窗口不再额外加载完整AI正文。

### 第三阶段 原生和GPU路径

实施F12媒体delta、F13/F14异步控制、F15GPU清理，再完善F02的应用可见性和后台节流策略。修改plugins目录时遵循仓库要求提升对应插件版本并验证发布产物；涉及设置和用户可见能力的改动同步中英文翻译及服务端Agent提示描述。

验收：媒体时间线不再带封面、helper超时不阻塞窗口、GPU资源反复开关可回收、隐藏后的装饰帧停止。降低背景刷新不应以漏闹钟、丢回复或中断下载为代价。

### 第四阶段 大文件和长期运行

实施F17/F18，按profile补日志批处理、音频资源和截图优化。执行8小时浸泡与100轮页面/窗口开关，检查内存斜率、句柄、线程和遗留请求。若已消除应用级浪费后仍不满足内存预算，再评估缩减独立renderer、可选重功能进程化等较大改造；当前证据不足以推荐立刻重写桌面框架。

### 测量口径

使用发布构建、独立临时userData、固定机器/分辨率/刷新率/电源模式，关闭DevTools和性能监控页本身，分别跑至少3次。每场景先预热60秒，再采样5分钟，报告中位数和P95；冷启动单独测。

| 场景 | 核心观察 |
| --- | --- |
| 无音乐、默认idle | 总CPU、空闲唤醒、tasklist/helper创建次数、私有内存 |
| 隐藏、最小化、锁屏 | renderer CPU、视频帧数、GPU活动；业务提醒正确 |
| 播放音乐，歌词关闭及开启 | React提交数、native JSON字节率、GC、歌词同步 |
| TODO独立窗口 | 增量私有内存、初始模块、是否加载AI正文 |
| AI长历史及A生成后切B | heap、保存次数/字节量、UI长任务 |
| 活跃CLI长日志 | 每轮读取字节、解析时间、IPC流量 |
| 1万图片相册 | DOM数、thumbnail请求数、缓存字节、滚动帧时间 |
| 1000个下载及分片失败 | Map大小、连接和句柄回收 |
| 大邮件、大截图、大壁纸 | 瞬时内存、主线程阻塞、取消后回落 |
| 8小时及100轮开关 | retained heap、Private Bytes趋势、线程/句柄是否稳定 |

通过app.getAppMetrics采集Electron进程指标，统一一个采样者，避免多处调用扰动CPU采样区间；外部.NET/helper/tasklist不一定完整包含在该集合，需按PID及创建时间跟踪整棵进程树，短命进程用ETW累计。内存同时报告Private Bytes、私有工作集、JS堆和GPU数据，不简单相加共享工作集。CPU同时保留原始值与按逻辑核数归一化的整机百分比。[Electron app指标](https://www.electronjs.org/docs/latest/api/app#appgetappmetrics) [Electron进程内存](https://www.electronjs.org/docs/latest/api/process#processgetprocessmemoryinfo)

产品级CPU/MB目标应在基线后确定；当前可承诺的是修复可验证的重复工作和资源所有权，而非未经测量的总占用降幅。Electron官方也建议以profile定位最耗资源的路径、延迟不必要加载，并避免阻塞主线程。[Electron性能指南](https://www.electronjs.org/docs/latest/tutorial/performance)


## 基线合成验证复现

以下命令用于原始基线复现，修复后聊天存储已改为异步按需加载，不能直接用旧脚本评估新实现。仅在基线临时工作树中运行，只使用合成聊天和内存localStorage替身；不接触浏览器或真实用户聊天。直接导入真实createAiSlice，使用已安装Node执行，不调用被NVM拦截的npm/npx。

```powershell
Set-Location -LiteralPath 'E:\projects\eisland_p\eIsland'
@'
import { createAiSlice } from './src/renderer/store/slices/aiSlice.ts';
const sourceSessions = Array.from({length: 40}, (_, s) => ({
  id: 's'+s, title: 'synthetic', updatedAt: 1,
  messages: Array.from({length: 50}, (_, m) => ({
    role: m % 2 ? 'assistant' : 'user',
    content: String(s)+':'+String(m)+':'+ 'x'.repeat(1000)
  }))
}));
const values = new Map([
  ['eIsland_aiChatSessions', JSON.stringify(sourceSessions)],
  ['eIsland_aiChatMessages', JSON.stringify(sourceSessions[0].messages)],
  ['eIsland_aiActiveChatSessionId', 's0']
]);
let writes = 0, chars = 0;
globalThis.localStorage = {
  getItem: k => values.get(k) ?? null,
  setItem: (k,v) => { writes++; chars += v.length; values.set(k, v); }
};
let state;
state = createAiSlice(
  patch => { state = {...state, ...(typeof patch === 'function' ? patch(state) : patch)}; },
  () => state
);
state.setAiChatStreaming(true);
state.setAiChatSessionMessages('s0', [
  ...state.aiChatMessages, {role:'assistant', content:'foreground chunk'}
]);
const foregroundWrites = writes;
writes = 0; chars = 0;
for (let i=0;i<10;i++) {
  state.setAiChatSessionMessages('s1', [
    ...sourceSessions[1].messages,
    {role:'assistant', content:'background chunk '+i}
  ]);
}
console.log(JSON.stringify({
  syntheticOnly:true, foregroundWrites, backgroundUpdates:10,
  backgroundStorageWrites:writes, totalSetItemValueCharacters:chars
}));
'@ | node --input-type=module
```

已执行的等价诊断结果为前台0次写入、后台30次写入、累计21,284,910字符。初始2000条消息，前台/后台会话各增一条后为2002条；后台10次更新替换同一条消息。字符总数包含sessions JSON、active messages JSON和active id，既不是UTF-8字节数，也不是实际磁盘写入量。此合成诊断不是Electron界面测试或完整Vitest通过证明。

原始审计的 npm run build 与 npx vitest 尝试被 NVM4306 拒绝。实施阶段的验证命令改用以下已有工具入口（不变更启动器信任设置）：

```powershell
node node_modules/vitest/vitest.mjs run --reporter=dot
node node_modules/electron-vite/bin/electron-vite.js build
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json --composite false
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.web.json --composite false
```
