using System.Runtime.InteropServices;

internal static class AudioEndpointController
{
    private static readonly Guid AudioEndpointVolumeInterfaceId = typeof(IAudioEndpointVolume).GUID;
    private static readonly Guid EventContext = Guid.Empty;

    public static bool? GetMute()
    {
        return WithDefaultEndpointVolume(endpointVolume =>
        {
            endpointVolume.GetMute(out var muted);
            return muted;
        });
    }

    public static bool SetMute(bool muted)
    {
        return WithDefaultEndpointVolume(endpointVolume =>
        {
            var eventContext = EventContext;
            endpointVolume.SetMute(muted, ref eventContext);
            return true;
        }) ?? false;
    }

    public static int? GetVolume()
    {
        return WithDefaultEndpointVolume(endpointVolume =>
        {
            endpointVolume.GetMasterVolumeLevelScalar(out var level);
            return NormalizeVolume(level);
        });
    }

    public static bool SetVolume(int level)
    {
        var normalized = Math.Clamp(level, 0, 100);
        return WithDefaultEndpointVolume(endpointVolume =>
        {
            var eventContext = EventContext;
            endpointVolume.SetMasterVolumeLevelScalar(normalized / 100f, ref eventContext);
            return true;
        }) ?? false;
    }

    internal static IAudioEndpointVolume CreateDefaultEndpointVolume(out IMMDevice endpoint)
    {
        DebugLog("create-enumerator");
        var enumerator = CoreAudioFactory.CreateDeviceEnumerator();
        try
        {
            DebugLog("get-default-endpoint");
            enumerator.GetDefaultAudioEndpoint(EDataFlow.Render, ERole.Multimedia, out endpoint);
            var interfaceId = AudioEndpointVolumeInterfaceId;
            DebugLog("activate-endpoint-volume");
            endpoint.Activate(ref interfaceId, ClsContext.All, IntPtr.Zero, out var endpointVolume);
            DebugLog("endpoint-volume-ready");
            return (IAudioEndpointVolume)endpointVolume;
        }
        finally
        {
            Marshal.FinalReleaseComObject(enumerator);
        }
    }

    internal static int NormalizeVolume(float level)
    {
        return Math.Clamp((int)Math.Round(level * 100f), 0, 100);
    }

    private static void DebugLog(string step)
    {
        if (Environment.GetEnvironmentVariable("EISLAND_VOLUME_DEBUG") == "1")
        {
            Console.Error.WriteLine($"[VolumeHelper] {step}");
            Console.Error.Flush();
        }
    }

    private static T? WithDefaultEndpointVolume<T>(Func<IAudioEndpointVolume, T> action)
        where T : struct
    {
        IMMDevice? endpoint = null;
        IAudioEndpointVolume? endpointVolume = null;

        try
        {
            endpointVolume = CreateDefaultEndpointVolume(out endpoint);
            return action(endpointVolume);
        }
        catch
        {
            return null;
        }
        finally
        {
            if (endpointVolume is not null)
            {
                Marshal.FinalReleaseComObject(endpointVolume);
            }

            if (endpoint is not null)
            {
                Marshal.FinalReleaseComObject(endpoint);
            }
        }
    }
}