/**
 * @file ExpandedContent.tsx
 * @description Expanded 状态内容组件
 * @author 鸡哥
 */

import React from 'react';

/**
 * Expanded 状态内容组件
 * @description 扩展状态下的完整功能面板
 * @returns Expanded 状态下的 UI 元素
 */
export function ExpandedContent(): React.ReactElement {
  return (
    <div className="expanded-content">
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-sm text-white">Expanded Mode</span>
      </div>
    </div>
  );
}
