{
  "targets": [
    {
      "target_name": "windows_performance_monitor",
      "sources": ["src/performance_monitor.c", "src/performance_core.c"],
      "defines": ["WIN32_LEAN_AND_MEAN", "NAPI_VERSION=8"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": ["/utf-8", "/GL-"]
        },
        "VCLinkerTool": {
          "AdditionalOptions": ["/LTCG:OFF"]
        }
      }
    }
  ]
}