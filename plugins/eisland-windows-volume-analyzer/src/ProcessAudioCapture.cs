namespace eIslandVolumeAnalyzer;

/// <summary>
/// Captures and analyzes only the selected process audio stream.
/// </summary>
internal sealed class ProcessAudioCapture : IDisposable
{
    private readonly FftProcessor _fft;
    private readonly object _resultLock = new();
    private readonly ManualResetEventSlim _startupEvent = new(false);
    private readonly IntPtr _stopEvent;
    private volatile bool _running;
    private Thread? _captureThread;
    private AudioAnalysisResult _result;
    private string? _startupError;
    private float[]? _sampleBuffer;
    private int _bufferWritePos;
    private int _sampleRate = 48000;
    private int _channels = 2;

    public ProcessAudioCapture(int fftSize = 2048)
    {
        _fft = new FftProcessor(fftSize);
        _result = AudioAnalysisResult.Empty;
        _stopEvent = Win32Audio.CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
        if (_stopEvent == IntPtr.Zero)
            throw new InvalidOperationException("Unable to create the capture stop event.");
    }

    /// <summary>Returns the latest immutable analysis snapshot.</summary>
    public AudioAnalysisResult LatestResult
    {
        get { lock (_resultLock) return _result; }
    }

    /// <summary>Indicates whether the capture thread is active.</summary>
    public bool IsRunning => _running;

    /// <summary>Starts process loopback capture and waits for the stream to initialize.</summary>
    public int Start(uint processId, bool includeProcessTree = true)
    {
        if (_running) return 0;

        _startupError = null;
        _startupEvent.Reset();
        Win32Audio.ResetEvent(_stopEvent);
        _running = true;
        _captureThread = new Thread(() => CaptureLoop(processId, includeProcessTree))
        {
            IsBackground = true,
            Name = $"AudioAnalyzer-{processId}"
        };
        _captureThread.Start();

        if (_startupEvent.Wait(5000))
            return _startupError is null ? 0 : 1;

        Stop();
        SetError("Timed out while starting process audio capture.");
        return 1;
    }

    /// <summary>Stops capture and joins the background thread.</summary>
    public void Stop()
    {
        if (!_running && (_captureThread is null || !_captureThread.IsAlive)) return;

        _running = false;
        Win32Audio.SetEvent(_stopEvent);
        _captureThread?.Join(3000);
        _captureThread = null;
    }

    /// <summary>Releases the capture event and analysis resources.</summary>
    public void Dispose()
    {
        Stop();
        _startupEvent.Dispose();
        Win32Audio.CloseHandle(_stopEvent);
    }

    private unsafe void CaptureLoop(uint processId, bool includeProcessTree)
    {
        var comResult = Win32Audio.CoInitializeEx(IntPtr.Zero, Win32Audio.COINIT_MULTITHREADED);
        var comInitialized = comResult is 0 or 1;
        IAudioClient? audioClient = null;
        IAudioCaptureClient? captureClient = null;

        try
        {
            if (!comInitialized)
                throw new InvalidOperationException($"COM initialization failed: 0x{comResult:X8}");

            audioClient = ProcessAudioActivator.ActivateProcessLoopbackClient(processId, includeProcessTree);

            // Process-loopback clients do not guarantee GetMixFormat support; request a stable float format.
            _sampleRate = 48000;
            var requestFormat = WaveFormat.CreateFloatStereo((uint)_sampleRate);
            var sessionGuid = Guid.Empty;
            var streamFlags = (uint)(AUDCLNT_STREAMFLAGS.LOOPBACK | AUDCLNT_STREAMFLAGS.AUTOCONVERTPCM);
            var hr = audioClient.Initialize(
                AUDCLNT_SHAREMODE.SHARED,
                streamFlags,
                0,
                0,
                ref requestFormat,
                ref sessionGuid);
            ThrowIfFailed(hr, "IAudioClient.Initialize");

            _channels = requestFormat.nChannels;
            _sampleBuffer = new float[_fft.Size];
            _bufferWritePos = 0;

            var captureGuid = AudioInterfaceGuids.IID_IAudioCaptureClient;
            ThrowIfFailed(audioClient.GetService(ref captureGuid, out var captureObject), "GetService(IAudioCaptureClient)");
            captureClient = (IAudioCaptureClient)captureObject;
            ThrowIfFailed(audioClient.Start(), "IAudioClient.Start");
            _startupEvent.Set();

            var beatDetector = new BeatDetector(_sampleRate, _fft.Size);
            var magnitudes = new float[_fft.Size / 2];
            while (_running)
            {
                if (Win32Audio.WaitForSingleObject(_stopEvent, 10) == Win32Audio.WAIT_OBJECT_0) break;
                ThrowIfFailed(captureClient.GetNextPacketSize(out var packetFrameCount), "GetNextPacketSize");

                while (packetFrameCount > 0 && _running)
                {
                    ThrowIfFailed(captureClient.GetBuffer(
                        out var dataPtr,
                        out var framesAvailable,
                        out var flags,
                        out _,
                        out _), "GetBuffer");
                    try
                    {
                        var silent = (flags & (uint)AUDCLNT_BUFFERFLAGS.SILENT) != 0;
                        if (silent || dataPtr == IntPtr.Zero)
                            WriteSilence(framesAvailable, beatDetector, magnitudes);
                        else
                            WriteAudio(new ReadOnlySpan<float>(dataPtr.ToPointer(), checked((int)framesAvailable * _channels)), beatDetector, magnitudes);
                    }
                    finally
                    {
                        ThrowIfFailed(captureClient.ReleaseBuffer(framesAvailable), "ReleaseBuffer");
                    }
                    ThrowIfFailed(captureClient.GetNextPacketSize(out packetFrameCount), "GetNextPacketSize");
                }
            }

            _ = audioClient.Stop();
        }
        catch (Exception ex)
        {
            SetError(ex.Message);
            _startupEvent.Set();
        }
        finally
        {
            _running = false;
            if (comInitialized) Win32Audio.CoUninitialize();
        }
    }

