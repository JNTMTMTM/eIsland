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
 * @file napi_binding.h
 * @description N-API argument parsing and exported function declarations.
 * @author JNTMTMTM
 */

#ifndef PROCESSES_ATTACKER_NAPI_BINDING_H
#define PROCESSES_ATTACKER_NAPI_BINDING_H

#include "types.h"
#include <node_api.h>
#include <stdbool.h>

/**
 * Parses a JS value (string or number) into a ProcessTarget.
 * Throws a JS TypeError on invalid input.
 * @return true if parsing succeeded.
 */
bool read_target(napi_env env, napi_value value, ProcessTarget* target);

/** N-API binding: closeProcess(target) — terminates processes matching a single target. */
napi_value close_single_process(napi_env env, napi_callback_info callback_info);

/** N-API binding: closeProcesses(targets[]) — terminates processes for each target in an array. */
napi_value close_multiple_processes(napi_env env, napi_callback_info callback_info);

#endif /* PROCESSES_ATTACKER_NAPI_BINDING_H */
