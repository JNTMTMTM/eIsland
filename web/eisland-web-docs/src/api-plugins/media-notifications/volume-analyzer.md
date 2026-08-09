---
watermark: true
title: Windows Volume Analyzer
icon: waveform
---

# Windows Volume Analyzer

`@eisland/windows-volume-analyzer` · v26.0.1

Process-specific audio analysis: frequency spectrum, amplitude, and beat detection via WASAPI loopback.

## Interfaces

| Interface | Description |
|-----------|-------------|
| [FrequencyPeak](volume-analyzer/frequency-peak.md) | Single frequency peak with Hz and magnitude |
| [FrequencyData](volume-analyzer/frequency-data.md) | Frequency spectrum and dominant frequency |
| [AmplitudeData](volume-analyzer/amplitude-data.md) | RMS and peak amplitude values |
| [BeatData](volume-analyzer/beat-data.md) | Beat detection with BPM and intensity |
| [AudioAnalysisResult](volume-analyzer/audio-analysis-result.md) | Complete analysis result (frequency + amplitude + beat) |
| [AnalyzerStatus](volume-analyzer/analyzer-status.md) | Analyzer running state and error info |
| [CommandResult](volume-analyzer/command-result.md) | Command success/failure result |
| [AudioProcessInfo](volume-analyzer/audio-process-info.md) | Process with audio session info |

## Functions

| Function | Description |
|----------|-------------|
| [start](volume-analyzer/start.md) | Start audio analysis for a process |
| [startEx](volume-analyzer/start-ex.md) | Start analysis with explicit process tree option |
| [stop](volume-analyzer/stop.md) | Stop audio analysis |
| [getResult](volume-analyzer/get-result.md) | Get the latest analysis snapshot |
| [getStatus](volume-analyzer/get-status.md) | Get analyzer running state |
| [startPolling](volume-analyzer/start-polling.md) | Start periodic result delivery via callback |
| [stopPolling](volume-analyzer/stop-polling.md) | Stop periodic polling |
| [getPlayingProcesses](volume-analyzer/get-playing-processes.md) | List processes with active audio sessions |
