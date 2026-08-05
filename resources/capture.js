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
 * @file capture.js
 * @description 截图选区与涂鸦交互逻辑，负责选区绘制、马赛克/线条/矩形/画笔标注及结果导出
 * @author 鸡哥
 */

const { ipcRenderer } = require('electron');

const bgCanvas = document.getElementById('bg-canvas');
const drawCanvas = document.getElementById('draw-canvas');
const tempCanvas = document.getElementById('temp-canvas');
const maskCanvas = document.getElementById('mask-canvas');

const bgCtx = bgCanvas.getContext('2d');
const drawCtx = drawCanvas.getContext('2d');
const tempCtx = tempCanvas.getContext('2d');
const maskCtx = maskCanvas.getContext('2d');

const sizeInfo = document.getElementById('size-info');
const toolbar = document.getElementById('toolbar');
const captureSourceBadge = document.getElementById('captureSourceBadge');
const colorPicker = document.getElementById('colorPicker');
const sizePicker = document.getElementById('sizePicker');
const btnUndo = document.getElementById('btnUndo');
const btnTranslate = document.getElementById('btnTranslate');
const btnTranslateLabel = document.getElementById('btnTranslateLabel');
const translateOverlay = document.getElementById('translateOverlay');
const translateMessage = document.getElementById('translateMessage');

let bgImage = null;
let W = 0;
let H = 0;
let scaleFactor = 1;
let captureDisplays = [];
let captureVirtualScreen = null;
let capturePhysicalScreen = null;

let selX = 0;
let selY = 0;
let selW = 0;
let selH = 0;

const STATE = { IDLE: 0, DRAWING: 1, SELECTED: 2, MOVING: 3, RESIZING: 4, ANNOTATING: 5 };
let state = STATE.IDLE;

let startX = 0;
let startY = 0;
let moveOffX = 0;
let moveOffY = 0;
let resizeHandle = '';
let resizeAnchorX = 0;
let resizeAnchorY = 0;

let activeTool = 'select';
let drawingColor = '#ff4d4f';
let drawingSize = 4;
let annotStartX = 0;
let annotStartY = 0;
let penLastX = 0;
let penLastY = 0;

const HANDLE_SIZE = 5;
const HANDLE_HIT = 8;
const MAX_HISTORY = 10;
const historyStack = [];
let currentCaptureObjectUrl = '';
let captureLanguage = 'zh-CN';
let captureWindowRects = [];
let hoverWindowRect = null;
let pendingWindowClickRect = null;
let isTranslating = false;
let translationCache = null;
let displayedImageVersion = 'original';

const CAPTURE_I18N = {
  'zh-CN': {
    source: { plugin: '使用插件', js: '使用js' },
    tools: {
      select: '选区',
      mosaic: '马赛克',
      line: '直线',
      rect: '矩形',
      pen: '画笔',
      undo: '撤销',
      color: '颜色',
      size: '粗细',
      save: '保存',
      translate: '图片翻译',
      showOriginal: '显示原文',
      showTranslation: '显示译文',
      translating: '翻译中',
      loginRequired: '请先登录 Pro 账号后再使用图片翻译',
      translateFailed: '图片翻译失败',
      invalidData: '无效的截图数据',
      submitFailed: '图片翻译任务提交失败',
      queryFailed: '查询图片翻译任务失败',
      noResultUrl: '服务端未返回翻译图片',
      timeout: '图片翻译等待超时，请稍后重试',
      aborted: '图片翻译请求已取消或超时',
      captureWindowClosed: '截图窗口已关闭',
      cancel: '取消',
      done: '完成',
    },
  },
  'en-US': {
    source: { plugin: 'Using plugin', js: 'Using JS' },
    tools: {
      select: 'Select',
      mosaic: 'Mosaic',
      line: 'Line',
      rect: 'Rectangle',
      pen: 'Pen',
      undo: 'Undo',
      color: 'Color',
      size: 'Size',
      save: 'Save',
      translate: 'Translate',
      showOriginal: 'Show original',
      showTranslation: 'Show translation',
      translating: 'Translating',
      loginRequired: 'Please sign in to a Pro account to translate images',
      translateFailed: 'Image translation failed',
      invalidData: 'Invalid screenshot data',
      submitFailed: 'Failed to submit image translation task',
      queryFailed: 'Failed to query image translation task',
      noResultUrl: 'Server did not return translated image',
      timeout: 'Image translation timed out, please try again',
      aborted: 'Image translation request was cancelled or timed out',
      captureWindowClosed: 'Screenshot window was closed',
      cancel: 'Cancel',
      done: 'Done',
    },
  },
};

