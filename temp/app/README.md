# eIsland 27.0.2 迁移助手

此目录是独立 Electron 应用，不是 Tauri 主工程恢复 Electron。它用于两跳更新：

```text
旧 Electron（版本 < 27.0.2）
  └─ 原 electron-updater 读取旧 latest.yml
       └─ 安装本助手 27.0.2，旧灵动岛业务暂时不再运行
            └─ 检测 → 用户确认 → 校验备份 → 下载 → 验证签名
                 └─ 用户打开交互式 NSIS → 确认注册版本和程序 → 启动 Tauri ≥27.0.3
```

助手不会在用户机器上自动结束其他进程、卸载旧程序、删除用户数据或执行静默安装。Tauri 之后的升级继续使用主工程官方 `tauri-plugin-updater`。

## 本地开发与检查

Windows x64，Node 24、Rust stable。仓库根目录先执行 `npm ci --ignore-scripts`，因为注释检查和 AWS/ESA 工具复用主工程实现；然后在本目录执行：

```powershell
npm ci --ignore-scripts
node node_modules/electron/install.js
npm run dev
```

独立检查命令：`npm run typecheck`、`npm run comment:check`、`npm run i18n:check`、`npm test`、`npm run test:coverage`、`npm run test:e2e`。E2E 使用随机临时数据目录及独立 Chromium profile；安装边界由服务测试替身验证，**不执行真实安装**。`test-results/welcome.png` 保存真实窗口截图。

`npm run package:preview` 生成 `test-results/preview/` 下带 `PREVIEW` 名称、独立安装标识的 NSIS/portable 包。没有 `latest.yml`，不能推送给旧客户端。未配置生产公钥时界面明确拒绝下载和安装。CI 只上传这些审查 artifact，不创建公开 Release 或更新源。

## 正式发布操作（仅说明，本任务不执行）

**先公开 Tauri 目标，再发布助手。不能先把用户更新到一个无目标可下载的助手。**

1. 在主工程统一 package、Cargo、Tauri 配置及清单版本为 **27.0.3** 或更高稳定版本，按主工程说明准备正式签名。当前仓库版本字段并不等于已发布 27.0.3，不能仅改助手中的最低版本来代替发布。
2. 根目录 `npm run package` → `npm run release:upload-only` 发布 Tauri 安装器、`.sig` 与官方 JSON 清单。根目录发布的是 `eisland-update/tauri/latest.json` 及现有 JSON 别名；不要手动拿 Tauri 安装器覆盖旧 Electron `latest.yml`。
3. 将同一正式签名身份的**公开密钥**配置到 `TAURI_UPDATER_PUBLIC_KEY`，或主工程 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。助手不需要更新私钥。随后在 **temp/app** 执行：

   ```powershell
   npm run package
   npm run release:upload-only -- --dry-run
   npm run release:upload-only
   ```

   也可在本目录 `npm run release`，等于正式打包后上传。**这些同名命令的工作目录很重要：根目录为 Tauri，本目录为 27.0.2 助手。** 正式打包会自动构建可信 Rust 签名验证器、main/preload/renderer，再生成 NSIS/portable；不重新构建 Tauri 主程序或它的原生插件。
4. 发布脚本复用根 `.env` 和 AWS CLI。沿用 COS/OSS，要求同时配置原 Electron R2 桶（`R2_*`，公开域名必须匹配历史 R2 地址）；复用 ESA 凭据 `ESA_ACCESS_KEY_ID`、`ESA_ACCESS_KEY_SECRET`、`ESA_ZONE_ID`。从历史 `src/main/ipc/app/config/updater.ts` 核对旧 ESA 清单入口为 CDN `/eisland-update/latest.yml`；桶内对象仍沿用旧上传脚本的根目录。CDN 源站重写必须映射这些根对象。若线上配置另有变化，设置 `EISLAND_ADAPTER_ESA_MANIFEST_URL` 为旧客户端实际入口，并核对源站映射；不能只刷新新 Tauri JSON URL。
5. 非 dry-run 上传前完整下载并用**构建时同一公钥**验证 ESA、R2 两个正式 Tauri 目标；失败则不执行 AWS 上传。所有镜像的安装包及 blockmap 全部上传成功后才上传各自的 `latest.yml`，最后精确刷新旧 ESA URL。上传失败不能等同于发布成功；多存储服务之间没有分布式事务，清单阶段失败后应核对各镜像再重试。

正式产物：`dist/eIsland-27.0.2-Setup.exe`、同名 `.blockmap`、`dist/latest.yml`，以及供手动运行的 `dist/eIsland-Migration-27.0.2.exe`。`dist/adapter-build.json` 把实际安装包哈希与打包时的公钥、旧 app ID 绑定，仅作本地上传校验，不上传。自动更新只使用 NSIS；portable 不作为旧更新目标。上传脚本只推送 NSIS、blockmap、旧 YAML；不会上传任何私钥，不执行安装，不发布 GitHub Release。

