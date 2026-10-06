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
 * @file aiSettingsInteractions.test.ts
 * @description AI 设置实际模型请求、头像文件回调、等待状态和 Orb 预览边界回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { AiSettingsSection } from '../AiSettingsSection';
import { renderWithHooks, resetLifecycle } from '../../../hooks/test/settingsCoverageHarness';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
const local = vi.hoisted(() => ({
  models: vi.fn<(base?: string) => Promise<string[]>>(),
  detect: vi.fn<() => Promise<string | null>>()
}));
vi.mock('../../../../../../../../api/ai/ollamaLocalAgent', () => ({
  getOllamaModels: local.models,
  detectOllamaBaseUrl: local.detect
}));
vi.mock('../../../../../../../components/DynamicIslandAgentInputBall', () => ({
  LiquidOrbCanvas: () => null
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
type Props = ComponentProps<typeof AiSettingsSection>;
interface ResponseFixture {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}
let props: Props;
const setConfig = vi.fn<(value: Partial<Props['aiConfig']>) => void>();
const fetchModels = vi.fn<(url: string, options: unknown) => Promise<ResponseFixture>>();
const json = vi.fn<() => Promise<unknown>>();
const readFile = vi.fn<(file: File) => void>();
const reading = {
  current: undefined as AvatarReader | undefined
};
/**
 * 叶文件读取边界：实际组件负责创建、注册并处理onload/onerror。
 */
class AvatarReader {
  result: string | ArrayBuffer | null = null;

  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  /**
   * 记录组件创建的叶读取器。
   */
  constructor() {
    reading.current = this;
  }

  /**
   * 记录实际文件参数，由场景控制操作系统读取结果。
   * @param file - 组件传入的图片文件。
   * @returns 无返回值。
   */
  readAsDataURL(file: File): void {
    readFile(file);
  }
}
/**
 * 重新执行真实组件，保留模型和预览状态。
 * @returns 实际组件元素树。
 */
function render() {
  return renderWithHooks(() => AiSettingsSection(props));
}
/**
 * 等待模型读取、JSON解析和状态恢复队列。
 * @returns 已排队异步动作处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 点击实际组件按钮并等待服务回调。
 * @param key - 实际按钮翻译键。
 * @returns 按钮启动的队列处理完毕。
 */
async function click(key: string): Promise<void> {
  invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === key), 'onClick');
  await settle();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  reading.current = undefined;
  props = {
    currentAiSettingsPageLabel: 'General',
    aiSettingsPage: 'general',
    aiConfig: {
      apiKey: ' key ',
      endpoint: 'https://host/v1',
      model: '',
      customApiModel: 'existing',
      workspaces: [],
      r1pxcAvatar: '',
      ollamaModel: 'qwen:8b',
      ollamaBaseUrl: ' http://localhost:11434 ',
      sttOrbEnabled: false,
      orbColorA: '',
      orbColorB: ''
    },
    setAiConfig: setConfig,
    onAddWorkspace: vi.fn(),
    onRemoveWorkspace: vi.fn(),
    SettingsFieldComponent: () => createElement('input'),
    aiSettingsPages: ['general', 'r1pxc', 'ollama', 'orb-style'],
    aiSettingsPageLabels: {},
    setAiSettingsPage: vi.fn(),
    isProUser: true
  };
  setConfig.mockImplementation((value) => {
    props.aiConfig = {
      ...props.aiConfig,
      ...value
    };
  });
  json.mockResolvedValue({
    data: [{
      id: ' model-a '
    }, {
      id: 'existing'
    }, {
      id: ''
    }, {
      id: 42
    }, null]
  });
  fetchModels.mockResolvedValue({
    json,
    ok: true,
    status: 200
  });
  local.models.mockResolvedValue(['qwen:8b', 'llama:8b']);
  local.detect.mockResolvedValue('http://localhost:12345');
  vi.stubGlobal('fetch', fetchModels);
  vi.stubGlobal('FileReader', AvatarReader);
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('远端模型实际请求和选择', () => {
  it.each([{
    endpoint: ' https://host/v1/models/ ',
    url: 'https://host/v1/models'
  }, {
    endpoint: 'https://host/models',
    url: 'https://host/models'
  }, {
    endpoint: 'https://host/v1/chat/completions',
    url: 'https://host/v1/models'
  }, {
    endpoint: 'https://host/chat/completions',
    url: 'https://host/models'
  }, {
    endpoint: 'https://host/v1',
    url: 'https://host/v1/models'
  }, {
    endpoint: 'https://host',
    url: 'https://host/v1/models'
  }, {
    endpoint: '///',
    url: ''
  }])('$endpoint请求模型URL=$url并筛选有效名称', async ({
    endpoint,
    url
  }) => {
    props.aiConfig.endpoint = endpoint;
    await click('settings.ai.agentModelFetchBtn');
    expect(fetchModels).toHaveBeenCalledWith(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer key'
      }
    });
    expect(textContent(render())).toContain('settings.ai.agentModelFetchOk');
    const select = findElement(render(), (node) => node.type === 'select');
    expect(elementProps(select).value).toBe('existing');
    expect(elements(select).filter((node) => node.type === 'option').map((node) => elementProps(node).value)).toEqual(['', 'model-a', 'existing']);
    invoke(select, 'onChange', {
      target: {
        value: ''
      }
    });
    expect(setConfig).not.toHaveBeenCalled();
    invoke(select, 'onChange', {
      target: {
        value: 'model-a'
      }
    });
    expect(setConfig).toHaveBeenCalledWith({
      customApiModel: 'model-a'
    });
  });
  it.each([' ', undefined])('无Endpoint%o不发HTTP请求', async (endpoint) => {
    props.aiConfig.endpoint = endpoint as unknown as string;
    await click('settings.ai.agentModelFetchBtn');
    expect(fetchModels).not.toHaveBeenCalled();
    expect(textContent(render())).toContain('settings.ai.agentModelFetchNeedEndpoint');
  });
  it.each([null, {}, {
    data: 42
  }, {
    data: []
  }])('模型载荷%o回退空列表', async (payload) => {
    json.mockResolvedValue(payload);
    props.aiConfig.apiKey = '';
    await click('settings.ai.agentModelFetchBtn');
    expect(fetchModels).toHaveBeenCalledWith('https://host/v1/models', {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    expect(textContent(render())).toContain('settings.ai.agentModelFetchEmpty');
    expect(elements(render()).some((node) => node.type === 'select')).toBe(false);
  });
  it.each(['http', 'json', 'network'])('模型%s失败清空旧列表并恢复按钮', async (failure) => {
    await click('settings.ai.agentModelFetchBtn');
    if (failure === 'http') {
      fetchModels.mockResolvedValue({
        json,
        ok: false,
        status: 500
      });
    }
    if (failure === 'json') json.mockRejectedValue(new Error('parse'));
    if (failure === 'network') fetchModels.mockRejectedValue(new Error('network'));
    await click('settings.ai.agentModelFetchBtn');
    expect(textContent(render())).toContain('settings.ai.agentModelFetchFail');
    expect(elements(render()).some((node) => node.type === 'select')).toBe(false);
  });
  it('获取中显示busy，选中不在模型列表的值回退placeholder', async () => {
    let resolve: (value: ResponseFixture) => void = () => undefined;
    fetchModels.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.ai.agentModelFetchBtn'), 'onClick');
    expect(elementProps(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.ai.agentModelFetching')).disabled).toBe(true);
    resolve({
      json,
      ok: true,
      status: 200
    });
    await settle();
    props.aiConfig.customApiModel = 'missing';
    expect(elementProps(findElement(render(), (node) => node.type === 'select')).value).toBe('');
  });
  it('凭据字段和多个工作区动作传递实际参数', () => {
    props.aiConfig.workspaces = ['one', 'two'];
    ['apiKey', 'apiEndpoint', 'agentModel'].forEach((label) => {
      invoke(findElement(render(), (node) => elementProps(node).label === `settings.ai.${label}`), 'onChange', 'changed');
    });
    expect(setConfig).toHaveBeenCalledWith({
      apiKey: 'changed'
    });
    expect(setConfig).toHaveBeenCalledWith({
      endpoint: 'changed'
    });
    expect(setConfig).toHaveBeenCalledWith({
      customApiModel: 'changed'
    });
    const removes = elements(render()).filter((node) => elementProps(node)['aria-label'] === 'settings.ai.workspaceRemove');
    invoke(removes[1], 'onClick');
    expect(props.onRemoveWorkspace).toHaveBeenCalledWith(1);
  });
});
describe('本地Ollama实际服务动作', () => {
  it.each(['success', 'empty', 'failed'])('读取本地模型%s并选择芯片', async (mode) => {
    props.aiSettingsPage = 'ollama';
    props.isProUser = false;
    if (mode === 'empty') local.models.mockResolvedValue([]);
    if (mode === 'failed') local.models.mockRejectedValue(new Error('offline'));
    await click('settings.ai.ollamaFetchBtn');
    expect(local.models).toHaveBeenCalledWith('http://localhost:11434');
    if (mode === 'success') {
      expect(textContent(render())).toContain('settings.ai.ollamaFetchOk');
      const chips = elements(render()).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-ollama-model-chip'));
      expect(String(elementProps(chips[0]).className)).toContain('active');
      expect(String(elementProps(chips[1]).className)).not.toContain('active');
      invoke(chips[1], 'onClick');
      expect(setConfig).toHaveBeenCalledWith({
        ollamaModel: 'llama:8b'
      });
    } else expect(textContent(render())).toContain(mode === 'empty' ? 'settings.ai.ollamaFetchEmpty' : 'settings.ai.ollamaFetchFail');
  });
  it('空服务地址使用默认，模型读取等待期间禁用按钮', async () => {
    props.aiSettingsPage = 'ollama';
    props.aiConfig.ollamaBaseUrl = '';
    let resolve: (value: string[]) => void = () => undefined;
    local.models.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.ai.ollamaFetchBtn'), 'onClick');
    expect(local.models).toHaveBeenCalledWith(undefined);
    expect(elementProps(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.ai.ollamaFetching')).disabled).toBe(true);
    resolve([]);
    await settle();
    expect(textContent(render())).toContain('settings.ai.ollamaFetchEmpty');
  });
  it.each([true, false])('检测到服务=%s后恢复按钮并给出结果', async (found) => {
    props.aiSettingsPage = 'ollama';
    local.detect.mockResolvedValue(found ? 'http://localhost:12345' : null);
    await click('settings.ai.ollamaDetectBtn');
    expect(textContent(render())).toContain(found ? 'settings.ai.ollamaDetectOk' : 'settings.ai.ollamaDetectFail');
    expect(setConfig).toHaveBeenCalledTimes(found ? 1 : 0);
  });
  it('检测等待期间禁用按钮，服务地址字段写入配置', async () => {
    props.aiSettingsPage = 'ollama';
    let resolve: (value: string | null) => void = () => undefined;
    local.detect.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.ai.ollamaDetectBtn'), 'onClick');
    expect(elementProps(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.ai.ollamaDetecting')).disabled).toBe(true);
    invoke(findElement(render(), (node) => elementProps(node).label === 'settings.ai.ollamaBaseUrl'), 'onChange', 'http://localhost:12345');
    expect(setConfig).toHaveBeenCalledWith({
      ollamaBaseUrl: 'http://localhost:12345'
    });
    resolve(null);
    await settle();
  });
});
describe('头像实际文件和拖放事件', () => {
  it.each([null, undefined, []])('未选择文件%o不启动读取并清空输入', (files) => {
    props.aiSettingsPage = 'r1pxc';
    const currentTarget = {
      value: 'chosen'
    };
    invoke(findElement(render(), (node) => node.type === 'input'), 'onChange', {
      currentTarget,
      target: {
        files
      }
    });
    expect(currentTarget.value).toBe('');
    expect(readFile).not.toHaveBeenCalled();
  });
  it('无效文件类型显示错误，拖放无文件只阻止浏览器默认行为', () => {
    props.aiSettingsPage = 'r1pxc';
    const file = new File(['text'], 'file.txt', {
      type: 'text/plain'
    });
    invoke(findElement(render(), (node) => node.type === 'input'), 'onChange', {
      target: {
        files: [file]
      },
      currentTarget: {
        value: 'chosen'
      }
    });
    expect(textContent(render())).toContain('settings.ai.r1pxcAvatarFileTypeError');
    expect(readFile).not.toHaveBeenCalled();
    const preventDefault = vi.fn();
    const drop = findElement(render(), (node) => elementProps(node).className === 'settings-r1pxc-avatar-dropzone');
    invoke(drop, 'onDragOver', {
      preventDefault
    });
    invoke(drop, 'onDrop', {
      preventDefault,
      dataTransfer: {
        files: null
      }
    });
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });
  it.each(['data:image/png;base64,content', 'not-image', null, new ArrayBuffer(1)])('实际读取结果%o仅接受图片DataURL', (result) => {
    props.aiSettingsPage = 'r1pxc';
    const file = new File(['content'], 'avatar.png', {
      type: 'image/png'
    });
    invoke(findElement(render(), (node) => elementProps(node).className === 'settings-r1pxc-avatar-dropzone'), 'onDrop', {
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [file]
      }
    });
    expect(readFile).toHaveBeenCalledWith(file);
    if (reading.current) reading.current.result = result;
    reading.current?.onload?.();
    if (typeof result === 'string' && result.startsWith('data:image/')) {
      expect(setConfig).toHaveBeenCalledWith({
        r1pxcAvatar: result
      });
      expect(textContent(render())).toContain('settings.ai.r1pxcAvatarReplace');
    } else {
      expect(setConfig).not.toHaveBeenCalled();
      expect(textContent(render())).toContain('settings.ai.r1pxcAvatarReadError');
    }
  });
  it('读取错误提示后清除头像同时清除错误', async () => {
    props.aiSettingsPage = 'r1pxc';
    props.aiConfig.r1pxcAvatar = 'data:image/png;base64,old';
    invoke(findElement(render(), (node) => node.type === 'input'), 'onChange', {
      target: {
        files: [new File(['x'], 'avatar.png', {
          type: 'image/png'
        })]
      },
      currentTarget: {
        value: ''
      }
    });
    reading.current?.onerror?.();
    expect(textContent(render())).toContain('settings.ai.r1pxcAvatarReadError');
    await click('settings.ai.r1pxcAvatarClear');
    expect(props.aiConfig.r1pxcAvatar).toBe('');
    expect(textContent(render())).not.toContain('settings.ai.r1pxcAvatarReadError');
  });
  it.each([true, false])('点击与Enter/空格选择文件，input ref存在=%s', (exists) => {
    props.aiSettingsPage = 'r1pxc';
    const select = vi.fn();
    const input = findElement(render(), (node) => node.type === 'input');
    const ref = elementProps(input).ref as {
      current: HTMLInputElement | null;
    };
    ref.current = exists ? {
      click: select
    } as unknown as HTMLInputElement : null;
    const drop = findElement(render(), (node) => elementProps(node).className === 'settings-r1pxc-avatar-dropzone');
    invoke(drop, 'onClick');
    ['Enter', ' ', 'Escape'].forEach((key) => {
      const preventDefault = vi.fn();
      invoke(drop, 'onKeyDown', {
        key,
        preventDefault
      });
      expect(preventDefault).toHaveBeenCalledTimes(key === 'Escape' ? 0 : 1);
    });
    expect(select).toHaveBeenCalledTimes(exists ? 3 : 0);
  });
});
describe('Orb样式与公开页名边界', () => {
  it.each(['onReady', 'onError'])('预览%s后移除加载提示', (callback) => {
    props.aiSettingsPage = 'orb-style';
    expect(textContent(render())).toContain('settings.ai.orbColorTitle');
    expect(elements(render()).some((node) => elementProps(node).className === 'settings-orb-preview-loading')).toBe(true);
    invoke(findElement(render(), (node) => 'uniformOverrides' in elementProps(node)), callback);
    expect(elements(render()).some((node) => elementProps(node).className === 'settings-orb-preview-loading')).toBe(false);
  });
  it('两种颜色输入和重置分别写入对应配置，空颜色使用默认', () => {
    props.aiSettingsPage = 'orb-style';
    const colors = elements(render()).filter((node) => node.type === 'input' && elementProps(node).type === 'color');
    expect(colors.map((node) => elementProps(node).value)).toEqual(['#d86bff', '#f4ff69']);
    elements(render()).filter((node) => node.type === 'input' && ['text', 'color'].includes(String(elementProps(node).type))).forEach((node) => {
      invoke(node, 'onChange', {
        target: {
          value: '#112233'
        }
      });
    });
    expect(props.aiConfig.orbColorA).toBe('#112233');
    expect(props.aiConfig.orbColorB).toBe('#112233');
    const resets = elements(render()).filter((node) => node.type === 'button' && elementProps(node).title === 'settings.ai.orbColorReset');
    resets.forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(props.aiConfig.orbColorA).toBe('');
    expect(props.aiConfig.orbColorB).toBe('');
  });
  it('损坏公开页名不渲染设置内容，导航开关仍可展开收起', () => {
    props.aiSettingsPage = 'unknown' as Props['aiSettingsPage'];
    expect(elements(render()).some((node) => elementProps(node).className === 'settings-cards')).toBe(false);
    invoke(findElement(render(), (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(render(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(true);
    invoke(findElement(render(), (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(render(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(false);
  });
});
