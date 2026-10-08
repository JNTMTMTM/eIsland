/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file string_utils.c
 * @description Wide-string utility implementations.
 * @author JNTMTMTM
 */

#include "string_utils.h"
#include <wchar.h>

bool string_ends_with_exe(const WCHAR* value) {
  size_t length = wcslen(value);

  if (length < 4) {
    return false;
  }

  return _wcsicmp(value + length - 4, L".exe") == 0;
}

void normalize_process_name(const WCHAR* source, WCHAR* output, size_t output_length) {
  size_t source_length;

  if (output_length == 0) {
    return;
  }

  output[0] = L'\0';
  wcsncpy_s(output, output_length, source, _TRUNCATE);
  source_length = wcslen(output);

  if (source_length > 0 && !string_ends_with_exe(output)) {
    wcscat_s(output, output_length, L".exe");
  }
}

bool process_name_matches(const ProcessTarget* target, const WCHAR* process_name) {
  if (target->kind != PROCESS_TARGET_NAME) {
    return false;
  }

  if (_wcsicmp(target->name, process_name) == 0) {
    return true;
  }

  return target->normalized_name[0] != L'\0' && _wcsicmp(target->normalized_name, process_name) == 0;
}