**两类签名独立：** Tauri 的 `.sig`/Minisign 用于第二跳的真实性和版本验证；助手 NSIS 的 Windows Authenticode 使用 electron-builder 原有 `CSC_*`/Windows 签名配置。如旧客户端强制校验发布者证书，助手必须使用它信任的证书身份。没有 Authenticode 时即使本地打包成功，也不能宣称能被所有旧客户端接受。

## 架构

- `main/`：组合入口、严格 sender 校验的 IPC、串行迁移状态机，以及只读系统检测、校验备份、流式下载、签名验证、安装交接服务。
- `preload/`：sandbox + contextIsolation，仅暴露固定动作；不提供任意 IPC、路径、shell 或 Node 能力。
- `renderer/`：React + CSS Modules + 四语言。`modules/migration/{types,config,utils,hooks,components}` 按指定 module-split 规范组织，组件只负责展示。
- `native/verifier/`：随包构建的可信验证器，使用与主工程相同的 `minisign-verify`，流式验证文件和 trusted comment 中的版本。测试密钥仅在内存中临时生成；下载的程序不能用来验证自身。

## 安装与数据兼容矩阵

| 路径 | 处理与证据 | 仍需验证 |
| --- | --- | --- |
| 旧 Electron → 助手 27.0.2 | 从历史 electron-builder 配置核对 `appId=com.eisland.app`、`productName=eIsland`、exe 名称、按用户 NSIS 与原安装包命名；保留旧 `latest.yml` 协议，`deleteAppDataOnUninstall=false` | 在干净 VM 对**实际已发布的旧安装包**验证更新、证书发布者、原安装目录、自启和卸载行为；同为 NSIS 不能代替验证 |
| 助手 → 首个 Tauri ≥27.0.3 | Tauri 标识 `com.pyisland.eisland`；读取注册表及 `app.asar`/已知卸载键区分框架；新路径不能与 Electron/未知路径相互包含；交互式安装后核对路径、注册版本、exe | 真实签名 27.0.3 安装器的管理员/普通用户、改安装目录、取消、WebView2 缺失等 VM 场景；本任务未执行安装 |
| 已有自研更新器 Tauri → 新 Tauri | 此助手只用于手动交接；已有兼容的 ≥27.0.3 时提供直接启动，后续升级交由其官方更新器；更早 Tauri 可复用同一目录，仍要求独立备份与签名 | 自研更新器的旧 JSON 别名由主工程发布链路继续维护，不由本助手改写 |
| 官方更新器 Tauri → 后续版本 | 由 Tauri 主工程官方更新器处理；助手不是长期第二套更新器 | 正式 feed/公钥、版本递增及签名轮换继续遵循主工程要求 |

备份原 `%APPDATA%\eIsland` 及已存在的 `%APPDATA%\com.pyisland.eisland` 到 `%LOCALAPPDATA%\eIsland Migration Adapter\backups\<UUID>`，逐文件 SHA-256 核对后才提交 `backup.json` 完整标记；拒绝链接/重解析路径，限制 100,000 文件和 8 GiB。文件内容变化、权限错误或空间不足会中止，保留原数据和已完成备份。

助手自己的 Chromium profile 为 `%APPDATA%\eIsland Migration Adapter`，不打开旧 profile。业务存储选择复用主工程实际规则：已有 Tauri `eIsland_store` 优先，否则直接复用旧 `%APPDATA%\eIsland\eIsland_store`；不移动、合并或覆盖逐键 JSON，不处理真实下载分片和历史。原 Chromium Cookies/localStorage 不直接合并至 WebView2，因此部分平台需要重新登录；这不等于已验证所有登录状态自动迁移。

初次 Tauri 目标默认 `%LOCALAPPDATA%\eIsland`，与旧目录或助手自身目录重叠、或已有未登记的目录时，使用 `%LOCALAPPDATA%\eIsland-Tauri`；两者都不安全时中止。安装器可交互修改目录，但只有保持助手计划目录才会被确认完成。旧卸载项不会自动删除；助手快捷方式名为 `eIsland Migration`，避免其后卸载误删新 Tauri 的 `eIsland` 快捷方式。确认新版本与数据正常并保留备份后，可人工卸载旧助手；**不要选择删除用户数据**。无法证明旧卸载器安全时，先在 VM 验证，不在真实机器试卸载。

助手不改写旧开机启动注册项或计划任务。需要自启时，在新 Tauri 设置中关闭后重新开启开机启动，并核对 Windows 启动项是否仍指向助手；`features/settings/autostart.rs` 在保存设置时才注册新可执行路径。这部分必须纳入 VM 验收，不能声称只因设置 JSON 保留就已自动迁移。

## 更新源边界

内置 ESA、R2 和 GitHub 官方 JSON 源；只有公开且提供有效目标时才可下载。COS/OSS 支持构建时 `EISLAND_ADAPTER_COS_URL`/`EISLAND_ADAPTER_OSS_URL` 公开 URL；未配置不显示，不尝试复用用户旧认证 token。离线入口选择官方 JSON，并读取同目录内清单 URL 对应的 exe 文件名，仍须经过同一内置公钥验证。没有发布任何源时不能宣称这些源已经接通。

