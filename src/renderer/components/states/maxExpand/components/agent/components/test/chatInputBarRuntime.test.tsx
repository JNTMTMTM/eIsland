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
 * @file chatInputBarRuntime.test.tsx
 * @description 对话输入栏真实配置、模型与上下文切换、技能附件原生事件及受控回调契约测试
 * @author 鸡哥
 */
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChatInputBar } from '../ChatInputBar';
import { AGENT_MODES } from '../../config/chatConstants';
import useIslandStore from '../../../../../../../store/slices';

vi.hoisted(() => {
  const storage = { getItem: () => null, setItem: () => undefined };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: storage, location: { hostname: 'localhost' }, api: { storeRead: () => Promise.resolve(null), onSettingsChanged: () => () => undefined } }));
});
vi.mock('react-i18next', async (original) => ({ ...await original<typeof import('react-i18next')>(), useTranslation: () => ({ t: (key: string) => key }) }));
type Props = React.ComponentProps<typeof ChatInputBar>;
type Node = React.ReactElement<Record<string, unknown>>;
let props: Props;
const pick = vi.fn();
const pathForFile = vi.fn();
const nativeClick = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); pick.mockReset(); pathForFile.mockReset();
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('window', { api: { pickSkillFile:pick, getPathForFile:pathForFile } });
  props = {
    input:'',setInput:vi.fn(),isStreaming:false,agentMode:'mihtnelis',currentAgentModeConfig:AGENT_MODES[0],
    selectedModel:'deepseek-v4-flash',isOllamaModel:false,isCustomApiModel:false,modelToggleIcon:null,customApiDisplayLabel:'Custom',ollamaDisplayLabel:'Ollama',
    isProUser:false,hasCustomApiCredentials:false,aiConfig:{ ...useIslandStore.getState().aiConfig,skills:[] },setAiConfig:vi.fn(),
    contextUsageTokens:123,selectedContextLimit:200_000,contextUsagePercent:1,contextUsagePercentText:'1%',contextUsageLevelClass:'low',contextUsageInlineText:'123/200K',selectedContextLabel:'200K',
    showModelCard:false,setShowModelCard:vi.fn(),showModelDropdown:false,setShowModelDropdown:vi.fn(),modelDropdownRef:{ current:null },
    showContextDropdown:false,setShowContextDropdown:vi.fn(),contextDropdownRef:{ current:null },
    showAgentModeDropdown:false,toggleAgentModeDropdown:vi.fn(),setAgentMode:vi.fn(),agentModeDropdownRef:{ current:null },agentModeTriggerRef:{ current:null },agentModeDropdownPos:null,
    showSessionSidebar:false,setShowSessionSidebar:vi.fn(),pendingAttachments:[],setPendingAttachments:vi.fn(),fileInputRef:{ current:{ click:nativeClick } as unknown as HTMLInputElement },
    attachmentDragOver:false,attachmentDropInvalid:false,handleAttachmentDragEnter:vi.fn(),handleAttachmentDragOver:vi.fn(),handleAttachmentDragLeave:vi.fn(),handleAttachmentDropEvent:vi.fn(),handleAttachFiles:vi.fn(),
    skillDragOver:false,setSkillDragOver:vi.fn(),skillDragDepthRef:{ current:0 },pendingQuote:null,setPendingQuote:vi.fn(),handleSend:vi.fn(),handleStop:vi.fn(),handleKeyDown:vi.fn(),inputRef:{ current:null },selectedProvider:'deepseek',
  };
});
afterEach(() => vi.unstubAllGlobals());
/** 遍历真实 JSX 节点。
 * @param node - 公开组件元素
 * @returns 原始节点
 */
function nodes(node: React.ReactNode): Node[] {
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node,...React.Children.toArray(node.props.children as React.ReactNode).flatMap(nodes)];
}
/** 通过公开样式类查找真实节点。
 * @param tree - 元素树
 * @param className - 样式类
 * @returns 匹配节点
 */
