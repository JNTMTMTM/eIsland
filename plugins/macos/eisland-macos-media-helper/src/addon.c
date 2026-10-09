/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file addon.c
 * @description Node-API 薄封装，缓存查询同步返回，子进程请求在工作线程执行。
 * @author 鸡哥
 */
#include <node_api.h>
#include <stdbool.h>
#include <stdlib.h>
#include <pthread.h>
#include <stdatomic.h>
#include "bridge.h"

typedef struct {
  void *core;
  bool cleaning;
} Client;

typedef struct {
  void *core;
  char *operation;
  double value;
  char *result;
  napi_threadsafe_function callback;
  napi_deferred deferred;
  napi_ref receiver;
  pthread_t thread;
  bool thread_started;
  bool thread_joined;
  bool cleanup_registered;
  atomic_bool cleaning;
} Request;

#define CHECK(call) do { \
  if ((call) != napi_ok) { \
    napi_throw_error(env, NULL, "Node-API media operation failed."); \
    return NULL; \
  } \
} while (0)

/** @returns JS 字符串；无论转换是否成功都释放 Swift 缓冲区。 */
static napi_value json_value(napi_env env, char *json) {
  if (!json) {
    napi_throw_error(env, NULL, "Unable to serialize media response.");
    return NULL;
  }
  napi_value result;
  napi_status status = napi_create_string_utf8(env, json, NAPI_AUTO_LENGTH, &result);
  media_free(json);
  CHECK(status);
  return result;
}

/** Worker 退出时先停止子进程；后台任务拥有各自的 Swift 引用。 */
static void cleanup_client(void *data) {
  Client *client = data;
  client->cleaning = true;
  media_close(client->core);
}

/** 释放 JS 客户端，并移除不再需要的环境清理钩子。 */
static void finalize_client(napi_env env, void *data, void *hint) {
  (void)hint;
  Client *client = data;
  if (!client->cleaning) {
    napi_remove_env_cleanup_hook(env, cleanup_client, client);
    media_close(client->core);
  }
  media_release(client->core);
  free(client);
}

/** @returns 方法接收者的客户端；不允许借用到其他对象。 */
static Client *get_client(napi_env env, napi_callback_info info, size_t *argc, napi_value *argv, napi_value *receiver) {
  if (napi_get_cb_info(env, info, argc, argv, receiver, NULL) != napi_ok) return NULL;
  Client *client = NULL;
  if (napi_unwrap(env, *receiver, (void **)&client) != napi_ok || !client) {
    napi_throw_type_error(env, NULL, "Invalid media client receiver.");
    return NULL;
  }
  return client;
}

/** @returns 启动监听结果 JSON。 */
static napi_value start(napi_env env, napi_callback_info info) {
  size_t argc = 0;
  napi_value receiver;
  Client *client = get_client(env, info, &argc, NULL, &receiver);
  if (!client) return NULL;
  return json_value(env, media_start(client->core));
}

/** 停止监听但不销毁客户端。 */
static napi_value stop(napi_env env, napi_callback_info info) {
  size_t argc = 0;
  napi_value receiver, result;
  Client *client = get_client(env, info, &argc, NULL, &receiver);
  if (!client) return NULL;
  media_stop(client->core);
  CHECK(napi_get_undefined(env, &result));
  return result;
}

/** 关闭客户端，取消监听和后台请求。 */
static napi_value close_client(napi_env env, napi_callback_info info) {
  size_t argc = 0;
  napi_value receiver, result;
  Client *client = get_client(env, info, &argc, NULL, &receiver);
  if (!client) return NULL;
  media_close(client->core);
  CHECK(napi_get_undefined(env, &result));
  return result;
}

