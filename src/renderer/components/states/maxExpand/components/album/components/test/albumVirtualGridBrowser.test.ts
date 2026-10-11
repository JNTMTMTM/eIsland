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
 * @file albumVirtualGridBrowser.test.ts
 * @description 在临时隔离 Electron 中验证真实 React 网格 DOM 的万项滚动、分组与缩放布局。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it('keeps real grid DOM bounded while scrolling and resizing 10,000 items', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eisland-album-grid-'));
  try {
    const entry = `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {AlbumOverview} from './src/renderer/components/states/maxExpand/components/album/components/AlbumOverview';
      const items=Array.from({length:10000},(_,id)=>({id,name:id+'.jpg',path:id+'.jpg',ext:'jpg',mediaType:'image',addedAt:id}));
      const noop=()=>{};
      window.draw=(columns=5)=>createRoot(document.getElementById('root')).render(React.createElement(AlbumOverview,{
        totalCount:items.length,filteredCount:items.length,columns,groupMode:'folder',
        groupedItems:[{key:'a',title:'First',subtitle:'folder',items:items.slice(0,5000)},{key:'b',title:'Second',items:items.slice(5000)}],
        metaCache:{},selectedIds:new Set(),selectMode:false,gridVideoRefs:{current:{}},
        onPickFiles:noop,onOpen:noop,onRemove:noop,onToggleSelection:noop,onMouseEnter:noop,onMouseLeave:noop,
        onVisibleItemsChange:items=>{window.requested=items.map(item=>item.id)}
      }));window.draw();`;
    const bundle = await build({
      stdin: {contents: entry, resolveDir: process.cwd(), loader: 'tsx'}, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
      plugins: [{name: 'translation-boundary', setup(builder) {
        builder.onResolve({filter: /^react-i18next$/}, () => ({path: 'i18n', namespace: 'test'}));
        builder.onLoad({filter: /.*/, namespace: 'test'}, () => ({contents: "export const useTranslation=()=>({t:key=>key})", loader: 'js'}));
      }}],
    });
    const css = await readFile(resolve('src/renderer/styles/settings/modules/settings-album.css'), 'utf8');
    await writeFile(join(directory, 'grid.js'), bundle.outputFiles[0].text);
    await writeFile(join(directory, 'index.html'), `<style>*{box-sizing:border-box}body{margin:0}#root{display:flex;width:800px;height:600px}${css}</style><div id="root"></div><script src="grid.js"></script>`);
    const checks = `(async()=>{
      const wait=()=>new Promise(resolve=>setTimeout(resolve,80)); await wait();
      const count=()=>document.querySelectorAll('.album-grid-item').length;
      if(count()===0||count()>60)throw Error('Initial DOM is not bounded: '+count());
      const scroll=document.querySelector('.album-group-list');
      scroll.scrollTop=scroll.scrollHeight; scroll.dispatchEvent(new Event('scroll')); await wait();
      if(count()>60||!window.requested.includes(9999))throw Error('Last row is not accessible');
      const last=document.querySelectorAll('.album-grid-item');
      const rect=last[last.length-1].getBoundingClientRect();
      if(rect.bottom>610||rect.bottom<500)throw Error('Last row layout mismatch '+JSON.stringify(rect));
      document.getElementById('root').style.width='500px'; await wait();
      scroll.scrollTop=scroll.scrollHeight; scroll.dispatchEvent(new Event('scroll')); await wait();
      if(count()>100||!window.requested.includes(9999))throw Error('Resize lost final row');
      scroll.scrollTop=0; scroll.dispatchEvent(new Event('scroll')); await wait();
      if(!window.requested.includes(0))throw Error('First row not restored '+scroll.scrollTop+' '+JSON.stringify(window.requested));
      const nodes=document.querySelectorAll('.album-grid-item');
      const first=nodes[0].getBoundingClientRect(); const secondRow=nodes[5].getBoundingClientRect();
      if(secondRow.top<first.bottom)throw Error('Rows overlap');
      return 'ALBUM_GRID_PASS';
    })()`;
    const script = `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(join(directory,'profile'))});app.disableHardwareAcceleration();
      app.whenReady().then(async()=>{try{const win=new BrowserWindow({show:false,width:900,height:700,webPreferences:{sandbox:true,backgroundThrottling:false}});
        await win.loadFile(${JSON.stringify(join(directory,'index.html'))});console.log(await win.webContents.executeJavaScript(${JSON.stringify(checks)}));win.destroy();app.exit(0);
      }catch(error){console.error(error);app.exit(1);}});`;
    await writeFile(join(directory,'main.cjs'),script);
    const environment = {...process.env}; delete environment.ELECTRON_RUN_AS_NODE;
    const result = await promisify(execFile)(createRequire(import.meta.url)('electron'), [join(directory,'main.cjs')], {env:environment,windowsHide:true,timeout:20000});
    expect(result.stdout).toContain('ALBUM_GRID_PASS');
  } finally { await rm(directory,{recursive:true,force:true}); }
},25000);
