using System.Text.Json;
using eIslandVolumeAnalyzer;

var command = args.FirstOrDefault() ?? string.Empty;
var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false
};

try
{
    return command switch
    {
        "processes" => ListProcesses(args.Contains("--all"), jsonOptions),
        "capture" => Capture(args, jsonOptions),
        _ => WriteError($"Unknown command: {command}", jsonOptions)
    };
}
catch (Exception ex)
{
    return WriteError(ex.Message, jsonOptions);
}

static int ListProcesses(bool includeInactive, JsonSerializerOptions options)
{
    var processes = AudioSessionEnumerator.GetPlayingProcesses(activeOnly: !includeInactive);
    Console.WriteLine(JsonSerializer.Serialize(processes, options));
    return 0;
}

static int Capture(string[] arguments, JsonSerializerOptions options)
{
    if (arguments.Length < 2 || !uint.TryParse(arguments[1], out var processId) || processId == 0)
        return WriteError("Usage: capture <positive-pid> [--include-tree]", options);

    using var capture = new ProcessAudioCapture(2048);
    if (capture.Start(processId, arguments.Contains("--include-tree")) != 0)
    {
        Console.WriteLine(JsonSerializer.Serialize(capture.LatestResult, options));
        return 1;
    }

    using var cancellation = new CancellationTokenSource();
    _ = Task.Run(() =>
    {
        try
        {
            Console.In.ReadLine();
        }
        catch
        {
            // Stdin closure still stops capture.
        }
        cancellation.Cancel();
    });

    while (!cancellation.IsCancellationRequested && capture.IsRunning)
    {
        Console.WriteLine(JsonSerializer.Serialize(capture.LatestResult, options));
        Console.Out.Flush();
        Thread.Sleep(50);
    }

    capture.Stop();
    return capture.LatestResult.Error is null ? 0 : 1;
}

static int WriteError(string error, JsonSerializerOptions options)
{
    Console.WriteLine(JsonSerializer.Serialize(new { error }, options));
    return 1;
}