function normalizeCaptureLanguage(raw) {
  if (typeof raw !== 'string') return 'zh-CN';
  if (raw === 'en' || raw === 'en-US' || raw.startsWith('en-')) return 'en-US';
  return 'zh-CN';
}

function tCapture(key) {
  return CAPTURE_I18N[captureLanguage].tools[key] || CAPTURE_I18N['zh-CN'].tools[key] || key;
}

function applyCaptureLanguage(language) {
  captureLanguage = normalizeCaptureLanguage(language);
  document.documentElement.lang = captureLanguage;
  Array.from(document.querySelectorAll('[data-i18n]')).forEach((el) => {
    el.textContent = tCapture(el.dataset.i18n);
  });
  Array.from(document.querySelectorAll('[data-i18n-title]')).forEach((el) => {
    el.title = tCapture(el.dataset.i18nTitle);
  });
  Array.from(document.querySelectorAll('[data-i18n-aria-label]')).forEach((el) => {
    el.setAttribute('aria-label', tCapture(el.dataset.i18nAriaLabel));
  });
  updateTranslateButtonLabel();
  setCaptureSource(captureSourceBadge?.dataset.captureSource || 'js');
}

async function initCaptureLanguage() {
  try {
    const stored = await ipcRenderer.invoke('store:read', 'i18n-language');
    applyCaptureLanguage(stored);
  } catch {
    applyCaptureLanguage(navigator.language);
  }
}

void initCaptureLanguage();

/**
 * 初始化各层画布尺寸
 * @description 在窗口尺寸变化后同步四层画布，保证坐标系统一致
 */
function initCanvases() {
  W = window.innerWidth;
  H = window.innerHeight;
  [bgCanvas, drawCanvas, tempCanvas, maskCanvas].forEach((cv) => {
    cv.width = W;
    cv.height = H;
  });
  drawBackground();
  redrawFromHistoryTop();
  drawMask();
}

function drawBackground() {
  bgCtx.clearRect(0, 0, W, H);
  if (!bgImage) return;

  if (!captureVirtualScreen || !capturePhysicalScreen || captureDisplays.length === 0) {
    bgCtx.drawImage(bgImage, 0, 0, W, H);
    return;
  }

  const sourceScaleX = bgImage.naturalWidth / capturePhysicalScreen.width;
  const sourceScaleY = bgImage.naturalHeight / capturePhysicalScreen.height;
  captureDisplays.forEach((display) => {
    const source = display.physicalBounds;
    const target = display.bounds;
    bgCtx.drawImage(
      bgImage,
      (source.x - capturePhysicalScreen.x) * sourceScaleX,
      (source.y - capturePhysicalScreen.y) * sourceScaleY,
      source.width * sourceScaleX,
      source.height * sourceScaleY,
      target.x - captureVirtualScreen.x,
      target.y - captureVirtualScreen.y,
      target.width,
      target.height,
    );
  });
}

function clearTemp() {
  tempCtx.clearRect(0, 0, W, H);
}

/**
 * 绘制遮罩层与选区边框
 * @description 非选区区域使用半透明遮罩，便于用户聚焦当前操作区域
 */
