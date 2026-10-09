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
 * @file string_utils.h
 * @description Wide-string utility helpers for process name matching and normalization.
 * @author JNTMTMTM
 */

#ifndef PROCESSES_ATTACKER_STRING_UTILS_H
#define PROCESSES_ATTACKER_STRING_UTILS_H

#include "types.h"
#include <stdbool.h>

/**
 * Checks whether a wide string ends with ".exe" (case-insensitive).
 * @param value  Null-terminated wide string to test.
 * @return true if the last four characters are ".exe".
 */
bool string_ends_with_exe(const WCHAR* value);

/**
 * Copies @p source into @p output, appending ".exe" if not already present.
 * @param source        Input process name.
 * @param output        Destination buffer.
 * @param output_length Size of @p output in WCHAR units.
 */
void normalize_process_name(const WCHAR* source, WCHAR* output, size_t output_length);

/**
 * Checks whether a target's name or normalized name matches @p process_name.
 * @param target        Target descriptor (must be PROCESS_TARGET_NAME).
 * @param process_name  Name from a PROCESSENTRY32W.
 * @return true if either form matches (case-insensitive).
 */
bool process_name_matches(const ProcessTarget* target, const WCHAR* process_name);

#endif /* PROCESSES_ATTACKER_STRING_UTILS_H */
