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

#include "toast_listener_types.h"
#include "toast_listener_helpers.h"
#include "toast_listener_changed.h"

#include <cstring>

/* Module-global state */
static INIT_ONCE g_init_once = INIT_ONCE_STATIC_INIT;
static CRITICAL_SECTION g_listener_lock;
napi_threadsafe_function g_threadsafe_callback = NULL;
static bool g_is_listening = false;
static bool g_suppression_enabled = false;

/* Polling-based listener thread */
static HANDLE g_poll_thread = NULL;
static HANDLE g_poll_stop_event = NULL;
#define POLL_INTERVAL_MS 500

static BOOL CALLBACK initialize_once(PINIT_ONCE init_once, PVOID parameter, PVOID* context) {
  (void)init_once;
  (void)parameter;
  (void)context;
  InitializeCriticalSection(&g_listener_lock);
  return TRUE;
}

static void ensure_initialized(void) {
  InitOnceExecuteOnce(&g_init_once, initialize_once, NULL, NULL);
  RoInitialize(RO_INIT_MULTITHREADED);
}

/* Collect current notification IDs into a caller-allocated sorted array.
   Returns count. Caller must free *out_ids. */
static UINT32 collect_notification_ids(ToastListener* listener, UINT32** out_ids) {
  NotificationVectorOperation* op = NULL;
  NotificationVector* vec = NULL;
  UINT32 count = 0;
  HRESULT hr;

  *out_ids = NULL;

  hr = listener->GetNotificationsAsync((NotificationKinds)1, &op);
  if (FAILED(hr) || op == NULL) {
    return 0;
  }

  hr = wait_for_notification_vector_result(op, &vec);
  op->Release();

  if (FAILED(hr) || vec == NULL) {
    return 0;
  }

  vec->get_Size(&count);
  if (count == 0) {
    vec->Release();
    return 0;
  }

  UINT32* ids = (UINT32*)calloc(count, sizeof(UINT32));
  if (ids == NULL) {
    vec->Release();
    return 0;
  }

  for (UINT32 i = 0; i < count; i++) {
    UserNotification* un = NULL;
    if (SUCCEEDED(vec->GetAt(i, &un)) && un != NULL) {
      un->get_Id(&ids[i]);
      un->Release();
    }
  }

  vec->Release();
  *out_ids = ids;
  return count;
}

/* Find id in sorted array */
static bool id_in_set(const UINT32* ids, UINT32 count, UINT32 target) {
  for (UINT32 i = 0; i < count; i++) {
    if (ids[i] == target) {
      return true;
    }
  }
  return false;
}

static DWORD WINAPI poll_thread_proc(LPVOID param) {
  ToastListener* listener = NULL;
  UINT32* prev_ids = NULL;
  UINT32 prev_count = 0;
  HRESULT hr;

  (void)param;

  hr = get_current_listener(&listener);
  if (FAILED(hr)) {
    return 1;
  }

  /* Snapshot initial state */
  prev_count = collect_notification_ids(listener, &prev_ids);

  while (WaitForSingleObject(g_poll_stop_event, POLL_INTERVAL_MS) == WAIT_TIMEOUT) {
    UINT32* curr_ids = NULL;
    UINT32 curr_count = collect_notification_ids(listener, &curr_ids);

    /* Detect added notifications */
    for (UINT32 i = 0; i < curr_count; i++) {
      if (!id_in_set(prev_ids, prev_count, curr_ids[i])) {
        ToastChangedEvent* event = (ToastChangedEvent*)calloc(1, sizeof(ToastChangedEvent));
        if (event != NULL) {
          strncpy(event->kind, "added", sizeof(event->kind) - 1);
          event->notification_id = curr_ids[i];

          EnterCriticalSection(&g_listener_lock);
          if (g_threadsafe_callback != NULL) {
            napi_status s = napi_call_threadsafe_function(g_threadsafe_callback, event, napi_tsfn_nonblocking);
            if (s != napi_ok) {
              free(event);
            }
          } else {
            free(event);
          }

          /* Suppression: getNotifications() returns [] when g_suppression_enabled */

          LeaveCriticalSection(&g_listener_lock);
        }
      }
    }

    /* Detect removed notifications */
    for (UINT32 i = 0; i < prev_count; i++) {
      if (!id_in_set(curr_ids, curr_count, prev_ids[i])) {
        ToastChangedEvent* event = (ToastChangedEvent*)calloc(1, sizeof(ToastChangedEvent));
        if (event != NULL) {
          strncpy(event->kind, "removed", sizeof(event->kind) - 1);
          event->notification_id = prev_ids[i];

          EnterCriticalSection(&g_listener_lock);
          if (g_threadsafe_callback != NULL) {
            napi_status s = napi_call_threadsafe_function(g_threadsafe_callback, event, napi_tsfn_nonblocking);
            if (s != napi_ok) {
              free(event);
            }
          } else {
            free(event);
          }
          LeaveCriticalSection(&g_listener_lock);
        }
      }
    }

    /* Swap state */
    free(prev_ids);
    prev_ids = curr_ids;
    prev_count = curr_count;
  }

  free(prev_ids);
  listener->Release();
  return 0;
}

