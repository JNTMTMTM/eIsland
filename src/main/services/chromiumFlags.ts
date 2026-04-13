import type { App } from 'electron';

export function applyChromiumPerformanceFlags(app: App): void {
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');

  app.commandLine.appendSwitch(
    'disable-features',
    [
      'SpareRendererForSitePerProcess',
      'HardwareMediaKeyHandling',
      'MediaSessionService',
      'WebRtcHideLocalIpsWithMdns',
      'CalculateNativeWinOcclusion',
      'WinRetrieveSuggestionsOnlyOnDemand',
    ].join(','),
  );

  app.commandLine.appendSwitch('enable-features', 'BackForwardCache');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('disable-speech-api');
  app.commandLine.appendSwitch('disable-print-preview');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-breakpad');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --lite-mode');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}