/** @returns 指定种类的缓存 JSON，不进行媒体 IPC。 */
static napi_value snapshot(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value receiver, argv[1];
  Client *client = get_client(env, info, &argc, argv, &receiver);
  if (!client) return NULL;
  int32_t kind;
  if (argc != 1 || napi_get_value_int32(env, argv[0], &kind) != napi_ok || kind < 0 || kind > 3) {
    napi_throw_type_error(env, NULL, "Invalid media snapshot kind.");
    return NULL;
  }
  return json_value(env, media_snapshot(client->core, kind));
}

/** @returns 有长度上限的复制字符串，调用方使用 free 释放。 */
static char *copy_string(napi_env env, napi_value value, size_t limit) {
  size_t length;
  if (napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok || length > limit) return NULL;
  char *text = malloc(length + 1);
  if (!text) return NULL;
  if (napi_get_value_string_utf8(env, value, text, length + 1, &length) != napi_ok) {
    free(text);
    return NULL;
  }
  return text;
}

/** 独立线程避免 libuv async_work 在 Worker 终止时阻止清理钩子取消子进程。 */
static void *execute_request(void *data) {
  Request *request = data;
  request->result = media_request(request->core, request->operation, request->value);
  if (!atomic_load(&request->cleaning)) {
    napi_call_threadsafe_function(request->callback, NULL, napi_tsfn_nonblocking);
  }
  napi_release_threadsafe_function(request->callback, napi_tsfn_release);
  return NULL;
}

/** 回到请求所属的 JS 环境完成 Promise；环境关闭时不调用 JS。 */
static void complete_request(napi_env env, napi_value callback, void *context, void *data) {
  (void)callback;
  (void)data;
  Request *request = context;
  if (env) {
    napi_value value;
    if (request->result &&
        napi_create_string_utf8(env, request->result, NAPI_AUTO_LENGTH, &value) == napi_ok) {
      napi_resolve_deferred(env, request->deferred, value);
    } else {
      napi_value message;
      napi_create_string_utf8(env, "Media request was cancelled or failed.", NAPI_AUTO_LENGTH, &message);
      napi_create_error(env, NULL, message, &value);
      napi_reject_deferred(env, request->deferred, value);
    }
  }
}

/** 比 TSFN 清理钩子后注册，因此在环境退出时先取消并等待线程，防止回调句柄提前失效。 */
static void cleanup_request(void *data) {
  Request *request = data;
  atomic_store(&request->cleaning, true);
  media_close(request->core);
  if (request->thread_started && !request->thread_joined) {
    pthread_join(request->thread, NULL);
    request->thread_joined = true;
  }
}

/** 线程引用与回调队列都释放后再销毁任务，覆盖 Worker 强制退出路径。 */
static void finalize_request(napi_env env, void *data, void *hint) {
  (void)hint;
  Request *request = data;
  if (env && request->cleanup_registered && !atomic_load(&request->cleaning)) {
    napi_remove_env_cleanup_hook(env, cleanup_request, request);
  }
  if (request->thread_started && !request->thread_joined) pthread_join(request->thread, NULL);
  if (env) napi_delete_reference(env, request->receiver);
  if (request->result) media_free(request->result);
  media_release(request->core);
  free(request->operation);
  free(request);
}

