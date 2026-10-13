/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */
/**
 * @file native_safety.c
 * @description 编译真实进程关闭实现，用模拟 Windows 边界确定性验证 PID 复用和查询失败时不终止进程。
 * @author 鸡哥
 */
#include "../src/process_ops.h"
#include <stdio.h>
#include <stdlib.h>
#include <wchar.h>

#define CHECK(condition) do { if (!(condition)) { fprintf(stderr, "CHECK failed at %d: %s\n", __LINE__, #condition); exit(1); } } while (0)
static unsigned open_calls, terminate_calls, process_closes, snapshot_closes;
static DWORD requested_access;
static bool time_captured, fail_open, fail_times, fail_image, fail_terminate, different_image, reused_pid;

static void test_clock(LPFILETIME time) {
  time->dwHighDateTime = 0; time->dwLowDateTime = 100; time_captured = true;
}
static HANDLE test_snapshot(DWORD flags, DWORD pid) {
  CHECK(time_captured); CHECK(flags == TH32CS_SNAPPROCESS); CHECK(pid == 0);
  return (HANDLE)1;
}
static BOOL test_first(HANDLE snapshot, LPPROCESSENTRY32W entry) {
  CHECK(snapshot == (HANDLE)1);
  entry->th32ProcessID = 4321;
  wcscpy_s(entry->szExeFile, MAX_PATH, L"audit-child.exe");
  return TRUE;
}
static BOOL test_next(HANDLE snapshot, LPPROCESSENTRY32W entry) {
  (void)snapshot; (void)entry; return FALSE;
}
static HANDLE test_open(DWORD access, BOOL inherit, DWORD pid) {
  CHECK(pid == 4321); CHECK(!inherit); requested_access = access; open_calls++;
  if (fail_open) { SetLastError(ERROR_ACCESS_DENIED); return NULL; }
  return (HANDLE)2;
}
static BOOL test_times(HANDLE handle, LPFILETIME creation, LPFILETIME exit_time, LPFILETIME kernel, LPFILETIME user) {
  CHECK(handle == (HANDLE)2); (void)exit_time; (void)kernel; (void)user;
  if (fail_times) { SetLastError(ERROR_ACCESS_DENIED); return FALSE; }
  creation->dwHighDateTime = 0; creation->dwLowDateTime = reused_pid ? 101 : 50;
  return TRUE;
}
static BOOL test_image(HANDLE handle, DWORD flags, LPWSTR image, PDWORD length) {
  CHECK(handle == (HANDLE)2); CHECK(flags == 0); CHECK(*length >= MAX_PATH);
  if (fail_image) { SetLastError(ERROR_ACCESS_DENIED); return FALSE; }
  wcscpy_s(image, *length, different_image ? L"C:\\Audit\\replacement.exe" : L"C:\\Audit\\AUDIT-CHILD.exe");
  return TRUE;
}
static BOOL test_terminate(HANDLE handle, UINT code) {
  CHECK(handle == (HANDLE)2); CHECK(code == EXIT_CODE_TERMINATED_BY_EISLAND); terminate_calls++;
  if (fail_terminate) { SetLastError(ERROR_ACCESS_DENIED); return FALSE; }
  return TRUE;
}
static BOOL test_close(HANDLE handle) {
  if (handle == (HANDLE)1) snapshot_closes++;
  else { CHECK(handle == (HANDLE)2); process_closes++; }
  return TRUE;
}

/* Keep every OS boundary simulated while compiling the actual production implementation. */
#define GetSystemTimePreciseAsFileTime test_clock
#define CreateToolhelp32Snapshot test_snapshot
#define Process32FirstW test_first
#define Process32NextW test_next
#define OpenProcess test_open
#define GetProcessTimes test_times
#define QueryFullProcessImageNameW test_image
#define TerminateProcess test_terminate
#define CloseHandle test_close
#include "../src/process_ops.c"

static void reset(void) {
  open_calls = terminate_calls = process_closes = snapshot_closes = requested_access = 0;
  time_captured = fail_open = fail_times = fail_image = fail_terminate = different_image = reused_pid = false;
}
static void run_case(bool rejected, DWORD error) {
  ProcessTarget target = {0}; ProcessCloseResult result;
  target.kind = PROCESS_TARGET_PID; target.pid = 4321;
  CHECK(close_matching_processes(&target, &result));
  CHECK(open_calls == 1); CHECK(snapshot_closes == 1);
  CHECK(requested_access == (PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION));
  CHECK(process_closes == (fail_open ? 0U : 1U));
  CHECK(result.matched_count == 1);
  CHECK(result.terminated_count == (rejected ? 0U : 1U));
  CHECK(result.failed_count == (rejected ? 1U : 0U));
  CHECK(terminate_calls == ((!rejected || fail_terminate) ? 1U : 0U));
  if (rejected) CHECK(result.failures[0].error_code == error);
  free(result.failures);
}
int main(void) {
  WCHAR normalized[MAX_PROCESS_NAME_LENGTH]; WCHAR long_name[MAX_PROCESS_NAME_LENGTH];
  reset(); run_case(false, 0);
  reset(); reused_pid = true; run_case(true, ERROR_RETRY);
  reset(); different_image = true; run_case(true, ERROR_RETRY);
  reset(); fail_open = true; run_case(true, ERROR_ACCESS_DENIED);
  reset(); fail_times = true; run_case(true, ERROR_ACCESS_DENIED);
  reset(); fail_image = true; run_case(true, ERROR_ACCESS_DENIED);
  reset(); fail_terminate = true; run_case(true, ERROR_ACCESS_DENIED);
  wmemset(long_name, L'a', MAX_PROCESS_NAME_LENGTH - 1); long_name[MAX_PROCESS_NAME_LENGTH - 1] = L'\0';
  normalize_process_name(long_name, normalized, MAX_PROCESS_NAME_LENGTH);
  CHECK(normalized[0] == L'\0');
  printf("PASS 8 native safety cases (actual C implementation, simulated OS boundaries)\n");
  return 0;
}
