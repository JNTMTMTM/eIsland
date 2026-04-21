/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file index.ts
 * @description Hello 插件模板入口
 * @description 演示基础通知与本地计数存储能力
 * @author 鸡哥
 */

interface PluginNotifyPayload {
  title: string;
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
}

interface PluginContext {
  pluginId: string;
  manifest: { name: string };
  mountEl: HTMLElement;
  api: {
    ui: {
      notify(payload: PluginNotifyPayload): Promise<void>;
    };
    storage: {
      get(key: string): Promise<unknown>;
      set(key: string, value: unknown): Promise<boolean>;
    };
  };
}

const PANEL_ID = 'eisland-plugin-maxexpand-sim';
const STYLE_ID = 'eisland-plugin-maxexpand-sim-style';
let mountedHostEl: HTMLElement | null = null;

/**
 * 获取或创建 maxExpand 模拟样式
 * @returns 样式节点
 */
function ensurePanelStyle(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} {
      width: 100%;
      min-height: 240px;
      border: 1px solid rgb(255 255 255 / 24%);
      border-radius: 22px;
      background: linear-gradient(140deg, rgb(19 26 43 / 95%), rgb(29 44 71 / 95%));
      box-shadow: 0 20px 46px rgb(5 8 18 / 46%);
      color: #fff;
      overflow: hidden;
      backdrop-filter: blur(16px);
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }

    #${PANEL_ID} .plugin-maxexpand-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid rgb(255 255 255 / 16%);
    }

    #${PANEL_ID} .plugin-maxexpand-title {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: .2px;
    }

    #${PANEL_ID} .plugin-maxexpand-badge {
      border: 1px solid rgb(134 202 255 / 38%);
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 12px;
      color: #a4d8ff;
    }

    #${PANEL_ID} .plugin-maxexpand-body {
      display: grid;
      gap: 12px;
      padding: 16px 18px;
    }

    #${PANEL_ID} .plugin-maxexpand-card {
      border: 1px solid rgb(255 255 255 / 14%);
      border-radius: 14px;
      background: rgb(255 255 255 / 6%);
      padding: 12px;
      font-size: 13px;
      line-height: 1.5;
      color: rgb(236 243 255 / 90%);
    }

    #${PANEL_ID} .plugin-maxexpand-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 18px 16px;
    }

    #${PANEL_ID} .plugin-maxexpand-btn {
      border: 1px solid rgb(255 255 255 / 22%);
      border-radius: 10px;
      background: rgb(255 255 255 / 7%);
      color: #fff;
      font-size: 13px;
      padding: 6px 12px;
      cursor: pointer;
    }

    #${PANEL_ID} .plugin-maxexpand-btn:hover {
      background: rgb(255 255 255 / 16%);
    }
  `;
  document.head.appendChild(style);
  return style;
}

/**
 * 渲染 maxExpand 模拟界面
 * @param context - 插件运行上下文
 * @param launchCount - 激活次数
 * @returns 面板根节点
 */
function renderPanel(context: PluginContext, launchCount: number): HTMLDivElement {
  const existing = context.mountEl.querySelector(`#${PANEL_ID}`);
  if (existing instanceof HTMLDivElement) {
    existing.remove();
  }

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="plugin-maxexpand-head">
      <div class="plugin-maxexpand-title">${context.manifest.name}</div>
      <div class="plugin-maxexpand-badge">maxExpand 模拟</div>
    </div>
    <div class="plugin-maxexpand-body">
      <div class="plugin-maxexpand-card">
        这是一个插件页面示例，模拟在灵动岛 maxExpand 状态下的内容布局。
      </div>
      <div class="plugin-maxexpand-card">
        当前插件 ID：${context.pluginId}<br>
        本次累计激活：${launchCount} 次
      </div>
    </div>
    <div class="plugin-maxexpand-actions">
      <button class="plugin-maxexpand-btn" type="button" data-action="notify">发送通知</button>
      <button class="plugin-maxexpand-btn" type="button" data-action="close">关闭面板</button>
    </div>
  `;

  panel.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.action;

    if (action === 'notify') {
      await context.api.ui.notify({
        title: 'Hello Plugin',
        message: '这是来自 maxExpand 模拟界面的通知。',
        level: 'info',
      });
      return;
    }

    if (action === 'close') {
      panel.remove();
    }
  });

  context.mountEl.appendChild(panel);
  return panel;
}

/**
 * 清理 maxExpand 模拟界面
 * @returns 无返回值
 */
function destroyPanel(): void {
  if (!mountedHostEl) {
    return;
  }
  const panel = mountedHostEl.querySelector(`#${PANEL_ID}`);
  if (panel) {
    panel.remove();
  }
}

/**
 * 激活 Hello 插件
 * @param context - 插件运行上下文
 * @returns 无返回值
 */
export async function activate(context: PluginContext): Promise<void> {
  mountedHostEl = context.mountEl;
  const countRaw = await context.api.storage.get('launchCount');
  const launchCount = typeof countRaw === 'number' ? countRaw + 1 : 1;
  await context.api.storage.set('launchCount', launchCount);

  ensurePanelStyle();
  renderPanel(context, launchCount);

  await context.api.ui.notify({
    title: 'Hello Plugin',
    message: `Activated: ${context.manifest.name}`,
    level: 'success',
  });
}

/**
 * 停用 Hello 插件
 * @returns 无返回值
 */
export async function deactivate(): Promise<void> {
  destroyPanel();
  mountedHostEl = null;
}
