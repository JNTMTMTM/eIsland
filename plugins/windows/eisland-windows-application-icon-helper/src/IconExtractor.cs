using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;

namespace eIslandAppIconHelper;

/// <summary>
/// 图标提取器：从进程名、PID、可执行文件路径或快捷方式获取图标
/// </summary>
internal static class IconExtractor
{
    // ── Shell32 P/Invoke ────────────────────────────────────────

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr ExtractAssociatedIconW(IntPtr hInst, string pszIconPath, ref ushort piIcon);

    // ── kernel32 P/Invoke ──────────────────────────────────────

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool QueryFullProcessImageNameW(IntPtr hProcess, uint dwFlags, char[] lpExName, ref uint lpdwSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    // ── COM 接口定义（快捷方式解析） ───────────────────────────

    private static readonly Guid CLSID_ShellLink = new("00021401-0000-0000-C000-000000000046");
    private static readonly Guid IID_IShellLinkW = new("000214F9-0000-0000-C000-000000000046");
    private static readonly Guid IID_IPersistFile = new("0000010b-0000-0000-C000-000000000046");

    [DllImport("ole32.dll")]
    private static extern int CoCreateInstance(ref Guid clsid, IntPtr pUnkOuter, uint dwClsContext, ref Guid riid, out IntPtr ppv);

    [DllImport("ole32.dll")]
    private static extern int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    [DllImport("ole32.dll")]
    private static extern void CoUninitialize();

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int PersistFileLoadDelegate(IntPtr thisPtr, [MarshalAs(UnmanagedType.LPWStr)] string pszFileName, uint dwMode);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int ShellLinkGetPathDelegate(IntPtr thisPtr, [Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszFile, int cch, IntPtr pfd, uint fFlags);

    /// <summary>根据进程名获取图标</summary>
    internal static byte[]? GetIconByProcessName(string processName)
    {
        var exePath = FindProcessPath(processName);
        return exePath != null ? GetIconFromPath(exePath) : null;
    }

    /// <summary>根据 PID 获取图标</summary>
    internal static byte[]? GetIconByPid(uint pid)
    {
        var exePath = GetProcessPath(pid);
        return exePath != null ? GetIconFromPath(exePath) : null;
    }

    /// <summary>根据可执行文件路径获取图标</summary>
    internal static byte[]? GetIconByPath(string exePath)
    {
        if (!File.Exists(exePath))
            return null;
        return GetIconFromPath(exePath);
    }

    /// <summary>根据快捷方式路径获取图标（解析 .lnk 目标）</summary>
    internal static byte[]? GetIconByShortcutPath(string lnkPath)
    {
        if (!File.Exists(lnkPath) || !lnkPath.EndsWith(".lnk", StringComparison.OrdinalIgnoreCase))
            return null;

        var targetPath = ResolveShortcut(lnkPath);
        if (targetPath == null || !File.Exists(targetPath))
            return null;

        return GetIconFromPath(targetPath);
    }

    /// <summary>通过进程名查找可执行文件路径（遍历所有同名进程）</summary>
    private static string? FindProcessPath(string processName)
    {
        try
        {
            var name = Path.GetFileNameWithoutExtension(processName);
            var processes = Process.GetProcessesByName(name);
            foreach (var proc in processes)
            {
                try
                {
                    var path = proc.MainModule?.FileName;
                    if (path != null) return path;
                }
                catch { /* 无权限访问该进程 */ }
                finally { proc.Dispose(); }
            }
        }
        catch { /* 进程不存在 */ }
        return null;
    }

    /// <summary>通过 PID 获取可执行文件路径</summary>
    private static string? GetProcessPath(uint pid)
    {
        // 先尝试 .NET API
        try
        {
            var proc = Process.GetProcessById((int)pid);
            try
            {
                var path = proc.MainModule?.FileName;
                if (path != null) return path;
            }
            finally { proc.Dispose(); }
        }
        catch { /* 可能无权限 */ }

        // 降级到 Win32 API
        IntPtr hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (hProc == IntPtr.Zero) return null;

        try
        {
            var buffer = new char[1024];
            uint size = (uint)buffer.Length;
            if (QueryFullProcessImageNameW(hProc, 0, buffer, ref size) && size > 0)
                return new string(buffer, 0, (int)size);
        }
        finally
        {
            CloseHandle(hProc);
        }
        return null;
    }

    /// <summary>解析 .lnk 快捷方式，返回目标路径</summary>
    private static string? ResolveShortcut(string lnkPath)
    {
        IntPtr persistPtr = IntPtr.Zero;
        IntPtr shellLinkPtr = IntPtr.Zero;
        bool comInitialized = false;
        try
        {
            int hr = CoInitializeEx(IntPtr.Zero, 0); // COINIT_APARTMENTTHREADED
            comInitialized = hr == 0 || hr == 1; // S_OK or S_FALSE (already initialized)

            Guid clsid = CLSID_ShellLink;
            Guid iidPersist = IID_IPersistFile;
            hr = CoCreateInstance(ref clsid, IntPtr.Zero, 1, ref iidPersist, out persistPtr);
            if (hr != 0 || persistPtr == IntPtr.Zero) return null;

            // IPersistFile::Load (vtable slot 5)
            IntPtr persistVtable = Marshal.ReadIntPtr(persistPtr);
            IntPtr loadPtr = Marshal.ReadIntPtr(persistVtable, 5 * IntPtr.Size);
            var load = Marshal.GetDelegateForFunctionPointer<PersistFileLoadDelegate>(loadPtr);
            hr = load(persistPtr, lnkPath, 0);
            if (hr != 0) return null;

            // 获取 IShellLinkW 接口
            Guid iidShellLink = IID_IShellLinkW;
            hr = Marshal.QueryInterface(persistPtr, ref iidShellLink, out shellLinkPtr);
            if (hr != 0 || shellLinkPtr == IntPtr.Zero) return null;

            // IShellLinkW::GetPath (vtable slot 3)
            IntPtr shellVtable = Marshal.ReadIntPtr(shellLinkPtr);
            IntPtr getPathPtr = Marshal.ReadIntPtr(shellVtable, 3 * IntPtr.Size);
            var getPath = Marshal.GetDelegateForFunctionPointer<ShellLinkGetPathDelegate>(getPathPtr);

            var sb = new StringBuilder(1024);
            hr = getPath(shellLinkPtr, sb, sb.Capacity, IntPtr.Zero, 0);
            if (hr != 0) return null;

            var targetPath = sb.ToString();
            return string.IsNullOrEmpty(targetPath) ? null : targetPath;
        }
        catch
        {
            return null;
        }
        finally
        {
            if (shellLinkPtr != IntPtr.Zero) Marshal.Release(shellLinkPtr);
            if (persistPtr != IntPtr.Zero) Marshal.Release(persistPtr);
            if (comInitialized) CoUninitialize();
        }
    }

    /// <summary>从可执行文件路径提取图标并转换为 PNG 字节数组</summary>
    private static byte[]? GetIconFromPath(string exePath)
    {
        try
        {
            ushort iconIndex = 0;
            IntPtr hIcon = ExtractAssociatedIconW(IntPtr.Zero, exePath, ref iconIndex);
            if (hIcon == IntPtr.Zero) return null;

            try
            {
                using var icon = Icon.FromHandle(hIcon);
                using var bmp = icon.ToBitmap();
                using var ms = new MemoryStream();
                bmp.Save(ms, ImageFormat.Png);
                return ms.ToArray();
            }
            finally
            {
                DestroyIcon(hIcon);
            }
        }
        catch
        {
            return null;
        }
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyIcon(IntPtr hIcon);
}
