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
 * @file process_ops.h
 * @description Windows process enumeration and termination operations.
 * @author JNTMTMTM
 */

#ifndef PROCESSES_ATTACKER_PROCESS_OPS_H
#define PROCESSES_ATTACKER_PROCESS_OPS_H

#include "types.h"
#include <tlhelp32.h>
#include <stdbool.h>

/**
 * Appends a failure record to @p result, growing the failures array as needed.
 * @return true on success, false if realloc fails.
 */
bool append_failure(ProcessCloseResult* result, DWORD pid, const WCHAR* name, DWORD error_code);

/**
 * Terminates the process described by @p entry and records the outcome.
 */
void close_process_by_entry(const PROCESSENTRY32W* entry, ProcessCloseResult* result);

/**
 * Checks whether a snapshot entry matches a target (by PID or name).
 */
bool entry_matches_target(const PROCESSENTRY32W* entry, const ProcessTarget* target);

/**
 * Enumerates all running processes and terminates those matching @p target.
 * @param target  The process to close (by PID or name).
 * @param result  Output: populated with match/terminate/failure counts.
 * @return true if the snapshot was opened successfully, false on snapshot error.
 */
bool close_matching_processes(const ProcessTarget* target, ProcessCloseResult* result);

#endif /* PROCESSES_ATTACKER_PROCESS_OPS_H */
