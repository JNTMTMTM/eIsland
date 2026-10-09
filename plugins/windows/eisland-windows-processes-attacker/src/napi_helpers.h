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
 * @file napi_helpers.h
 * @description N-API value creation and result-building helpers.
 * @author JNTMTMTM
 */

#ifndef PROCESSES_ATTACKER_NAPI_HELPERS_H
#define PROCESSES_ATTACKER_NAPI_HELPERS_H

#include "types.h"
#include <node_api.h>

/** Creates a JS uint32 value from a C uint32. */
napi_value make_uint32(napi_env env, uint32_t value);

/** Creates a JS string from a null-terminated wide string. */
napi_value make_wide_string(napi_env env, const WCHAR* value);

/** Creates a JS value representing the target (number for PID, string for name). */
napi_value make_target_value(napi_env env, const ProcessTarget* target);

/** Creates a JS object from a single ProcessFailure record. */
napi_value make_failure(napi_env env, const ProcessFailure* failure);

/**
 * Creates a JS object summarizing a close operation:
 * { target, matchedCount, terminatedCount, failedCount, failures[] }
 */
napi_value make_result(napi_env env, const ProcessTarget* target, const ProcessCloseResult* close_result);

#endif /* PROCESSES_ATTACKER_NAPI_HELPERS_H */
