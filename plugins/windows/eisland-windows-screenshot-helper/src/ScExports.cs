using System.Runtime.InteropServices;
using System.Text;

namespace eIslandScreenshotHelper;

public static class ScExports
{
    private static string _lastError = "";

    [UnmanagedCallersOnly(EntryPoint = "sc_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
        {
            Marshal.FreeCoTaskMem(ptr);
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "sc_get_last_error")]
    public static IntPtr GetLastError()
    {
        var error = _lastError;
        if (string.IsNullOrEmpty(error))
        {
            error = ScreenCapture.GetLastError();
        }
        if (string.IsNullOrEmpty(error))
        {
            error = WindowBounds.GetLastError();
        }
        return StringToCoTaskMem(error);
    }

    [UnmanagedCallersOnly(EntryPoint = "sc_capture_primary_display_png")]
    public static IntPtr CapturePrimaryDisplayPng()
    {
        _lastError = "";
        try
        {
            var png = ScreenCapture.CapturePrimaryDisplayPng();
            return png.Length == 0 ? IntPtr.Zero : StringToCoTaskMem(Convert.ToBase64String(png));
        }
        catch (Exception ex)
        {
            _lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "sc_capture_all_displays_png")]
    public static IntPtr CaptureAllDisplaysPng()
    {
        _lastError = "";
        try
        {
            var png = ScreenCapture.CaptureAllDisplaysPng();
            return png.Length == 0 ? IntPtr.Zero : StringToCoTaskMem(Convert.ToBase64String(png));
        }
        catch (Exception ex)
        {
            _lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    /// <summary>返回原始 PNG，由调用方使用 sc_free_string 释放同一 CoTaskMem 分配器。</summary>
    [UnmanagedCallersOnly(EntryPoint = "sc_capture_primary_display_png_bytes")]
    public static IntPtr CapturePrimaryDisplayPngBytes(IntPtr size) => CaptureBytes(size, ScreenCapture.CapturePrimaryDisplayPng);

    /// <summary>多屏截图二进制接口，避免 PNG 和 Base64 同时驻留。</summary>
    [UnmanagedCallersOnly(EntryPoint = "sc_capture_all_displays_png_bytes")]
    public static IntPtr CaptureAllDisplaysPngBytes(IntPtr size) => CaptureBytes(size, ScreenCapture.CaptureAllDisplaysPng);

    private static IntPtr CaptureBytes(IntPtr size, Func<byte[]> capture)
    {
        _lastError = "";
        Marshal.WriteInt32(size, 0);
        try
        {
            var png = capture();
            if (png.Length == 0) return IntPtr.Zero;
            if (png.Length > 64 * 1024 * 1024) throw new InvalidOperationException("PNG exceeds 64 MiB");
            var ptr = Marshal.AllocCoTaskMem(png.Length);
            try { Marshal.Copy(png, 0, ptr, png.Length); Marshal.WriteInt32(size, png.Length); return ptr; }
            catch { Marshal.FreeCoTaskMem(ptr); throw; }
        }
        catch (Exception error) { _lastError = error.ToString(); return IntPtr.Zero; }
    }

    [UnmanagedCallersOnly(EntryPoint = "sc_get_visible_windows")]
    public static IntPtr GetVisibleWindows()
    {
        _lastError = "";
        try
        {
            return StringToCoTaskMem(WindowBounds.GetVisibleWindowsJson());
        }
        catch (Exception ex)
        {
            _lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    private static IntPtr StringToCoTaskMem(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }
}