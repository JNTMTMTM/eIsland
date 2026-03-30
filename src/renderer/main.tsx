/**
 * @file main.tsx
 * @description React 19 渲染进程入口，挂载根组件并初始化全局样式
 * @author 鸡哥
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import DynamicIsland from './components/DynamicIsland';

const root = document.getElementById('root');
if (!root) {
  throw new Error('[Renderer] 未找到 #root 挂载节点');
}

createRoot(root).render(
  <StrictMode>
    <DynamicIsland />
  </StrictMode>
);
