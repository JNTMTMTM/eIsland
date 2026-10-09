using System.Text.Json;

var command = args.FirstOrDefault() ?? "get";
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

try
{
    switch (command)
    {
        case "get-mute":
            Console.WriteLine(JsonSerializer.Serialize(
                AudioEndpointController.GetMute() is bool muted
                    ? new { muted }
                    : null,
                jsonOptions));
            break;

        case "set-mute" when args.Length > 1 && bool.TryParse(args[1], out var requestedMute):
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                success = AudioEndpointController.SetMute(requestedMute),
                muted = requestedMute
            }, jsonOptions));
            break;

        case "set-mute":
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                success = false,
                error = "Missing or invalid mute state"
            }, jsonOptions));
            break;

        case "get":
            Console.WriteLine(JsonSerializer.Serialize(
                AudioEndpointController.GetVolume() is int level
                    ? new { level }
                    : null,
                jsonOptions));
            break;

        case "set" when args.Length > 1 && int.TryParse(args[1], out var requestedLevel):
            var normalizedLevel = Math.Clamp(requestedLevel, 0, 100);
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                success = AudioEndpointController.SetVolume(normalizedLevel),
                level = normalizedLevel
            }, jsonOptions));
            break;

        case "set":
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                success = false,
                error = "Missing or invalid volume level"
            }, jsonOptions));
            break;

        case "monitor":
            using (var monitor = new AudioEndpointMonitor())
            {
                Console.CancelKeyPress += (_, eventArgs) =>
                {
                    eventArgs.Cancel = true;
                    monitor.Stop();
                };
                _ = Task.Run(() =>
                {
                    try
                    {
                        Console.In.ReadLine();
                    }
                    catch
                    {
                        // Stdin closure still stops the monitor.
                    }
                    monitor.Stop();
                });
                monitor.Run();
            }
            break;

        default:
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                error = $"Unknown command: {command}"
            }, jsonOptions));
            break;
    }
}
catch (Exception exception)
{
    Console.WriteLine(JsonSerializer.Serialize(new { error = exception.Message }, jsonOptions));
}