function find(tree: React.ReactNode,className:string): Node[] { return nodes(tree).filter((node) => String(node.props.className).split(' ').includes(className)); }
/** 调用真实可交互元素的公开事件。
 * @param node - 真实元素
 * @param name - 事件名
 * @param event - 原生叶事件参数
 * @returns 回调结果
 */
function fire(node: Node,name = 'onClick',event?:unknown): unknown { return (node.props[name] as (event?:unknown) => unknown)(event); }

it.each(['custom','ollama','mimo','minimax','deepseek'])('shows the actual %s reasoning label and propagates every permitted reasoning option', (provider) => {
  props.selectedProvider = provider; const tree = ChatInputBar(props); const reasoning = nodes(tree).find((node) => node.type === 'select')!;
  ['low','medium','high'].forEach((value) => { fire(reasoning,'onChange',{ target:{ value } }); expect(props.setAiConfig).toHaveBeenLastCalledWith({ deepseekReasoningEffort:value }); });
  const labels: Record<string,string> = { custom:'customReasoning',ollama:'ollamaReasoning',mimo:'mimoReasoning',minimax:'minimaxReasoning',deepseek:'deepseekReasoning' };
  expect(reasoning.props.title).toContain(labels[provider]);
});

it('executes every paid model and context selection with actual helpers and preserves configured model labels', () => {
  props.showModelDropdown = true;props.showContextDropdown = true;props.isProUser = true;props.hasCustomApiCredentials = true;props.isCustomApiModel = true;props.selectedModel = 'ollama';props.modelToggleIcon = 'model.svg';props.aiConfig.ollamaModel = 'local-model';
  const tree = ChatInputBar(props);const options = find(tree,'max-expand-chat-model-dropdown-item');
  expect(options).toHaveLength(13); options.forEach((node) => fire(node));
  expect(props.setAiConfig).toHaveBeenCalledWith({ model:'ollama' });expect(props.setAiConfig).toHaveBeenCalledWith({ model:'custom-api' });expect(props.setAiConfig).toHaveBeenLastCalledWith({ contextLimit:1_000_000 });
  const selects = nodes(tree).filter((node) => node.type === 'select');fire(selects[1],'onChange',{ target:{ value:'off' } });expect(props.setAiConfig).toHaveBeenLastCalledWith({ deepseekThinking:false });
  fire(selects[2],'onChange',{ target:{ value:'direct' } });expect(props.setAiConfig).toHaveBeenLastCalledWith({ customApiMode:'direct' });
  props.isCustomApiModel = false;props.isOllamaModel = true; const ollama = ChatInputBar(props);expect(find(ollama,'max-expand-chat-model-dropdown-trigger-label')[0].props.children).toContain('Ollama');
});

it.each([[false,true],[true,false],[false,false]] as const)('guards native clickable custom and paid choices for pro=%s credentials=%s', (pro,credentials) => {
  props.showModelDropdown = true;props.showContextDropdown = true;props.isProUser = pro;props.hasCustomApiCredentials = credentials;const tree = ChatInputBar(props);const options = find(tree,'max-expand-chat-model-dropdown-item');
  fire(options[9]);expect(props.setAiConfig).not.toHaveBeenCalled();
  if (!pro) { fire(options[1]);fire(options[12]);expect(props.setAiConfig).not.toHaveBeenCalled(); }
});

