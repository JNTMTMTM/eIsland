---
watermark: true
title: Windows Volume Analyzer
icon: waveform
---

# Windows Volume Analyzer

`@eisland/windows-volume-analyzer` · v26.0.1

:::info
Process-specific audio analysis via WASAPI loopback capture. Provides real-time frequency spectrum, amplitude, and beat detection for any application producing audio. Uses a .NET NativeAOT EXE for high-performance audio processing.
:::

## API Reference

| Type | Name | Description |
|------|------|-------------|
| Interface | [FrequencyPeak](frequency-peak.md) | Single frequency peak with Hz and magnitude |
| Interface | [FrequencyData](frequency-data.md) | Frequency spectrum and dominant frequency |
| Interface | [AmplitudeData](amplitude-data.md) | RMS and peak amplitude values |
| Interface | [BeatData](beat-data.md) | Beat detection with BPM and intensity |
| Interface | [AudioAnalysisResult](audio-analysis-result.md) | Complete analysis result (frequency + amplitude + beat) |
| Interface | [AnalyzerStatus](analyzer-status.md) | Analyzer running state and error info |
| Interface | [CommandResult](command-result.md) | Command success/failure result |
| Interface | [AudioProcessInfo](audio-process-info.md) | Process with audio session info |
| Function | [start](start.md) | Start audio analysis for a process |
| Function | [startEx](start-ex.md) | Start analysis with explicit process tree option |
| Function | [stop](stop.md) | Stop audio analysis |
| Function | [getResult](get-result.md) | Get the latest analysis snapshot |
| Function | [getStatus](get-status.md) | Get analyzer running state |
| Function | [startPolling](start-polling.md) | Start periodic result delivery via callback |
| Function | [stopPolling](stop-polling.md) | Stop periodic polling |
| Function | [getPlayingProcesses](get-playing-processes.md) | List processes with active audio sessions |
