using System.Runtime.InteropServices;
using System.Text;

namespace eIslandScreenshotHelper;

internal static class WindowBounds
{
    private const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    private const int DWMWA_CLOAKED = 14;
    private static string _lastError = "";

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static string GetLastError() => _lastError;

    public static string GetVisibleWindowsJson()
    {
        _lastError = "";
        var currentProcessId = Environment.ProcessId;
        var windows = new List<WindowInfo>();

        try
        {
            EnumWindows((hWnd, _) =>
            {
                if (!TryGetWindowInfo(hWnd, currentProcessId, out var info)) return true;
                windows.Add(info);
                return true;
            }, IntPtr.Zero);
        }
        catch (Exception ex)
        {
            _lastError = ex.ToString();
        }

        return ToJson(windows);
    }

    private static bool TryGetWindowInfo(IntPtr hWnd, int currentProcessId, out WindowInfo info)
    {
        info = default;

        if (hWnd == IntPtr.Zero || !IsWindowVisible(hWnd) || IsIconic(hWnd)) return false;
        if (IsCloaked(hWnd)) return false;

        _ = GetWindowThreadProcessId(hWnd, out var processId);
        if ((int)processId == currentProcessId) return false;

        if (!TryGetWindowRect(hWnd, out var rect)) return false;

        var width = rect.Right - rect.Left;
        var height = rect.Bottom - rect.Top;
        if (width < 40 || height < 40) return false;

        info = new WindowInfo(
            Hwnd: hWnd.ToInt64().ToString("X"),
            Title: GetWindowTitle(hWnd),
            ProcessId: (int)processId,
            X: rect.Left,
            Y: rect.Top,
            Width: width,
            Height: height);
        return true;
    }

    private static bool IsCloaked(IntPtr hWnd)
    {
        var result = DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out int cloaked, Marshal.SizeOf<int>());
        return result == 0 && cloaked != 0;
    }

    private static bool TryGetWindowRect(IntPtr hWnd, out RECT rect)
    {
        if (DwmGetWindowAttribute(hWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out rect, Marshal.SizeOf<RECT>()) == 0)
        {
            return rect.Right > rect.Left && rect.Bottom > rect.Top;
        }

        return GetWindowRect(hWnd, out rect) && rect.Right > rect.Left && rect.Bottom > rect.Top;
    }

    private static string GetWindowTitle(IntPtr hWnd)
    {
        var length = GetWindowTextLengthW(hWnd);
        if (length <= 0) return "";

        var builder = new StringBuilder(length + 1);
        var copied = GetWindowTextW(hWnd, builder, builder.Capacity);
        return copied <= 0 ? "" : builder.ToString();
    }

    private static string ToJson(IReadOnlyList<WindowInfo> windows)
    {
        var builder = new StringBuilder(windows.Count * 128 + 2);
        builder.Append('[');
        for (var i = 0; i < windows.Count; i++)
        {
            if (i > 0) builder.Append(',');
            var item = windows[i];
            builder.Append('{')
                .Append("\"hwnd\":\"").Append(EscapeJson(item.Hwnd)).Append("\",")
                .Append("\"title\":\"").Append(EscapeJson(item.Title)).Append("\",")
                .Append("\"processId\":").Append(item.ProcessId).Append(',')
                .Append("\"x\":").Append(item.X).Append(',')
                .Append("\"y\":").Append(item.Y).Append(',')
                .Append("\"width\":").Append(item.Width).Append(',')
                .Append("\"height\":").Append(item.Height)
                .Append('}');
        }
        builder.Append(']');
        return builder.ToString();
    }

    private static string EscapeJson(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";

        var builder = new StringBuilder(value.Length + 8);
        foreach (var ch in value)
        {
            switch (ch)
            {
                case '\\': builder.Append("\\\\"); break;
                case '"': builder.Append("\\\""); break;
                case '\b': builder.Append("\\b"); break;
                case '\f': builder.Append("\\f"); break;
                case '\n': builder.Append("\\n"); break;
                case '\r': builder.Append("\\r"); break;
                case '\t': builder.Append("\\t"); break;
                default:
                    if (ch < ' ')
                    {
                        builder.Append("\\u").Append(((int)ch).ToString("x4"));
                    }
                    else
                    {
                        builder.Append(ch);
                    }
                    break;
            }
        }
        return builder.ToString();
    }

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowTextLengthW(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out RECT pvAttribute, int cbAttribute);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);

    private readonly record struct WindowInfo(string Hwnd, string Title, int ProcessId, int X, int Y, int Width, int Height);

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}