/* --- NAPI bindings: access --- */

static napi_value request_access(napi_env env, napi_callback_info callback_info) {
  ToastListener* listener = NULL;
  AccessStatusOperation* operation = NULL;
  AccessStatus status = (AccessStatus)0;
  HRESULT hr;

  (void)callback_info;
  ensure_initialized();

  hr = get_current_listener(&listener);
  if (FAILED(hr)) {
    throw_error(env, "Failed to get Windows notification listener.");
    return NULL;
  }

  hr = listener->RequestAccessAsync(&operation);
  listener->Release();

  if (FAILED(hr) || operation == NULL) {
    throw_error(env, "Failed to request Windows notification listener access.");
    return NULL;
  }

  hr = wait_for_access_result(operation, &status);
  operation->Release();

  if (FAILED(hr)) {
    throw_error(env, "Failed to read Windows notification listener access result.");
    return NULL;
  }

  return make_string(env, access_status_to_string(status));
}

static napi_value get_access_status(napi_env env, napi_callback_info callback_info) {
  ToastListener* listener = NULL;
  AccessStatus status = (AccessStatus)0;
  HRESULT hr;

  (void)callback_info;
  ensure_initialized();

  hr = get_current_listener(&listener);
  if (FAILED(hr)) {
    throw_error(env, "Failed to get Windows notification listener.");
    return NULL;
  }

  hr = listener->GetAccessStatus(&status);
  listener->Release();

  if (FAILED(hr)) {
    throw_error(env, "Failed to read Windows notification listener access status.");
    return NULL;
  }

  return make_string(env, access_status_to_string(status));
}

/* --- NAPI bindings: notifications --- */

static void set_string_property(napi_env env, napi_value obj, const char* key, HSTRING hs) {
  const char* str = hstring_to_utf8(hs);
  napi_value js_val;
  napi_create_string_utf8(env, str, NAPI_AUTO_LENGTH, &js_val);
  napi_set_named_property(env, obj, key, js_val);
  if (str[0] != '\0') {
    free((void*)str);
  }
  WindowsDeleteString(hs);
}

static void set_app_info_properties(napi_env env, napi_value item, AppInfo* app_info) {
  AppDisplayInfo* display_info = NULL;
  HSTRING app_user_model_id_hs = NULL;
  HRESULT hr;

  app_info->get_AppUserModelId(&app_user_model_id_hs);
  set_string_property(env, item, "appUserModelId", app_user_model_id_hs);

  hr = app_info->get_DisplayInfo(&display_info);
  if (SUCCEEDED(hr) && display_info != NULL) {
    HSTRING display_name_hs = NULL;
    display_info->get_DisplayName(&display_name_hs);
    set_string_property(env, item, "appDisplayName", display_name_hs);
    display_info->Release();
  }
}

