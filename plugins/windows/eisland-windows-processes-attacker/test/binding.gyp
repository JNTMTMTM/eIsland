{
  "targets": [{
    "target_name": "native_safety",
    "type": "executable",
    "sources": ["native_safety.c", "../src/string_utils.c"],
    "msvs_settings": {
      "VCCLCompilerTool": {"AdditionalOptions": ["/utf-8"], "WholeProgramOptimization": "false"},
      "VCLinkerTool": {"AdditionalOptions": ["/LTCG:OFF"]}
    }
  }]
}
