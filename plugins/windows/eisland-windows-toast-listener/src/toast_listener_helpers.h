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

#ifndef TOAST_LISTENER_HELPERS_H
#define TOAST_LISTENER_HELPERS_H

#include "toast_listener_types.h"

/* NAPI value constructors */
napi_value make_boolean(napi_env env, bool value);
napi_value make_string(napi_env env, const char* value);
void throw_error(napi_env env, const char* message);

/* Enum-to-string converters */
const char* access_status_to_string(AccessStatus status);
const char* changed_kind_to_string(ToastChangedKind kind);

/* HSTRING to UTF-8 conversion (caller must free if non-empty) */
const char* hstring_to_utf8(HSTRING hs);

/* WinRT async operation waiters */
HRESULT wait_for_access_result(AccessStatusOperation* operation, AccessStatus* status);
HRESULT wait_for_notification_vector_result(NotificationVectorOperation* operation, NotificationVector** result);

/* WinRT listener activation */
HRESULT get_current_listener(ToastListener** listener);

#endif /* TOAST_LISTENER_HELPERS_H */
