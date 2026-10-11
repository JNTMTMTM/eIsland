/* eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com. GPL-3.0-or-later.
 */
/**
 * @file localAssetsBrowser.test.ts
 * @description 隔离 Electron 验证资源跨源加载及实际图片转换的画布导出。
 * @author 鸡哥
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { expect, it } from 'vitest';
const fontPath = join(process.env.WINDIR || 'C:/Windows', 'Fonts', 'segoeui.ttf');
it.skipIf(!existsSync(fontPath))('loads streamed assets and exports converted canvas pixels in a sandboxed renderer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eisland-asset-browser-'));
  try {
    await writeFile(join(directory, 'fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="7" height="9"><rect width="7" height="9" fill="red"/></svg>');
    await writeFile(join(directory, 'index.html'), '<!doctype html><title>isolated asset test</title>');
    await build({ entryPoints: [resolve('src/main/media/localAssets.ts')], outfile: join(directory, 'assets.cjs'), bundle: true, platform: 'node', format: 'cjs' });
    await build({ entryPoints: [resolve('src/renderer/components/states/maxExpand/components/tools/utils/imageConverter.ts')], outfile: join(directory, 'converter.js'), bundle: true, platform: 'browser', format: 'iife', globalName: 'assetConverter' });
    const script = `const {app,BrowserWindow,protocol}=require('electron');
      const {createLocalAssetUrl,handleLocalAssetRequest}=require('./assets.cjs');
      app.setPath('userData',${JSON.stringify(join(directory, 'profile'))});app.disableHardwareAcceleration();
      protocol.registerSchemesAsPrivileged([{scheme:'eisland-media',privileges:{standard:true,secure:true,corsEnabled:true,supportFetchAPI:true,stream:true}}]);
      app.whenReady().then(async()=>{try{
        protocol.handle('eisland-media',handleLocalAssetRequest);
        const imageUrl=await createLocalAssetUrl(${JSON.stringify(join(directory, 'fixture.svg'))},1024);
        const fontUrl=await createLocalAssetUrl(${JSON.stringify(fontPath)},32*1024*1024);
        const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
        await win.loadFile(${JSON.stringify(join(directory, 'index.html'))});
        await win.webContents.executeJavaScript(require('node:fs').readFileSync(${JSON.stringify(join(directory, 'converter.js'))},'utf8'));
        const result=await win.webContents.executeJavaScript('('+ (async(imageUrl,fontUrl)=>{
          const image=new Image();image.src=imageUrl;await image.decode();
          if(image.naturalWidth!==7||image.naturalHeight!==9)throw Error('Image size mismatch');
          const font=new FontFace('StreamedTest','url("'+fontUrl+'")');await font.load();
          if(font.status!=='loaded')throw Error('Font failed');
          const body=await fetch(imageUrl);if(!body.ok||(await body.text()).length<50)throw Error('Stream failed');
          window.api={loadWallpaperFile:async()=>imageUrl};
          let downloadUrl='';
          const originalClick=HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click=function(){downloadUrl=this.href;};
          try{
            const converted=await assetConverter.convertImageInRenderer({filePath:'fixture.svg',targetFormat:'png',icoSize:32});
            if(!converted.success)throw Error('Canvas conversion failed: '+converted.error);
            const png=await(await fetch(downloadUrl)).blob();
            const bitmap=await createImageBitmap(png);
            try{
              if(bitmap.width!==7||bitmap.height!==9)throw Error('Converted PNG size mismatch');
              const canvas=document.createElement('canvas');canvas.width=7;canvas.height=9;
              const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
              const pixel=context.getImageData(0,0,1,1).data;
              if(pixel[0]!==255||pixel[1]!==0||pixel[2]!==0||pixel[3]!==255)throw Error('Converted PNG pixel mismatch');
            }finally{bitmap.close();}
          }finally{HTMLAnchorElement.prototype.click=originalClick;if(downloadUrl)URL.revokeObjectURL(downloadUrl);}
          return 'ASSET_BROWSER_PASS';
        }).toString()+')('+JSON.stringify(imageUrl)+','+JSON.stringify(fontUrl)+')');
        console.log(result);win.destroy();app.exit(0);
      }catch(error){console.error(error);app.exit(1);}});`;
    await writeFile(join(directory, 'main.cjs'), script);
    const environment = { ...process.env }; delete environment.ELECTRON_RUN_AS_NODE;
    const result = await promisify(execFile)(createRequire(import.meta.url)('electron'), [join(directory, 'main.cjs')], { env: environment, windowsHide: true, timeout: 20000 });
    expect(result.stdout).toContain('ASSET_BROWSER_PASS');
  } finally {
    if (directory.startsWith(join(tmpdir(), 'eisland-asset-browser-'))) await rm(directory, { recursive: true, force: true });
  }
}, 25000);