it('executes all public visibility toggles and native input/drag forwarding', () => {
  const tree = ChatInputBar(props);fire(find(tree,'max-expand-chat-model-dropdown-trigger')[0]);fire(find(tree,'max-expand-chat-model-dropdown-trigger')[1]);fire(find(tree,'max-expand-chat-session-toggle')[0]);
  const modelToggle = find(tree,'max-expand-chat-send').at(-1)!;fire(modelToggle);
  [props.setShowModelDropdown,props.setShowContextDropdown,props.setShowSessionSidebar,props.setShowModelCard].forEach((setter) => {
    const [[change]] = vi.mocked(setter).mock.calls; const update = change as (value:boolean) => boolean;expect(update(false)).toBe(true);expect(update(true)).toBe(false);
  });
  fire(find(tree,'max-expand-chat-agent-mode-trigger')[0]);expect(props.toggleAgentModeDropdown).toHaveBeenCalledOnce();
  const input = nodes(tree).find((node) => node.type === 'textarea')!;fire(input,'onChange',{ target:{ value:'hello' } });expect(props.setInput).toHaveBeenCalledWith('hello');fire(input,'onKeyDown',{ key:'Enter' });expect(props.handleKeyDown).toHaveBeenCalledWith({ key:'Enter' });
  const [drop] = find(tree,'max-expand-chat-attachments-drop-zone');const event = { preventDefault:vi.fn(),stopPropagation:vi.fn() };
  ['onDragEnter','onDragOver','onDragLeave','onDrop'].forEach((name) => fire(drop,name,event));expect(props.handleAttachmentDragEnter).toHaveBeenCalledWith(event);expect(props.handleAttachmentDropEvent).toHaveBeenCalledWith(event);
  fire(find(tree,'max-expand-chat-session-toggle')[1]);expect(nativeClick).toHaveBeenCalledOnce();
  props.fileInputRef.current = null;fire(find(ChatInputBar(props),'max-expand-chat-session-toggle')[1]);expect(nativeClick).toHaveBeenCalledOnce();
  const [wheel] = find(tree,'max-expand-chat-model-card-scroll');fire(wheel,'onWheel',event);fire(wheel,'onWheelCapture',event);expect(event.stopPropagation).toHaveBeenCalledTimes(2);
});

it('preserves complete skills through nested drag, duplicate drops, toggles and removal', () => {
  const one = { id:'one',name:'one',filePath:'C:/one.md',enabled:true }; const two = { id:'two',name:'two',filePath:'C:/two.md',enabled:false };props.aiConfig.skills = [one,two];props.skillDragOver = true;
  const tree = ChatInputBar(props);const [section] = find(tree,'max-expand-chat-skills-section');const event = { preventDefault:vi.fn(),stopPropagation:vi.fn(),dataTransfer:{ files:[new File(['x'],'one.md')] } };
  fire(section,'onDragEnter',event);fire(section,'onDragEnter',event);fire(section,'onDragOver',event);fire(section,'onDragLeave',event);expect(props.skillDragDepthRef.current).toBe(1);fire(section,'onDragLeave',event);expect(props.setSkillDragOver).toHaveBeenLastCalledWith(false);
  pathForFile.mockReturnValue('c:/ONE.md');fire(section,'onDrop',event);expect(props.setAiConfig).not.toHaveBeenCalled();
  fire(section,'onDrop',{ ...event,dataTransfer:{ files:[new File(['x'],'ignored.txt')] } });expect(pathForFile).toHaveBeenCalledTimes(1);
  pathForFile.mockReturnValue('');fire(section,'onDrop',event);expect(props.setAiConfig).not.toHaveBeenCalled();
  pathForFile.mockReturnValue('C:/skills/.md');fire(section,'onDrop',event);expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills:[one,two,expect.objectContaining({ name:'skill',filePath:'C:/skills/.md' })] });
  fire(find(tree,'max-expand-chat-skills-toggle')[0]);expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills:[{ ...one,enabled:false },two] });
  fire(find(tree,'max-expand-chat-skills-toggle')[1]);expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills:[one,{ ...two,enabled:true }] });
  fire(find(tree,'max-expand-chat-skills-remove-btn')[0]);expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills:[two] });
});

it('uses the real native picker and provides an unnamed markdown skill fallback', async () => {
  pick.mockResolvedValue('C:/skills/.md');await fire(find(ChatInputBar(props),'max-expand-chat-skills-add-btn')[0]);expect(props.setAiConfig).toHaveBeenCalledWith({ skills:[expect.objectContaining({ name:'skill',filePath:'C:/skills/.md',enabled:true })] });
});

