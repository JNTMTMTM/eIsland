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
 * @file process_ops.c
 * @description Windows process enumeration and termination implementations.
 * @author JNTMTMTM
 */

#include "process_ops.h"
#include "string_utils.h"
#include <windows.h>
#include <tlhelp32.h>
#include <string.h>
#include <stdlib.h>

bool append_failure(ProcessCloseResult* result, DWORD pid, const WCHAR* name, DWORD error_code) {
  ProcessFailure* next_failures;
  size_t next_size = ((size_t)result->failed_count + 1) * sizeof(ProcessFailure);

  next_failures = (ProcessFailure*)realloc(result->failures, next_size);
  if (next_failures == NULL) {
    return false;
  }

  result->failures = next_failures;
  result->failures[result->failed_count].pid = pid;
  result->failures[result->failed_count].error_code = error_code;
  wcsncpy_s(result->failures[result->failed_count].name, MAX_PROCESS_NAME_LENGTH, name, _TRUNCATE);
  result->failed_count += 1;
  return true;
}

void close_process_by_entry(const PROCESSENTRY32W* entry, ProcessCloseResult* result) {
  HANDLE process_handle;
  DWORD error_code;

  result->matched_count += 1;
  process_handle = OpenProcess(PROCESS_TERMINATE, FALSE, entry->th32ProcessID);

  if (process_handle == NULL) {
    error_code = GetLastError();
    append_failure(result, entry->th32ProcessID, entry->szExeFile, error_code);
    return;
  }

  if (TerminateProcess(process_handle, EXIT_CODE_TERMINATED_BY_EISLAND)) {
    result->terminated_count += 1;
    CloseHandle(process_handle);
    return;
  }

  error_code = GetLastError();
  CloseHandle(process_handle);
  append_failure(result, entry->th32ProcessID, entry->szExeFile, error_code);
}

bool entry_matches_target(const PROCESSENTRY32W* entry, const ProcessTarget* target) {
  if (target->kind == PROCESS_TARGET_PID) {
    return entry->th32ProcessID == target->pid;
  }

  return process_name_matches(target, entry->szExeFile);
}

bool close_matching_processes(const ProcessTarget* target, ProcessCloseResult* result) {
  HANDLE snapshot;
  PROCESSENTRY32W entry;

  memset(result, 0, sizeof(ProcessCloseResult));

  snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snapshot == INVALID_HANDLE_VALUE) {
    append_failure(result, 0, L"", GetLastError());
    return false;
  }

  memset(&entry, 0, sizeof(entry));
  entry.dwSize = sizeof(PROCESSENTRY32W);

  if (!Process32FirstW(snapshot, &entry)) {
    append_failure(result, 0, L"", GetLastError());
    CloseHandle(snapshot);
    return false;
  }

  do {
    if (entry_matches_target(&entry, target)) {
      close_process_by_entry(&entry, result);
    }
  } while (Process32NextW(snapshot, &entry));

  CloseHandle(snapshot);
  return true;
}
