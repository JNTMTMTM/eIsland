sealed class TemperatureSnapshot
{
    public static TemperatureSnapshot Empty { get; } = new()
    {
        IsAvailable = false,
        Readings = [],
        MaxTemperatureCelsius = null,
    };

    public required bool IsAvailable { get; init; }
    public required List<TemperatureReading> Readings { get; init; }
    public required double? MaxTemperatureCelsius { get; init; }
}

sealed class TemperatureReading
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required string Category { get; init; }
    public required double TemperatureCelsius { get; init; }
    public required string Source { get; init; }
}

sealed class HardwareListSnapshot
{
    public static HardwareListSnapshot Empty { get; } = new()
    {
        IsAvailable = false,
        Cpus = [],
        Gpus = [],
    };

    public required bool IsAvailable { get; init; }
    public required List<HardwareDevice> Cpus { get; init; }
    public required List<HardwareDevice> Gpus { get; init; }
}

sealed class HardwareDevice
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Category { get; init; }
    public required string HardwareType { get; init; }
    public required string Source { get; init; }
}