function drawMask() {
  maskCtx.clearRect(0, 0, W, H);
  if (state === STATE.IDLE) {
    maskCtx.fillStyle = 'rgba(0,0,0,0.35)';
    if (!hoverWindowRect) {
      maskCtx.fillRect(0, 0, W, H);
      return;
    }
    maskCtx.fillRect(0, 0, W, hoverWindowRect.y);
    maskCtx.fillRect(0, hoverWindowRect.y + hoverWindowRect.height, W, H - hoverWindowRect.y - hoverWindowRect.height);
    maskCtx.fillRect(0, hoverWindowRect.y, hoverWindowRect.x, hoverWindowRect.height);
    maskCtx.fillRect(hoverWindowRect.x + hoverWindowRect.width, hoverWindowRect.y, W - hoverWindowRect.x - hoverWindowRect.width, hoverWindowRect.height);
    maskCtx.strokeStyle = '#409cff';
    maskCtx.lineWidth = 2;
    maskCtx.strokeRect(hoverWindowRect.x, hoverWindowRect.y, hoverWindowRect.width, hoverWindowRect.height);
    return;
  }

  maskCtx.fillStyle = 'rgba(0,0,0,0.46)';
  maskCtx.fillRect(0, 0, W, selY);
  maskCtx.fillRect(0, selY + selH, W, H - selY - selH);
  maskCtx.fillRect(0, selY, selX, selH);
  maskCtx.fillRect(selX + selW, selY, W - selX - selW, selH);

  maskCtx.strokeStyle = '#409cff';
  maskCtx.lineWidth = 1.5;
  maskCtx.strokeRect(selX, selY, selW, selH);

  if (activeTool === 'select' && (state === STATE.SELECTED || state === STATE.MOVING || state === STATE.RESIZING)) {
    maskCtx.fillStyle = '#409cff';
    const handles = getHandlePositions();
    Object.values(handles).forEach((p) => {
      maskCtx.fillRect(p[0] - HANDLE_SIZE, p[1] - HANDLE_SIZE, HANDLE_SIZE * 2, HANDLE_SIZE * 2);
    });
  }
}

function getHandlePositions() {
  const cx = selX + selW / 2;
  const cy = selY + selH / 2;
  return {
    tl: [selX, selY],
    t: [cx, selY],
    tr: [selX + selW, selY],
    r: [selX + selW, cy],
    br: [selX + selW, selY + selH],
    b: [cx, selY + selH],
    bl: [selX, selY + selH],
    l: [selX, cy],
  };
}

function hitTestHandle(mx, my) {
  const handles = getHandlePositions();
  const matched = Object.entries(handles).find((entry) => {
    const p = entry[1];
    return Math.abs(mx - p[0]) <= HANDLE_HIT && Math.abs(my - p[1]) <= HANDLE_HIT;
  });
  return matched ? matched[0] : '';
}

function isInsideSelection(mx, my) {
  return mx >= selX && mx <= selX + selW && my >= selY && my <= selY + selH;
}

/**
 * 设置可见窗口矩形列表
 * @description 将窗口的虚拟屏幕坐标转换为画布相对坐标，支持多显示器偏移
 * @param windows - 原始窗口边界数组（虚拟屏幕坐标）
 * @param virtualScreen - 虚拟屏幕边界 { x, y, width, height }
 */
function setVisibleWindowRects(windows, virtualScreen) {
  const vs = virtualScreen || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  captureWindowRects = Array.isArray(windows)
    ? windows.map((item) => {
      const left = Math.max(item.x, vs.x);
      const top = Math.max(item.y, vs.y);
      const right = Math.min(item.x + item.width, vs.x + vs.width);
      const bottom = Math.min(item.y + item.height, vs.y + vs.height);
      return {
        x: Math.max(0, Math.round(left - vs.x)),
        y: Math.max(0, Math.round(top - vs.y)),
        width: Math.max(0, Math.round(right - left)),
        height: Math.max(0, Math.round(bottom - top)),
        title: item.title || '',
      };
    }).filter((item) => item.width >= 40 && item.height >= 40)
    : [];
}

function findWindowRectAt(mx, my) {
  return captureWindowRects.find((item) => (
    mx >= item.x && mx <= item.x + item.width && my >= item.y && my <= item.y + item.height
  )) || null;
}

function selectWindowRect(rect) {
  resetTranslationCache();
  selX = rect.x;
  selY = rect.y;
  selW = rect.width;
  selH = rect.height;
  hoverWindowRect = null;
  state = STATE.SELECTED;
  historyStack.length = 0;
  drawCtx.clearRect(0, 0, W, H);
  showToolbar();
  drawMask();
  updateSizeInfo(selX, selY);
}

function clipToSelection(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(selX, selY, selW, selH);
  ctx.clip();
}

function restoreClip(ctx) {
  ctx.restore();
}

/**
 * 保存当前绘制层的选区快照到历史栈
 * @description 仅存储选区范围内的 ImageData，避免在高分辨率屏幕下整屏快照导致内存暴涨
 */
function pushHistory() {
  if (selW < 1 || selH < 1) return;
  historyStack.push({
    data: drawCtx.getImageData(selX, selY, selW, selH),
    x: selX,
    y: selY,
    w: selW,
    h: selH,
  });
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
}

