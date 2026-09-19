/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarConfig.ts
 * @description 日历布局、月份缓冲范围及滚动阻尼和吸附参数。
 * @author 鸡哥
 */

/** 每周日期行的固定高度，供渲染与滚动定位共用，单位为像素。 */
export const CALENDAR_WEEK_HEIGHT = 56;
/** 固定月份标题高度，不计入滚动内容，单位为像素。 */
export const CALENDAR_MONTH_HEADER_HEIGHT = 48;
/** 相邻月份之间的留白，单位为像素。 */
export const CALENDAR_MONTH_GAP = 40;
/** 月初分隔线内的月份缩写高度，吸附时保留可见，单位为像素。 */
export const CALENDAR_MONTH_LABEL_HEIGHT = 24;
/** 每次向前或向后扩展的月份数量。 */
export const BUFFER_MONTHS = 12;

/** 滚轮原始位移的缩放系数。 */
export const WHEEL_SCALE = .55;
/** 指数缓动的衰减时间常数，单位为毫秒。 */
export const DAMPING_TIME_MS = 70;
/** 缓动停止时允许的剩余位移，单位为像素。 */
export const STOP_DISTANCE = .25;
/** 月初吸附的最大作用距离，单位为像素。 */
export const SNAP_DISTANCE = 72;
