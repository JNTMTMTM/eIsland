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
 * @file architecture.test.mjs
 * @description 防止原生宿主退回平面入口或在基础设施、公共类型和功能层引入反向依赖。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const layers = ['app', 'commands', 'features', 'infrastructure', 'shared', 'state'];

/** 读取源码，剥除注释以免文档示例被判作模块依赖。
 * @param path - 仓库相对路径。
 * @returns 无注释源码。
 */
function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/[^\r\n]*/gu, '');
}

/** 提取 crate 根模块调用以及分组 use 中的顶层模块。
 * @param code - 无注释 Rust 源码。
 * @returns 根模块依赖集合。
 */
function dependencies(code) {
  const modules = new Set(Array.from(code.matchAll(/\bcrate\s*::\s*(\w+)/gu), ([, name]) => name));
  Array.from(code.matchAll(/\buse\s+crate\s*::\s*\{([\s\S]*?)\};/gu)).forEach(([, group]) => {
    let depth = 0;
    let top = '';
    Array.from(group).forEach((character) => {
      if (character === '{') depth += 1;
      else if (character === '}') depth -= 1;
      else if (depth === 0) top += character;
    });
    top.split(',').forEach((item) => {
      const name = item.trim().match(/^\w+/u)?.[0];
      if (name) modules.add(name);
    });
  });
  return modules;
}

test('native Rust implementation has six layers and one thin executable', () => {
  const files = globSync('src-tauri/src/**/*.rs', { cwd: root }).map((path) => path.replaceAll('\\', '/'));
  const entry = source('src-tauri/src/main.rs');
  assert.match(entry, /fn main\(\)\s*\{\s*eisland_lib::run\(\);\s*\}/u);
  assert.doesNotMatch(entry, /tauri::Builder|\bmod\s+\w+/u);
  const lib = source('src-tauri/src/lib.rs');
  layers.forEach((name) => assert(lib.includes(`pub(crate) mod ${name};`), name));
  files.forEach((path) => {
    const relative = path.slice('src-tauri/src/'.length);
    assert(['main.rs', 'lib.rs'].includes(relative) || layers.includes(relative.split('/')[0]), path);
  });
  const cargo = readFileSync(new URL('../../src-tauri/Cargo.toml', import.meta.url), 'utf8');
  assert.match(cargo, /\[lib\][\s\S]*?name\s*=\s*"eisland_lib"[\s\S]*?crate-type\s*=\s*\["rlib"\]/u);
});

test('infrastructure, shared and feature dependencies respect layer boundaries', () => {
  const forbidden = {
    infrastructure: ['app', 'commands', 'features', 'state'],
    shared: ['app', 'commands', 'features', 'infrastructure', 'state', 'tauri'],
    features: ['app', 'commands'],
  };
  Object.entries(forbidden).forEach(([layer, denied]) => {
    globSync(`src-tauri/src/${layer}/**/*.rs`, { cwd: root }).forEach((path) => {
      const code = source(path.replaceAll('\\', '/'));
      const modules = dependencies(code);
      denied.forEach((name) => assert(!modules.has(name), `${path}: reverse dependency on ${name}`));
      if (layer === 'shared') assert.doesNotMatch(code, /\btauri(?:_\w+)?\s*::/u, path);
    });
  });
});

test('native hook CLI precedes GUI plugins and state precedes service startup', () => {
  const app = source('src-tauri/src/app/mod.rs');
  assert(app.indexOf('features::agent::run_hook_cli()') >= 0);
  assert(app.indexOf('features::agent::run_hook_cli()') < app.indexOf('tauri::Builder::default()'));
  assert(app.indexOf('tauri_plugin_single_instance::init') < app.indexOf('tauri_plugin_opener::init'));
  const setup = source('src-tauri/src/app/setup.rs');
  assert(setup.indexOf('app.manage(paths)') < setup.indexOf('app.manage(Desktop::new(store))'));
  assert(setup.indexOf('app.manage(Desktop::new(store))') < setup.indexOf('super::services::start'));
});

test('process lifecycle keeps explicit exits and tray-hosted window closes distinct', () => {
  const lifecycle = source('src-tauri/src/app/lifecycle.rs');
  assert.match(lifecycle, /RunEvent::Exit\s*=>\s*super::services::stop\(app\)/u);
  assert.match(lifecycle, /RunEvent::Resumed\s*=>\s*crate::features::runtime::changed\(app\)/u);
  assert.match(lifecycle, /RunEvent::ExitRequested\s*\{\s*api,\s*code:\s*None,[\s\S]*?api\.prevent_exit\(\)/u);
});
