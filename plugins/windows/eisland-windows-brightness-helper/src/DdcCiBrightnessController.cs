using System.Runtime.InteropServices;

internal sealed record DdcCiBrightnessSnapshot(
    int CurrentBrightness,
    string? Description);

internal static class DdcCiBrightnessController
{
    private const int PhysicalMonitorDescriptionSize = 128;

    public static DdcCiBrightnessSnapshot? GetBrightness()
    {
        var monitors = EnumeratePhysicalMonitors();
        try
        {
            foreach (var monitor in monitors)
            {
                if (!GetMonitorBrightness(monitor.Handle, out var minimum, out var current, out var maximum))
                {
                    continue;
                }

                return new DdcCiBrightnessSnapshot(
                    NormalizeBrightness(minimum, current, maximum),
                    monitor.Description);
            }
        }
        finally
        {
            DestroyPhysicalMonitors(monitors);
        }

        return null;
    }

    public static bool SetBrightness(byte brightness)
    {
        var monitors = EnumeratePhysicalMonitors();
        var updated = false;

        try
        {
            foreach (var monitor in monitors)
            {
                if (!GetMonitorBrightness(monitor.Handle, out var minimum, out _, out var maximum))
                {
                    continue;
                }

                var target = ScaleBrightness(brightness, minimum, maximum);
                updated = SetMonitorBrightness(monitor.Handle, target) || updated;
            }
        }
        finally
        {
            DestroyPhysicalMonitors(monitors);
        }

        return updated;
    }

    private static List<PhysicalMonitor> EnumeratePhysicalMonitors()
    {
        var monitors = new List<PhysicalMonitor>();
        MonitorEnumProc callback = (monitorHandle, _, _, _) =>
        {
            if (!GetNumberOfPhysicalMonitorsFromHMONITOR(monitorHandle, out var count) || count == 0)
            {
                return true;
            }

            var nativeMonitors = new PhysicalMonitorNative[count];
            if (!GetPhysicalMonitorsFromHMONITOR(monitorHandle, count, nativeMonitors))
            {
                return true;
            }

            monitors.AddRange(nativeMonitors.Select(monitor => new PhysicalMonitor(
                monitor.Handle,
                string.IsNullOrWhiteSpace(monitor.Description) ? null : monitor.Description)));
            return true;
        };

        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, callback, IntPtr.Zero);
        GC.KeepAlive(callback);
        return monitors;
    }

    private static int NormalizeBrightness(uint minimum, uint current, uint maximum)
    {
        if (maximum <= minimum)
        {
            return 0;
        }

        return (int)Math.Round((current - minimum) * 100d / (maximum - minimum));
    }

    private static uint ScaleBrightness(byte brightness, uint minimum, uint maximum)
    {
        if (maximum <= minimum)
        {
            return minimum;
        }

        return minimum + (uint)Math.Round(brightness * (maximum - minimum) / 100d);
    }

    private static void DestroyPhysicalMonitors(IEnumerable<PhysicalMonitor> monitors)
    {
        foreach (var monitor in monitors)
        {
            DestroyPhysicalMonitor(monitor.Handle);
        }
    }

    private sealed record PhysicalMonitor(IntPtr Handle, string? Description);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct PhysicalMonitorNative
    {
        public IntPtr Handle;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = PhysicalMonitorDescriptionSize)]
        public string Description;
    }

    private delegate bool MonitorEnumProc(
        IntPtr monitorHandle,
        IntPtr monitorDeviceContext,
        IntPtr monitorRectangle,
        IntPtr userData);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EnumDisplayMonitors(
        IntPtr deviceContext,
        IntPtr clipRectangle,
        MonitorEnumProc callback,
        IntPtr userData);

    [DllImport("dxva2.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(
        IntPtr monitorHandle,
        out uint numberOfPhysicalMonitors);

    [DllImport("dxva2.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetPhysicalMonitorsFromHMONITOR(
        IntPtr monitorHandle,
        uint physicalMonitorArraySize,
        [Out] PhysicalMonitorNative[] physicalMonitorArray);

    [DllImport("dxva2.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DestroyPhysicalMonitor(IntPtr physicalMonitorHandle);

    [DllImport("dxva2.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetMonitorBrightness(
        IntPtr physicalMonitorHandle,
        out uint minimumBrightness,
        out uint currentBrightness,
        out uint maximumBrightness);

    [DllImport("dxva2.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetMonitorBrightness(
        IntPtr physicalMonitorHandle,
        uint newBrightness);
}