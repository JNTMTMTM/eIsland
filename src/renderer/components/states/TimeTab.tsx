/**
 * @file TimeTab.tsx
 * @description 时间 Tab 内容组件
 * @author 鸡哥
 */

import React from 'react';

interface TimeTabProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/**
 * 时间 Tab 内容
 * @description 显示当前时间和农历日期
 */
export function TimeTab({ fullTimeStr, lunarStr }: TimeTabProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 text-right">
      <span className="text-sm text-white font-medium tabular-nums">
        {fullTimeStr}
      </span>
      <span className="text-xs text-white opacity-60">
        农历 {lunarStr}
      </span>
    </div>
  );
}
