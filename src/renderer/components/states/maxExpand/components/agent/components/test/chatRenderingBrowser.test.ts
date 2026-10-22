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
 * @description 在真实 Electron/React 中验证流式片段即时显示且不重复解析历史消息和格式化会话时间。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it('renders each chunk immediately while reusing historical rows in both agent modes', async () => {
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
        visibleMessages:messages,aiChatMessages:messages,visibleStartIndex:0,aiChatStreaming:true,
        input:'',inputRef:ref(),chatRootRef:ref(),chatEndRef:ref(),fileInputRef:ref(),
        agentModeDropdownRef:ref(),agentModeTriggerRef:ref(),modelDropdownRef:ref(),contextDropdownRef:ref(),
        skillDragDepthRef:{current:0},pendingAttachments:[],contextUsageTokens:0,selectedContextLimit:200000,
        contextUsagePercent:0,contextUsagePercentText:'0%',selectedModel:'deepseek-v4-flash',
        setPendingQuote:noop,setResolvingWebAccessDecision:noop,setResolvingLocalToolAccessDecision:noop,
        setAiChatStreaming:noop,setVisibleWindowStart:noop,switchAiChatSession:()=>Promise.resolve(),
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
    await writeFile(join(directory, 'index.html'), '<div id="root"></div><script src="chat.js"></script>');
    const checks = `(()=>{
      const assert=(condition,message)=>{if(!condition)throw Error(message)};
      const text=()=>document.querySelector('.max-expand-chat-messages').textContent;
      for(const mode of ['mihtnelis','r1pxc']){
        window.chatState={...window.chatState,agentMode:mode};window.draw();
        const historic=document.querySelector('.max-expand-chat-user-row');
        window.historicalReads=0;window.dateFormats=0;
        for(let i=0;i<20;i++){
          const messages=window.chatState.aiChatMessages;
          const content=messages.at(-1).content+' '+mode+'-chunk-'+i;
          const updated=[...messages.slice(0,-1),{role:'assistant',content}];
          window.chatState={...window.chatState,aiChatMessages:updated,visibleMessages:updated,input:'typing '+i,
            orderedSessions:window.chatState.orderedSessions.map(s=>({...s}))};
          window.draw();
          assert(text().includes(content),'Chunk did not render immediately in '+mode);
        }
        assert(window.historicalReads===0,'Reparsed history in '+mode+': '+window.historicalReads);
        assert(window.dateFormats===0,'Reformatted unchanged sessions in '+mode+': '+window.dateFormats);
        assert(document.querySelector('.max-expand-chat-user-row')===historic,'History DOM was replaced');
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
      return 'CHAT_RENDER_PASS: 40 chunks, 0 historical reads, 0 unchanged session date formats';
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
    });
    expect(result.stdout).toContain('CHAT_RENDER_PASS');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 25000);
