/**
 * @file SvgIcon.ts
 * @description 全局 SVG 图标路径枚举
 * @author 鸡哥
 */

export const SvgIcon = {
  /** 播放 */
  CONTINUE: './svg/CONTINUE.svg',
  /** 暂停 */
  PAUSE: './svg/PAUSE.svg',
  /** 上一曲 */
  PREVIOUS_SONG: './svg/PREVIOUS_SONG.svg',
  /** 下一曲 */
  NEXT_SONG: './svg/NEXT_SONG.svg',
  /** 隐藏 */
  HIDE: './svg/HIDE.svg',
  /** 退出 */
  POWER_OFF: './svg/POWER_OFF.svg',
  /** 计时器 */
  TIMER: './svg/TIMER.svg',
  /** 重置 */
  REVERT: './svg/REVERT.svg',
  /** 截图 */
  SCREENSHOT: './svg/SCREENSHOT.svg',
  /** 任务管理器 */
  TASK_MANAGER: './svg/TASK_MANAGER.svg',
} as const;

export type SvgIconKey = keyof typeof SvgIcon;
