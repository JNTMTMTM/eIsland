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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

#ifndef TOAST_LISTENER_CHANGED_H
#define TOAST_LISTENER_CHANGED_H

#include "toast_listener_types.h"

/* NAPI threadsafe callback bridge for changed events */
void call_js_changed_callback(napi_env env, napi_value js_callback, void* context, void* data);

/* Build a JS object from a ToastChangedEvent */
napi_value make_changed_event(napi_env env, const ToastChangedEvent* event);

#endif /* TOAST_LISTENER_CHANGED_H */
