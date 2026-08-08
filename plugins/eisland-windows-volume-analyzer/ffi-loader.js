/**
 * @file ffi-loader.js
 * @description 通过 child_process 调用 Native EXE，定义所有操作函数
 */

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const exeName = 'eIslandVolumeAnalyzer.exe';
const exeCandidates = [
  ...(typeof process.resourcesPath === 'string'
    ? [path.join(process.resourcesPath, 'helpers', 'analyzer', exeName)]
    : []),
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', exeName),
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', 'win-x64', exeName),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', exeName),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', 'win-x64', exeName),
];

function findExe() {
  return exeCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function toUnpackedPath(candidate) {
  return candidate.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
}

function callExe(args, timeout = 5000) {
  const exePath = findExe();
  if (!exePath) return null;

  const result = spawnSync(toUnpackedPath(exePath), args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
  });

  if (result.status !== 0 || result.error || !result.stdout) return null;

  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }
}

module.exports = { findExe, callExe, toUnpackedPath };
