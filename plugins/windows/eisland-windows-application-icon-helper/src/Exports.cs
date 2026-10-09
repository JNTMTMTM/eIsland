using System.Runtime.InteropServices;

namespace eIslandAppIconHelper;

/// <summary>
/// 导出函数：提供给 Node.js 通过 koffi FFI 调用的 C ABI 入口
/// </summary>
internal static class Exports
{

    /// <summary>释放 icon_free_string 分配的字符串</summary>
    [UnmanagedCallersOnly(EntryPoint = "icon_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }


    /// <summary>根据进程名获取图标（返回 base64 PNG）</summary>
    [UnmanagedCallersOnly(EntryPoint = "icon_get_by_process_name")]
    public static IntPtr GetByProcessName(IntPtr namePtr)
    {
        string? name = Marshal.PtrToStringUTF8(namePtr);
        if (string.IsNullOrEmpty(name)) return IntPtr.Zero;

        var png = IconExtractor.GetIconByProcessName(name);
        return png != null ? MarshalToBase64(png) : IntPtr.Zero;
    }

    /// <summary>根据 PID 获取图标（返回 base64 PNG）</summary>
    [UnmanagedCallersOnly(EntryPoint = "icon_get_by_pid")]
    public static IntPtr GetByPid(uint pid)
    {
        var png = IconExtractor.GetIconByPid(pid);
        return png != null ? MarshalToBase64(png) : IntPtr.Zero;
    }

    /// <summary>根据可执行文件路径获取图标（返回 base64 PNG）</summary>
    [UnmanagedCallersOnly(EntryPoint = "icon_get_by_path")]
    public static IntPtr GetByPath(IntPtr pathPtr)
    {
        string? path = Marshal.PtrToStringUTF8(pathPtr);
        if (string.IsNullOrEmpty(path)) return IntPtr.Zero;

        var png = IconExtractor.GetIconByPath(path);
        return png != null ? MarshalToBase64(png) : IntPtr.Zero;
    }

    /// <summary>根据快捷方式路径获取图标（返回 base64 PNG）</summary>
    [UnmanagedCallersOnly(EntryPoint = "icon_get_by_shortcut")]
    public static IntPtr GetByShortcut(IntPtr lnkPtr)
    {
        string? lnkPath = Marshal.PtrToStringUTF8(lnkPtr);
        if (string.IsNullOrEmpty(lnkPath)) return IntPtr.Zero;

        var png = IconExtractor.GetIconByShortcutPath(lnkPath);
        return png != null ? MarshalToBase64(png) : IntPtr.Zero;
    }


    /// <summary>将字节数组编码为 base64 并通过 CoTaskMem 分配为 UTF-8 字符串</summary>
    private static IntPtr MarshalToBase64(byte[] data)
    {
        string b64 = Convert.ToBase64String(data);
        return Marshal.StringToCoTaskMemUTF8(b64);
    }
}