/** @returns 异步桥接请求 Promise，receiver 引用保护客户端不被提前 GC。 */
static napi_value request(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value receiver, argv[2], promise, name;
  Client *client = get_client(env, info, &argc, argv, &receiver);
  if (!client) return NULL;
  double number;
  if (argc != 2 || napi_get_value_double(env, argv[1], &number) != napi_ok) {
    napi_throw_type_error(env, NULL, "Media request requires an operation and numeric value.");
    return NULL;
  }
  char *operation = copy_string(env, argv[0], 32);
  if (!operation) {
    napi_throw_type_error(env, NULL, "Invalid media operation.");
    return NULL;
  }
  Request *job = calloc(1, sizeof(Request));
  if (!job) {
    free(operation);
    napi_throw_error(env, NULL, "Unable to allocate media request.");
    return NULL;
  }
  job->core = client->core;
  job->operation = operation;
  job->value = number;
  atomic_init(&job->cleaning, false);
  media_retain(job->core);
  napi_status status = napi_create_promise(env, &job->deferred, &promise);
  if (status == napi_ok) status = napi_create_reference(env, receiver, 1, &job->receiver);
  if (status == napi_ok) status = napi_create_string_utf8(env, "eisland.media.request", NAPI_AUTO_LENGTH, &name);
  if (status == napi_ok) status = napi_create_threadsafe_function(env, NULL, NULL, name, 1, 1,
    job, finalize_request, job, complete_request, &job->callback);
  if (status != napi_ok) {
    if (job->receiver) napi_delete_reference(env, job->receiver);
    media_release(job->core);
    free(job->operation);
    free(job);
    napi_throw_error(env, NULL, "Unable to queue media request.");
    return NULL;
  }
  if (napi_add_env_cleanup_hook(env, cleanup_request, job) != napi_ok) {
    napi_release_threadsafe_function(job->callback, napi_tsfn_abort);
    napi_throw_error(env, NULL, "Unable to register media request cleanup.");
    return NULL;
  }
  job->cleanup_registered = true;
  if (pthread_create(&job->thread, NULL, execute_request, job) != 0) {
    napi_release_threadsafe_function(job->callback, napi_tsfn_abort);
    napi_throw_error(env, NULL, "Unable to start media request thread.");
    return NULL;
  }
  job->thread_started = true;
  return promise;
}

/** @returns 独立的 Swift 客户端对象，资源路径由 JS 加载器解析。 */
static napi_value create(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3], result;
  CHECK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  double timeout;
  if (argc != 3 || napi_get_value_double(env, argv[2], &timeout) != napi_ok || !(timeout >= 0.1 && timeout <= 30)) {
    napi_throw_type_error(env, NULL, "Media request timeout must be between 0.1 and 30 seconds.");
    return NULL;
  }
  char *script = copy_string(env, argv[0], 4096);
  char *framework = copy_string(env, argv[1], 4096);
  if (!script || !framework) {
    free(script);
    free(framework);
    napi_throw_type_error(env, NULL, "Invalid media bridge resource paths.");
    return NULL;
  }
  Client *client = calloc(1, sizeof(Client));
  if (!client) {
    free(script);
    free(framework);
    napi_throw_error(env, NULL, "Unable to allocate media client.");
    return NULL;
  }
  client->core = media_create(script, framework, timeout);
  free(script);
  free(framework);
  napi_property_descriptor properties[] = {
    {"start", NULL, start, NULL, NULL, NULL, napi_default, NULL},
    {"stop", NULL, stop, NULL, NULL, NULL, napi_default, NULL},
    {"close", NULL, close_client, NULL, NULL, NULL, napi_default, NULL},
    {"snapshot", NULL, snapshot, NULL, NULL, NULL, napi_default, NULL},
    {"request", NULL, request, NULL, NULL, NULL, napi_default, NULL}
  };
  napi_status status = napi_create_object(env, &result);
  if (status == napi_ok) status = napi_define_properties(env, result, sizeof(properties) / sizeof(properties[0]), properties);
  if (status == napi_ok) status = napi_add_env_cleanup_hook(env, cleanup_client, client);
  if (status != napi_ok) {
    media_release(client->core);
    free(client);
    napi_throw_error(env, NULL, "Unable to create media client.");
    return NULL;
  }
  status = napi_wrap(env, result, client, finalize_client, NULL, NULL);
  if (status != napi_ok) {
    napi_remove_env_cleanup_hook(env, cleanup_client, client);
    media_release(client->core);
    free(client);
    napi_throw_error(env, NULL, "Unable to wrap media client.");
    return NULL;
  }
  return result;
}

/** @returns Node-API 模块导出。 */
static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor property = {"create", NULL, create, NULL, NULL, NULL, napi_default, NULL};
  CHECK(napi_define_properties(env, exports, 1, &property));
  return exports;
}

NAPI_MODULE(eisland_macos_media_helper, init)
