{
  "targets": [
    {
      "target_name": "eisland_windows_processes_attacker",
      "sources": [
        "src/processes_attacker.c",
        "src/string_utils.c",
        "src/process_ops.c",
        "src/napi_helpers.c",
        "src/napi_binding.c"
      ],
      "defines": ["WIN32_LEAN_AND_MEAN", "NAPI_VERSION=8"],
      "libraries": ["kernel32.lib"],
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