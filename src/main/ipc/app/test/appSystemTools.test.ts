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
 * @file appSystemTools.test.ts
 * @description Agent系统工具的命令路由、结果解析、系统元数据与叶依赖失败契约测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupHarness, resetHarness, mocks, root, tool, errorContaining } from './appHarness';

beforeEach(resetHarness);
afterEach(cleanupHarness);

/**
 * 为命令边界设置明确输出，所有外部进程均停留在替身中。
 * @param stdout - 命令输出。
 * @param error - 操作系统错误。
 */
function commandOutput(stdout: unknown, error: Error | null = null): void {
  mocks.exec.mockImplementation((program, args, options, callback) => {
    void program; void args; void options; callback(error, stdout, '');
  });
}

const jsonCommands = [
  { name: 'net.dns', args: { host: "o'ne.example" }, command: 'Resolve-DnsName', expected: { host: "o'ne.example", records: { value: 42 } }, fallback: { host: "o'ne.example", records: 'raw-output' } },
  { name: 'net.ports', args: { filter: '443' }, command: 'Get-NetTCPConnection', expected: { filter: '443', ports: { value: 42 } }, fallback: { filter: '443', ports: 'raw-output' } },
  { name: 'monitor.cpu', args: {}, command: 'Win32_Processor', expected: { value: 42 }, fallback: 'raw-output' },
  { name: 'monitor.disk', args: {}, command: 'Win32_LogicalDisk', expected: { disks: { value: 42 } }, fallback: { disks: 'raw-output' } },
  { name: 'monitor.gpu', args: {}, command: 'Win32_VideoController', expected: { value: 42 }, fallback: 'raw-output' },
  { name: 'volume.get', args: {}, command: 'GetMasterVolumeLevelScalar', expected: { value: 42 }, fallback: { raw: 'raw-output' } },
  { name: 'display.list', args: {}, command: 'Win32_DesktopMonitor', expected: { displays: { value: 42 } }, fallback: { displays: 'raw-output' } },
  { name: 'registry.read', args: { path: 'HKCU:/Fixture' }, command: 'Get-ItemProperty', expected: { path: 'HKCU:/Fixture', name: null, value: { value: 42 } }, fallback: { path: 'HKCU:/Fixture', name: null, value: 'raw-output' } },
  { name: 'service.list', args: { filter: "o'ne" }, command: 'Get-Service', expected: { filter: "o'ne", services: { value: 42 } }, fallback: { filter: "o'ne", services: 'raw-output' } },
  { name: 'service.start', args: { name: "o'ne" }, command: 'Start-Service', expected: { name: "o'ne", action: 'start', service: { value: 42 } }, fallback: { name: "o'ne", action: 'start', service: 'raw-output' } },
  { name: 'service.stop', args: { name: 'fixture' }, command: 'Stop-Service', expected: { name: 'fixture', action: 'stop', service: { value: 42 } }, fallback: { name: 'fixture', action: 'stop', service: 'raw-output' } },
  { name: 'service.restart', args: { name: 'fixture' }, command: 'Restart-Service', expected: { name: 'fixture', action: 'restart', service: { value: 42 } }, fallback: { name: 'fixture', action: 'restart', service: 'raw-output' } },
  { name: 'schedule.task.list', args: { filter: "o'ne" }, command: 'Get-ScheduledTask', expected: { filter: "o'ne", tasks: { value: 42 } }, fallback: { filter: "o'ne", tasks: 'raw-output' } },
  { name: 'schedule.task.create', args: { name: "o'ne", command: "echo 'fixture'", trigger: 'Daily', time: '08:00' }, command: 'Register-ScheduledTask', expected: { name: "o'ne", command: "echo 'fixture'", trigger: 'Daily', task: { value: 42 } }, fallback: { name: "o'ne", command: "echo 'fixture'", trigger: 'Daily', task: 'raw-output' } },
  { name: 'net.proxy', args: {}, command: 'Get-ItemProperty', expected: { action: 'get', proxy: { value: 42 } }, fallback: { action: 'get', proxy: 'raw-output' } },
  { name: 'firewall.rules', args: { filter: "o'ne" }, command: 'Get-NetFirewallRule', expected: { filter: "o'ne", rules: { value: 42 } }, fallback: { filter: "o'ne", rules: 'raw-output' } },
];

