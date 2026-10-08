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

#include "toast_listener_helpers.h"

#include <cstdlib>
#include <cstring>
#include <cwchar>

napi_value make_boolean(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

napi_value make_string(napi_env env, const char* value) {
  napi_value result;
  napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &result);
  return result;
}

void throw_error(napi_env env, const char* message) {
  napi_throw_error(env, NULL, message);
}

const char* access_status_to_string(AccessStatus status) {
  switch (status) {
    case 0:
      return "unspecified";
    case 1:
      return "allowed";
    case 2:
      return "denied";
    default:
      return "unknown";
  }
}

const char* changed_kind_to_string(ToastChangedKind kind) {
  switch (kind) {
    case 0:
      return "added";
    case 1:
      return "removed";
    default:
      return "unknown";
  }
}

const char* hstring_to_utf8(HSTRING hs) {
  UINT32 len = 0;
  const wchar_t* raw = WindowsGetStringRawBuffer(hs, &len);
  if (raw == NULL || len == 0) {
    return "";
  }

  int utf8_len = WideCharToMultiByte(CP_UTF8, 0, raw, (int)len, NULL, 0, NULL, NULL);
  if (utf8_len <= 0) {
    return "";
  }

  char* buf = (char*)malloc((size_t)utf8_len + 1);
  if (buf == NULL) {
    return "";
  }

  WideCharToMultiByte(CP_UTF8, 0, raw, (int)len, buf, utf8_len, NULL, NULL);
  buf[utf8_len] = '\0';
  return buf;
}

static HRESULT wait_for_async_status(IAsyncInfo* async_info, AsyncStatus* out_status) {
  HRESULT hr;
  DWORD waited_ms = 0;

  while (waited_ms < ASYNC_ACCESS_TIMEOUT_MS) {
    hr = async_info->get_Status(out_status);
    if (FAILED(hr)) {
      return hr;
    }

    if (*out_status != Started) {
      return S_OK;
    }

    Sleep(ASYNC_ACCESS_POLL_MS);
    waited_ms += ASYNC_ACCESS_POLL_MS;
  }

  *out_status = Error;
  return HRESULT_FROM_WIN32(WAIT_TIMEOUT);
}

HRESULT wait_for_access_result(AccessStatusOperation* operation, AccessStatus* status) {
  IAsyncInfo* async_info = NULL;
  AsyncStatus async_status = Started;
  HRESULT hr;

  if (operation == NULL || status == NULL) {
    return E_POINTER;
  }

  hr = operation->QueryInterface(__uuidof(IAsyncInfo), (void**)&async_info);
  if (FAILED(hr)) {
    return hr;
  }

  hr = wait_for_async_status(async_info, &async_status);
  async_info->Release();

  if (FAILED(hr)) {
    return hr;
  }

  if (async_status != Completed) {
    return HRESULT_FROM_WIN32(WAIT_TIMEOUT);
  }

  return operation->GetResults(status);
}

HRESULT wait_for_notification_vector_result(NotificationVectorOperation* operation, NotificationVector** result) {
  IAsyncInfo* async_info = NULL;
  AsyncStatus async_status = Started;
  HRESULT hr;

  if (operation == NULL || result == NULL) {
    return E_POINTER;
  }

  *result = NULL;

  hr = operation->QueryInterface(__uuidof(IAsyncInfo), (void**)&async_info);
  if (FAILED(hr)) {
    return hr;
  }

  hr = wait_for_async_status(async_info, &async_status);
  async_info->Release();

  if (FAILED(hr)) {
    return hr;
  }

  if (async_status != Completed) {
    return HRESULT_FROM_WIN32(WAIT_TIMEOUT);
  }

  return operation->GetResults(result);
}

HRESULT get_current_listener(ToastListener** listener) {
  HSTRING class_name = NULL;
  ToastListenerStatics* statics = NULL;
  HRESULT hr;

  if (listener == NULL) {
    return E_POINTER;
  }

  *listener = NULL;
  hr = WindowsCreateString(TOAST_LISTENER_CLASS_NAME, (UINT32)wcslen(TOAST_LISTENER_CLASS_NAME), &class_name);
  if (FAILED(hr)) {
    return hr;
  }

  hr = RoGetActivationFactory(class_name, __uuidof(ToastListenerStatics), (void**)&statics);
  WindowsDeleteString(class_name);

  if (FAILED(hr)) {
    return hr;
  }

  hr = statics->get_Current(listener);
  statics->Release();
  return hr;
}
