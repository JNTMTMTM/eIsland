// 离线验证原生增量协议，不启动 WinRT 监控或控制播放器。
using System.Reflection;
using System.Text.Json;
using eIslandSmtcHelper;

// SMTC Position 属于 LastUpdatedTime，不是调用时刻；离线复现启动后落后、拖动后才对齐。
var projectPosition = typeof(SmtcController).GetMethod("ProjectTimelinePosition", BindingFlags.NonPublic | BindingFlags.Static)!;
var sampledAt = new DateTimeOffset(2026, 10, 15, 12, 0, 0, TimeSpan.Zero);
void AssertPosition(double expected, double raw, DateTimeOffset updatedAt, bool playing = true,
    double? rate = null, double end = 180, double start = 0)
{
    var actual = (double)projectPosition.Invoke(null, new object?[] { raw, start, end, updatedAt, playing, rate, sampledAt })!;
    if (Math.Abs(actual - expected) > 0.000001)
        throw new Exception($"Timeline expected {expected}, received {actual}");
}
AssertPosition(22.25, 20, sampledAt.AddSeconds(-2.25));
AssertPosition(23.375, 20, sampledAt.AddSeconds(-2.25), rate: 1.5);
AssertPosition(21.125, 20, sampledAt.AddSeconds(-2.25), rate: 0.5);
AssertPosition(20, 20, sampledAt.AddSeconds(-2.25), playing: false);
AssertPosition(20, 20, sampledAt.AddSeconds(-2.25), rate: 0);
AssertPosition(22.25, 20, sampledAt.AddSeconds(-2.25), rate: double.NaN);
AssertPosition(20, 20, sampledAt.AddSeconds(2.25));
AssertPosition(20, 20, DateTimeOffset.MinValue);
AssertPosition(180, 179, sampledAt.AddSeconds(-5));
AssertPosition(185, 180, sampledAt.AddSeconds(-5), end: 0);
AssertPosition(10, 0, sampledAt, start: 10);
AssertPosition(75.05, 75, sampledAt.AddMilliseconds(-50));
Console.WriteLine("PASS: delayed timeline, playback rate, pause, seek, bounds and invalid source timestamps.");

// 部分播放器只发 PlaybackInfoChanged，暂停/恢复/倍速变更都沿用同一原始时间线。
var clockType = typeof(SmtcController).GetNestedType("TimelineClock", BindingFlags.NonPublic)!;
var clock = Activator.CreateInstance(clockType, nonPublic: true)!;
var sampleClock = clockType.GetMethod("Sample", BindingFlags.NonPublic | BindingFlags.Instance)!;
void AssertClock(double expected, double elapsed, bool playing, double rate = 1,
    double raw = 10, double updatedAfter = 0)
{
    var actual = (double)sampleClock.Invoke(clock, new object[] {
        raw, 0d, 180d, sampledAt.AddSeconds(updatedAfter), playing, rate, sampledAt.AddSeconds(elapsed)
    })!;
    if (Math.Abs(actual - expected) > 0.000001)
        throw new Exception($"Timeline state expected {expected}, received {actual}");
}
AssertClock(12, 2, true);
AssertClock(15, 5, false);
AssertClock(15, 8, false);
AssertClock(15, 10, true);
AssertClock(17, 12, true);
AssertClock(19, 14, true, rate: 2);
AssertClock(21, 15, true, rate: 2);
AssertClock(50, 15, true, rate: 2, raw: 50, updatedAfter: 15);
AssertClock(52, 16, true, rate: 2, raw: 50, updatedAfter: 15);
Console.WriteLine("PASS: unchanged source timeline preserves pause/resume/rate transitions and accepts seek updates.");

var publish = typeof(SmtcSessionMonitor).GetMethod("PublishSession", BindingFlags.NonPublic | BindingFlags.Static)!;
var cover = "data:image/png;base64," + new string('x', 300000);
var media = new MediaMetadata { Title = "Song", Thumbnail = cover };
void Update(double position, bool changed) => publish.Invoke(null, new object[] {
    new SessionInfo { SourceAppId = "app", Media = media, Playback = new PlaybackInfoSnapshot { PlaybackStatus = 4, PlaybackRate = 1.5 }, Timeline = new TimelineInfo { Position = position, Duration = 900, SampledAtMs = sampledAt.ToUnixTimeMilliseconds() } }, changed
});
Update(0, true);
Update(0.2, false); // 轮询前的时间线变化必须保留首次媒体和封面。
var first = SmtcSessionMonitor.DrainSessionChangesJson()!;
if (!first.Contains(cover)) throw new Exception("First delta lost artwork");
using (var initial = JsonDocument.Parse(first))
{
    if (initial.RootElement[0].GetProperty("timeline").GetProperty("sampledAtMs").GetInt64() != sampledAt.ToUnixTimeMilliseconds())
        throw new Exception("Delta lost timeline sample time");
    if (initial.RootElement[0].GetProperty("playback").GetProperty("playbackRate").GetDouble() != 1.5)
        throw new Exception("Delta lost playback rate");
}
using (var cached = JsonDocument.Parse(SmtcSessionMonitor.GetSessionJson("app")!))
{
    if (cached.RootElement.GetProperty("timeline").GetProperty("sampledAtMs").GetInt64() != sampledAt.ToUnixTimeMilliseconds())
        throw new Exception("Cached timeline was restamped");
}
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

var dispatch = typeof(SmtcExports).GetMethod("RunOnSTAThread", BindingFlags.NonPublic | BindingFlags.Static)!.MakeGenericMethod(typeof(int));
var threads = new HashSet<int>();
for (var i = 0; i < 100; i++)
{
    Func<Task<int>> action = () => Task.FromResult(Environment.CurrentManagedThreadId);
    threads.Add((int)dispatch.Invoke(null, new object[] { action })!);
}
if (threads.Count != 1) throw new Exception("Commands must reuse one STA thread");
Console.WriteLine("PASS: 100 offline commands reused one STA thread.");

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