function redrawFromHistoryTop() {
  drawCtx.clearRect(0, 0, W, H);
  if (historyStack.length > 0) {
    const snap = historyStack[historyStack.length - 1];
    drawCtx.putImageData(snap.data, snap.x, snap.y);
  }
}

function undoLast() {
  if (historyStack.length === 0) {
    drawCtx.clearRect(0, 0, W, H);
    return;
  }
  const snap = historyStack.pop();
  drawCtx.clearRect(0, 0, W, H);
  if (snap) {
    drawCtx.putImageData(snap.data, snap.x, snap.y);
  }
}

function updateSizeInfo(mx, my) {
  if (state === STATE.IDLE) {
    sizeInfo.style.display = 'none';
    return;
  }
  if (state === STATE.SELECTED || state === STATE.MOVING || state === STATE.RESIZING || state === STATE.ANNOTATING) {
    sizeInfo.style.display = 'block';
    sizeInfo.textContent = `${Math.round(selW * scaleFactor)} × ${Math.round(selH * scaleFactor)}`;
    sizeInfo.style.left = `${selX}px`;
    sizeInfo.style.top = `${Math.max(selY - 24, 0)}px`;
    return;
  }
  sizeInfo.style.display = 'block';
  sizeInfo.textContent = `${mx}, ${my}`;
  sizeInfo.style.left = `${Math.min(mx + 12, W - 80)}px`;
  sizeInfo.style.top = `${Math.min(my + 12, H - 28)}px`;
}

function setCaptureSource(source) {
  if (!captureSourceBadge) return;
  const safeSource = source === 'plugin' ? 'plugin' : 'js';
  captureSourceBadge.dataset.captureSource = safeSource;
  captureSourceBadge.textContent = CAPTURE_I18N[captureLanguage].source[safeSource];
}

function showToolbar() {
  toolbar.style.display = 'flex';
  const tbW = toolbar.offsetWidth || 520;
  const tbH = toolbar.offsetHeight || 40;
  let tx = selX + selW - tbW;
  if (tx < 6) tx = 6;
  let ty = selY + selH + 8;
  if (ty + tbH > H - 6) ty = selY - tbH - 8;
  if (ty < 6) ty = 6;
  toolbar.style.left = `${tx}px`;
  toolbar.style.top = `${ty}px`;
}

function hideToolbar() {
  toolbar.style.display = 'none';
}

function positionTranslateOverlay() {
  translateOverlay.style.left = `${selX}px`;
  translateOverlay.style.top = `${selY}px`;
  translateOverlay.style.width = `${selW}px`;
  translateOverlay.style.height = `${selH}px`;
}

function showTranslateOverlay(message, isError = false) {
  positionTranslateOverlay();
  translateMessage.textContent = message;
  translateOverlay.classList.toggle('is-error', isError);
  translateOverlay.style.display = 'flex';
}

function hideTranslateOverlay() {
  translateOverlay.style.display = 'none';
  translateOverlay.classList.remove('is-error');
}

function updateTranslateButtonLabel() {
  const labelKey = !translationCache
    ? 'translate'
    : displayedImageVersion === 'translated'
      ? 'showOriginal'
      : 'showTranslation';
  btnTranslateLabel.textContent = tCapture(labelKey);
}

function resetTranslationCache() {
  translationCache = null;
  displayedImageVersion = 'original';
  updateTranslateButtonLabel();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(tCapture('translateFailed')));
    image.src = src;
  });
}

async function renderSelectionImage(dataUrl) {
  const image = await loadImage(dataUrl);
  drawCtx.clearRect(selX, selY, selW, selH);
  drawCtx.drawImage(image, selX, selY, selW, selH);
  activeTool = 'select';
  Array.from(document.querySelectorAll('button.tool')).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === 'select');
  });
  drawMask();
}

async function toggleCachedTranslation() {
  if (!translationCache) return false;
  const nextVersion = displayedImageVersion === 'translated' ? 'original' : 'translated';
  const nextImage = nextVersion === 'translated'
    ? translationCache.translatedImage
    : translationCache.originalImage;
  await renderSelectionImage(nextImage);
  displayedImageVersion = nextVersion;
  updateTranslateButtonLabel();
  return true;
}

function setTool(tool) {
  activeTool = tool;
  Array.from(document.querySelectorAll('button.tool')).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  drawMask();
}

function getMergedCanvas() {
  const merged = document.createElement('canvas');
  merged.width = W;
  merged.height = H;
  const mctx = merged.getContext('2d');
  mctx.drawImage(bgCanvas, 0, 0);
  mctx.drawImage(drawCanvas, 0, 0);
  return merged;
}

