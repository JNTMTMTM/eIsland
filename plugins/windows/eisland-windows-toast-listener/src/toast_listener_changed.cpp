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

#include "toast_listener_changed.h"

#include <cstdlib>

napi_value make_changed_event(napi_env env, const ToastChangedEvent* event) {
  napi_value object;
  napi_value kind;
  napi_value notification_id;

  napi_create_object(env, &object);
  napi_create_string_utf8(env, event->kind, NAPI_AUTO_LENGTH, &kind);
  napi_create_uint32(env, event->notification_id, &notification_id);
  napi_set_named_property(env, object, "kind", kind);
  napi_set_named_property(env, object, "notificationId", notification_id);
  return object;
}

void call_js_changed_callback(napi_env env, napi_value js_callback, void* context, void* data) {
  ToastChangedEvent* event = (ToastChangedEvent*)data;
  napi_value undefined;
  napi_value argv[1];

  (void)context;

  if (env == NULL || js_callback == NULL || event == NULL) {
    free(event);
    return;
  }

  napi_get_undefined(env, &undefined);
  argv[0] = make_changed_event(env, event);
  napi_call_function(env, undefined, js_callback, 1, argv, NULL);
  free(event);
}