it.each(['mihtnelis','r1pxc'] as const)('renders streaming controls, complete agent choices and short quote for %s', (mode) => {
  props.isStreaming = true;props.agentMode = mode;props.currentAgentModeConfig = AGENT_MODES.find((m) => m.id === mode)!;props.showSessionSidebar = true;props.showModelCard = true;props.showAgentModeDropdown = true;props.agentModeDropdownPos = { left:12,bottom:20 };props.pendingQuote = 'quoted';props.attachmentDragOver = true;props.attachmentDropInvalid = true;
  const tree = ChatInputBar(props);find(tree,'max-expand-chat-agent-mode-item').forEach((node) => fire(node));expect(props.setAgentMode).toHaveBeenCalledTimes(3);
  const stop = find(tree,'max-expand-chat-send').find((node) => node.props.children === 'aiChat.actions.stop')!;fire(stop);expect(props.handleStop).toHaveBeenCalledOnce();
  if (mode === 'r1pxc') { expect(find(tree,'max-expand-chat-quote-preview-text')[0].props.children).toBe('quoted');fire(find(tree,'max-expand-chat-quote-preview-close')[0]);expect(props.setPendingQuote).toHaveBeenCalledWith(null); }
});

it('renders actual accepted text/source attachment icons and preserves only the unremoved attachment', () => {
  props.aiConfig.deepseekThinking = true;
  const text = { name:'notes.txt',size:1,content:'x' }; const code = { name:'code.ts',size:1,content:'x' }; props.pendingAttachments = [text,code];
  const tree = ChatInputBar(props); expect(find(tree,'max-expand-chat-attachment-tag-icon')).toHaveLength(1); expect(find(tree,'max-expand-chat-attachment-tag-icon-fallback')).toHaveLength(1);
  const fileInput = nodes(tree).find((node) => node.type === 'input')!;const file = new File(['x'],'code.ts');fire(fileInput,'onChange',{ target:{ files:[file] } });expect(props.handleAttachFiles).toHaveBeenCalledWith([file]);
  fire(find(tree,'max-expand-chat-attachment-tag-remove')[0]);const [[change]] = vi.mocked(props.setPendingAttachments).mock.calls;expect((change as (previous:typeof text[]) => typeof text[])([text,code])).toEqual([code]);
  expect(nodes(tree).find((node) => node.type === 'select' && node.props.value === 'on')).toBeDefined();
});

it('contains malformed JSON at the public configuration setter boundary before adding valid skills', async () => {
  const original = useIslandStore.getState().aiConfig;
  useIslandStore.getState().setAiConfig(JSON.parse('{"skills":null,"customApiMode":""}') as Partial<Props['aiConfig']>);
  try {
    props.aiConfig = useIslandStore.getState().aiConfig;props.isCustomApiModel = true;
    const tree = ChatInputBar(props);expect(nodes(tree).find((node) => node.type === 'select' && node.props.value === 'relay')).toBeDefined();expect(find(tree,'max-expand-chat-skills-drop-hint')).toHaveLength(1);
    pathForFile.mockReturnValue('C:/valid.md');const [drop] = find(tree,'max-expand-chat-skills-section');fire(drop,'onDrop',{ preventDefault:vi.fn(),stopPropagation:vi.fn(),dataTransfer:{ files:[new File(['x'],'valid.md')] } });expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills:[expect.objectContaining({ name:'valid',filePath:'C:/valid.md' })] });
    pick.mockResolvedValue('C:/picked.md');await fire(find(tree,'max-expand-chat-skills-add-btn')[0]);expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills:[expect.objectContaining({ name:'picked',filePath:'C:/picked.md' })] });
  } finally { useIslandStore.getState().setAiConfig(original); }
});
