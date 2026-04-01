/**
 * @file musicUtils.ts
 * @description 音乐相关工具函数
 * @author 鸡哥
 */

/**
 * 将毫秒转换为 MM:SS 格式的时间字符串
 * @param ms 毫秒
 * @returns 格式化的时间字符串，如 "3:45"
 */
export function formatMusicTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 计算进度百分比
 * @param position_ms 当前播放位置（毫秒）
 * @param duration_ms 总时长（毫秒）
 * @returns 0-100 的百分比数值
 */
export function calculateProgressPercent(position_ms: number, duration_ms: number): number {
  if (!duration_ms || duration_ms <= 0) return 0;
  return Math.min(100, Math.max(0, (position_ms / duration_ms) * 100));
}

/**
 * 从鼠标事件计算滑块百分比
 * @param e 鼠标事件
 * @param rect 滑块边界矩形
 * @returns 0-1 的小数
 */
export function calculateSliderPercentFromMouse(
  e: MouseEvent,
  rect: DOMRect
): number {
  const percent = (e.clientX - rect.left) / rect.width;
  return Math.min(1, Math.max(0, percent));
}

/**
 * 根据百分比计算播放位置（毫秒）
 * @param percent 百分比 (0-1)
 * @param duration_ms 总时长（毫秒）
 * @returns 播放位置（毫秒）
 */
export function calculatePositionFromPercent(percent: number, duration_ms: number): number {
  return Math.round(percent * duration_ms);
}

/**
 * 截断文本并添加省略号
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 1)}…`;
}

/**
 * 判断歌词是否为空（用于 placeholder 显示）
 * @param text 歌词文本
 * @returns 是否为空
 */
export function isLyricEmpty(text: string | null): boolean {
  return !text || text.trim() === '' || text === '♪';
}
