/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file index.js
 * @description eisland-macos-media-helper 的公共查询、控制和监控接口。
 * @author 鸡哥
 */
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
const { MediaClient, getDefaultClient, shutdown } = require('./client');
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
const { MediaMonitor } = require('./media-monitor');

/**
 * 读取当前媒体状态缓存。
 * @returns 默认客户端的缓存状态，调用 refresh 或启动监控后才有数据。
 */
function getStatus() { return getDefaultClient().getStatus(); }

/**
 * 读取轻量播放时间戳。
 * @returns 默认客户端的轻量时间戳。
 */
function getTimestamp() { return getDefaultClient().getTimestamp(); }

/**
 * 读取当前可观测播放源。
 * @returns 当前可观测播放源列表。
 */
function getMediaSessions() { return getDefaultClient().getMediaSessions(); }

/**
 * 主动查询并刷新媒体缓存。
 * @returns 主动刷新后的媒体状态。
 */
async function refresh() { return getDefaultClient().refresh(); }

/**
 * 发送播放命令。
 * @returns 播放命令发送结果。
 */
async function play() { return getDefaultClient().play(); }

/**
 * 发送暂停命令。
 * @returns 暂停命令发送结果。
 */
async function pause() { return getDefaultClient().pause(); }

/**
 * 发送下一首命令。
 * @returns 下一首命令发送结果。
 */
async function next() { return getDefaultClient().next(); }

/**
 * 发送上一首命令。
 * @returns 上一首命令发送结果。
 */
async function previous() { return getDefaultClient().previous(); }

/**
 * 发送停止命令。
 * @returns 停止命令发送结果。
 */
async function stop() { return getDefaultClient().stop(); }

/**
 * 定位到指定播放位置。
 * @param positionSeconds - 目标位置，单位为秒。
 * @returns 命令发送结果。
 */
async function seek(positionSeconds) { return getDefaultClient().seek(positionSeconds); }

/**
 * 设置随机播放模式。
 * @param active - true 开启曲目随机，false 关闭。
 * @returns 命令发送结果。
 */
async function setShuffle(active) { return getDefaultClient().setShuffle(active); }

/**
 * 设置循环播放模式。
 * @param mode - 0 关闭，1 单曲，2 列表。
 * @returns 命令发送结果。
 */
async function setRepeatMode(mode) { return getDefaultClient().setRepeatMode(mode); }

/**
 * 设置播放速率。
 * @param rate - 正整数播放速度。
 * @returns 命令发送结果。
 */
async function setPlaybackRate(rate) { return getDefaultClient().setPlaybackRate(rate); }

module.exports = {
  MediaClient, MediaMonitor,
  getStatus, getTimestamp, getMediaSessions, refresh,
  play, pause, next, previous, stop, seek, setShuffle, setRepeatMode, setPlaybackRate, shutdown,
  SmtcMonitor: MediaMonitor,
};