static void set_notification_text_properties(napi_env env, napi_value item, napi_value js_texts, NotificationBinding* binding) {
  AdaptiveTextVector* text_items = NULL;
  HRESULT hr;

  hr = binding->GetTextElements(&text_items);
  if (FAILED(hr) || text_items == NULL) {
    return;
  }

  UINT32 text_count = 0;
  text_items->get_Size(&text_count);

  for (UINT32 j = 0; j < text_count; j++) {
    AdaptiveNotificationText* text_item = NULL;
    if (SUCCEEDED(text_items->GetAt(j, &text_item)) && text_item != NULL) {
      HSTRING text_hs = NULL;
      text_item->get_Text(&text_hs);
      const char* text_str = hstring_to_utf8(text_hs);
      napi_value js_text;
      napi_create_string_utf8(env, text_str, NAPI_AUTO_LENGTH, &js_text);
      napi_set_element(env, js_texts, j, js_text);
      if (text_str[0] != '\0') {
        free((void*)text_str);
      }
      WindowsDeleteString(text_hs);
      text_item->Release();
    }
  }

  if (text_count > 0) {
    AdaptiveNotificationText* first_text = NULL;
    if (SUCCEEDED(text_items->GetAt(0, &first_text)) && first_text != NULL) {
      HSTRING title_hs = NULL;
      first_text->get_Text(&title_hs);
      set_string_property(env, item, "title", title_hs);
      first_text->Release();
    }
  }

  if (text_count > 1) {
    AdaptiveNotificationText* second_text = NULL;
    if (SUCCEEDED(text_items->GetAt(1, &second_text)) && second_text != NULL) {
      HSTRING body_hs = NULL;
      second_text->get_Text(&body_hs);
      set_string_property(env, item, "body", body_hs);
      second_text->Release();
    }
  }

  text_items->Release();
}

static void set_notification_content(napi_env env, napi_value item, napi_value js_texts, UserNotification* user_notification) {
  Notification* notification = NULL;
  NotificationVisual* visual = NULL;
  BindingVector* bindings = NULL;
  HRESULT hr;

  hr = user_notification->get_Notification(&notification);
  if (FAILED(hr) || notification == NULL) {
    return;
  }

  hr = notification->get_Visual(&visual);
  if (FAILED(hr) || visual == NULL) {
    notification->Release();
    return;
  }

  hr = visual->get_Bindings(&bindings);
  if (SUCCEEDED(hr) && bindings != NULL) {
    UINT32 binding_count = 0;
    bindings->get_Size(&binding_count);

    if (binding_count > 0) {
      NotificationBinding* first_binding = NULL;
      if (SUCCEEDED(bindings->GetAt(0, &first_binding)) && first_binding != NULL) {
        set_notification_text_properties(env, item, js_texts, first_binding);
        first_binding->Release();
      }
    }

    bindings->Release();
  }

  visual->Release();
  notification->Release();
}

static napi_value build_notification_item(napi_env env, UserNotification* user_notification, UINT32 index) {
  AppInfo* app_info = NULL;
  napi_value item;
  napi_value js_id, js_app_user_model_id, js_app_display_name;
  napi_value js_title, js_body, js_texts, js_created_at;
  UINT32 notification_id = 0;

  napi_create_object(env, &item);

  napi_create_string_utf8(env, "", NAPI_AUTO_LENGTH, &js_app_user_model_id);
  napi_create_string_utf8(env, "", NAPI_AUTO_LENGTH, &js_app_display_name);
  napi_create_string_utf8(env, "", NAPI_AUTO_LENGTH, &js_title);
  napi_create_string_utf8(env, "", NAPI_AUTO_LENGTH, &js_body);
  napi_create_array_with_length(env, 0, &js_texts);
  napi_set_named_property(env, item, "appUserModelId", js_app_user_model_id);
  napi_set_named_property(env, item, "appDisplayName", js_app_display_name);
  napi_set_named_property(env, item, "title", js_title);
  napi_set_named_property(env, item, "body", js_body);
  napi_set_named_property(env, item, "texts", js_texts);

  user_notification->get_Id(&notification_id);
  napi_create_uint32(env, notification_id, &js_id);
  napi_set_named_property(env, item, "id", js_id);

  HRESULT hr = user_notification->get_AppInfo(&app_info);
  if (SUCCEEDED(hr) && app_info != NULL) {
    set_app_info_properties(env, item, app_info);
    app_info->Release();
  }

  set_notification_content(env, item, js_texts, user_notification);

  ABI::Windows::Foundation::DateTime creation_time;
  memset(&creation_time, 0, sizeof(creation_time));
  user_notification->get_CreationTime(&creation_time);
  napi_create_int64(env, creation_time.UniversalTime, &js_created_at);
  napi_set_named_property(env, item, "createdAt", js_created_at);

  (void)index;
  return item;
}

