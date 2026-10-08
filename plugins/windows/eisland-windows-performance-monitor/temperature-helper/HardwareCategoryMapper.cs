using LibreHardwareMonitor.Hardware;

static class HardwareCategoryMapper
{
    public static string Map(HardwareType hardwareType) => hardwareType switch
    {
        HardwareType.Cpu => "cpu",
        HardwareType.GpuAmd or HardwareType.GpuIntel or HardwareType.GpuNvidia => "gpu",
        HardwareType.Motherboard => "motherboard",
        HardwareType.Storage => "storage",
        _ => "unknown",
    };
}