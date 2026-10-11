// 离线验证原生增量协议，不启动 WinRT 监控或控制播放器。
using System.Reflection;
using System.Text.Json;
using eIslandSmtcHelper;

var publish = typeof(SmtcSessionMonitor).GetMethod("PublishSession", BindingFlags.NonPublic | BindingFlags.Static)!;
var cover = "data:image/png;base64," + new string('x', 300000);
var media = new MediaMetadata { Title = "Song", Thumbnail = cover };
void Update(double position, bool changed) => publish.Invoke(null, new object[] {
    new SessionInfo { SourceAppId = "app", Media = media, Playback = new PlaybackInfoSnapshot { PlaybackStatus = 4 }, Timeline = new TimelineInfo { Position = position, Duration = 900 } }, changed
});
Update(0, true);
Update(0.2, false); // 轮询前的时间线变化必须保留首次媒体和封面。
var first = SmtcSessionMonitor.DrainSessionChangesJson()!;
if (!first.Contains(cover)) throw new Exception("First delta lost artwork");
long bytes = 0;
for (var i = 1; i <= 3000; i++)
{
    Update(i * 0.2, false);
    var delta = SmtcSessionMonitor.DrainSessionChangesJson()!;
    if (delta.Contains("thumbnail") || delta.Contains("\"media\"")) throw new Exception("Timeline copied media/artwork");
    bytes += delta.Length;
}
media = new MediaMetadata { Title = "Renamed", Thumbnail = cover };
Update(601, true);
var renamed = SmtcSessionMonitor.DrainSessionChangesJson()!;
if (renamed.Contains(cover)) throw new Exception("Unchanged artwork was resent");
using var parsed = JsonDocument.Parse(renamed);
if (!parsed.RootElement[0].GetProperty("mediaChanged").GetBoolean()) throw new Exception("Media update lost");
if (SmtcSessionMonitor.DrainSessionChangesJson() != "[]") throw new Exception("Drain must consume changes");
Console.WriteLine($"PASS: 3000 timeline updates contain no artwork; {bytes} JSON characters total.");

// 模拟 WinRT 回调持锁且迟迟不返回；FFI drain 必须立即返回可重试信号。
var sessionLock = typeof(SmtcSessionMonitor).GetField("_sessionLock", BindingFlags.NonPublic | BindingFlags.Static)!.GetValue(null)!;
using var acquired = new ManualResetEventSlim();
using var release = new ManualResetEventSlim();
Update(602, false);
var holder = new Thread(() => { lock (sessionLock) { acquired.Set(); release.Wait(); } }) { IsBackground = true };
holder.Start();
if (!acquired.Wait(1000)) throw new Exception("Lock fixture did not start");
try
{
    var blockedDrain = Task.Run(SmtcSessionMonitor.DrainSessionChangesJson);
    if (!blockedDrain.Wait(500)) throw new Exception("Drain blocked the Node Worker on a WinRT callback lock");
    if (blockedDrain.Result != null) throw new Exception("Contended drain must remain retryable");
}
finally { release.Set(); holder.Join(); }
if (SmtcSessionMonitor.DrainSessionChangesJson() == "[]") throw new Exception("Contended drain lost its pending delta");
Console.WriteLine("PASS: contended drain returned without blocking and retained pending changes.");
