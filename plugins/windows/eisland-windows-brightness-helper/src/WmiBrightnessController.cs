using System.Management;

internal sealed record WmiBrightnessSnapshot(
    byte CurrentBrightness,
    int[]? Levels,
    string? InstanceName);

internal static class WmiBrightnessController
{
    private static readonly TimeSpan QueryTimeout = TimeSpan.FromSeconds(1);

    public static WmiBrightnessSnapshot? GetBrightness()
    {
        try
        {
            using var searcher = CreateSearcher("SELECT * FROM WmiMonitorBrightness");
            foreach (ManagementObject obj in searcher.Get())
            {
                using (obj)
                {
                    var rawLevels = obj["Level"] as byte[];
                    return new WmiBrightnessSnapshot(
                        (byte)obj["CurrentBrightness"],
                        rawLevels?.Select(level => (int)level).ToArray(),
                        obj["InstanceName"] as string);
                }
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    public static bool SetBrightness(byte brightness)
    {
        try
        {
            using var searcher = CreateSearcher("SELECT * FROM WmiMonitorBrightnessMethods");
            foreach (ManagementObject obj in searcher.Get())
            {
                using (obj)
                using (var parameters = obj.GetMethodParameters("WmiSetBrightness"))
                {
                    parameters["Brightness"] = brightness;
                    parameters["Timeout"] = (uint)0;
                    obj.InvokeMethod("WmiSetBrightness", parameters, null);
                    return true;
                }
            }
        }
        catch
        {
            return false;
        }

        return false;
    }

    private static ManagementObjectSearcher CreateSearcher(string query)
    {
        var searcher = new ManagementObjectSearcher(@"root\wmi", query);
        searcher.Options.Timeout = QueryTimeout;
        searcher.Options.ReturnImmediately = true;
        return searcher;
    }
}