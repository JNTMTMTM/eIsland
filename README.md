# eIsland

Windows 灵动岛桌面应用，基于 Electron + React + TypeScript 构建。

支持实时显示天气、歌词、计时器、系统工具快捷操作等功能。

> 许可证说明：本软件开源协议基于 GPLv3，并在其基础上进行了修改与补充（详见 `LICENSE`）。

## 功能

- **时间 & 天气** — 实时显示当前时间、农历日期、天气预报
- **歌词滚动** — 自动获取当前播放歌曲的同步歌词
- **倒计时器** — 滚动设置小时/分钟/秒，到时自动通知
- **媒体控制** — 支持 QQ音乐、网易云音乐 的播放控制
- **AI 对话** — 接入 OpenAI 兼容 API，流式输出 + Markdown 渲染
- **待办事项** — 轻量 Todo 管理，支持优先级标记
- **系统工具** — 截图、任务管理器快捷入口
- **设置面板** — API Key / Endpoint / 模型 / MCP / System Prompt 可视化配置
- **系统托盘** — 后台运行，最小化到托盘

## 运行

```bash
# 安装依赖
npm install
# 开发模式
npm run dev
# 构建安装包
npm run package
```

构建产物位于 `dist/` 目录，包含可执行的 `.exe` 安装包。

## 技术栈
| 层级 | 技术 |
|------|------|
| 框架 | Electron 35 |
| 前端 | React 19 + TypeScript |
| 样式 | Tailwind CSS 4 |
| 状态 | Zustand |
| 构建 | electron-vite + electron-builder |

## 支持的音乐软件

- QQ 音乐
- 网易云音乐
- 汽水音乐
- 酷狗

## LICENSE

本软件开源协议基于 GPLv3，并在其基础上进行了修改与补充。

详细条款请参见仓库中的 `LICENSE` 文件。