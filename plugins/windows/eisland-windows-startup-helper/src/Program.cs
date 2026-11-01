/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/*
 * @file Program.cs
 * @description 启动项 / 计划任务 / 服务查询 helper 入口，结果以 { items, errors } JSON 写入 stdout
 * @description errors 记录无权限或读取失败的位置，供调用方识别不完整结果；整体失败时以非零退出码退出
 * @author 鸡哥
 */

using System.ComponentModel;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

var command = args.FirstOrDefault() ?? "";
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
// 错误信息可能为本地化文本，固定 UTF-8 避免调用方读取 stderr 时乱码
Console.OutputEncoding = Encoding.UTF8;

try
{
    var errors = new List<object>();
    object[]? items = command switch
    {
        "startup"  => StartupInfoHelper.GetStartupItems(errors),
        "tasks"    => StartupInfoHelper.GetScheduledTasks(errors),
        "services" => StartupInfoHelper.GetServices(errors),
        _          => null
    };
    if (items == null)
    {
        Console.Error.WriteLine($"Unknown command: {command}");
        return 1;
    }
    Console.WriteLine(JsonSerializer.Serialize(new { items, errors }, jsonOptions));
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex.Message);
    return 1;
}

static class StartupInfoHelper
{
    const string RunPath           = @"Software\Microsoft\Windows\CurrentVersion\Run";
    const string RunOncePath       = @"Software\Microsoft\Windows\CurrentVersion\RunOnce";
    const string ApprovedRoot      = @"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved";

    // ───────────────────────── 启动项 ─────────────────────────

    public static object[] GetStartupItems(List<object> errors)
    {
        var list = new List<object>();
        var hkcu = RegistryKey.OpenBaseKey(RegistryHive.CurrentUser, RegistryView.Default);
        var hklm64 = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64);

        AddRegistryItems(list, errors, hkcu, RunPath, "user", hkcu, "Run");
        AddRegistryItems(list, errors, hkcu, RunOncePath, "user", null, null);
        AddRegistryItems(list, errors, hklm64, RunPath, "machine", hklm64, "Run");
        AddRegistryItems(list, errors, hklm64, RunOncePath, "machine", null, null);

