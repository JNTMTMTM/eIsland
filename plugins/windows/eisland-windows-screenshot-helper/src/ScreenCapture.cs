using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace eIslandScreenshotHelper;

internal static class ScreenCapture
{
    private const int SM_CXSCREEN = 0;
    private const int SM_CYSCREEN = 1;
    private const int SM_XVIRTUALSCREEN = 76;
    private const int SM_YVIRTUALSCREEN = 77;
    private const int SM_CXVIRTUALSCREEN = 78;
    private const int SM_CYVIRTUALSCREEN = 79;
    private const int SRCCOPY = 0x00CC0020;
    private const int CAPTUREBLT = 0x40000000;

    private static string _lastError = "";

    /// <summary>
    /// 获取最后一次截屏失败的错误信息
    /// </summary>
    public static string GetLastError() => _lastError;

    public static byte[] CapturePrimaryDisplayPng()
    {
        _lastError = "";

        var width = GetSystemMetrics(SM_CXSCREEN);
        var height = GetSystemMetrics(SM_CYSCREEN);
        if (width <= 0 || height <= 0)
        {
            _lastError = $"invalid primary display dimensions ({width}x{height})";
            return Array.Empty<byte>();
        }

        var screenDc = GetDC(IntPtr.Zero);
        if (screenDc == IntPtr.Zero)
        {
            _lastError = "GetDC failed for primary display";
            return Array.Empty<byte>();
        }

        var memoryDc = IntPtr.Zero;
        var bitmap = IntPtr.Zero;
        var oldObject = IntPtr.Zero;

        try
        {
            memoryDc = CreateCompatibleDC(screenDc);
            if (memoryDc == IntPtr.Zero)
            {
                _lastError = "CreateCompatibleDC failed";
                return Array.Empty<byte>();
            }

            bitmap = CreateCompatibleBitmap(screenDc, width, height);
            if (bitmap == IntPtr.Zero)
            {
                _lastError = "CreateCompatibleBitmap failed";
                return Array.Empty<byte>();
            }

            oldObject = SelectObject(memoryDc, bitmap);
            if (!BitBlt(memoryDc, 0, 0, width, height, screenDc, 0, 0, SRCCOPY | CAPTUREBLT))
            {
                _lastError = "BitBlt failed";
                return Array.Empty<byte>();
            }

            using var image = Image.FromHbitmap(bitmap);
            using var stream = new MemoryStream();
            image.Save(stream, ImageFormat.Png);
            return stream.ToArray();
        }
        finally
        {
            if (oldObject != IntPtr.Zero)
            {
                SelectObject(memoryDc, oldObject);
            }
            if (bitmap != IntPtr.Zero)
            {
                DeleteObject(bitmap);
            }
            if (memoryDc != IntPtr.Zero)
            {
                DeleteDC(memoryDc);
            }
            ReleaseDC(IntPtr.Zero, screenDc);
        }
    }

    /// <summary>
    /// 截取所有显示器的虚拟屏幕画面并返回 PNG 字节数组
    /// @description 使用虚拟屏幕坐标系覆盖全部多显示器，原点可能为负值
    /// </summary>
    public static byte[] CaptureAllDisplaysPng()
    {
        _lastError = "";

        var vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
        var vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
        var vw = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        var vh = GetSystemMetrics(SM_CYVIRTUALSCREEN);
        if (vw <= 0 || vh <= 0)
        {
            _lastError = $"invalid virtual screen dimensions ({vw}x{vh})";
            return Array.Empty<byte>();
        }

        var screenDc = GetDC(IntPtr.Zero);
        if (screenDc == IntPtr.Zero)
        {
            _lastError = "GetDC failed for virtual screen";
            return Array.Empty<byte>();
        }

        var memoryDc = IntPtr.Zero;
        var bitmap = IntPtr.Zero;
        var oldObject = IntPtr.Zero;

        try
        {
            memoryDc = CreateCompatibleDC(screenDc);
            if (memoryDc == IntPtr.Zero)
            {
                _lastError = "CreateCompatibleDC failed";
                return Array.Empty<byte>();
            }

            bitmap = CreateCompatibleBitmap(screenDc, vw, vh);
            if (bitmap == IntPtr.Zero)
            {
                _lastError = "CreateCompatibleBitmap failed";
                return Array.Empty<byte>();
            }

            oldObject = SelectObject(memoryDc, bitmap);
            if (!BitBlt(memoryDc, 0, 0, vw, vh, screenDc, vx, vy, SRCCOPY | CAPTUREBLT))
            {
                _lastError = "BitBlt failed";
                return Array.Empty<byte>();
            }

            using var image = Image.FromHbitmap(bitmap);
            using var stream = new MemoryStream();
            image.Save(stream, ImageFormat.Png);
            return stream.ToArray();
        }
        finally
        {
            if (oldObject != IntPtr.Zero)
            {
                SelectObject(memoryDc, oldObject);
            }
            if (bitmap != IntPtr.Zero)
            {
                DeleteObject(bitmap);
            }
            if (memoryDc != IntPtr.Zero)
            {
                DeleteDC(memoryDc);
            }
            ReleaseDC(IntPtr.Zero, screenDc);
        }
    }

    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int nIndex);

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern int ReleaseDC(IntPtr hWnd, IntPtr hDc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleDC(IntPtr hDc);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteDC(IntPtr hDc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleBitmap(IntPtr hDc, int width, int height);

    [DllImport("gdi32.dll")]
    private static extern IntPtr SelectObject(IntPtr hDc, IntPtr hObject);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr hObject);

    [DllImport("gdi32.dll")]
    private static extern bool BitBlt(
        IntPtr hDestDc,
        int x,
        int y,
        int width,
        int height,
        IntPtr hSrcDc,
        int srcX,
        int srcY,
        int rasterOperation);
}