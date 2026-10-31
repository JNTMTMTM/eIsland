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

using System.Management;
using System.Text.Json;
using Microsoft.Win32;

var command = args.FirstOrDefault() ?? "";
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

try
{
    string json = command switch
    {
        "startup"  => JsonSerializer.Serialize(StartupInfoHelper.GetStartupItems(), jsonOptions),
        "tasks"    => JsonSerializer.Serialize(StartupInfoHelper.GetScheduledTasks(), jsonOptions),
        "services" => JsonSerializer.Serialize(StartupInfoHelper.GetServices(), jsonOptions),
        _          => JsonSerializer.Serialize(new { error = $"Unknown command: {command}" }, jsonOptions)
    };
    Console.WriteLine(json);
}
catch (Exception ex)
{
    Console.WriteLine(JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions));
}

static class StartupInfoHelper
{
    const string RunPath           = @"Software\Microsoft\Windows\CurrentVersion\Run";
    const string RunOncePath       = @"Software\Microsoft\Windows\CurrentVersion\RunOnce";
    const string ApprovedRoot      = @"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved";

    // ───────────────────────── 启动项 ─────────────────────────

    public static object[] GetStartupItems()
    {
        var list = new List<object>();
        var hkcu = RegistryKey.OpenBaseKey(RegistryHive.CurrentUser, RegistryView.Default);
        var hklm64 = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64);

        AddRegistryItems(list, hkcu, RunPath, "user", hkcu, "Run");
        AddRegistryItems(list, hkcu, RunOncePath, "user", null, null);
        AddRegistryItems(list, hklm64, RunPath, "machine", hklm64, "Run");
        AddRegistryItems(list, hklm64, RunOncePath, "machine", null, null);

        // 32 位系统上两个视图指向同一位置，跳过以避免重复
        if (Environment.Is64BitOperatingSystem)
        {
            var hklm32 = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry32);
            AddRegistryItems(list, hklm32, RunPath, "machine", hklm64, "Run32");
            AddRegistryItems(list, hklm32, RunOncePath, "machine", null, null);
        }

        AddFolderItems(list, Environment.GetFolderPath(Environment.SpecialFolder.Startup), "user", hkcu);
        AddFolderItems(list, Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup), "machine", hklm64);

        return list.ToArray();
    }

    static void AddRegistryItems(
        List<object> list, RegistryKey hive, string path, string scope,
        RegistryKey? approvedHive, string? approvedSub)
    {
        try
        {
            using var key = hive.OpenSubKey(path);
            if (key == null) return;
            var source = $@"{hive.Name}\{path}" + (hive.View == RegistryView.Registry32 ? " (32-bit)" : "");
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
        catch { /* 无权限读取时跳过该位置 */ }
    }

    static void AddFolderItems(List<object> list, string folder, string scope, RegistryKey approvedHive)
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
        catch { /* 无权限读取时跳过该位置 */ }
    }

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

    public static object[] GetScheduledTasks()
    {
        var list = new List<object>();
        var type = Type.GetTypeFromProgID("Schedule.Service")
            ?? throw new InvalidOperationException("Task Scheduler service is unavailable");
        dynamic service = Activator.CreateInstance(type)!;
        service.Connect();
        WalkTaskFolder(service.GetFolder(@"\"), list);
        return list.ToArray();
    }

    static void WalkTaskFolder(dynamic folder, List<object> list)
    {
        try
        {
            // 1 = TASK_ENUM_HIDDEN，包含隐藏任务
            foreach (dynamic task in folder.GetTasks(1))
            {
                try { list.Add(ReadTask(task)); }
                catch { /* 单个任务读取失败不影响其余任务 */ }
            }
        }
        catch { /* 无权限枚举该目录的任务 */ }

        try
        {
            foreach (dynamic sub in folder.GetFolders(0))
            {
                WalkTaskFolder(sub, list);
            }
        }
        catch { /* 无权限枚举子目录 */ }
    }

    static object ReadTask(dynamic task)
    {
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
        catch { /* 部分系统任务定义需要管理员权限 */ }

        string path = (string)task.Path;
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
        dt.Year < 2000 ? null : dt.ToString("yyyy-MM-ddTHH:mm:ss");

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

    public static object[] GetServices()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Service");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    name             = Str(obj, "Name"),
                    displayName      = Str(obj, "DisplayName"),
                    description      = Str(obj, "Description"),
                    state            = Str(obj, "State"),
                    startMode        = Str(obj, "StartMode"),
                    delayedAutoStart = Bool(obj, "DelayedAutoStart"),
                    pathName         = Str(obj, "PathName"),
                    startName        = Str(obj, "StartName"),
                    processId        = Uint(obj, "ProcessId"),
                    serviceType      = Str(obj, "ServiceType"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── WMI 属性读取辅助 ─────────────────────────

    static string? Str(ManagementObject o, string p)
    { try { return o[p]?.ToString(); } catch { return null; } }

    static uint? Uint(ManagementObject o, string p)
    { try { return o[p] is uint v ? v : null; } catch { return null; } }

    static bool? Bool(ManagementObject o, string p)
    { try { return o[p] is bool v ? v : null; } catch { return null; } }
}