static napi_value get_notifications(napi_env env, napi_callback_info callback_info) {
  ToastListener* listener = NULL;
  NotificationVectorOperation* vector_operation = NULL;
  NotificationVector* notifications = NULL;
  napi_value result;
  HRESULT hr;
  UINT32 count = 0;

  (void)callback_info;
  ensure_initialized();

  hr = get_current_listener(&listener);
  if (FAILED(hr)) {
    throw_error(env, "Failed to get Windows notification listener.");
    return NULL;
  }

  hr = listener->GetNotificationsAsync((NotificationKinds)1, &vector_operation);
  listener->Release();

  if (FAILED(hr) || vector_operation == NULL) {
    throw_error(env, "Failed to get Windows notifications.");
    return NULL;
  }

  hr = wait_for_notification_vector_result(vector_operation, &notifications);
  vector_operation->Release();

  if (FAILED(hr) || notifications == NULL) {
    napi_create_array_with_length(env, 0, &result);
    return result;
  }

  notifications->get_Size(&count);

  /* When suppression is active, hide all notifications from the caller */
  EnterCriticalSection(&g_listener_lock);
  bool suppressing = g_suppression_enabled;
  LeaveCriticalSection(&g_listener_lock);

  if (suppressing) {
    notifications->Release();
    napi_create_array_with_length(env, 0, &result);
    return result;
  }

  napi_create_array_with_length(env, count, &result);

  for (UINT32 i = 0; i < count; i++) {
    UserNotification* user_notification = NULL;

    if (FAILED(notifications->GetAt(i, &user_notification)) || user_notification == NULL) {
      continue;
    }

    napi_value item = build_notification_item(env, user_notification, i);
    user_notification->Release();
    napi_set_element(env, result, i, item);
  }

  notifications->Release();
  return result;
}

/* --- NAPI bindings: listener control --- */

static napi_value start_listening(napi_env env, napi_callback_info callback_info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_valuetype callback_type;
  napi_value resource_name;
  napi_status napi_result;

  ensure_initialized();

  napi_get_cb_info(env, callback_info, &argc, argv, NULL, NULL);
  if (argc < 1) {
    throw_error(env, "startListening requires a callback.");
    return NULL;
  }

  napi_typeof(env, argv[0], &callback_type);
  if (callback_type != napi_function) {
    throw_error(env, "startListening callback must be a function.");
    return NULL;
  }

  EnterCriticalSection(&g_listener_lock);

  if (g_is_listening) {
    LeaveCriticalSection(&g_listener_lock);
    return make_boolean(env, false);
  }

  napi_create_string_utf8(env, "eisland-windows-toast-listener", NAPI_AUTO_LENGTH, &resource_name);
  napi_result = napi_create_threadsafe_function(
    env,
    argv[0],
    NULL,
    resource_name,
    0,
    1,
    NULL,
    NULL,
    NULL,
    call_js_changed_callback,
    &g_threadsafe_callback
  );

  if (napi_result != napi_ok) {
    LeaveCriticalSection(&g_listener_lock);
    throw_error(env, "Failed to create notification listener callback bridge.");
    return NULL;
  }

  g_poll_stop_event = CreateEvent(NULL, TRUE, FALSE, NULL);
  if (g_poll_stop_event == NULL) {
    napi_release_threadsafe_function(g_threadsafe_callback, napi_tsfn_abort);
    g_threadsafe_callback = NULL;
    LeaveCriticalSection(&g_listener_lock);
    throw_error(env, "Failed to create poll stop event.");
    return NULL;
  }

  g_poll_thread = CreateThread(NULL, 0, poll_thread_proc, NULL, 0, NULL);
  if (g_poll_thread == NULL) {
    CloseHandle(g_poll_stop_event);
    g_poll_stop_event = NULL;
    napi_release_threadsafe_function(g_threadsafe_callback, napi_tsfn_abort);
    g_threadsafe_callback = NULL;
    LeaveCriticalSection(&g_listener_lock);
    throw_error(env, "Failed to start notification listener thread.");
    return NULL;
  }

  g_is_listening = true;
  LeaveCriticalSection(&g_listener_lock);

  return make_boolean(env, true);
}

/* --- NAPI bindings: suppression --- */

static napi_value enable_suppression(napi_env env, napi_callback_info callback_info) {
  (void)callback_info;
  ensure_initialized();

  EnterCriticalSection(&g_listener_lock);
  g_suppression_enabled = true;
  LeaveCriticalSection(&g_listener_lock);

  return make_boolean(env, true);
}

