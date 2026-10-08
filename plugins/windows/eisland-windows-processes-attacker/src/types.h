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
 * @file types.h
 * @description Shared type definitions and constants for the process attacker module.
 * @author JNTMTMTM
 */

#ifndef PROCESSES_ATTACKER_TYPES_H
#define PROCESSES_ATTACKER_TYPES_H

#include <windows.h>

/** Maximum length of a process name including null terminator. */
#define MAX_PROCESS_NAME_LENGTH 260

/** Exit code used when terminating a process via eIsland. */
#define EXIT_CODE_TERMINATED_BY_EISLAND 1

/** Discriminator for ProcessTarget: identified by PID or by name. */
typedef enum ProcessTargetKind {
  PROCESS_TARGET_PID,
  PROCESS_TARGET_NAME
} ProcessTargetKind;

/** Describes a single process target — either a PID or a name (with normalized form). */
typedef struct ProcessTarget {
  ProcessTargetKind kind;
  DWORD pid;
  WCHAR name[MAX_PROCESS_NAME_LENGTH];
  WCHAR normalized_name[MAX_PROCESS_NAME_LENGTH];
} ProcessTarget;

/** Records a single termination failure for later reporting. */
typedef struct ProcessFailure {
  DWORD pid;
  DWORD error_code;
  WCHAR name[MAX_PROCESS_NAME_LENGTH];
} ProcessFailure;

/** Accumulates results across one or more process-close operations. */
typedef struct ProcessCloseResult {
  DWORD matched_count;
  DWORD terminated_count;
  DWORD failed_count;
  ProcessFailure* failures;
} ProcessCloseResult;

#endif /* PROCESSES_ATTACKER_TYPES_H */
