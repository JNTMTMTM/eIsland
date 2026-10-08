{
  "targets": [
    {
      "target_name": "windows_fullscreen_detector",
      "sources": ["src/fullscreen_detector.c", "src/fullscreen_core.c"],
      "defines": ["WIN32_LEAN_AND_MEAN", "NAPI_VERSION=8"],
      "libraries": ["user32.lib", "dwmapi.lib"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": ["/GL-"]
        },
        "VCLinkerTool": {
          "AdditionalOptions": ["/LTCG:OFF"]
        }
      }
    }
  ]
}