第一跳历史默认源为 R2。本上传器不会替旧客户端发布 GitHub Release；旧客户端若选 GitHub，应先切换到已发布助手的 R2/ESA 源后更新。不要把 27.0.2 助手另发为 GitHub 的 latest Release 而移走 Tauri `tauri-latest.json`，这会破坏新客户端的 GitHub 源。COS/OSS 仍取决于旧服务器能否签发有效地址；服务器若拒绝旧客户端，改用公开 R2/ESA。以上是明确的源兼容边界，不代表所有旧源均已完成线上验证。

## 发布前剩余事项

- 配置匹配正式 Tauri 签名的 `TAURI_UPDATER_PUBLIC_KEY`。仓库当前公钥为空，正式 `package` 应明确失败，不使用测试钥匙替代。
- 先完成真正的 Tauri ≥27.0.3 版本统一与公开发布，并通过上传器的完整下载/签名预检。
- 使用实际旧安装器与新安装器在隔离 VM 完成上表人工安装验收，核对旧更新器证书要求、自启和自定义安装路径。已通过单元/窗口测试和本地预览打包并不等于这一兼容性已经验证。
- 本目录 CI 没有上传/发布权限；Actions artifact 不能当成公开更新 Release。

## 本地验证记录（2026-11-05）

执行环境：Windows x64、Node 24.22.1、Electron 45.2.3。下列结果仅针对本任务本地代码，不代表线上发布或真实安装验收。

| 检查 | 实际结果 |
| --- | --- |
| TypeScript / ESLint 与注释规范 | `typecheck`、`comment:check` 通过，未放宽安全、类型或 React Hook 规则；仅按指定规范保留命名导出、PascalCase 组件，以及有界 I/O 的顺序循环 |
| 国际化 | 四语言 77 个叶子键及插值一致，固定 `t()` 键检查通过 |
| 迁移服务与发布边界 | Vitest 46 项通过；覆盖清单、UTF-8 分块、取消、截断/哈希错误、备份原字节、链接拒绝、未登记目录及自身程序保护、重复命令、运行实例保护、安装前重验、假成功拒绝、公钥/产物绑定、所有安装包先于清单上传及失败阻断 |
| 真实 Rust 签名与 CLI | `cargo test` 7 项通过（4 单元 + 3 真实验证器进程集成），私钥仅在内存；错误公钥、篡改、签名版本重放、CLI JSON/参数/大小限制拒绝；fmt、Clippy `-D warnings` 通过 |
| 真实 Electron 窗口 | 四语言、独立 profile、sandbox、固定 preload API、其他窗口 sender 拒绝和缺少公钥时拒绝下载均通过；隔离历史文件保持原字节 |
| 预览打包 | 独立标识的 NSIS 与 portable 构建成功；没有 Authenticode 证书，未安装、未执行安装器，也未生成正式 `latest.yml` |
| 原发布链路回归 | 根目录 `scripts/native/release.test.mjs` 25 项通过；CI/命令契约 `scripts/lint/pr-report-comments.test.mjs` 40 项通过；修改的两个共享上传工具 ESLint 通过 |
| 正式打包缺少密钥 | `npm run package` 按预期在构建/发布前失败，要求配置正式 `TAURI_UPDATER_PUBLIC_KEY`；未用测试密钥生成正式包 |
| 依赖审计 | `npm audit --omit=dev` 为 0 个漏洞；完整开发依赖仍有 6 个 moderate，来自当前最新 electron-builder 的传递依赖，未用强制降级掩盖 |

覆盖率使用完整本目录业务范围；只排除不产生运行时代码的 `.d.ts`。没有删业务分支或缩小分母来凑 99%。

| 范围 / 工具 | 行 | 语句 / region | 函数 | 分支 |
| --- | --- | --- | --- | --- |
| TypeScript/JS：main、preload、renderer、shared、scripts / Vitest V8 | 277/553（50.09%） | 346/765（45.22%） | 49/161（30.43%） | 236/522（45.21%） |
| 上述范围中的 renderer 单独统计 | 0/58（0%） | 0/93（0%） | 0/34（0%） | 0/84（0%） |
| Rust 验证器 `src/main.rs` / cargo-llvm-cov（包含其内联测试代码，CLI 测试对真实子进程覆盖计入） | 103/108（95.37%） | region 213/228（93.42%） | 10/10（100%） | 未采集，分母为 0，不视为达标 |

**未达到 99%。** renderer 的真实窗口测试是功能验证，尚未把 Chromium 覆盖数据合并进 V8 单测报告，不能用窗口通过冒充前端覆盖率。其他主要缺口是系统安装探测、交互式安装交接、验证器 JS 包装、超时及备份大小上限等异常分支；Rust 仍有大安装包限制与 I/O 失败路径缺口。明细保存在 `coverage/coverage-summary.json`、`coverage/index.html` 和 `test-results/rust-coverage.json`。新 GitHub 工作流已编写，但没有在本任务中远程执行。