static napi_value disable_suppression(napi_env env, napi_callback_info callback_info) {
  (void)callback_info;
  ensure_initialized();

  EnterCriticalSection(&g_listener_lock);
  g_suppression_enabled = false;
  LeaveCriticalSection(&g_listener_lock);

  return make_boolean(env, true);
}

static napi_value is_suppression_enabled(napi_env env, napi_callback_info callback_info) {
  bool enabled;

  (void)callback_info;
  ensure_initialized();

  EnterCriticalSection(&g_listener_lock);
  enabled = g_suppression_enabled;
  LeaveCriticalSection(&g_listener_lock);

  return make_boolean(env, enabled);
}

static napi_value stop_listening(napi_env env, napi_callback_info callback_info) {
  bool stopped = false;

  (void)callback_info;
  ensure_initialized();

  EnterCriticalSection(&g_listener_lock);

  if (g_is_listening) {
    if (g_poll_stop_event != NULL) {
      SetEvent(g_poll_stop_event);
    }

    LeaveCriticalSection(&g_listener_lock);

    if (g_poll_thread != NULL) {
      WaitForSingleObject(g_poll_thread, 5000);
      CloseHandle(g_poll_thread);
      g_poll_thread = NULL;
    }

    if (g_poll_stop_event != NULL) {
      CloseHandle(g_poll_stop_event);
      g_poll_stop_event = NULL;
    }

    EnterCriticalSection(&g_listener_lock);

    if (g_threadsafe_callback != NULL) {
      napi_release_threadsafe_function(g_threadsafe_callback, napi_tsfn_abort);
      g_threadsafe_callback = NULL;
    }

    g_is_listening = false;
    stopped = true;
  }

  LeaveCriticalSection(&g_listener_lock);
  return make_boolean(env, stopped);
}

static napi_value is_listening(napi_env env, napi_callback_info callback_info) {
  bool listening;

  (void)callback_info;
  ensure_initialized();

  EnterCriticalSection(&g_listener_lock);
  listening = g_is_listening;
  LeaveCriticalSection(&g_listener_lock);

  return make_boolean(env, listening);
}

/* --- Module lifecycle --- */

static void finalize_module(void* data) {
  (void)data;

  EnterCriticalSection(&g_listener_lock);

  if (g_is_listening) {
    if (g_poll_stop_event != NULL) {
      SetEvent(g_poll_stop_event);
    }

    LeaveCriticalSection(&g_listener_lock);

    if (g_poll_thread != NULL) {
      WaitForSingleObject(g_poll_thread, 5000);
      CloseHandle(g_poll_thread);
      g_poll_thread = NULL;
    }

    if (g_poll_stop_event != NULL) {
      CloseHandle(g_poll_stop_event);
      g_poll_stop_event = NULL;
    }

    EnterCriticalSection(&g_listener_lock);

    if (g_threadsafe_callback != NULL) {
      napi_release_threadsafe_function(g_threadsafe_callback, napi_tsfn_abort);
      g_threadsafe_callback = NULL;
    }

    g_is_listening = false;
  }

  LeaveCriticalSection(&g_listener_lock);
}

static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    { "requestAccess", NULL, request_access, NULL, NULL, NULL, napi_default, NULL },
    { "getAccessStatus", NULL, get_access_status, NULL, NULL, NULL, napi_default, NULL },
    { "getNotifications", NULL, get_notifications, NULL, NULL, NULL, napi_default, NULL },
    { "startListening", NULL, start_listening, NULL, NULL, NULL, napi_default, NULL },
    { "stopListening", NULL, stop_listening, NULL, NULL, NULL, napi_default, NULL },
    { "isListening", NULL, is_listening, NULL, NULL, NULL, napi_default, NULL },
    { "enableSuppression", NULL, enable_suppression, NULL, NULL, NULL, napi_default, NULL },
    { "disableSuppression", NULL, disable_suppression, NULL, NULL, NULL, napi_default, NULL },
    { "isSuppressionEnabled", NULL, is_suppression_enabled, NULL, NULL, NULL, napi_default, NULL }
  };

  ensure_initialized();
  napi_define_properties(env, exports, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
  napi_add_env_cleanup_hook(env, finalize_module, NULL);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
