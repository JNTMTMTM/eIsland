using LibreHardwareMonitor.Hardware;

static class TemperatureCollector
{
    private const string Source = "libre-hardware-monitor";

    public static TemperatureSnapshot Collect(Computer computer)
    {
        var readings = new List<TemperatureReading>();

        foreach (var hardware in computer.Hardware)
        {
            CollectHardwareTemperatures(hardware, readings);
        }

        return new TemperatureSnapshot
        {
            IsAvailable = readings.Count > 0,
            Readings = readings,
            MaxTemperatureCelsius = readings.Count == 0 ? null : readings.Max(reading => reading.TemperatureCelsius),
        };
    }

    private static void CollectHardwareTemperatures(IHardware hardware, List<TemperatureReading> readings)
    {
        hardware.Update();

        foreach (var subHardware in hardware.SubHardware)
        {
            CollectHardwareTemperatures(subHardware, readings);
        }

        foreach (var sensor in hardware.Sensors)
        {
            if (sensor.SensorType != SensorType.Temperature || sensor.Value is null)
            {
                continue;
            }

            readings.Add(new TemperatureReading
            {
                Id = $"{hardware.Identifier}/{sensor.Identifier}",
                Label = string.IsNullOrWhiteSpace(sensor.Name) ? hardware.Name : $"{hardware.Name} {sensor.Name}",
                Category = HardwareCategoryMapper.Map(hardware.HardwareType),
                TemperatureCelsius = Math.Round(sensor.Value.Value, 1),
                Source = Source,
            });
        }
    }
}