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
 * @file chatRenderingBrowser.test.ts
 * @description 在真实 Electron/React 中验证聊天渲染复用、授权侧拉布局与模型卡片互斥。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it('reuses historical rows and keeps authorization drawers above the chat without model-card overlap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eisland-chat-render-'));
  try {
    const entry = `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {flushSync} from 'react-dom';
      import {AiChatContent} from './src/renderer/components/states/maxExpand/components/agent/components/AiChatTab';
      const noop=()=>{};
      const ref=()=>({current:null});
      window.historicalReads=0; window.dateFormats=0;
      const format=Date.prototype.toLocaleString;
      Date.prototype.toLocaleString=function(...args){window.dateFormats++;return format.apply(this,args)};
      const messages=Array.from({length:100},(_,i)=>({role:i%2?'assistant':'user',get content(){window.historicalReads++;return 'history '+i}}));
      messages.push({role:'assistant',content:'start'});
      const sessions=Array.from({length:100},(_,i)=>({id:String(i),title:'Session '+i,updatedAt:i}));
      window.chatState={
        hasLoginSession:true,isProUser:true,agentMode:'mihtnelis',currentAgentModeConfig:{label:'Agent'},
        aiConfig:{deepseekThinking:false,skills:[]},dominantColor:[140,140,140],
        activeAiChatSessionId:'0',orderedSessions:sessions,getSessionCardState:()=> 'running',
        aiChatMessages:messages,aiChatStreaming:true,
        input:'',inputRef:ref(),chatRootRef:ref(),fileInputRef:ref(),
        agentModeDropdownRef:ref(),agentModeTriggerRef:ref(),modelDropdownRef:ref(),contextDropdownRef:ref(),
        skillDragDepthRef:{current:0},pendingAttachments:[],contextUsageTokens:0,selectedContextLimit:200000,
        contextUsagePercent:0,contextUsagePercentText:'0%',selectedModel:'deepseek-v4-flash',
        setPendingQuote:noop,setResolvingWebAccessDecision:noop,setResolvingLocalToolAccessDecision:noop,
        setAiChatStreaming:noop,switchAiChatSession:()=>Promise.resolve(),
        deleteAiChatSession:()=>Promise.resolve()
      };
      window.chatSend={handleReportIssueFromFinalAnswer:noop,navigateToSettingsTab:noop};
      const root=createRoot(document.getElementById('root'));
      window.draw=()=>flushSync(()=>root.render(React.createElement(AiChatContent)));
      window.draw();`;
    const bundle = await build({
      stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
      bundle: true, write: false, outfile: join(directory, 'chat.js'), format: 'iife', platform: 'browser', jsx: 'automatic',
      plugins: [{ name: 'chat-state-boundary', setup(builder) {
        builder.onResolve({ filter: /(?:react-i18next|hooks\/useChatState|hooks\/useChatSend|store\/slices)$/ }, ({ path }) => ({ path, namespace: 'chat-test' }));
        builder.onLoad({ filter: /.*/, namespace: 'chat-test' }, ({ path }) => {
          let contents = 'const state={setAiChatMessageThinkDuration:()=>{}};export default selector=>selector(state);';
          if (path === 'react-i18next') contents = 'const t=key=>key;export const useTranslation=()=>({t});';
          if (path.endsWith('useChatState')) contents = 'export const SESSION_STREAMING_IDS=new Set();export const useChatState=()=>window.chatState;';
          if (path.endsWith('useChatSend')) contents = 'export const useChatSend=()=>window.chatSend;';
          return { contents, loader: 'js' };
        });
      } }],
    });
    await writeFile(join(directory, 'chat.js'), bundle.outputFiles[0].text);
    const css = await readFile('src/renderer/styles/settings/modules/settings-chat.css', 'utf8');
    await writeFile(join(directory, 'index.html'), `<style>*{box-sizing:border-box}body{margin:0;--color-text-rgb:255,255,255;--color-island-bg:#0a0a0a}#root{display:flex;width:800px;height:380px}${css}</style><div id="root"></div><script src="chat.js"></script>`);
    const checks = `(async()=>{
      const assert=(condition,message)=>{if(!condition)throw Error(message)};
      const text=()=>document.querySelector('.max-expand-chat-messages').textContent;
      const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>{const timer=setTimeout(resolve,50);requestAnimationFrame(()=>{clearTimeout(timer);resolve()})})};
      await settle();
      for(const mode of ['mihtnelis','r1pxc']){
        window.chatState={...window.chatState,agentMode:mode};window.draw();await settle();
        const mounted=document.querySelectorAll('[data-chat-index]');
        assert(mounted.length<window.chatState.aiChatMessages.length,'History was fully mounted in '+mode);
        assert(Number(mounted[0].dataset.chatIndex)>0,'Virtual list did not start at the latest messages in '+mode);
        const historic=Array.from(document.querySelectorAll('.max-expand-chat-user-row')).at(-1);
        const historicIndex=historic?.closest('[data-chat-index]').dataset.chatIndex;
        assert(historic,'Expected a mounted historical user row in '+mode);
        window.historicalReads=0;window.dateFormats=0;
        for(let i=0;i<20;i++){
          const messages=window.chatState.aiChatMessages;
          const content=messages.at(-1).content+' '+mode+'-chunk-'+i;
          const updated=[...messages.slice(0,-1),{role:'assistant',content}];
          window.chatState={...window.chatState,aiChatMessages:updated,input:'typing '+i,
            orderedSessions:window.chatState.orderedSessions.map(s=>({...s}))};
          window.draw();await settle();
          assert(text().includes(content),'Chunk did not render immediately in '+mode);
          const list=document.querySelector('.max-expand-chat-messages');
          assert(list.scrollHeight-list.clientHeight-list.scrollTop<=2,'Streaming did not follow the bottom in '+mode);
        }
        assert(window.historicalReads===0,'Reparsed history in '+mode+': '+window.historicalReads);
        assert(window.dateFormats===0,'Reformatted unchanged sessions in '+mode+': '+window.dateFormats);
        assert(document.querySelector('[data-chat-index="'+historicIndex+'"] .max-expand-chat-user-row')===historic,'History DOM was replaced');
        window.chatState={...window.chatState,aiChatStreaming:false};window.draw();
        assert(!document.querySelector('.max-expand-chat-generating-dots'),'Streaming indicator did not stop');
        window.chatState={...window.chatState,aiChatStreaming:true};
      }
      window.dateFormats=0;
      window.chatState.orderedSessions=window.chatState.orderedSessions.map((s,i)=>i? s:{...s,title:'Renamed',updatedAt:999});
      window.draw();
      assert(window.dateFormats===1,'Changed session should render exactly once');
      assert(document.querySelector('.max-expand-chat-session-item-title').textContent==='Renamed','Session title stayed stale');
      window.chatState={...window.chatState,userAvatarUrl:'data:image/png;base64,avatar'};window.draw();
      assert(document.querySelector('.max-expand-chat-user-avatar').getAttribute('src')==='data:image/png;base64,avatar','Avatar stayed stale');
      const bounds=()=>document.querySelector('.max-expand-chat-messages').getBoundingClientRect();
      const original=bounds();
      window.chatState={...window.chatState,showModelCard:true};window.draw();
      window.chatState={...window.chatState,aiLocalToolAccessPrompt:{
        sessionId:'0',requestId:'local',tool:'island.theme.set',riskLevel:'medium',
        purpose:'Switch to light theme',message:'Allow?',argumentsPayload:{mode:'light',details:'long\\n'.repeat(100)}
      }};window.draw();
      document.querySelector('.max-expand-chat-access-drawer').getAnimations().forEach(animation=>animation.finish());
      const model=document.querySelector('#ai-chat-model-card');
      assert(model.inert&&model.getAttribute('aria-hidden')==='true','Authorization did not suppress the model card');
      assert(model.hidden,'Model closing animation must not overlap authorization');
      assert(document.querySelector('[aria-controls="ai-chat-model-card"]').disabled,'Model toggle was not locked');
      const after=bounds();
      assert(after.height===original.height&&after.width===original.width,'Authorization consumed message layout space');
      for(const [width,height] of [[800,380],[360,280]]){
        const root=document.getElementById('root');root.style.width=width+'px';root.style.height=height+'px';
        const drawer=document.querySelector('.max-expand-chat-access-drawer');
        const rect=drawer.getBoundingClientRect();
        const actions=drawer.querySelector('.max-expand-chat-web-access-actions');
        const buttons=actions.getBoundingClientRect();
        const scroll=drawer.querySelector('.max-expand-chat-local-tool-access-scroll');
        assert(rect.left===8&&rect.right<=width&&rect.bottom<=height,'Left drawer escaped the chat bounds '+JSON.stringify({width,height,rect:rect.toJSON()}));
        assert(buttons.bottom<=rect.bottom&&buttons.top>=rect.top,'Authorization actions are clipped');
        assert(scroll.scrollHeight>scroll.clientHeight,'Long arguments should scroll inside the drawer');
        assert(!scroll.contains(actions),'Action buttons must remain outside scrolling details');
      }
      const card=document.querySelector('.max-expand-chat-web-access-card');
      assert(getComputedStyle(card).backgroundColor==='rgb(10, 10, 10)','Dark drawer is transparent');
      document.body.style.setProperty('--color-island-bg','#ffffff');
      document.body.style.setProperty('--color-text-rgb','20,20,20');
      document.documentElement.dataset.theme='light';
      assert(getComputedStyle(card).backgroundColor==='rgb(255, 255, 255)','Light drawer is transparent');
      window.chatState={...window.chatState,aiLocalToolAccessPrompt:null,aiWebAccessPrompt:{
        sessionId:'0',requestId:'web',url:'https://example.invalid',message:'Allow?',siteName:'Example'
      }};window.draw();
      assert(document.querySelectorAll('[role="dialog"]').length===1,'Authorization drawers overlap');
      const webActions=document.querySelector('.max-expand-chat-web-access-actions').getBoundingClientRect();
      assert(webActions.bottom<=280,'Web authorization actions are clipped');
      return 'CHAT_RENDER_PASS: 40 chunks, mounted history reused, bottom followed, 0 unchanged session date formats';
    })()`;
    const script = `const {app,BrowserWindow}=require('electron');
      app.setPath('userData',${JSON.stringify(join(directory, 'profile'))});app.disableHardwareAcceleration();
      app.whenReady().then(async()=>{try{
        const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,backgroundThrottling:false}});
        await win.loadFile(${JSON.stringify(join(directory, 'index.html'))});
        console.log(await win.webContents.executeJavaScript(${JSON.stringify(checks)}));win.destroy();app.exit(0);
      }catch(error){console.error(error);app.exit(1);}});`;
    await writeFile(join(directory, 'main.cjs'), script);
    const environment = { ...process.env };
    delete environment.ELECTRON_RUN_AS_NODE;
    const electron = createRequire(import.meta.url)('electron') as string;
    const result = await promisify(execFile)(electron, [join(directory, 'main.cjs')], {
      env: environment, windowsHide: true, timeout: 20000,
    }).catch((error: unknown) => {
      const failure = error as { stdout?: string; stderr?: string; killed?: boolean };
      throw new Error(`Chat browser check failed (killed=${String(failure.killed)}): ${failure.stdout ?? ''} ${failure.stderr ?? ''}`, { cause: error });
    });
    expect(result.stdout).toContain('CHAT_RENDER_PASS');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 25000);