describe('local system command adapters', () => {
  it.each(jsonCommands)('$name parses structured output and routes its own command', async ({ name, args, command, expected }) => {
    commandOutput(' {"value":42} ');
    expect(await tool(name, args)).toMatchObject({ success: true, error: '', result: expected });
    expect(mocks.exec).toHaveBeenCalledOnce();
    expect(mocks.exec.mock.calls[0][0]).toBe('powershell.exe');
    expect(mocks.exec.mock.calls[0][1].at(-1)).toContain(command);
    expect(mocks.exec.mock.calls[0][2]).toMatchObject({ windowsHide: true });
  });
  it.each(jsonCommands)('$name retains non-JSON output', async ({ name, args, fallback }) => {
    commandOutput(' raw-output ');
    expect(await tool(name, args)).toMatchObject({ success: true, result: fallback });
  });
  it.each(jsonCommands)('$name returns a tool error after a rejected process', async ({ name, args }) => {
    commandOutput('', new Error('fixture process denied'));
    expect(await tool(name, args)).toMatchObject({ success: false, error: 'fixture process denied' });
  });
  it.each(['net.ports', 'service.list', 'schedule.task.list', 'firewall.rules'])('%s supports an absent filter', async (name) => {
    commandOutput('[]');
    expect(await tool(name, {})).toMatchObject({ success: true, result: { filter: null } });
    expect(mocks.exec.mock.calls[0][1].at(-1)).not.toContain('Where-Object');
  });
  it('normalizes ping counts and returns useful diagnostics even when ping fails', async () => {
    commandOutput(' pong ');
    expect(await tool('net.ping', { host: 'example.com', count: 99 })).toMatchObject({ success: true, result: { host: 'example.com', count: 10, output: 'pong' } });
    expect(mocks.exec).toHaveBeenCalledWith('ping', ['-n', '10', 'example.com'], { windowsHide: true, timeout: 30000, maxBuffer: 128 * 512 }, expect.any(Function));
    commandOutput('timeout response', new Error('ping timeout'));
    expect(await tool('net.ping', { host: 'example.com' })).toMatchObject({ success: true, result: { count: 4, output: 'timeout response' } });
    commandOutput('', new Error('ping timeout'));
    expect(await tool('net.ping', { host: 'example.com', count: -1 })).toMatchObject({ success: true, result: { count: 1, output: 'ping timeout' } });
  });
  it.each([{ output: ' 75 ', value: 75 }, { output: 'not-number', value: 0 }])('parses brightness $output', async ({ output, value }) => {
    commandOutput(output);
    expect(await tool('brightness.get', {})).toMatchObject({ success: true, result: { brightness: value } });
  });
  it.each([
    { name: 'volume.set', args: { level: 150 }, fragment: 'SetMasterVolumeLevelScalar(1.00', result: { level: 100, set: true } },
    { name: 'volume.set', args: { level: -4 }, fragment: 'SetMasterVolumeLevelScalar(0.00', result: { level: 0, set: true } },
    { name: 'brightness.set', args: { level: 24.9 }, fragment: 'WmiSetBrightness(1,24)', result: { brightness: 24, set: true } },
    { name: 'registry.write', args: { path: "HKCU:/o'ne", name: "v'alue", value: "o'ne" }, fragment: "-PropertyType String", result: { path: "HKCU:/o'ne", name: "v'alue", written: true } },
    { name: 'registry.write', args: { path: 'HKCU:/Fixture', name: 'flag', type: 'DWord' }, fragment: "-Value '' -PropertyType DWord", result: { written: true } },
    { name: 'registry.delete', args: { path: 'HKCU:/Fixture', name: 'flag' }, fragment: 'Remove-ItemProperty', result: { path: 'HKCU:/Fixture', name: 'flag', deleted: true } },
    { name: 'registry.delete', args: { path: 'HKCU:/Fixture' }, fragment: 'Remove-Item -Path', result: { name: null, deleted: true } },
    { name: 'defender.scan', args: {}, fragment: 'Start-MpScan -ScanType QuickScan', result: { scanType: 'QuickScan', initiated: true } },
    { name: 'defender.scan', args: { type: 'FullScan' }, fragment: 'Start-MpScan -ScanType FullScan', result: { scanType: 'FullScan', initiated: true } },
    { name: 'net.proxy', args: { action: 'set', server: "127.0.0.1:8080" }, fragment: '-Name ProxyEnable -Value 1', result: { action: 'set', server: '127.0.0.1:8080', enabled: true } },
    { name: 'net.proxy', args: { action: 'disable' }, fragment: '-Name ProxyEnable -Value 0', result: { action: 'disable', server: '', enabled: false } },
    { name: 'net.hosts', args: { action: 'add', ip: '127.0.0.1', host: 'fixture.example' }, fragment: "-Value '127.0.0.1 fixture.example'", result: { action: 'add', entry: '127.0.0.1 fixture.example', added: true } },
  ])('$name safely builds command arguments at the mocked process boundary', async ({ name, args, fragment, result }) => {
    expect(await tool(name, args)).toMatchObject({ result, success: true });
    expect(mocks.exec.mock.calls[0][1].at(-1)).toContain(fragment);
    commandOutput('', new Error('mutation denied'));
    expect(await tool(name, args)).toMatchObject({ success: false, error: 'mutation denied' });
  });
  it('reads one named registry value and constructs the default scheduled trigger', async () => {
    commandOutput('"fixture"');
    expect(await tool('registry.read', { path: "HKCU:/o'ne", name: "v'alue" })).toMatchObject({ success: true, result: { name: "v'alue", value: 'fixture' } });
    expect(mocks.exec.mock.calls[0][1].at(-1)).toContain("Get-ItemPropertyValue -Path 'HKCU:/o''ne' -Name 'v''alue'");
    commandOutput('{}');
    expect(await tool('schedule.task.create', { name: 'fixture', command: 'echo fixture' })).toMatchObject({ success: true, result: { trigger: 'Once' } });
    expect(mocks.exec.mock.calls[1][1].at(-1)).toContain('(Get-Date).AddMinutes(5)');
  });
  it('reads hosts or defaults to empty content when unavailable', async () => {
    mocks.read.mockResolvedValue('fixture hosts');
    expect(await tool('net.hosts', {})).toMatchObject({ success: true, result: { content: 'fixture hosts' } });
    expect(mocks.read).toHaveBeenCalledWith('C:\\Windows\\System32\\drivers\\etc\\hosts', 'utf8');
    mocks.read.mockRejectedValue(new Error('unavailable'));
    expect(await tool('net.hosts', { action: 'read' })).toMatchObject({ success: true, result: { content: '' } });
  });
  it('exposes Wi-Fi output and process failure', async () => {
    commandOutput(' networks ');
    expect(await tool('wifi.list', {})).toMatchObject({ success: true, result: { output: 'networks' } });
    expect(mocks.exec.mock.calls[0][0]).toBe('netsh');
    expect(mocks.exec.mock.calls[0][1]).toEqual(['wlan', 'show', 'networks', 'mode=bssid']);
    commandOutput('', new Error('wifi denied'));
    expect(await tool('wifi.list', {})).toMatchObject({ success: false, error: 'wifi denied' });
  });
  it.each([
    { name: 'power.sleep', fragment: 'SetSuspendState', action: 'sleep' },
    { name: 'power.shutdown', fragment: 'shutdown /s', action: 'shutdown' },
    { name: 'power.restart', fragment: 'shutdown /r', action: 'restart' },
  ])('dispatches $name only through the process mock', async ({ name, fragment, action }) => {
    expect(await tool(name, {})).toMatchObject({ success: true, result: { action, initiated: true } });
    expect(mocks.exec.mock.calls[0][0]).toBe('cmd.exe');
    expect(mocks.exec.mock.calls[0][1][1]).toContain(fragment);
    commandOutput('', new Error('power denied'));
    expect(await tool(name, {})).toMatchObject({ success: false, error: 'power denied' });
  });
});

