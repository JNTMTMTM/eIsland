/**
 * @file HoverContent.tsx
 * @description Hover 状态内容组件
 * @author 鸡哥
 */

import React from 'react';

interface HoverContentProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/**
 * Hover 状态内容组件
 * @description 显示完整时间和农历日期，靠右对齐
 */
export function HoverContent({ fullTimeStr, lunarStr }: HoverContentProps): React.ReactElement {
  return (
    <div className="hover-content">
      <div className="flex flex-col gap-1 text-right">
        {/* 第一行：时间 */}
        <span className="text-sm text-white font-medium tabular-nums">
          {fullTimeStr}
        </span>
        {/* 第二行：农历日期 */}
        <span className="text-xs text-white opacity-60">
          农历 {lunarStr}
        </span>
      </div>
    </div>
  );
}
