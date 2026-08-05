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