describe('system metadata and launcher tools', () => {
  it('normalizes CPU, memory and uptime metadata and handles unavailable user details', async () => {
    expect(await tool('sys.info', {})).toMatchObject({ success: true, result: { platform: 'win32', arch: 'x64', hostname: 'fixture-host', cpuModel: 'fixture-cpu', cpuCores: 2, totalMemoryMB: 8, freeMemoryMB: 3, uptime: 2, userInfo: { username: 'fixture', uid: 1, gid: 2 } } });
    expect(await tool('monitor.memory', {})).toMatchObject({ success: true, result: { totalMB: 8, freeMB: 3, usedMB: 5, usagePercent: 63 } });
    mocks.cpus.mockReturnValue([]);
    mocks.userInfo.mockImplementation(() => { throw new Error('unavailable'); });
    expect(await tool('sys.info', {})).toMatchObject({ success: true, result: { cpuModel: 'unknown', cpuCores: 0, userInfo: null } });
  });
  it('reads named environment fixtures, filters names and honors the maximum count', async () => {
    vi.stubEnv('EISLAND_COVERAGE_FIXTURE_ALPHA', 'one');
    vi.stubEnv('EISLAND_COVERAGE_FIXTURE_BETA', 'two');
    expect(await tool('sys.env', { name: 'EISLAND_COVERAGE_FIXTURE_ALPHA' })).toMatchObject({ success: true, result: { name: 'EISLAND_COVERAGE_FIXTURE_ALPHA', value: 'one' } });
    expect(await tool('sys.env', { name: 'EISLAND_COVERAGE_FIXTURE_ABSENT' })).toMatchObject({ success: true, result: { value: null } });
    expect(await tool('sys.env', { filter: 'eisland_coverage_fixture_', limit: 1 })).toMatchObject({ success: true, result: { count: 1, totalMatched: 2, variables: { EISLAND_COVERAGE_FIXTURE_ALPHA: 'one' } } });
    const response = await tool('sys.env', { limit: 1 });
    expect(response.success).toBe(true);
    expect(response.result).toMatchObject({ count: 1 });
  });
  it.each([
    { target: 'settings', args: {}, external: 'ms-settings:', program: '' },
    { target: 'explorer', args: { path: root }, external: '', program: 'explorer.exe' },
    { target: 'devmgr', args: {}, external: '', program: 'mmc.exe' },
    { target: 'notepad', args: {}, external: '', program: 'notepad.exe' },
    { target: 'ms-settings:display', args: {}, external: 'ms-settings:display', program: '' },
    { target: 'https://example.com', args: {}, external: 'https://example.com', program: '' },
  ])('opens $target using its dedicated shell or process boundary', async ({ target, args, external, program }) => {
    expect(await tool('sys.open', { target, ...args })).toMatchObject({ success: true, result: { target, opened: true } });
    if (external) expect(mocks.external).toHaveBeenCalledWith(external);
    else expect(mocks.exec.mock.calls[0][0]).toBe(program);
  });
  it('returns a controlled error for unknown system destinations and failed launchers', async () => {
    expect(await tool('sys.open', { target: 'unknown-fixture' })).toMatchObject({ success: false, error: errorContaining('不支持的 target') });
    commandOutput('', new Error('launcher denied'));
    expect(await tool('sys.open', { target: 'devmgr' })).toMatchObject({ success: false, error: 'launcher denied' });
    expect(await tool('sys.open', { target: 'calc' })).toMatchObject({ success: false, error: 'launcher denied' });
    mocks.external.mockRejectedValue(new Error('URI denied'));
    expect(await tool('sys.open', { target: 'settings' })).toMatchObject({ success: false, error: 'URI denied' });
  });
  it('normalizes installed software fields, filters publishers and sorts before truncation', async () => {
    mocks.software.mockResolvedValue([{ DisplayName: 'Zebra', DisplayVersion: '2', Publisher: 'Fixture Co' }, { DisplayName: 'Alpha', Publisher: 'Fixture Co' }, { DisplayName: '' }, { DisplayName: 'Other', Publisher: 'Other' }]);
    expect(await tool('sys.installed-apps', { filter: 'fixture', limit: 1 })).toMatchObject({ success: true, result: { count: 1, apps: [{ name: 'Alpha', version: '', publisher: 'Fixture Co', installDate: '', installLocation: '' }] } });
    expect(mocks.software).toHaveBeenCalledOnce();
    expect(await tool('sys.installed-apps', {})).toMatchObject({ success: true, result: { count: 3, filter: null } });
    mocks.software.mockRejectedValue(new Error('software unavailable'));
    expect(await tool('sys.installed-apps', {})).toMatchObject({ success: false, error: 'software unavailable' });
  });
  it.each([
    { args: { target: 'https://example.com' }, expected: { launched: 'https://example.com', app: null } },
    { args: { app: 'fixture-editor' }, expected: { launched: 'fixture-editor', app: 'fixture-editor' } },
    { args: { app: 'fixture-editor', target: `${root  }\\note.txt` }, expected: { launched: `${root  }\\note.txt`, app: 'fixture-editor' } },
  ])('launches through an isolated dynamic-import boundary $args', async ({ args, expected }) => {
    expect(await tool('sys.launch', args)).toMatchObject({ success: true, result: expected });
    if (!args.app) expect(mocks.openDefault).toHaveBeenCalledWith(args.target);
    else if (!args.target) expect(mocks.openApp).toHaveBeenCalledWith(args.app);
    else expect(mocks.openApp).toHaveBeenCalledWith(args.app, { arguments: [args.target] });
  });
  it('does not launch an empty target and propagates launcher failures', async () => {
    expect(await tool('sys.launch', {})).toMatchObject({ success: false, error: 'sys.launch 需要 target 或 app 参数' });
    expect(mocks.openApp).not.toHaveBeenCalled();
    mocks.openDefault.mockRejectedValue(new Error('open denied'));
    expect(await tool('sys.launch', { target: root })).toMatchObject({ success: false, error: 'open denied' });
  });
});