/**
 * 对框选区域应用马赛克
 * @param x1 - 起点 x 坐标
 * @param y1 - 起点 y 坐标
 * @param x2 - 终点 x 坐标
 * @param y2 - 终点 y 坐标
 */
function applyMosaic(x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  if (w < 2 || h < 2) return;

  const rx = Math.max(selX, x);
  const ry = Math.max(selY, y);
  const rr = Math.min(selX + selW, x + w);
  const rb = Math.min(selY + selH, y + h);
  if (rr - rx < 2 || rb - ry < 2) return;

  const rw = rr - rx;
  const rh = rb - ry;
  const block = Math.max(4, drawingSize * 2);

  const merged = getMergedCanvas();
  const srcCtx = merged.getContext('2d');
  const imageData = srcCtx.getImageData(rx, ry, rw, rh);
  const data = imageData.data;

  for (let yy = 0; yy < rh; yy += block) {
    for (let xx = 0; xx < rw; xx += block) {
      const sx = Math.min(xx + Math.floor(block / 2), rw - 1);
      const sy = Math.min(yy + Math.floor(block / 2), rh - 1);
      const i = (sy * rw + sx) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      for (let by = yy; by < Math.min(yy + block, rh); by++) {
        for (let bx = xx; bx < Math.min(xx + block, rw); bx++) {
          const j = (by * rw + bx) * 4;
          data[j] = r;
          data[j + 1] = g;
          data[j + 2] = b;
          data[j + 3] = a;
        }
      }
    }
  }

  drawCtx.putImageData(imageData, rx, ry);
}

