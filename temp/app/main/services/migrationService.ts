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
 * @file migrationService.ts
 * @description 串行控制检测、保护、下载、验证和安装；只有系统确认目标版本后才显示完成。
 * @author 鸡哥
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gte, valid } from 'semver';
import { AdapterError, fail } from '../../shared/utils/adapterErrors';
import { MINIMUM_TAURI_VERSION } from '../../shared/config/adapterConfig';
import type { AdapterState, Phase, SourceId, Release } from '../../shared/types/adapterTypes';
import type { MigrationPorts, ServiceConfig } from '../types/serviceTypes';

/** 串行控制迁移生命周期，不自动卸载原客户端或终止外部进程。 */
export class MigrationService {
  private active: AbortController | null = null;

  private installer: string | null = null;

  private localFile: string | undefined;

  state: AdapterState;

  /** 管理本次适配器会话，不复用旧客户端的 session 或下载调度器。
   * @param config - 已固定的信任配置与数据目录。
   * @param ports - 操作系统及网络边界。
   */
  constructor(private readonly config: ServiceConfig, private readonly ports: MigrationPorts) {
    const sources = Object.keys(config.feeds).map((id) => ({ id: id as SourceId }));
    this.state = { sources, phase: 'welcome', source: 'esa', signingConfigured: Boolean(config.publicKey), release: null, inspection: null, backup: null, progress: { done: 0, total: null }, error: null };
  }

  /** 发布不可跨进程共享引用的状态快照。
   * @param patch - 本次状态变化。
   */
  private update(patch: Partial<AdapterState>): void {
    this.state = { ...this.state, ...patch };
    this.ports.publish(structuredClone(this.state));
  }

  /** 同一时刻只允许一个操作；取消和错误不会伪装成安装完成。
   * @param phase - 操作的初始阶段。
   * @param work - 执行流程。
   */
  private async operation(phase: Phase, work: (signal: AbortSignal) => Promise<void>): Promise<void> {
    if (this.active) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({ phase, error: null, progress: { done: 0, total: null } });
    try { await work(controller.signal); }
    catch (error) {
      this.update(controller.signal.aborted ? { phase: 'cancelled', error: null } : { phase: 'error', error: error instanceof AdapterError ? error.code : 'operationFailed' });
    } finally { this.active = null; }
  }

  /** 检测原安装与目标清单；检测阶段不写用户数据。
   * @param source - 构建时配置的更新源。
   * @param local - 原生对话框选中的离线清单及安装器。
   * @param local.release - 官方目标清单。
   * @param local.file - 用户选取清单旁的安装器。
   */
  async inspect(source: SourceId, local?: { release: Release; file: string }): Promise<void> {
    await this.operation('inspecting', async (signal) => {
      if (!this.config.publicKey) fail('missingKey');
      if (source !== 'local' && !this.config.feeds[source]) fail('invalidSource');
      const inspection = await this.ports.inspect();
      const installed = inspection.installations.find((entry) => entry.runtime === 'tauri' && valid(entry.version) && gte(entry.version, MINIMUM_TAURI_VERSION));
      if (installed) {
        this.installer = null;
        this.update({ source, phase: 'installed', inspection: { ...inspection, targetDirectory: installed.directory }, release: null });
        return;
      }
      const release = local?.release ?? await this.ports.release(source, signal);
      this.localFile = local?.file;
      this.installer = null;
      this.update({ source, inspection, release, phase: 'ready' });
    });
  }

  /** 在用户点击后，先完成独立校验备份，再下载并验证新安装包。
   * @returns 完成时进入 prepared，尚未启动安装器。
   */
  async prepare(): Promise<void> {
    if (this.state.phase !== 'ready' || !this.state.release) return;
    const {release} = this.state;
    await this.operation('backing-up', async (signal) => {
      const inspection = await this.ports.inspect();
      this.update({ inspection });
      if (inspection.running.length) fail('closeRunning');
      if (inspection.installations.some((entry) => entry.runtime === 'tauri' && valid(entry.version) && gte(entry.version, release.version))) fail('alreadyCurrent');
      const id = randomUUID();
      const operation = join(this.config.workRoot, 'operations', id);
      const backups = join(this.config.workRoot, 'backups');
      await mkdir(operation, { recursive: true });
      await mkdir(backups, { recursive: true });
      const progress = (value: AdapterState['progress']): void => this.update({ progress: value });
      const backup = await this.ports.backup(inspection.dataRoots, join(backups, id), signal, progress);
      this.update({ backup, phase: 'downloading', progress: { done: 0, total: release.size ?? null } });
      const installer = join(operation, 'tauri-setup.exe');
      await this.ports.download(release, installer, signal, progress, this.localFile);
      this.update({ phase: 'verifying' });
      await this.ports.verify(release, installer, signal);
      signal.throwIfAborted();
      this.installer = installer;
      this.update({ phase: 'prepared' });
    });
  }

  /** 用户最后确认后交接安装；保留原目录、原卸载项及独立备份。
   * @returns 仅在安装路径与注册版本均得到确认后进入 complete。
   */
  async install(): Promise<void> {
    if (this.state.phase !== 'prepared' || !this.installer || !this.state.release || !this.state.backup || !this.state.inspection) return;
    const {installer} = this;
    const {release} = this.state;
    const {backup} = this.state;
    const directory = this.state.inspection.targetDirectory;
    await this.operation('verifying', async (signal) => {
      const inspected = await this.ports.inspect();
      if (inspected.running.length) fail('closeRunning');
      if (inspected.installations.some((entry) => entry.runtime === 'tauri' && valid(entry.version) && gte(entry.version, release.version))) fail('alreadyCurrent');
      if (resolve(inspected.targetDirectory).toLowerCase() !== resolve(directory).toLowerCase()) fail('dataChanged');
      const marker = JSON.parse(await readFile(join(backup.directory, 'backup.json'), 'utf8')) as { complete?: boolean };
      if (marker.complete !== true) fail('backupMissing');
      await this.ports.verify(release, installer, signal);
      signal.throwIfAborted();
      this.update({ phase: 'installing' });
      await this.ports.install(installer, directory);
      const installed = await this.ports.inspect();
      const matching = installed.installations.find((entry) => entry.runtime === 'tauri' && resolve(entry.directory).toLowerCase() === resolve(directory).toLowerCase() && valid(entry.version) && gte(entry.version, release.version));
      if (!matching || !(await stat(join(directory, 'eisland.exe'))).isFile()) fail('installNotConfirmed');
      this.update({ phase: 'complete', inspection: installed });
    });
  }

  /** 只取消适配器拥有的准备工作，不终止用户或安装程序。
   * @returns 当前安装阶段不会被强制中断。
   */
  cancel(): void { if (this.state.phase !== 'installing') this.active?.abort(); }
}