    private void WriteAudio(ReadOnlySpan<float> interleaved, BeatDetector detector, float[] magnitudes)
    {
        var sampleCount = interleaved.Length / _channels;
        for (var frame = 0; frame < sampleCount; frame++)
        {
            var sum = 0f;
            var offset = frame * _channels;
            for (var channel = 0; channel < _channels; channel++) sum += interleaved[offset + channel];
            WriteSample(sum / _channels, detector, magnitudes);
        }
    }

    private void WriteSilence(uint frames, BeatDetector detector, float[] magnitudes)
    {
        for (var frame = 0u; frame < frames; frame++) WriteSample(0f, detector, magnitudes);
    }

    private void WriteSample(float sample, BeatDetector detector, float[] magnitudes)
    {
        if (_sampleBuffer is null) return;
        _sampleBuffer[_bufferWritePos++] = sample;
        if (_bufferWritePos < _sampleBuffer.Length) return;

        AnalyzeBuffer(magnitudes, detector);
        _bufferWritePos = 0;
    }

    private void AnalyzeBuffer(float[] magnitudes, BeatDetector beatDetector)
    {
        if (_sampleBuffer is null) return;
        _fft.ComputeMagnitude(_sampleBuffer, magnitudes);

        var sumSquares = 0f;
        var peak = 0f;
        foreach (var sample in _sampleBuffer)
        {
            var absolute = MathF.Abs(sample);
            sumSquares += sample * sample;
            if (absolute > peak) peak = absolute;
        }

        var rms = MathF.Sqrt(sumSquares / _sampleBuffer.Length);
        var topBins = FindTopFrequencyBins(magnitudes, 8);
        var lowBin = Math.Max(2, (int)(40f * _fft.Size / _sampleRate));
        var highBin = Math.Min(magnitudes.Length, Math.Max(lowBin + 1, (int)(200f * _fft.Size / _sampleRate)));
        beatDetector.Analyze(magnitudes, lowBin, highBin);

        lock (_resultLock)
        {
            _result = new AudioAnalysisResult
            {
                Error = null,
                Frequency = new FrequencyData
                {
                    Spectrum = DownsampleSpectrum(magnitudes, 512),
                    DominantHz = topBins.Length == 0 ? 0f : BinToHz(topBins[0].Bin),
                    TopFrequencies = topBins.Select(bin => new FrequencyPeak
                    {
                        Hz = BinToHz(bin.Bin),
                        Magnitude = bin.Magnitude
                    }).ToArray()
                },
                Amplitude = new AmplitudeData { Rms = rms, Peak = peak },
                Beat = new BeatData
                {
                    IsBeat = beatDetector.IsBeat,
                    Bpm = beatDetector.Bpm,
                    Intensity = beatDetector.BeatIntensity
                }
            };
        }
    }

    private float BinToHz(int bin) => bin * (float)_sampleRate / _fft.Size;

    private void SetError(string error)
    {
        _startupError = error;
        lock (_resultLock) _result = _result with { Error = error };
    }

    private static void ThrowIfFailed(int hResult, string operation)
    {
        if (hResult != 0) throw new InvalidOperationException($"{operation} failed: 0x{hResult:X8}");
    }

    private static (int Bin, float Magnitude)[] FindTopFrequencyBins(ReadOnlySpan<float> magnitudes, int count)
    {
        var bins = new List<(int Bin, float Magnitude)>(Math.Max(0, magnitudes.Length - 2));
        for (var bin = 2; bin < magnitudes.Length; bin++)
        {
            if (magnitudes[bin] > 1e-8f) bins.Add((bin, magnitudes[bin]));
        }

        return bins.OrderByDescending(item => item.Magnitude).Take(count).ToArray();
    }

    private static float[] DownsampleSpectrum(ReadOnlySpan<float> source, int targetSize)
    {
        var result = new float[targetSize];
        var ratio = (float)source.Length / targetSize;
        for (var i = 0; i < targetSize; i++)
        {
            var start = Math.Min(source.Length, (int)(i * ratio));
            var end = Math.Min(source.Length, Math.Max(start + 1, (int)((i + 1) * ratio)));
            for (var j = start; j < end; j++) result[i] = MathF.Max(result[i], source[j]);
        }
        return result;
    }
}

internal record struct FrequencyPeak
{
    public float Hz { get; init; }
    public float Magnitude { get; init; }
}

internal record struct FrequencyData
{
    public float[] Spectrum { get; init; }
    public float DominantHz { get; init; }
    public FrequencyPeak[] TopFrequencies { get; init; }
}

internal record struct AmplitudeData
{
    public float Rms { get; init; }
    public float Peak { get; init; }
}

internal record struct BeatData
{
    public bool IsBeat { get; init; }
    public float Bpm { get; init; }
    public float Intensity { get; init; }
}

internal record AudioAnalysisResult
{
    public string? Error { get; init; }
    public FrequencyData Frequency { get; init; }
    public AmplitudeData Amplitude { get; init; }
    public BeatData Beat { get; init; }

    public static AudioAnalysisResult Empty => new()
    {
        Frequency = new FrequencyData
        {
            Spectrum = Array.Empty<float>(),
            TopFrequencies = Array.Empty<FrequencyPeak>()
        },
        Amplitude = new AmplitudeData(),
        Beat = new BeatData()
    };
}

internal record StatusInfo
{
    public bool IsRunning { get; init; }
    public string? Error { get; init; }
}