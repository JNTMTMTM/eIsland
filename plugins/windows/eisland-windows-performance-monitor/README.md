# @eisland/windows-performance-monitor

Windows CPU、内存与硬件温度采集插件，版本 26.1.0。

CPU 与内存直接调用 Win32 API。温度与设备发现复用一个 .NET / LibreHardwareMonitor helper，通过 stdin/stdout 按行交换 JSON，只在收到请求时更新传感器。

```js
const monitor = require('@eisland/windows-performance-monitor');

async function sample() {
  try {
    const [temperature, hardwareList] = await Promise.all([
      monitor.getTemperatureAsync(),
      monitor.getHardwareListAsync(),
    ]);
    return { temperature, hardwareList, cpu: monitor.getCpu(), memory: monitor.getMemory() };
  } finally {
    monitor.dispose();
  }
}
```

连续监控时在整个监控会话结束后调用 `dispose()`，避免每次采样都重启 helper。

| API | 行为 |
| --- | --- |
| `getCpu()` | 返回 CPU 增量占用率与基线状态 |
| `getMemory()` | 返回物理内存快照 |
| `getTemperature()` | 立即返回温度缓存，过期时异步刷新 |
| `getTemperatureAsync()` | 等待本次温度采集，或返回两秒内的缓存 |
| `getHardwareList()` | 立即返回设备列表缓存，首次异步发现 |
| `getHardwareListAsync()` | 首次等待设备发现，后续读取缓存 |
| `dispose()` | 停止 helper、结束等待中的请求并清空缓存 |

从 26.0.x 升级时，需要等待首次温度或设备发现的调用应改用对应 `Async` API。同步入口首次返回 `isAvailable: false`；快照结构保持一致。缓存对象和数组被冻结，需要修改时请先复制。

并发查询共享一次采样；温度缓存两秒。设备发现不更新传感器，只在会话内发现一次。helper 无后台轮询，15 秒没有采集请求后关闭；进程错误、异常响应或五秒超时会返回不可用温度快照，并退避十秒再允许重试。设备列表保留到下一次发现或 `dispose()`。温度可用性取决于硬件和访问权限。

构建需要 Node.js、Windows C++ 构建工具及 .NET 10 SDK：

```powershell
npm run build
npm test
npm run smoke
npm run smoke:polling
```
