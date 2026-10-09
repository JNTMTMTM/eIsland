/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file bridge.h
 * @description Swift 媒体缓存与 Node-API 之间的 C ABI，返回字符串由调用方释放。
 * @author 鸡哥
 */
#ifndef EISLAND_MEDIA_BRIDGE_H
#define EISLAND_MEDIA_BRIDGE_H

#include <stdint.h>

/** 创建独立客户端；资源路径必须为绝对路径。 */
void *media_create(const char *script, const char *framework, double timeout);
/** 保留异步任务引用，防止 Worker 退出期间释放客户端。 */
void media_retain(void *core);
/** 释放客户端引用。 */
void media_release(void *core);
/** 停止监听并取消所有正在运行的请求，关闭后不可重新使用。 */
void media_close(void *core);
/** 启动监听，返回 CommandResult JSON。 */
char *media_start(void *core);
/** 停止监听并清空快照，可再次启动。 */
void media_stop(void *core);
/** 获取缓存 JSON：0=状态，1=时间戳，2=会话列表，3=监听状态。 */
char *media_snapshot(void *core, int32_t kind);
/** 在后台线程刷新缓存或执行命令，返回结果 JSON。 */
char *media_request(void *core, const char *operation, double value);
/** 释放由 Swift 分配的 UTF-8 字符串。 */
void media_free(char *value);

#endif
