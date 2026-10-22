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

    if (command == "server")
    {
        // 设备标识和名称无需更新传感器；同一次发现结果可供所有采样复用。
        var hardwareList = HardwareListCollector.Collect(computer);
        while (Console.ReadLine() is { } request)
        {
            if (request != "snapshot") continue;
            TemperatureSnapshot temperature;
            try
            {
                temperature = TemperatureCollector.Collect(computer);
            }
            catch
            {
                temperature = TemperatureSnapshot.Empty;
            }
            Console.WriteLine(JsonSerializer.Serialize(new { temperature, hardwareList }, jsonOptions));
            Console.Out.Flush();
        }
        return;
    }

    var payload = command == "hardware-list"
        ? JsonSerializer.Serialize(HardwareListCollector.Collect(computer), jsonOptions)
        : JsonSerializer.Serialize(TemperatureCollector.Collect(computer), jsonOptions);

    Console.WriteLine(payload);
}
catch
{
    if (command == "server") return;
    var fallback = command == "hardware-list"
        ? JsonSerializer.Serialize(HardwareListSnapshot.Empty, jsonOptions)
        : JsonSerializer.Serialize(TemperatureSnapshot.Empty, jsonOptions);

    Console.WriteLine(fallback);
}
finally
{
    computer.Close();
}