function drawLine(ctx, x1, y1, x2, y2) {
  ctx.strokeStyle = drawingColor;
  ctx.lineWidth = drawingSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawRect(ctx, x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  ctx.strokeStyle = drawingColor;
  ctx.lineWidth = drawingSize;
  ctx.strokeRect(x, y, w, h);
}

function finishSelection(mx, my) {
  resetTranslationCache();
  hoverWindowRect = null;
  selX = Math.min(startX, mx);
  selY = Math.min(startY, my);
  selW = Math.abs(mx - startX);
  selH = Math.abs(my - startY);
  if (selW < 3 || selH < 3) {
    state = STATE.IDLE;
    selX = selY = selW = selH = 0;
    drawCtx.clearRect(0, 0, W, H);
    historyStack.length = 0;
    hideToolbar();
    drawMask();
    updateSizeInfo(mx, my);
    return;
  }
  state = STATE.SELECTED;
  showToolbar();
  drawMask();
  updateSizeInfo(mx, my);
}

/**
 * 裁剪选区并合并涂鸦图层
 * @returns PNG dataURL，若选区无效则返回 null
 */
function cropSelectionWithAnnotations() {
  if (!bgImage || selW < 2 || selH < 2) return null;

  const usesCompositedBackground = Boolean(
    captureVirtualScreen && capturePhysicalScreen && captureDisplays.length > 0,
  );
  const sourceCanvas = usesCompositedBackground ? bgCanvas : bgImage;
  const scaleX = usesCompositedBackground ? 1 : bgImage.naturalWidth / W;
  const scaleY = usesCompositedBackground ? 1 : bgImage.naturalHeight / H;

  const sx = Math.round(selX * scaleX);
  const sy = Math.round(selY * scaleY);
  const sw = Math.round(selW * scaleX);
  const sh = Math.round(selH * scaleY);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = sw;
  outCanvas.height = sh;
  const outCtx = outCanvas.getContext('2d');

  outCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const scaledDraw = document.createElement('canvas');
  scaledDraw.width = sw;
  scaledDraw.height = sh;
  const sctx = scaledDraw.getContext('2d');
  sctx.drawImage(drawCanvas, selX, selY, selW, selH, 0, 0, sw, sh);
  outCtx.drawImage(scaledDraw, 0, 0);

  return outCanvas.toDataURL('image/png');
}

/**
 * 释放截图页中的大对象资源
 * @description 截图窗口销毁前主动释放 URL、位图与历史栈，降低内存峰值残留
 */
function releaseCaptureResources() {
  if (currentCaptureObjectUrl) {
    URL.revokeObjectURL(currentCaptureObjectUrl);
    currentCaptureObjectUrl = '';
  }

  historyStack.length = 0;
  bgImage = null;
  captureDisplays = [];
  captureVirtualScreen = null;
  capturePhysicalScreen = null;

  [bgCanvas, drawCanvas, tempCanvas, maskCanvas].forEach((cv) => {
    cv.width = 0;
    cv.height = 0;
  });
}

ipcRenderer.on('capture-image', (_e, data) => {
  resetTranslationCache();
  scaleFactor = data.scaleFactor || 1;
  captureDisplays = Array.isArray(data.displays) ? data.displays : [];
  captureVirtualScreen = data.virtualScreen || null;
  capturePhysicalScreen = data.physicalScreen || null;
  setCaptureSource(data.captureSource);
  setVisibleWindowRects(data.visibleWindows, captureVirtualScreen);

  if (currentCaptureObjectUrl) {
    URL.revokeObjectURL(currentCaptureObjectUrl);
    currentCaptureObjectUrl = '';
  }

  let imageSrc = data.imageDataURL || '';
  if (data.imageBytes && data.imageBytes.length > 0) {
    const blob = new Blob([data.imageBytes], { type: 'image/png' });
    currentCaptureObjectUrl = URL.createObjectURL(blob);
    imageSrc = currentCaptureObjectUrl;
  }

  if (!imageSrc) {
    return;
  }

  const img = new Image();
  img.onload = () => {
    bgImage = img;
    initCanvases();

    if (currentCaptureObjectUrl) {
      URL.revokeObjectURL(currentCaptureObjectUrl);
      currentCaptureObjectUrl = '';
    }
  };

  img.onerror = () => {
    if (currentCaptureObjectUrl) {
      URL.revokeObjectURL(currentCaptureObjectUrl);
      currentCaptureObjectUrl = '';
    }
  };

  img.src = imageSrc;
});

tempCanvas.addEventListener('mousedown', (e) => {
  if (isTranslating || e.button !== 0) return;
  const mx = e.clientX;
  const my = e.clientY;

  if (state === STATE.IDLE) {
    resetTranslationCache();
    pendingWindowClickRect = hoverWindowRect;
    state = STATE.DRAWING;
    startX = mx;
    startY = my;
    hoverWindowRect = null;
    hideToolbar();
    drawMask();
    return;
  }

  if (state === STATE.SELECTED && activeTool === 'select') {
    const handle = hitTestHandle(mx, my);
    if (handle) {
      resetTranslationCache();
      state = STATE.RESIZING;
      resizeHandle = handle;
      const anchors = {
        tl: [selX + selW, selY + selH], t: [selX, selY + selH],
        tr: [selX, selY + selH], r: [selX, selY],
        br: [selX, selY], b: [selX, selY],
        bl: [selX + selW, selY], l: [selX + selW, selY],
      };
      resizeAnchorX = anchors[handle][0];
      resizeAnchorY = anchors[handle][1];
      hideToolbar();
      return;
    }
    if (isInsideSelection(mx, my)) {
      resetTranslationCache();
      state = STATE.MOVING;
      moveOffX = mx - selX;
      moveOffY = my - selY;
      hideToolbar();
      return;
    }
    resetTranslationCache();
    state = STATE.DRAWING;
    startX = mx;
    startY = my;
    hideToolbar();
    drawMask();
    return;
  }

  if (state === STATE.SELECTED && activeTool !== 'select' && isInsideSelection(mx, my)) {
    resetTranslationCache();
    state = STATE.ANNOTATING;
    annotStartX = mx;
    annotStartY = my;
    penLastX = mx;
    penLastY = my;
    pushHistory();
    hideToolbar();
    if (activeTool === 'pen') {
      clipToSelection(drawCtx);
      drawLine(drawCtx, penLastX, penLastY, mx, my);
      restoreClip(drawCtx);
    }
  }
});

tempCanvas.addEventListener('mousemove', (e) => {
  if (isTranslating) return;
  const mx = e.clientX;
  const my = e.clientY;

  if (state === STATE.IDLE) {
    const nextHoverWindow = findWindowRectAt(mx, my);
    if (nextHoverWindow !== hoverWindowRect) {
      hoverWindowRect = nextHoverWindow;
      drawMask();
    }
    document.body.style.cursor = 'crosshair';
    return;
  }

  if (state === STATE.DRAWING) {
    selX = Math.min(startX, mx);
    selY = Math.min(startY, my);
    selW = Math.abs(mx - startX);
    selH = Math.abs(my - startY);
    drawMask();
    updateSizeInfo(mx, my);
    return;
  }

  if (state === STATE.MOVING) {
    selX = Math.max(0, Math.min(mx - moveOffX, W - selW));
    selY = Math.max(0, Math.min(my - moveOffY, H - selH));
    drawMask();
    updateSizeInfo(mx, my);
    return;
  }

  if (state === STATE.RESIZING) {
    let newX = selX;
    let newY = selY;
    let newW = selW;
    let newH = selH;
    const h = resizeHandle;

    if (h === 'tl' || h === 'l' || h === 'bl') { newX = Math.min(mx, resizeAnchorX); newW = Math.abs(resizeAnchorX - mx); }
    else if (h === 'tr' || h === 'r' || h === 'br') { newX = Math.min(mx, resizeAnchorX); newW = Math.abs(mx - resizeAnchorX); }

    if (h === 'tl' || h === 't' || h === 'tr') { newY = Math.min(my, resizeAnchorY); newH = Math.abs(resizeAnchorY - my); }
    else if (h === 'bl' || h === 'b' || h === 'br') { newY = Math.min(my, resizeAnchorY); newH = Math.abs(my - resizeAnchorY); }

    selX = newX;
    selY = newY;
    selW = newW;
    selH = newH;
    drawMask();
    updateSizeInfo(mx, my);
    return;
  }

  if (state === STATE.ANNOTATING) {
    clearTemp();
    if (activeTool === 'pen') {
      clipToSelection(drawCtx);
      drawLine(drawCtx, penLastX, penLastY, mx, my);
      restoreClip(drawCtx);
      penLastX = mx;
      penLastY = my;
    } else {
      clipToSelection(tempCtx);
      if (activeTool === 'line') {
        drawLine(tempCtx, annotStartX, annotStartY, mx, my);
      } else if (activeTool === 'rect') {
        drawRect(tempCtx, annotStartX, annotStartY, mx, my);
      } else if (activeTool === 'mosaic') {
        tempCtx.strokeStyle = '#ffffff';
        tempCtx.setLineDash([6, 3]);
        tempCtx.lineWidth = 1;
        tempCtx.strokeRect(Math.min(annotStartX, mx), Math.min(annotStartY, my), Math.abs(mx - annotStartX), Math.abs(my - annotStartY));
        tempCtx.setLineDash([]);
      }
      restoreClip(tempCtx);
    }
    updateSizeInfo(mx, my);
    return;
  }

  if (state === STATE.SELECTED && activeTool === 'select') {
    const handle = hitTestHandle(mx, my);
    if (handle) {
      const map = { tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize', t: 'ns-resize', b: 'ns-resize', l: 'ew-resize', r: 'ew-resize' };
      document.body.style.cursor = map[handle] || 'crosshair';
    } else if (isInsideSelection(mx, my)) {
      document.body.style.cursor = 'move';
    } else {
      document.body.style.cursor = 'crosshair';
    }
    updateSizeInfo(mx, my);
    return;
  }

  updateSizeInfo(mx, my);
});

tempCanvas.addEventListener('mouseup', (e) => {
  if (isTranslating) return;
  const mx = e.clientX;
  const my = e.clientY;

  if (state === STATE.DRAWING) {
    const moved = Math.abs(mx - startX) >= 3 || Math.abs(my - startY) >= 3;
    if (!moved && pendingWindowClickRect) {
      selectWindowRect(pendingWindowClickRect);
      pendingWindowClickRect = null;
      return;
    }
    pendingWindowClickRect = null;
    finishSelection(mx, my);
    return;
  }

  if (state === STATE.MOVING || state === STATE.RESIZING) {
    state = STATE.SELECTED;
    showToolbar();
    drawMask();
    updateSizeInfo(mx, my);
    return;
  }

  if (state === STATE.ANNOTATING) {
    clearTemp();
    clipToSelection(drawCtx);
    if (activeTool === 'line') {
      drawLine(drawCtx, annotStartX, annotStartY, mx, my);
    } else if (activeTool === 'rect') {
      drawRect(drawCtx, annotStartX, annotStartY, mx, my);
    } else if (activeTool === 'mosaic') {
      restoreClip(drawCtx);
      applyMosaic(annotStartX, annotStartY, mx, my);
      state = STATE.SELECTED;
      showToolbar();
      drawMask();
      updateSizeInfo(mx, my);
      return;
    }
    restoreClip(drawCtx);
    state = STATE.SELECTED;
    showToolbar();
    drawMask();
    updateSizeInfo(mx, my);
  }
});

Array.from(document.querySelectorAll('button.tool')).forEach((btn) => {
  btn.addEventListener('click', () => {
    if (isTranslating || state !== STATE.SELECTED) return;
    setTool(btn.dataset.tool || 'select');
  });
});

colorPicker.addEventListener('input', () => { drawingColor = colorPicker.value; });
sizePicker.addEventListener('change', () => { drawingSize = Number(sizePicker.value || 4); });

btnUndo.addEventListener('click', () => {
  if (state !== STATE.SELECTED) return;
  resetTranslationCache();
  undoLast();
});

document.getElementById('btnCopy').addEventListener('click', () => {
  const dataURL = cropSelectionWithAnnotations();
  if (dataURL) ipcRenderer.send('capture-complete', { dataURL });
});

btnTranslate.addEventListener('click', async () => {
  if (isTranslating || state !== STATE.SELECTED) return;

  if (translationCache) {
    isTranslating = true;
    try {
      await toggleCachedTranslation();
    } finally {
      isTranslating = false;
    }
    return;
  }

  const originalImage = cropSelectionWithAnnotations();
  if (!originalImage) return;

  isTranslating = true;
  hideToolbar();
  sizeInfo.style.display = 'none';
  showTranslateOverlay(tCapture('translating'));

  try {
    const token = await ipcRenderer.invoke('store:read', 'user-account-token');
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error(tCapture('loginRequired'));
    }
    const [storedSourceLang, storedTargetLang] = await Promise.all([
      ipcRenderer.invoke('store:read', 'screenshot-translate-source-lang'),
      ipcRenderer.invoke('store:read', 'screenshot-translate-target-lang'),
    ]);
    const sourceLanguage = typeof storedSourceLang === 'string' && storedSourceLang ? storedSourceLang : 'auto';
    const targetLanguage = typeof storedTargetLang === 'string' && storedTargetLang ? storedTargetLang : 'en';
    const result = await ipcRenderer.invoke('capture-translate', {
      dataURL: originalImage,
      token,
      sourceLanguage,
      targetLanguage,
    });
    if (!result?.success || !result.translatedImage) {
      const errorCode = result?.code;
      const fallbackMsg = errorCode && tCapture(errorCode) !== errorCode
        ? tCapture(errorCode)
        : tCapture('translateFailed');
      throw new Error(result?.message || fallbackMsg);
    }
    pushHistory();
    await renderSelectionImage(result.translatedImage);
    translationCache = {
      originalImage,
      translatedImage: result.translatedImage,
    };
    displayedImageVersion = 'translated';
    updateTranslateButtonLabel();
    hideTranslateOverlay();
  } catch (error) {
    showTranslateOverlay(error instanceof Error ? error.message : tCapture('translateFailed'), true);
    await new Promise((resolve) => window.setTimeout(resolve, 2200));
    hideTranslateOverlay();
  } finally {
    isTranslating = false;
    showToolbar();
    updateSizeInfo(selX, selY);
  }
});

document.getElementById('btnSave').addEventListener('click', () => {
  const dataURL = cropSelectionWithAnnotations();
  if (dataURL) ipcRenderer.send('capture-save', { dataURL });
});

document.getElementById('btnCancel').addEventListener('click', () => {
  ipcRenderer.send('capture-cancel');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ipcRenderer.send('capture-cancel');
    return;
  }
  if (e.key === 'Enter' && state === STATE.SELECTED) {
    const dataURL = cropSelectionWithAnnotations();
    if (dataURL) ipcRenderer.send('capture-complete', { dataURL });
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (state === STATE.SELECTED) {
      resetTranslationCache();
      undoLast();
    }
  }
});

window.addEventListener('resize', () => {
  initCanvases();
  if (state !== STATE.IDLE) {
    if (isTranslating) {
      hideToolbar();
      positionTranslateOverlay();
      sizeInfo.style.display = 'none';
    } else {
      showToolbar();
      updateSizeInfo(selX, selY);
    }
  } else {
    sizeInfo.style.display = 'none';
    hideToolbar();
  }
});

window.addEventListener('beforeunload', () => {
  releaseCaptureResources();
});
