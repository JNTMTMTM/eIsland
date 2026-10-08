using LibreHardwareMonitor.Hardware;

static class HardwareListCollector
{
    private const string Source = "libre-hardware-monitor";

    public static HardwareListSnapshot Collect(Computer computer)
    {
        var cpus = new List<HardwareDevice>();
        var gpus = new List<HardwareDevice>();

        foreach (var hardware in computer.Hardware)
        {
            CollectHardwareDevice(hardware, cpus, gpus);
        }

        return new HardwareListSnapshot
        {
            IsAvailable = cpus.Count > 0 || gpus.Count > 0,
            Cpus = cpus,
            Gpus = gpus,
        };
    }

    private static void CollectHardwareDevice(IHardware hardware, List<HardwareDevice> cpus, List<HardwareDevice> gpus)
    {
        hardware.Update();

        var category = HardwareCategoryMapper.Map(hardware.HardwareType);
        if (category == "cpu")
        {
            cpus.Add(CreateHardwareDevice(hardware, category));
        }
        else if (category == "gpu")
        {
            gpus.Add(CreateHardwareDevice(hardware, category));
        }

        foreach (var subHardware in hardware.SubHardware)
        {
            CollectHardwareDevice(subHardware, cpus, gpus);
        }
    }

    private static HardwareDevice CreateHardwareDevice(IHardware hardware, string category) => new()
    {
        Id = hardware.Identifier.ToString(),
        Name = hardware.Name,
        Category = category,
        HardwareType = hardware.HardwareType.ToString(),
        Source = Source,
    };
}