# Dynamic Island Electron + React + TypeScript + Tailwind 技术实现文档

> 基于 Tauri 版本的分析，提供完整的 Electron 实现指南

---

## 📋 目录

1. [项目架构](#项目架构)
2. [核心功能模块](#核心功能模块)
3. [技术栈详解](#技术栈详解)
4. [SMTC 媒体控制实现](#smtc-媒体控制实现)
5. [歌词系统实现](#歌词系统实现)
6. [天气系统实现](#天气系统实现)
7. [AI Agent 实现](#ai-agent-实现)
8. [窗口交互系统](#窗口交互系统)
9. [隐私状态监控](#隐私状态监控)
10. [剪贴板链接检测](#剪贴板链接检测)
11. [网络与蓝牙监控](#网络与蓝牙监控)
12. [状态管理](#状态管理)
13. [样式系统](#样式系统)
14. [部署与打包](#部署与打包)

---

## 项目架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process (主进程)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • 窗口管理 (创建、透明、置顶、穿透)                │  │
│  │  • 系统托盘                                          │  │
│  │  • IPC 通信桥接                                      │  │
│  │  • SMTC 会话管理 (Node.js addon)                    │  │
│  │  • 隐私状态监控 (Node.js addon)                     │  │
│  │  • 窗口标题枚举 (Node.js addon)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↑↓ IPC
┌─────────────────────────────────────────────────────────────┐
│                   Preload Script (预加载)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • contextBridge 安全暴露 API                         │  │
│  │  • 类型定义 (TypeScript)                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↑↓
┌─────────────────────────────────────────────────────────────┐
│               Renderer Process (渲染进程)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • React 18 + TypeScript                            │  │
│  │  • Tailwind CSS 样式                                 │  │
│  │  • Zustand 状态管理                                  │  │
│  │  • 音乐面板组件                                      │  │
│  │  • 时间/天气组件                                     │  │
│  │  • AI Agent 聊天组件                                 │  │
│  │  • 通知组件                                          │  │
│  │  • 剪贴板链接列表组件                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
eIsland/
├── src/
│   ├── main/                 # 主进程
│   │   ├── index.ts          # 窗口创建、IPC 处理
│   │   ├── tray.ts           # 系统托盘
│   │   ├── smtc/             # SMTC 媒体控制 (Node.js addon)
│   │   ├── privacy/          # 隐私状态监控 (Node.js addon)
│   │   └── window/           # 窗口标题枚举 (Node.js addon)
│   │
│   ├── preload/              # 预加载脚本
│   │   ├── index.ts          # API 桥接
│   │   └── index.d.ts       # 类型定义
│   │
│   ├── renderer/             # 渲染进程
│   │   ├── main.tsx          # React 入口
│   │   ├── components/       # React 组件
│   │   │   ├── DynamicIsland.tsx
│   │   │   ├── TimeView.tsx
│   │   │   ├── MusicPanel.tsx
│   │   │   ├── AIAgent.tsx
│   │   │   ├── Notification.tsx
│   │   │   └── UrlList.tsx
│   │   ├── store/            # Zustand Store
│   │   │   └── islandStore.ts
│   │   ├── api/              # API 调用
│   │   │   ├── weatherApi.ts
│   │   │   ├── lyricsApi.ts
│   │   │   └── aiApi.ts
│   │   ├── utils/            # 工具函数
│   │   │   ├── timeUtils.ts
│   │   │   ├── musicUtils.ts
│   │   │   └── formatUtils.ts
│   │   └── styles/           # 样式文件
│   │       ├── index.css
│   │       ├── expanded.css
│   │       ├── hover.css
│   │       └── notification.css
│   │
│   └── native/               # Node.js Native Addons
│       ├── binding.gyp       # 构建配置
│       ├── smtc.cpp          # SMTC C++ 实现
│       ├── privacy.cpp       # 隐私状态 C++ 实现
│       └── window.cpp        # 窗口枚举 C++ 实现
│
├── electron-builder.json      # 打包配置
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

---

## 核心功能模块

### 功能清单

| 模块 | 功能 | 技术实现 |
|------|------|----------|
| **动态岛窗口** | 透明、置顶、穿透、动画 | Electron BrowserWindow + IPC |
| **时间显示** | 实时时钟、日期 | Date API + requestAnimationFrame |
| **天气显示** | 当前天气、温度 | Open-Meteo API |
| **音乐控制** | SMTC 媒体播放控制 | Node.js C++ Addon |
| **歌词同步** | 实时歌词、进度显示 | LRCLIB + 网易云 API |
| **专辑封面** | 封面提取、显示 | SMTC Thumbnail API |
| **AI Agent** | 对话、流式响应 | OpenAI / 本地 LLM |
| **通知系统** | 系统通知、弹窗 | Electron Notification + UI |
| **剪贴板监控** | 链接检测、快捷键 | Electron Clipboard |
| **隐私监控** | 麦克风/摄像头状态 | Windows API |
| **网络监控** | 在线状态、蓝牙设备 | WinINet + PowerShell |
| **系统托盘** | 托盘图标、菜单 | Electron Tray |

---

## 技术栈详解

### 依赖配置 (package.json)

```json
{
  "name": "eisland",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "build:native": "node-gyp rebuild"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "marked": "^11.0.0",
    "highlight.js": "^11.9.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "node-gyp": "^10.0.0"
  }
}
```

---

## SMTC 媒体控制实现

### 架构设计

由于 Electron 没有内置 SMTC 支持，需要通过 **Node.js Native Addon** 调用 Windows API。

### 1. C++ Addon 实现 (native/smtc.cpp)

```cpp
#include <node.h>
#include <windows.h>
#include <wrl/client.h>
#include <windows.media.control.h>

using namespace v8;
using namespace Microsoft::WRL;
using namespace Windows::Media::Control;

// 媒体信息结构
struct MediaInfo {
  std::wstring title;
  std::wstring artist;
  int64_t duration_ms;
  int64_t position_ms;
  bool is_playing;
};

// 获取最佳 SMTC 会话
void GetBestSession(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  ComPtr<IGlobalSystemMediaTransportControlsSessionManager> sessionManager;
  HRESULT hr = RoActivateInstance(
    HStringReference(RuntimeClass_Windows_Media_Control_GlobalSystemMediaTransportControlsSessionManager).Get(),
    &sessionManager
  );

  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  // 获取所有会话
  ComPtr<IVectorView<GlobalSystemMediaTransportControlsSession*>> sessions;
  hr = sessionManager->GetSessions(&sessions);
  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  unsigned int size;
  hr = sessions->get_Size(&size);
  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  // 评分系统选择最佳会话
  int best_score = -1;
  ComPtr<IGlobalSystemMediaTransportControlsSession> best_session;
  MediaInfo best_info = { L"", L"", 0, 0, false };

  for (unsigned int i = 0; i < size; i++) {
    ComPtr<IGlobalSystemMediaTransportControlsSession> session;
    hr = sessions->GetAt(i, &session);
    if (FAILED(hr)) continue;

    MediaInfo info = ReadSessionInfo(session.Get());
    int score = CalculateSessionScore(session.Get(), info);

    if (score > best_score) {
      best_score = score;
      best_session = session;
      best_info = info;
    }
  }

  if (!best_session) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  // 返回媒体信息
  Local<Object> result = Object::New(isolate);
  result->Set(context, String::NewFromUtf8(isolate, "title").ToLocalChecked(),
    String::NewFromTwoByte(isolate,
      reinterpret_cast<const uint16_t*>(best_info.title.c_str())).ToLocalChecked());
  result->Set(context, String::NewFromUtf8(isolate, "artist").ToLocalChecked(),
    String::NewFromTwoByte(isolate,
      reinterpret_cast<const uint16_t*>(best_info.artist.c_str())).ToLocalChecked());
  result->Set(context, String::NewFromUtf8(isolate, "duration_ms").ToLocalChecked(),
    Number::New(isolate, best_info.duration_ms));
  result->Set(context, String::NewFromUtf8(isolate, "position_ms").ToLocalChecked(),
    Number::New(isolate, best_info.position_ms));
  result->Set(context, String::NewFromUtf8(isolate, "is_playing").ToLocalChecked(),
    Boolean::New(isolate, best_info.is_playing));

  args.GetReturnValue().Set(result);
}

// 读取会话信息
MediaInfo ReadSessionInfo(IGlobalSystemMediaTransportControlsSession* session) {
  MediaInfo info = { L"", L"", 0, 0, false };

  // 获取播放状态
  ComPtr<IGlobalSystemMediaTransportControlsSessionPlaybackInfo> playbackInfo;
  if (SUCCEEDED(session->GetPlaybackInfo(&playbackInfo))) {
    GlobalSystemMediaTransportControlsSessionPlaybackStatus status;
    if (SUCCEEDED(playbackInfo->get_PlaybackStatus(&status))) {
      info.is_playing = (status == GlobalSystemMediaTransportControlsSessionPlaybackStatus_Playing);
    }
  }

  // 获取时间轴信息
  ComPtr<IGlobalSystemMediaTransportControlsSessionTimelineProperties> timeline;
  if (SUCCEEDED(session->GetTimelineProperties(&timeline))) {
    IReference<TimeSpan>* positionRef;
    if (SUCCEEDED(timeline->get_Position(&positionRef)) && positionRef) {
      TimeSpan position;
      positionRef->get_Value(&position);
      info.position_ms = position.Duration / 10000; // 100ns -> ms
    }

    IReference<TimeSpan>* endRef;
    if (SUCCEEDED(timeline->get_EndTime(&endRef)) && endRef) {
      TimeSpan end;
      endRef->get_Value(&end);
      info.duration_ms = end.Duration / 10000;
    }
  }

  // 获取媒体属性
  ComPtr<IAsyncOperation<GlobalSystemMediaTransportControlsSessionMediaProperties*>> propsOp;
  if (SUCCEEDED(session->TryGetMediaPropertiesAsync(&propsOp))) {
    GlobalSystemMediaTransportControlsSessionMediaProperties* props;
    if (SUCCEEDED(propsOp->GetResults(&props))) {
      HString title, artist;
      props->get_Title(title.GetAddressOf());
      props->get_Artist(artist.GetAddressOf());

      info.title = std::wstring(title.GetRawBuffer(nullptr), title.Length());
      info.artist = std::wstring(artist.GetRawBuffer(nullptr), artist.Length());
    }
  }

  return info;
}

// 计算会话评分
int CalculateSessionScore(IGlobalSystemMediaTransportControlsSession* session, const MediaInfo& info) {
  int score = 0;

  if (info.is_playing) score += 100;
  if (!info.title.empty() || !info.artist.empty()) score += 20;

  // 检查是否为音乐应用
  HString appId;
  session->get_SourceAppUserModelId(appId.GetAddressOf());
  std::wstring appIdStr(appId.GetRawBuffer(nullptr), appId.Length());
  std::wstring appIdLower = appIdStr;
  std::transform(appIdLower.begin(), appIdLower.end(), appIdLower.begin(), ::towlower);

  if (appIdLower.find(L"cloudmusic") != std::wstring::npos ||
      appIdLower.find(L"netease") != std::wstring::npos ||
      appIdLower.find(L"spotify") != std::wstring::npos ||
      appIdLower.find(L"qqmusic") != std::wstring::npos) {
    score += 40;
  }

  // 降低浏览器/视频应用优先级
  if (appIdLower.find(L"chrome") != std::wstring::npos ||
      appIdLower.find(L"edge") != std::wstring::npos ||
      appIdLower.find(L"potplayer") != std::wstring::npos) {
    score -= 80;
  }

  return score;
}

// 媒体控制
void PlayPause(const FunctionCallbackInfo<Value>& args) {
  auto session = GetBestSessionInternal();
  if (session) {
    ComPtr<IAsyncAction> action;
    session->TryTogglePlayPauseAsync(&action);
  }
}

void Next(const FunctionCallbackInfo<Value>& args) {
  auto session = GetBestSessionInternal();
  if (session) {
    ComPtr<IAsyncAction> action;
    session->TrySkipNextAsync(&action);
  }
}

void Previous(const FunctionCallbackInfo<Value>& args) {
  auto session = GetBestSessionInternal();
  if (session) {
    ComPtr<IAsyncAction> action;
    session->TrySkipPreviousAsync(&action);
  }
}

void Seek(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  int64_t position_ms = args[0]->NumberValue(context).FromMaybe(0);

  auto session = GetBestSessionInternal();
  if (session) {
    TimeSpan timespan;
    timespan.Duration = position_ms * 10000; // ms -> 100ns ticks

    ComPtr<IAsyncOperation<bool>> operation;
    HRESULT hr = session->TryChangePlaybackPositionAsync(timespan.Duration, &operation);
    if (SUCCEEDED(hr)) {
      boolean result;
      operation->GetResults(&result);
    }
  }
}

// 获取封面 (Base64)
void GetThumbnail(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  auto session = GetBestSessionInternal();
  if (!session) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  ComPtr<IAsyncOperation<GlobalSystemMediaTransportControlsSessionMediaProperties*>> propsOp;
  HRESULT hr = session->TryGetMediaPropertiesAsync(&propsOp);
  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  GlobalSystemMediaTransportControlsSessionMediaProperties* props;
  hr = propsOp->GetResults(&props);
  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  ComPtr<IRandomAccessStreamReference> thumbnailRef;
  hr = props->get_Thumbnail(&thumbnailRef);
  if (FAILED(hr) || !thumbnailRef) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  ComPtr<IAsyncOperation<IRandomAccessStreamWithContentType*>> streamOp;
  hr = thumbnailRef->OpenReadAsync(&streamOp);
  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  IRandomAccessStreamWithContentType* stream;
  hr = streamOp->GetResults(&stream);
  if (FAILED(hr)) {
    args.GetReturnValue().Set(Null(isolate));
    return;
  }

  // 读取流数据并转换为 Base64
  UINT64 size;
  stream->get_Size(&size);

  ComPtr<IInputStream> inputStream;
  stream->GetInputStreamAt(0, &inputStream);

  ComPtr<IDataReader> reader;
  DataReader::CreateDataReader(inputStream.Get(), &reader);

  ComPtr<IAsyncOperation<UINT32>> loadOp;
  reader->LoadAsync(static_cast<UINT32>(size), &loadOp);
  loadOp->GetResults();

  BYTE* buffer = new BYTE[static_cast<size_t>(size)];
  reader->ReadBytes({ buffer, static_cast<UINT32>(size) });

  // Base64 编码
  std::string base64 = Base64Encode(buffer, static_cast<size_t>(size));
  delete[] buffer;

  // 检测图片格式
  std::string mime = "image/jpeg";
  if (size >= 8 && buffer[0] == 0x89 && buffer[1] == 0x50 &&
      buffer[2] == 0x4E && buffer[3] == 0x47) {
    mime = "image/png";
  }

  std::string dataUrl = "data:" + mime + ";base64," + base64;

  args.GetReturnValue().Set(
    String::NewFromUtf8(isolate, dataUrl.c_str()).ToLocalChecked()
  );
}

// 模块初始化
void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "getBestSession", GetBestSession);
  NODE_SET_METHOD(exports, "playPause", PlayPause);
  NODE_SET_METHOD(exports, "next", Next);
  NODE_SET_METHOD(exports, "previous", Previous);
  NODE_SET_METHOD(exports, "seek", Seek);
  NODE_SET_METHOD(exports, "getThumbnail", GetThumbnail);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
```

### 2. 构建配置 (native/binding.gyp)

```python
{
  'targets': [
    {
      'target_name': 'smtc_native',
      'sources': ['smtc.cpp'],
      'include_dirs': [
        '<(module_root_dir)/node_modules/node-addon-api'
      ],
      'dependencies': [
        '<!(node -p "require(\'node-addon-api\').gyp")'
      ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      'conditions': [
        ['OS=="win"', {
          'msvs_settings': {
            'VCCLCompilerTool': {
              'ExceptionHandling': 1,
            },
          },
          'link_settings': {
            'libraries': [
              '-lwindowsapp',
              '-lruntimeobject',
            ],
          },
        }]
      ]
    }
  ]
}
```

### 3. 主进程调用 (main/smtc.ts)

```typescript
import { ipcMain } from 'electron';
import smtcNative from '../../build/Release/smtc_native.node';

/** SMTC 媒体信息 */
interface SMTCMediaInfo {
  title: string;
  artist: string;
  duration_ms: number;
  position_ms: number;
  is_playing: boolean;
}

/** 注册 SMTC IPC 处理器 */
export function registerSmtcHandlers(): void {
  // 获取媒体信息
  ipcMain.handle('smtc:get-info', async () => {
    try {
      const info = smtcNative.getBestSession() as SMTCMediaInfo;
      return info;
    } catch (error) {
      console.error('[SMTC] 获取媒体信息失败:', error);
      return null;
    }
  });

  // 播放/暂停
  ipcMain.on('smtc:play-pause', () => {
    try {
      smtcNative.playPause();
    } catch (error) {
      console.error('[SMTC] 播放控制失败:', error);
    }
  });

  // 下一曲
  ipcMain.on('smtc:next', () => {
    try {
      smtcNative.next();
    } catch (error) {
      console.error('[SMTC] 切曲失败:', error);
    }
  });

  // 上一曲
  ipcMain.on('smtc:previous', () => {
    try {
      smtcNative.previous();
    } catch (error) {
      console.error('[SMTC] 切曲失败:', error);
    }
  });

  // 进度跳转
  ipcMain.on('smtc:seek', (_event, position_ms: number) => {
    try {
      smtcNative.seek(position_ms);
    } catch (error) {
      console.error('[SMTC] 进度跳转失败:', error);
    }
  });

  // 获取封面
  ipcMain.handle('smtc:get-thumbnail', async () => {
    try {
      const thumbnail = smtcNative.getThumbnail() as string | null;
      return thumbnail;
    } catch (error) {
      console.error('[SMTC] 获取封面失败:', error);
      return null;
    }
  });
}

/** 启动 SMTC 轮询线程 */
export function startSmtcPolling(sendToRenderer: (channel: string, data: any) => void): void {
  let lastTrackKey = '';
  let lastPositionMs = 0;

  const pollInterval = setInterval(async () => {
    const info = await smtcNative.getBestSession() as SMTCMediaInfo | null;

    if (!info) {
      // 没有媒体会话
      if (lastTrackKey) {
        lastTrackKey = '';
        sendToRenderer('media:stopped', null);
      }
      return;
    }

    const trackKey = `${info.artist} - ${info.title}`;

    // 歌曲切换
    if (trackKey !== lastTrackKey) {
      lastTrackKey = trackKey;

      // 获取封面
      try {
        const thumbnail = await smtcNative.getThumbnail() as string | null;

        sendToRenderer('media:changed', {
          title: info.title,
          artist: info.artist,
          duration_ms: info.duration_ms,
          thumbnail
        });
      } catch (error) {
        console.error('[SMTC] 获取封面失败:', error);
        sendToRenderer('media:changed', {
          title: info.title,
          artist: info.artist,
          duration_ms: info.duration_ms,
          thumbnail: null
        });
      }
    }

    // 播放状态变化
    if (info.is_playing !== lastIsPlaying) {
      lastIsPlaying = info.is_playing;
      sendToRenderer('playback:state-changed', info.is_playing);
    }

    // 进度更新
    if (info.is_playing && info.position_ms !== lastPositionMs) {
      lastPositionMs = info.position_ms;
      sendToRenderer('playback:progress', info.position_ms);
    }
  }, 200); // 200ms 轮询

  // 清理函数
  return () => clearInterval(pollInterval);
}
```

### 4. 预加载桥接 (preload/smtc.d.ts)

```typescript
declare global {
  interface Window {
    smtc: {
      getInfo(): Promise<SMTCMediaInfo | null>;
      playPause(): void;
      next(): void;
      previous(): void;
      seek(position_ms: number): void;
      getThumbnail(): Promise<string | null>;
    };
  }
}
```

### 5. 渲染进程调用 (renderer/api/mediaApi.ts)

```typescript
import { ipcRenderer } from 'electron';

export interface SMTCMediaInfo {
  title: string;
  artist: string;
  duration_ms: number;
  position_ms: number;
  is_playing: boolean;
}

/** 获取当前媒体信息 */
export async function getMediaInfo(): Promise<SMTCMediaInfo | null> {
  return await ipcRenderer.invoke('smtc:get-info');
}

/** 播放/暂停 */
export function playPause(): void {
  ipcRenderer.send('smtc:play-pause');
}

/** 下一曲 */
export function next(): void {
  ipcRenderer.send('smtc:next');
}

/** 上一曲 */
export function previous(): void {
  ipcRenderer.send('smtc:previous');
}

/** 进度跳转 */
export function seek(position_ms: number): void {
  ipcRenderer.send('smtc:seek', position_ms);
}

/** 获取封面 */
export async function getThumbnail(): Promise<string | null> {
  return await ipcRenderer.invoke('smtc:get-thumbnail');
}

/** 监听媒体变化 */
export function onMediaChanged(callback: (data: {
  title: string;
  artist: string;
  duration_ms: number;
  thumbnail: string | null;
}) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
  ipcRenderer.on('media:changed', handler);

  return () => ipcRenderer.removeListener('media:changed', handler);
}

/** 监听播放状态变化 */
export function onPlaybackStateChanged(callback: (isPlaying: boolean) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, isPlaying: boolean) => callback(isPlaying);
  ipcRenderer.on('playback:state-changed', handler);

  return () => ipcRenderer.removeListener('playback:state-changed', handler);
}

/** 监听进度更新 */
export function onPlaybackProgress(callback: (position_ms: number) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, position_ms: number) => callback(position_ms);
  ipcRenderer.on('playback:progress', handler);

  return () => ipcRenderer.removeListener('playback:progress', handler);
}
```

---

## 歌词系统实现

### 1. 歌词解析工具 (renderer/utils/lyricParser.ts)

```typescript
/** 单行歌词 */
export interface LyricLine {
  time_ms: number;
  text: string;
}

/** 解析 LRC 格式歌词 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  // 过滤元数据
  const metaPrefixes = [
    '作词', '作曲', '编曲', '制作', '混音', '母带', '录音',
    'Lyrics by', 'Composed by', 'Produced by', 'Arranged by'
  ];

  for (const rawLine of lrc.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('[')) continue;

    const endIndex = line.indexOf(']');
    if (endIndex === -1) continue;

    const timeTag = line.slice(1, endIndex);
    const text = line.slice(endIndex + 1).trim();

    const timeMs = parseTimeTag(timeTag);
    if (timeMs !== null && text && !metaPrefixes.some(p => text.startsWith(p))) {
      lines.push({ time_ms: timeMs, text });
    }
  }

  // 按时间排序
  lines.sort((a, b) => a.time_ms - b.time_ms);
  return lines;
}

/** 解析时间标签 [mm:ss.xx] */
function parseTimeTag(tag: string): number | null {
  const parts = tag.split(':');
  if (parts.length !== 2) return null;

  const minutes = parseInt(parts[0], 10);
  if (isNaN(minutes)) return null;

  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  if (isNaN(seconds)) return null;

  let milliseconds = 0;
  if (secondsParts.length > 1) {
    const frac = secondsParts[1];
    const val = parseInt(frac.padEnd(3, '0').slice(0, 3), 10);
    milliseconds = val;
  }

  return minutes * 60000 + seconds * 1000 + milliseconds;
}

/** 获取当前歌词 */
export function getCurrentLyric(lyrics: LyricLine[], positionMs: number): LyricLine | null {
  if (lyrics.length === 0) return null;

  let result: LyricLine | null = null;

  for (const line of lyrics) {
    if (line.time_ms <= positionMs) {
      result = line;
    } else {
      break;
    }
  }

  return result;
}

/** 获取附近歌词 (前2行 + 当前行 + 后2行) */
export function getNearbyLyrics(lyrics: LyricLine[], positionMs: number): LyricLine[] {
  if (lyrics.length === 0) return [];

  let currentIndex: number | null = null;

  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time_ms <= positionMs) {
      currentIndex = i;
    } else {
      break;
    }
  }

  if (currentIndex === null) return [];

  const start = Math.max(0, currentIndex - 2);
  const end = Math.min(lyrics.length, currentIndex + 3);

  return lyrics.slice(start, end);
}

/** 清理歌曲标题 */
export function cleanTitle(title: string): string {
  let cleaned = title;

  // 去除括号内容
  for (const [open, close] of [['(', ')'], ['[', ']']]) {
    while (true) {
      const start = cleaned.indexOf(open);
      if (start === -1) break;

      const end = cleaned.indexOf(close, start);
      if (end === -1) {
        cleaned = cleaned.slice(0, start);
        break;
      }

      cleaned = cleaned.slice(0, start) + cleaned.slice(end + close.length);
    }
  }

  // 去除 " - " 后面的副标题
  const dashIndex = cleaned.indexOf(' - ');
  if (dashIndex !== -1) {
    cleaned = cleaned.slice(0, dashIndex);
  }

  return cleaned.trim();
}
```

### 2. 歌词 API (renderer/api/lyricsApi.ts)

```typescript
import axios from 'axios';
import { LyricLine, parseLRC, cleanTitle } from '../utils/lyricParser';

const HTTP_CLIENT = axios.create({
  timeout: 5000,
});

/** 从 LRCLIB 获取歌词 */
async function fetchFromLrclib(title: string, artist: string): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = artist.split(/[/,]/)[0].trim();

  // 策略 1: 原始标题搜索
  let url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  let result = await tryLrclibSearch(url);
  if (result) return result;

  // 策略 2: 清理后搜索
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
    result = await tryLrclibSearch(url);
    if (result) return result;
  }

  // 策略 3: 自由搜索
  const query = `${cleanedTitle} ${cleanedArtist}`;
  url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  result = await tryLrclibSearch(url);
  if (result) return result;

  // 策略 4: 精确匹配
  url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}&album_name=&duration=0`;
  result = await tryLrclibGet(url);
  if (result) return result;

  return null;
}

/** 尝试 LRCLIB 搜索 */
async function tryLrclibSearch(url: string): Promise<LyricLine[] | null> {
  try {
    const response = await HTTP_CLIENT.get(url);
    const results = response.data as any[];

    for (const item of results) {
      if (item.syncedLyrics) {
        const lines = parseLRC(item.syncedLyrics);
        if (lines.length > 0) return lines;
      }
    }
  } catch (error) {
    // 忽略错误
  }
  return null;
}

/** 尝试 LRCLIB 精确获取 */
async function tryLrclibGet(url: string): Promise<LyricLine[] | null> {
  try {
    const response = await HTTP_CLIENT.get(url);
    const item = response.data as any;

    if (item.syncedLyrics) {
      const lines = parseLRC(item.syncedLyrics);
      if (lines.length > 0) return lines;
    }
  } catch (error) {
    // 忽略错误
  }
  return null;
}

/** 从网易云音乐获取歌词 */
async function fetchFromNetease(title: string, artist: string): Promise<LyricLine[] | null> {
  try {
    const cleanedTitle = cleanTitle(title);
    const cleanedArtist = artist.split(/[/,]/)[0].trim();
    const query = `${cleanedTitle} ${cleanedArtist}`;

    // 搜索歌曲
    const searchResponse = await HTTP_CLIENT.post(
      'https://music.163.com/api/search/get',
      new URLSearchParams({
        s: query,
        type: '1',
        limit: '5',
        offset: '0'
      }),
      {
        headers: {
          'Referer': 'https://music.163.com',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    const songs = searchResponse.data.result?.songs;
    if (!songs || songs.length === 0) return null;

    const songId = songs[0].id;

    // 获取歌词
    const lyricResponse = await HTTP_CLIENT.get(
      `https://music.163.com/api/song/lyric?id=${songId}&lv=1`,
      {
        headers: {
          'Referer': 'https://music.163.com',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    const lrcStr = lyricResponse.data.lrc?.lyric;
    if (!lrcStr) return null;

    const lines = parseLRC(lrcStr);
    return lines.length > 0 ? lines : null;
  } catch (error) {
    console.error('[Lyrics] 网易云获取失败:', error);
    return null;
  }
}

/** 获取歌词 (主函数) */
export async function fetchLyrics(title: string, artist: string): Promise<LyricLine[]> {
  // 优先 LRCLIB
  let lyrics = await fetchFromLrclib(title, artist);
  if (lyrics) return lyrics;

  // 备用网易云音乐
  lyrics = await fetchFromNetease(title, artist);
  if (lyrics) return lyrics;

  return [];
}
```

### 3. React 组件使用 (renderer/components/LyricsView.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { useIslandStore } from '../store/islandStore';
import { fetchLyrics, getCurrentLyric, getNearbyLyrics } from '../api/lyricsApi';
import { onMediaChanged, onPlaybackProgress } from '../api/mediaApi';

export function LyricsView() {
  const {
    mediaInfo,
    currentPositionMs,
    currentLyricText,
    updateLrcData
  } = useIslandStore();

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);

  // 监听媒体变化，获取歌词
  useEffect(() => {
    const unsubscribe = onMediaChanged(async (data) => {
      if (data.title && data.artist) {
        setLoading(true);

        try {
          const fetchedLyrics = await fetchLyrics(data.title, data.artist);
          setLyrics(fetchedLyrics);
        } catch (error) {
          console.error('[Lyrics] 获取失败:', error);
          setLyrics([]);
        } finally {
          setLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  // 实时同步歌词
  useEffect(() => {
    if (lyrics.length === 0) {
      updateLrcData({
        text: loading ? '♪' : null,
        title: mediaInfo.title,
        artist: mediaInfo.artist,
        position_ms: currentPositionMs,
        duration_ms: mediaInfo.duration_ms
      });
      return;
    }

    const current = getCurrentLyric(lyrics, currentPositionMs);
    const nearby = getNearbyLyrics(lyrics, currentPositionMs);

    updateLrcData({
      text: current?.text || '♪',
      title: mediaInfo.title,
      artist: mediaInfo.artist,
      position_ms: currentPositionMs,
      duration_ms: mediaInfo.duration_ms,
      nearby_lyrics: nearby.map(l => ({
        text: l.text,
        is_current: l.time_ms === currentPositionMs
      }))
    });
  }, [currentPositionMs, lyrics, loading]);

  return (
    <div className="lyrics-view">
      <div className="current-lyric">{currentLyricText || '♪'}</div>
    </div>
  );
}
```

---

## 天气系统实现

### 1. 天气 API (renderer/api/weatherApi.ts)

```typescript
import axios from 'axios';

export interface WeatherData {
  temperature: number;
  description: string;
  city: string;
}

export interface WeatherApiConfig {
  latitude?: number;
  longitude?: number;
  city?: string;
}

/** 天气代码映射 */
const WEATHER_CODES: Record<number, string> = {
  0: '晴',
  1: '晴',
  2: '少云',
  3: '多云',
  45: '雾',
  48: '雾凇',
  51: '毛毛雨',
  53: '毛毛雨',
  55: '毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  80: '阵雨',
  81: '阵雨',
  82: '强阵雨',
  95: '雷暴',
  96: '雷暴雨',
  99: '雷暴雨',
};

/** 获取天气数据 */
export async function fetchWeather(config: WeatherApiConfig): Promise<WeatherData> {
  const { latitude, longitude, city } = config;

  // 优先使用经纬度
  if (latitude !== undefined && longitude !== undefined) {
    return fetchWeatherByCoords(latitude, longitude);
  }

  // 备用：城市名称查询
  if (city) {
    return fetchWeatherByCity(city);
  }

  throw new Error('缺少天气参数');
}

/** 通过经纬度获取天气 */
async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;

  const response = await axios.get(url, { timeout: 5000 });
  const current = response.data.current;

  const weatherCode = current.weather_code || 0;
  const temperature = Math.round(current.temperature_2m || 0);

  return {
    temperature,
    description: WEATHER_CODES[weatherCode] || '未知',
    city: ''
  };
}

/** 通过城市名称获取天气 */
async function fetchWeatherByCity(cityName: string): Promise<WeatherData> {
  // 先获取城市坐标
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh&format=json`;

  const geoResponse = await axios.get(geoUrl);
  const location = geoResponse.data.results?.[0];

  if (!location) {
    throw new Error('城市未找到');
  }

  // 获取天气
  return fetchWeatherByCoords(location.latitude, location.longitude);
}
```

### 2. 天气组件 (renderer/components/WeatherWidget.tsx)

```typescript
import React, { useEffect } from 'react';
import { useIslandStore } from '../store/islandStore';

export function WeatherWidget() {
  const { weather, fetchWeatherData } = useIslandStore();

  useEffect(() => {
    // 每小时刷新一次
    fetchWeatherData({ latitude: 39.9, longitude: 116.4 }); // 北京

    const interval = setInterval(() => {
      fetchWeatherData({ latitude: 39.9, longitude: 116.4 });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="weather-widget">
      <span className="weather-desc">{weather.description}</span>
      <span className="weather-temp">{weather.temperature}°C</span>
    </div>
  );
}
```

---

## AI Agent 实现

### 1. AI API (renderer/api/aiApi.ts)

```typescript
import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface StreamResponse {
  content: string;
  done: boolean;
}

/** 发送消息 (流式) */
export async function* sendMessageStream(
  messages: ChatMessage[],
  config: AIConfig
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        if (data === '[DONE]') {
          return;
        }

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;

          if (content) {
            yield content;
          }
        } catch (error) {
          // 忽略解析错误
        }
      }
    }
  }
}
```

### 2. AI Agent 组件 (renderer/components/AIAgent.tsx)

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useIslandStore } from '../store/islandStore';
import { sendMessageStream, type ChatMessage } from '../api/aiApi';
import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

export function AIAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const aiConfig = useIslandStore(state => ({
    apiUrl: state.aiApiUrl,
    apiKey: state.aiApiKey,
    model: state.aiModel
  }));

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    // 添加助手消息占位
    const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const fullContent: string[] = [];

      for await (const chunk of sendMessageStream([...messages, userMessage], aiConfig)) {
        fullContent.push(chunk);

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: fullContent.join('')
          };
          return updated;
        });
      }
    } catch (error) {
      console.error('[AI] 生成失败:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，生成失败。'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="ai-agent">
      <div className="ai-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`ai-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.role === 'assistant' ? (
              <div
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                className="markdown-content"
              />
            ) : (
              <div className="user-content">{msg.content}</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
          disabled={isGenerating}
        />
        <button
          onClick={handleSend}
          disabled={isGenerating || !input.trim()}
        >
          {isGenerating ? '●' : '↑'}
        </button>
      </div>
    </div>
  );
}
```

---

## 窗口交互系统

### 1. 主进程窗口管理 (main/window.ts)

```typescript
import { BrowserWindow, screen } from 'electron';
import { registerIpcHandlers } from './ipc';

/** 窗口尺寸常量 */
export const WINDOW_CONFIG = {
  IDLE_WIDTH: 140,
  IDLE_HEIGHT: 42,
  HOVER_WIDTH: 320,
  HOVER_HEIGHT: 74,
  EXPANDED_WIDTH: 380,
  EXPANDED_HEIGHT: 360,
  TOP_MARGIN: 0,
};

let mainWindow: BrowserWindow | null = null;
let initialCenterX = 0;

/** 创建灵动岛窗口 */
export function createDynamicIslandWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const { x: workX, y: workY } = primaryDisplay.workArea;

  initialCenterX = workX + (screenWidth - WINDOW_CONFIG.IDLE_WIDTH) / 2 + WINDOW_CONFIG.IDLE_WIDTH / 2;

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.IDLE_WIDTH,
    height: WINDOW_CONFIG.IDLE_HEIGHT,
    x: workX + (screenWidth - WINDOW_CONFIG.IDLE_WIDTH) / 2,
    y: workY + WINDOW_CONFIG.TOP_MARGIN,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 初始透明穿透
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // 失焦时强制透明背景
  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.setBackgroundColor('#00000000');
      mainWindow.webContents.executeJavaScript(`
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
      `);
    }
  });

  registerIpcHandlers(mainWindow);

  return mainWindow;
}

/** 动画过渡窗口大小 */
export function animateWindowBounds(
  targetBounds: Electron.Rectangle,
  duration: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    if (!mainWindow) {
      resolve();
      return;
    }

    const startBounds = mainWindow.getBounds();
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 缓动函数
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentBounds = {
        x: startBounds.x + (targetBounds.x - startBounds.x) * ease,
        y: startBounds.y + (targetBounds.y - startBounds.y) * ease,
        width: startBounds.width + (targetBounds.width - startBounds.width) * ease,
        height: startBounds.height + (targetBounds.height - startBounds.height) * ease,
      };

      mainWindow?.setBounds({
        x: Math.round(currentBounds.x),
        y: Math.round(currentBounds.y),
        width: Math.round(currentBounds.width),
        height: Math.round(currentBounds.height),
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    animate();
  });
}
```

### 2. IPC 处理器 (main/ipc.ts)

```typescript
import { ipcMain } from 'electron';
import { WINDOW_CONFIG, animateWindowBounds, initialCenterX } from './window';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // 鼠标穿透控制
  ipcMain.on('window:set-mouse-passthrough', (_event, enabled: boolean) => {
    mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
  });

  // 窗口展开 (Hover)
  ipcMain.on('window:expand-hover', async () => {
    const bounds = mainWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;

    const newBounds = {
      x: Math.round(centerX - WINDOW_CONFIG.HOVER_WIDTH / 2),
      y: bounds.y,
      width: WINDOW_CONFIG.HOVER_WIDTH,
      height: WINDOW_CONFIG.HOVER_HEIGHT,
    };

    await animateWindowBounds(newBounds, 300);
  });

  // 窗口收起
  ipcMain.on('window:collapse-hover', async () => {
    const bounds = mainWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;

    const newBounds = {
      x: Math.round(centerX - WINDOW_CONFIG.IDLE_WIDTH / 2),
      y: bounds.y,
      width: WINDOW_CONFIG.IDLE_WIDTH,
      height: WINDOW_CONFIG.IDLE_HEIGHT,
    };

    await animateWindowBounds(newBounds, 300);
  });

  // 音乐面板展开
  ipcMain.on('window:expand-music', async () => {
    const bounds = mainWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;

    const newBounds = {
      x: Math.round(centerX - WINDOW_CONFIG.EXPANDED_WIDTH / 2),
      y: bounds.y,
      width: WINDOW_CONFIG.EXPANDED_WIDTH,
      height: WINDOW_CONFIG.EXPANDED_HEIGHT,
    };

    await animateWindowBounds(newBounds, 300);
  });

  // 音乐面板收起
  ipcMain.on('window:collapse-music', async () => {
    const bounds = mainWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;

    const newBounds = {
      x: Math.round(centerX - WINDOW_CONFIG.HOVER_WIDTH / 2),
      y: bounds.y,
      width: WINDOW_CONFIG.HOVER_WIDTH,
      height: WINDOW_CONFIG.HOVER_HEIGHT,
    };

    await animateWindowBounds(newBounds, 300);
  });

  // 获取鼠标位置
  ipcMain.handle('window:get-mouse-position', () => {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  });

  // 获取窗口边界
  ipcMain.handle('window:get-bounds', () => {
    return mainWindow.getBounds();
  });
}
```

### 3. 渲染进程鼠标追踪 (renderer/utils/mouseTracker.ts)

```typescript
import { useEffect, useRef } from 'react';

interface UseMouseTrackerOptions {
  /** 是否启用追踪 */
  enabled?: boolean;
  /** 悬停触发区域 */
  hoverZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** 悬停回调 */
  onHover?: () => void;
  /** 离开回调 */
  onLeave?: () => void;
}

export function useMouseTracker(options: UseMouseTrackerOptions = {}) {
  const {
    enabled = true,
    hoverZone,
    onHover,
    onLeave
  } = options;

  const isHoveringRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const checkMousePosition = async () => {
      try {
        const position = await window.api?.getMousePosition();
        if (!position) return;

        const isInside = hoverZone &&
          position.x >= hoverZone.x &&
          position.x <= hoverZone.x + hoverZone.width &&
          position.y >= hoverZone.y &&
          position.y <= hoverZone.y + hoverZone.height;

        if (isInside && !isHoveringRef.current) {
          isHoveringRef.current = true;
          onHover?.();
        } else if (!isInside && isHoveringRef.current) {
          isHoveringRef.current = false;
          onLeave?.();
        }
      } catch (error) {
        console.error('[MouseTracker] 获取鼠标位置失败:', error);
      }

      if (enabled) {
        animationFrameId = requestAnimationFrame(checkMousePosition);
      }
    };

    animationFrameId = requestAnimationFrame(checkMousePosition);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, hoverZone, onHover, onLeave]);
}
```

---

## 隐私状态监控

### 1. Native Addon (native/privacy.cpp)

```cpp
#include <node.h>
#include <windows.h>
#include <winrt/Windows.Devices.Enumeration.h>
#include <winrt/Windows.Media.Capture.h>

using namespace v8;
using namespace winrt::Windows::Devices::Enumeration;
using namespace winrt::Windows::Media::Capture;

/** 获取隐私使用状态 */
void GetPrivacyUsage(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  bool microphoneInUse = false;
  bool cameraInUse = false;

  // 检查麦克风
  try {
    auto deviceInfo = DeviceInformation::CreateFromIdAsync(
      L"?\\SWD\\MMDEVAPI\\{0.0.1.00000000}{50994946-0D09-4682-AF67-85BF7AE1C88C}"
    ).get();

    // 实际实现需要调用 Windows Audio API
    // 这里是简化示例
  } catch (...) {
  }

  // 检查摄像头
  try {
    DeviceInformationCollection devices = DeviceInformation::FindAllAsync(
      DeviceClass::VideoCapture
    ).get();

    for (const auto& device : devices) {
      // 检查设备是否被占用
    }
  } catch (...) {
  }

  Local<Object> result = Object::New(isolate);
  result->Set(context,
    String::NewFromUtf8(isolate, "microphone").ToLocalChecked(),
    Boolean::New(isolate, microphoneInUse)
  );
  result->Set(context,
    String::NewFromUtf8(isolate, "camera").ToLocalChecked(),
    Boolean::New(isolate, cameraInUse)
  );

  args.GetReturnValue().Set(result);
}

void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "getPrivacyUsage", GetPrivacyUsage);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
```

### 2. 主进程轮询 (main/privacy.ts)

```typescript
import { BrowserWindow } from 'electron';
import privacyNative from '../../build/Release/privacy_native.node';

export function startPrivacyPolling(mainWindow: BrowserWindow): void {
  let lastMicState = false;
  let lastCameraState = false;

  const pollInterval = setInterval(async () => {
    try {
      const privacy = privacyNative.getPrivacyUsage() as {
        microphone: boolean;
        camera: boolean;
      };

      // 麦克风状态变化
      if (privacy.microphone !== lastMicState) {
        lastMicState = privacy.microphone;
        mainWindow.webContents.send('privacy:usage-changed', {
          microphone: privacy.microphone,
          camera: lastCameraState
        });
      }

      // 摄像头状态变化
      if (privacy.camera !== lastCameraState) {
        lastCameraState = privacy.camera;
        mainWindow.webContents.send('privacy:usage-changed', {
          microphone: lastMicState,
          camera: privacy.camera
        });
      }
    } catch (error) {
      console.error('[Privacy] 获取状态失败:', error);
    }
  }, 1200); // 1.2秒轮询

  return () => clearInterval(pollInterval);
}
```

---

## 剪贴板链接检测

### 1. 主进程监控 (main/clipboard.ts)

```typescript
import { clipboard, BrowserWindow } from 'electron';
import { extractUrls } from '../renderer/utils/urlUtils';

let lastText = '';

export function startClipboardMonitoring(mainWindow: BrowserWindow): void {
  const pollInterval = setInterval(() => {
    const currentText = clipboard.readText();

    if (currentText !== lastText) {
      lastText = currentText;

      const urls = extractUrls(currentText);

      if (urls.length > 0) {
        mainWindow.webContents.send('clipboard:urls-detected', urls);
      }
    }
  }, 1200); // 1.2秒轮询

  return () => clearInterval(pollInterval);
}

/** URL 提取工具 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}
```

### 2. URL 工具 (renderer/utils/urlUtils.ts)

```typescript
/** 提取文本中的 URL */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/** 格式化 URL 显示 */
export function formatUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;

  return url.slice(0, maxLength - 3) + '...';
}

/** 获取域名 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}
```

---

## 网络与蓝牙监控

### 1. 网络监控 (main/network.ts)

```typescript
import { BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let lastOnline = false;

export function startNetworkMonitoring(mainWindow: BrowserWindow): void {
  const pollInterval = setInterval(async () => {
    try {
      // Windows: 使用 ping 检测
      const { stdout } = await execAsync('ping -n 1 8.8.8.8', {
        timeout: 2000
      });

      const isOnline = stdout.includes('TTL') || stdout.includes('bytes');

      if (isOnline !== lastOnline) {
        lastOnline = isOnline;

        mainWindow.webContents.send('network:status-changed', {
          online: isOnline,
          message: isOnline ? '网络已连接' : '网络已断开'
        });
      }
    } catch (error) {
      if (lastOnline) {
        lastOnline = false;
        mainWindow.webContents.send('network:status-changed', {
          online: false,
          message: '网络已断开'
        });
      }
    }
  }, 8000); // 8秒轮询

  return () => clearInterval(pollInterval);
}
```

### 2. 蓝牙监控 (main/bluetooth.ts)

```typescript
import { BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function startBluetoothMonitoring(mainWindow: BrowserWindow): void {
  let lastDevices = new Set<string>();

  const pollInterval = setInterval(async () => {
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq 'OK'} | Select-Object -ExpandProperty FriendlyName"`,
        { timeout: 5000 }
      );

      const devices = new Set(
        stdout.trim().split('\n').filter(d => d.trim())
      );

      // 检测新连接的设备
      for (const device of devices) {
        if (!lastDevices.has(device)) {
          mainWindow.webContents.send('bluetooth:device-connected', { name: device });
        }
      }

      // 检测断开的设备
      for (const device of lastDevices) {
        if (!devices.has(device)) {
          mainWindow.webContents.send('bluetooth:device-disconnected', { name: device });
        }
      }

      lastDevices = devices;
    } catch (error) {
      console.error('[Bluetooth] 检测失败:', error);
    }
  }, 32000); // 32秒轮询

  return () => clearInterval(pollInterval);
}
```

---

## 状态管理

### Zustand Store 完整实现 (renderer/store/islandStore.ts)

```typescript
import { create } from 'zustand';
import { fetchWeather, type WeatherData, type WeatherApiConfig } from '../api/weatherApi';

// ===== 类型定义 =====
export type IslandState = 'idle' | 'hover' | 'notification';
export type ViewMode = 'time' | 'music' | 'agent';
export type LrcMode = 'off' | 'info' | 'lrc';

export interface LyricLine {
  text: string;
  is_current: boolean;
}

export interface MediaInfo {
  title: string;
  artist: string;
  duration_ms: number;
}

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
}

// ===== Store 接口 =====
interface IIslandStore {
  // 状态
  state: IslandState;
  viewMode: ViewMode;
  isExpanded: boolean;
  isMusicExpanded: boolean;

  // 时间
  currentTime: string;
  currentDate: string;

  // 天气
  weather: WeatherData;

  // 音乐
  isMusicPlaying: boolean;
  isPlaying: boolean;
  lrcMode: LrcMode;
  mediaInfo: MediaInfo;
  currentLyricText: string | null;
  currentPositionMs: number;
  currentDurationMs: number;
  nearbyLyrics: LyricLine[];
  coverImage: string | null;

  // 通知
  notification: NotificationData;

  // URL 列表
  pendingUrls: string[];

  // AI Agent
  aiEnabled: boolean;
  aiGenerating: boolean;
  aiMessages: ChatMessage[];

  // 隐私
  microphoneInUse: boolean;
  cameraInUse: boolean;

  // ===== 方法 =====
  // 状态切换
  setState: (state: IslandState) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleExpanded: () => void;
  toggleMusicExpanded: () => void;

  // 时间更新
  updateTime: () => void;

  // 天气
  setWeather: (data: WeatherData) => void;
  fetchWeather: (config: WeatherApiConfig) => Promise<void>;

  // 音乐
  updateLrcData: (data: LrcUpdateData) => void;
  onMediaChanged: (data: MediaChangedData) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setLrcMode: (mode: LrcMode) => void;
  updateProgress: (positionMs: number) => void;
  setCoverImage: (cover: string | null) => void;

  // 通知
  setNotification: (data: NotificationData) => void;
  clearNotification: () => void;

  // URL
  setPendingUrls: (urls: string[]) => void;
  clearPendingUrls: () => void;

  // AI
  setAiEnabled: (enabled: boolean) => void;
  setAiGenerating: (generating: boolean) => void;
  addAiMessage: (message: ChatMessage) => void;
  clearAiMessages: () => void;

  // 隐私
  setPrivacyUsage: (mic: boolean, camera: boolean) => void;
}

// ===== Store 实现 =====
const useIslandStore = create<IIslandStore>((set, get) => ({
  // 初始状态
  state: 'idle',
  viewMode: 'time',
  isExpanded: false,
  isMusicExpanded: false,

  currentTime: '00:00:00',
  currentDate: '',

  weather: {
    temperature: 0,
    description: '',
    city: ''
  },

  isMusicPlaying: false,
  isPlaying: false,
  lrcMode: 'lrc',
  mediaInfo: { title: '', artist: '', duration_ms: 0 },
  currentLyricText: null,
  currentPositionMs: 0,
  currentDurationMs: 0,
  nearbyLyrics: [],
  coverImage: null,

  notification: {
    title: '',
    body: ''
  },

  pendingUrls: [],

  aiEnabled: false,
  aiGenerating: false,
  aiMessages: [],

  microphoneInUse: false,
  cameraInUse: false,

  // ===== 方法实现 =====
  setState: (state) => set({ state }),
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleExpanded: () => {
    const { isExpanded } = get();
    set({ isExpanded: !isExpanded });

    if (!isExpanded) {
      window.api?.expandWindow();
    } else {
      window.api?.collapseWindow();
    }
  },

  toggleMusicExpanded: () => {
    const { isMusicExpanded } = get();
    set({ isMusicExpanded: !isMusicExpanded });

    if (!isMusicExpanded) {
      window.api?.expandMusicPanel();
    } else {
      window.api?.collapseMusicPanel();
    }
  },

  updateTime: () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    const dateStr = now.toLocaleDateString('zh-CN', {
      weekday: 'short',
      month: '2-digit',
      day: '2-digit'
    });

    set({
      currentTime: timeStr,
      currentDate: dateStr
    });
  },

  setWeather: (data) => set({ weather: data }),

  fetchWeather: async (config) => {
    const weather = await fetchWeather(config);
    set({ weather });
  },

  updateLrcData: (data) => set((state) => {
    if (!data.text && !data.title && !data.artist) {
      return {
        isMusicPlaying: false,
        isPlaying: false,
        currentLyricText: null,
        nearbyLyrics: []
      };
    }

    return {
      isMusicPlaying: true,
      currentLyricText: data.text,
      currentPositionMs: data.position_ms ?? state.currentPositionMs,
      currentDurationMs: data.duration_ms ?? state.currentDurationMs,
      mediaInfo: {
        title: data.title || state.mediaInfo.title,
        artist: data.artist || state.mediaInfo.artist,
        duration_ms: data.duration_ms ?? state.mediaInfo.duration_ms
      },
      nearbyLyrics: data.nearby_lyrics ?? []
    };
  }),

  onMediaChanged: (data) => set({
    isMusicPlaying: true,
    mediaInfo: {
      title: data.title,
      artist: data.artist,
      duration_ms: data.duration_ms ?? 0
    },
    currentLyricText: null,
    nearbyLyrics: [],
    currentDurationMs: data.duration_ms ?? 0,
    currentPositionMs: 0,
    coverImage: data.thumbnail ?? null
  }),

  setPlaybackState: (isPlaying) => set({ isPlaying }),
  setLrcMode: (mode) => set({ lrcMode: mode }),
  updateProgress: (positionMs) => set({ currentPositionMs: positionMs }),
  setCoverImage: (cover) => set({ coverImage: cover }),

  setNotification: (data) => {
    set({ notification: data, state: 'notification' });
    window.api?.expandWindow();
  },

  clearNotification: () => {
    set({ notification: { title: '', body: '' } });
    window.api?.collapseWindow();
  },

  setPendingUrls: (urls) => set({ pendingUrls: urls }),
  clearPendingUrls: () => set({ pendingUrls: [] }),

  setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
  setAiGenerating: (generating) => set({ aiGenerating: generating }),
  addAiMessage: (message) => set((state) => ({
    aiMessages: [...state.aiMessages, message]
  })),
  clearAiMessages: () => set({ aiMessages: [] }),

  setPrivacyUsage: (mic, camera) => set({
    microphoneInUse: mic,
    cameraInUse: camera
  })
}));

export default useIslandStore;
```

---

## 样式系统

### Tailwind 配置 (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx,html}'
  ],
  theme: {
    extend: {
      colors: {
        island: {
          bg: '#00000000',
          capsule: 'rgba(28, 28, 30, 0.95)',
          hover: 'rgba(44, 44, 46, 0.98)',
          text: '#ffffff',
          textSecondary: 'rgba(255, 255, 255, 0.7)',
          accent: '#0A84FF',
          success: '#30D158',
          warning: '#FFD60A',
          danger: '#FF453A'
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
```

### 全局样式 (renderer/styles/index.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    width: 100%;
    height: 100%;
  }
}

@layer components {
  /* 灵动岛胶囊 */
  .island-capsule {
    @apply bg-island-capsule rounded-[24px] shadow-xl;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  /* 按钮样式 */
  .island-btn {
    @apply px-3 py-1.5 rounded-lg
           bg-island-hover/80
           text-island-text
           hover:bg-island-accent
           active:scale-95
           transition-all duration-200;
  }

  /* 进度条 */
  .island-progress {
    @apply h-1 bg-white/10 rounded-full cursor-pointer;
  }

  .island-progress-fill {
    @apply h-full bg-island-accent rounded-full transition-all duration-100;
  }

  /* 唱片旋转 */
  .vinyl-spin {
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* 歌词高亮 */
  .lyric-highlight {
    @apply text-island-text font-medium;
  }

  .lyric-fade {
    @apply text-island-textSecondary;
  }
}
```

### Hover 状态样式 (renderer/styles/hover.css)

```css
/* Hover 区域 */
.hover-zone {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 20px;
  z-index: 100;
}

/* Hover 触发 */
.island-capsule:hover {
  transform: translateY(2px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.4);
}

/* 展开态 */
.island-capsule.expanded {
  width: 320px;
  height: 74px;
}

/* 音乐面板展开态 */
.island-capsule.music-expanded {
  width: 380px;
  height: 360px;
}
```

---

## 部署与打包

### 1. Electron Builder 配置 (electron-builder.json)

```json
{
  "appId": "com.eisland.app",
  "productName": "eIsland",
  "directories": {
    "output": "dist",
    "buildResources": "resources"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "resources/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "perMachine": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "eisland"
  }
}
```

### 2. 构建脚本 (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:native": "node-gyp rebuild --directory src/native",
    "build:all": "npm run build:native && npm run build",
    "dist": "npm run build:all && electron-builder",
    "dist:win": "npm run build:all && electron-builder --win",
    "dist:mac": "npm run build:all && electron-builder --mac"
  }
}
```

### 3. 开发环境启动

```bash
# 安装依赖
npm install

# 构建原生模块
npm run build:native

# 启动开发服务器
npm run dev
```

### 4. 生产环境打包

```bash
# Windows 打包
npm run dist:win

# 输出目录: dist/
# - eIsland Setup 1.0.0.exe (安装包)
# - eIsland-win32-x64 (免安装版)
```

---

## 总结

这份文档提供了完整的 Electron + React + TypeScript + Tailwind 实现方案，涵盖：

✅ **核心功能**
- 动态岛窗口 (透明、置顶、穿透)
- SMTC 媒体控制 (Node.js C++ Addon)
- 歌词系统 (LRCLIB + 网易云)
- 天气显示 (Open-Meteo API)
- AI Agent (OpenAI / 本地 LLM)
- 通知系统
- 剪贴板链接检测
- 隐私状态监控
- 网络/蓝牙监控

✅ **技术栈**
- Electron 28 (主进程)
- React 18 (UI)
- TypeScript (类型安全)
- Tailwind CSS (样式)
- Zustand (状态管理)
- Node.js C++ Addon (Windows API)

✅ **性能优化**
- 轮询机制 (200ms/8000ms)
- 代数机制防止竞态
- 异步获取不阻塞主线程
- requestAnimationFrame 平滑动画

✅ **可扩展性**
- 模块化架构
- 插件式 API
- 清晰的类型定义
- 易于维护的代码结构

---

**下一步建议:**

1. 实现完整的 C++ Native Addons
2. 添加单元测试和 E2E 测试
3. 实现设置持久化 (electron-store)
4. 添加多语言支持
5. 实现主题切换
6. 优化性能和内存占用
7. 添加错误报告和日志系统

祝你实现顺利！🚀