        // 32 位系统上两个视图指向同一位置，跳过以避免重复
        if (Environment.Is64BitOperatingSystem)
        {
            var hklm32 = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry32);
            AddRegistryItems(list, errors, hklm32, RunPath, "machine", hklm64, "Run32");
            AddRegistryItems(list, errors, hklm32, RunOncePath, "machine", null, null);
        }

        AddFolderItems(list, errors, Environment.GetFolderPath(Environment.SpecialFolder.Startup), "user", hkcu);
        AddFolderItems(list, errors, Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup), "machine", hklm64);

        return list.ToArray();
    }

    static void AddRegistryItems(
        List<object> list, List<object> errors, RegistryKey hive, string path, string scope,
        RegistryKey? approvedHive, string? approvedSub)
    {
        var source = $@"{hive.Name}\{path}" + (hive.View == RegistryView.Registry32 ? " (32-bit)" : "");
        try
        {
            using var key = hive.OpenSubKey(path);
            if (key == null) return;
            foreach (var valueName in key.GetValueNames())
            {
                if (string.IsNullOrEmpty(valueName)) continue;
                list.Add(new
                {
                    name     = valueName,
                    command  = key.GetValue(valueName)?.ToString(),
                    location = "registry",
                    source,
                    scope,
                    enabled  = approvedSub == null ? true : IsApproved(approvedHive!, approvedSub, valueName),
                });
            }
        }
        catch (Exception ex) { errors.Add(QueryError(source, ex)); }
    }

    static void AddFolderItems(List<object> list, List<object> errors, string folder, string scope, RegistryKey approvedHive)
    {
        try
        {
            if (string.IsNullOrEmpty(folder) || !Directory.Exists(folder)) return;
            foreach (var file in Directory.EnumerateFiles(folder))
            {
                var fileName = Path.GetFileName(file);
                if (fileName.Equals("desktop.ini", StringComparison.OrdinalIgnoreCase)) continue;
                list.Add(new
                {
                    name     = Path.GetFileNameWithoutExtension(file),
                    command  = file,
                    location = "startupFolder",
                    source   = folder,
                    scope,
                    enabled  = IsApproved(approvedHive, "StartupFolder", fileName),
                });
            }
        }
        catch (Exception ex) { errors.Add(QueryError(folder, ex)); }
    }

    /// 记录单个位置的读取失败，source 为注册表键、目录、任务路径或 service:名称
    static object QueryError(string source, Exception ex) => new { source, message = ex.Message };

    /// StartupApproved 值首字节最低位为 1 表示被任务管理器禁用；缺失视为启用
    static bool IsApproved(RegistryKey hive, string sub, string valueName)
    {
        try
        {
            using var key = hive.OpenSubKey($@"{ApprovedRoot}\{sub}");
            if (key?.GetValue(valueName) is byte[] data && data.Length > 0)
            {
                return (data[0] & 1) == 0;
            }
        }
        catch { /* 读取失败按启用处理 */ }
        return true;
    }

    // ───────────────────────── 计划任务 ─────────────────────────

    public static object[] GetScheduledTasks(List<object> errors)
    {
        var list = new List<object>();
        var type = Type.GetTypeFromProgID("Schedule.Service")
            ?? throw new InvalidOperationException("Task Scheduler service is unavailable");
        dynamic service = Activator.CreateInstance(type)!;
        service.Connect();
        WalkTaskFolder(service.GetFolder(@"\"), list, errors);
        return list.ToArray();
    }

    static void WalkTaskFolder(dynamic folder, List<object> list, List<object> errors)
    {
        string folderPath = (string)folder.Path;
        try
        {
            // 1 = TASK_ENUM_HIDDEN，包含隐藏任务
            foreach (dynamic task in folder.GetTasks(1))
            {
                // 单个任务读取失败不影响其余任务
                try { list.Add(ReadTask(task, errors)); }
                catch (Exception ex) { errors.Add(QueryError(folderPath, ex)); }
            }
        }
        catch (Exception ex) { errors.Add(QueryError(folderPath, ex)); }

        try
        {
            // ITaskFolder::GetFolders 的 flags 为保留参数，必须为 0；隐藏属性只作用于任务而非目录
            foreach (dynamic sub in folder.GetFolders(0))
            {
                WalkTaskFolder(sub, list, errors);
            }
        }
        catch (Exception ex) { errors.Add(QueryError(folderPath, ex)); }
    }

    static object ReadTask(dynamic task, List<object> errors)
    {
        string path = (string)task.Path;
        string? author = null, description = null;
        var actions = new List<object>();
        try
        {
            dynamic def = task.Definition;
            author = (string?)def.RegistrationInfo.Author;
            description = (string?)def.RegistrationInfo.Description;
            foreach (dynamic action in def.Actions)
            {
                int actionType = (int)action.Type;
                // 0 = TASK_ACTION_EXEC，其余类型（COM 处理器 / 邮件 / 消息）无可执行路径
                actions.Add(actionType == 0
                    ? new { type = "exec", path = (string?)action.Path, arguments = (string?)action.Arguments, workingDirectory = (string?)action.WorkingDirectory }
                    : new { type = TaskActionTypeName(actionType), path = (string?)null, arguments = (string?)null, workingDirectory = (string?)null });
            }
        }
        // 部分系统任务定义需要管理员权限，此时 author / description / actions 缺失
        catch (Exception ex) { errors.Add(QueryError(path, ex)); }

        int lastSlash = path.LastIndexOf('\\');
        return new
        {
            name           = (string)task.Name,
            path,
            folder         = lastSlash <= 0 ? @"\" : path[..lastSlash],
            state          = TaskStateName((int)task.State),
            enabled        = (bool)task.Enabled,
            author,
            description,
            lastRunTime    = TaskTime((DateTime)task.LastRunTime),
            nextRunTime    = TaskTime((DateTime)task.NextRunTime),
            lastTaskResult = (int)task.LastTaskResult,
            actions        = actions.ToArray(),
        };
    }

    /// 任务计划程序以 1899/1999 等占位日期表示"从未运行/无计划"
    static string? TaskTime(DateTime dt) =>
        dt.Year < 2000 ? null : dt.ToString("yyyy-MM-dd'T'HH':'mm':'ss", CultureInfo.InvariantCulture);

    static string TaskStateName(int s) => s switch
    {
        1 => "disabled", 2 => "queued", 3 => "ready", 4 => "running",
        _ => "unknown"
    };

    static string TaskActionTypeName(int t) => t switch
    {
        5 => "comHandler", 6 => "email", 7 => "showMessage",
        _ => "unknown"
    };

    // ───────────────────────── 服务 ─────────────────────────

    public static object[] GetServices(List<object> errors)
    {
        var scm = Scm.OpenSCManagerW(null, null, Scm.SC_MANAGER_CONNECT | Scm.SC_MANAGER_ENUMERATE_SERVICE);
        if (scm == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());

        try
        {
            var list = new List<object>();
            uint resume = 0;
            var entrySize = Marshal.SizeOf<Scm.ENUM_SERVICE_STATUS_PROCESSW>();
            bool more;
            do
            {
                // 首次以空缓冲区探测所需大小；ERROR_MORE_DATA 时按 resume 句柄继续分页
                Scm.EnumServicesStatusExW(scm, Scm.SC_ENUM_PROCESS_INFO, Scm.SERVICE_WIN32, Scm.SERVICE_STATE_ALL,
                    IntPtr.Zero, 0, out var needed, out _, ref resume, null);
                var buf = Marshal.AllocHGlobal((int)needed);
                try
                {
                    var ok = Scm.EnumServicesStatusExW(scm, Scm.SC_ENUM_PROCESS_INFO, Scm.SERVICE_WIN32, Scm.SERVICE_STATE_ALL,
                        buf, needed, out _, out var returned, ref resume, null);
                    var err = Marshal.GetLastWin32Error();
                    more = !ok && err == Scm.ERROR_MORE_DATA;
                    if (!ok && !more) throw new Win32Exception(err);

                    for (var i = 0; i < returned; i++)
                    {
                        var entry = Marshal.PtrToStructure<Scm.ENUM_SERVICE_STATUS_PROCESSW>(buf + i * entrySize);
                        list.Add(ReadService(scm, entry, errors));
                    }
                }
                finally { Marshal.FreeHGlobal(buf); }
            } while (more);

            return list.ToArray();
        }
        finally { Scm.CloseServiceHandle(scm); }
    }

    static object ReadService(IntPtr scm, Scm.ENUM_SERVICE_STATUS_PROCESSW entry, List<object> errors)
    {
        var name = Marshal.PtrToStringUni(entry.lpServiceName);
        var status = entry.ServiceStatusProcess;
        string? description = null, pathName = null, startName = null, startMode = null;
        bool? delayedAutoStart = null;

        var source = $"service:{name}";
        var svc = Scm.OpenServiceW(scm, name!, Scm.SERVICE_QUERY_CONFIG);
        if (svc == IntPtr.Zero)
        {
            errors.Add(QueryError(source, new Win32Exception(Marshal.GetLastWin32Error())));
        }
        else
        {
            try
            {
                QueryConfig(errors, source, (b, s, out n) => Scm.QueryServiceConfigW(svc, b, s, out n), b =>
                {
                    var cfg = Marshal.PtrToStructure<Scm.QUERY_SERVICE_CONFIGW>(b);
                    pathName = Marshal.PtrToStringUni(cfg.lpBinaryPathName);
                    startName = NullIfEmpty(Marshal.PtrToStringUni(cfg.lpServiceStartName));
                    startMode = StartModeName(cfg.dwStartType);
                });
                QueryConfig(errors, source, (b, s, out n) => Scm.QueryServiceConfig2W(svc, Scm.SERVICE_CONFIG_DESCRIPTION, b, s, out n), b =>
                {
                    var ptr = Marshal.ReadIntPtr(b);
                    description = ptr == IntPtr.Zero ? null : Marshal.PtrToStringUni(ptr);
                });
                QueryConfig(errors, source, (b, s, out n) => Scm.QueryServiceConfig2W(svc, Scm.SERVICE_CONFIG_DELAYED_AUTO_START_INFO, b, s, out n), b =>
                {
                    delayedAutoStart = Marshal.ReadInt32(b) != 0;
                });
            }
            finally { Scm.CloseServiceHandle(svc); }
        }

        return new
        {
            name,
            displayName      = Marshal.PtrToStringUni(entry.lpDisplayName),
            description,
            state            = StateName(status.dwCurrentState),
            startMode,
            delayedAutoStart,
            pathName,
            startName,
            processId        = status.dwProcessId,
            serviceType      = ServiceTypeName(status.dwServiceType),
        };
    }

    delegate bool ConfigQuery(IntPtr buf, uint size, out uint needed);

    /// 按所需字节数分配缓冲区读取；配置在两次调用间变大时按新的大小重试，其余失败记入 errors
    static void QueryConfig(List<object> errors, string source, ConfigQuery query, Action<IntPtr> read)
    {
        uint size = 0;
        while (true)
        {
            var buf = size == 0 ? IntPtr.Zero : Marshal.AllocHGlobal((int)size);
            try
            {
                if (query(buf, size, out var needed))
                {
                    read(buf);
                    return;
                }
                var err = Marshal.GetLastWin32Error();
                if (err != Scm.ERROR_INSUFFICIENT_BUFFER || needed <= size)
                {
                    errors.Add(QueryError(source, new Win32Exception(err)));
                    return;
                }
                size = needed;
            }
            finally { if (buf != IntPtr.Zero) Marshal.FreeHGlobal(buf); }
        }
    }

    static string? NullIfEmpty(string? s) => string.IsNullOrEmpty(s) ? null : s;

    // 名称映射与 WMI Win32_Service 的取值保持一致，避免调用方因实现切换而改动
    static string StateName(uint s) => s switch
    {
        1 => "Stopped", 2 => "Start Pending", 3 => "Stop Pending", 4 => "Running",
        5 => "Continue Pending", 6 => "Pause Pending", 7 => "Paused",
        _ => "Unknown"
    };

    static string? StartModeName(uint t) => t switch
    {
        0 => "Boot", 1 => "System", 2 => "Auto", 3 => "Manual", 4 => "Disabled",
        _ => null
    };

    // WMI 忽略 0x100（SERVICE_INTERACTIVE_PROCESS）标志位，只报告基础进程类型
    static string ServiceTypeName(uint t) => (t & ~0x100u) switch
    {
        0x10 => "Own Process", 0x20 => "Share Process", 0x30 => "Share Process",
        _ => "Unknown"
    };
}

/// advapi32 服务控制管理器（SCM）P/Invoke 声明
static class Scm
{
    public const uint SC_MANAGER_CONNECT = 0x0001;
    public const uint SC_MANAGER_ENUMERATE_SERVICE = 0x0004;
    public const uint SERVICE_QUERY_CONFIG = 0x0001;
    public const uint SC_ENUM_PROCESS_INFO = 0;
    public const uint SERVICE_WIN32 = 0x30;
    public const uint SERVICE_STATE_ALL = 0x3;
    public const uint SERVICE_CONFIG_DESCRIPTION = 1;
    public const uint SERVICE_CONFIG_DELAYED_AUTO_START_INFO = 3;
    public const int ERROR_INSUFFICIENT_BUFFER = 122;
    public const int ERROR_MORE_DATA = 234;

    [StructLayout(LayoutKind.Sequential)]
    public struct SERVICE_STATUS_PROCESS
    {
        public uint dwServiceType, dwCurrentState, dwControlsAccepted, dwWin32ExitCode,
                    dwServiceSpecificExitCode, dwCheckPoint, dwWaitHint, dwProcessId, dwServiceFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct ENUM_SERVICE_STATUS_PROCESSW
    {
        public IntPtr lpServiceName;
        public IntPtr lpDisplayName;
        public SERVICE_STATUS_PROCESS ServiceStatusProcess;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct QUERY_SERVICE_CONFIGW
    {
        public uint dwServiceType, dwStartType, dwErrorControl;
        public IntPtr lpBinaryPathName, lpLoadOrderGroup;
        public uint dwTagId;
        public IntPtr lpDependencies, lpServiceStartName, lpDisplayName;
    }

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr OpenSCManagerW(string? machineName, string? databaseName, uint desiredAccess);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr OpenServiceW(IntPtr scm, string serviceName, uint desiredAccess);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool CloseServiceHandle(IntPtr handle);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool EnumServicesStatusExW(
        IntPtr scm, uint infoLevel, uint serviceType, uint serviceState,
        IntPtr services, uint bufSize, out uint bytesNeeded, out uint servicesReturned,
        ref uint resumeHandle, string? groupName);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool QueryServiceConfigW(IntPtr service, IntPtr config, uint bufSize, out uint bytesNeeded);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool QueryServiceConfig2W(IntPtr service, uint infoLevel, IntPtr buffer, uint bufSize, out uint bytesNeeded);
}
