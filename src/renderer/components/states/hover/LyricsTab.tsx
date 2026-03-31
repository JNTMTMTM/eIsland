/**
 * @file LyricsTab.tsx
 * @description 歌词 Tab 内容组件
 * @author 鸡哥
 */

import React from 'react';

/**
 * 歌词 Tab 内容
 * @description 显示当前播放歌词（待接入）
 */
export function LyricsTab(): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 text-right">
      <span className="text-sm text-white font-medium">
        歌词
      </span>
      <span className="text-xs text-white opacity-60">
        待接入
      </span>
    </div>
  );
}
