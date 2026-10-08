using System.Text.Json;
using LibreHardwareMonitor.Hardware;

var command = args.FirstOrDefault() ?? "temperature";
var computer = new Computer
{
    IsCpuEnabled = true,
    IsGpuEnabled = true,
    IsMotherboardEnabled = true,
    IsStorageEnabled = true,
};

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

try
{
    computer.Open();

    var payload = command == "hardware-list"
        ? JsonSerializer.Serialize(HardwareListCollector.Collect(computer), jsonOptions)
        : JsonSerializer.Serialize(TemperatureCollector.Collect(computer), jsonOptions);

    Console.WriteLine(payload);
}
catch
{
    var fallback = command == "hardware-list"
        ? JsonSerializer.Serialize(HardwareListSnapshot.Empty, jsonOptions)
        : JsonSerializer.Serialize(TemperatureSnapshot.Empty, jsonOptions);

    Console.WriteLine(fallback);
}
finally
{
    computer.Close();
}
