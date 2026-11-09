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
import { mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gte, valid } from 'semver';
import { AdapterError, fail } from '../../shared/utils/adapterErrors';
import { MINIMUM_TAURI_VERSION } from '../../shared/config/adapterConfig';
import { verifyBackup } from './backupService';
import { legacyInstallation, validateTargetDirectory } from './platformService';
import type { AdapterState, Inspection, Installation, Phase, SourceId, Release } from '../../shared/types/adapterTypes';
import type { MigrationPorts, ServiceConfig } from '../types/serviceTypes';

/** 查找已达到目标版本的 Tauri 安装，不限定目录，因为安装器允许用户修改位置。
 * @param inspection - 系统检测结果。
 * @param version - 需要达到的最低版本。
 * @returns 第一个满足条件的安装项。
 */
function currentInstallation(inspection: Inspection, version: string): Installation | undefined {
  return inspection.installations.find((entry) => entry.runtime === 'tauri' && valid(entry.version) && gte(entry.version, version));
}

/** 串行控制迁移生命周期，旧版卸载须由用户选择且新版安装已确认。 */
export default class MigrationService {
  private previousPhase: Phase = 'welcome';

  private active: AbortController | null = null;

  private installer: string | null = null;

  private localFile: string | undefined;

  private customDirectory: string | null = null;

  private legacyChoiceLocked = false;

  state: AdapterState;

  /** 管理本次适配器会话，不复用旧客户端的 session 或下载调度器。
   * @param config - 已固定的信任配置与数据目录。
   * @param ports - 操作系统及网络边界。
   * @returns 处于 welcome 阶段的服务实例。
   */
  constructor(private readonly config: ServiceConfig, private readonly ports: MigrationPorts) {
    const sources = Object.keys(config.feeds).map((id) => ({ id: id as SourceId }));
    this.state = { sources, phase: 'welcome', source: 'esa', signingConfigured: Boolean(config.publicKey), removeLegacy: false, release: null, inspection: null, backup: null, progress: { done: 0, total: null }, error: null };
  }

  /** 发布不可跨进程共享引用的状态快照。
   * @param patch - 本次状态变化。
   * @returns 无返回值，快照已推送给 renderer。
   */
  private update(patch: Partial<AdapterState>): void {
    this.state = { ...this.state, ...patch };
    this.ports.publish(structuredClone(this.state));
  }

  /** 每次关键操作都重新检测，并重新校验用户选定的目录。
   * @returns 带当前安装目录的检测结果。
   */
  private async inspectConfigured(): Promise<Inspection> {
    const inspection = await this.ports.inspect();
    if (this.customDirectory) return { ...inspection, targetDirectory: await validateTargetDirectory(this.customDirectory, inspection, this.config) };
    return inspection;
  }

  /** 仅在用户可操作阶段接受原生目录选择结果。
   * @param directory - 原生对话框选择的安装位置。
   * @returns 校验后更新目录，不开始安装。
   */
  async setTargetDirectory(directory: string): Promise<void> {
    if (this.active || !['ready', 'prepared'].includes(this.state.phase)) return;
    const { phase } = this.state;
    await this.operation('inspecting', async () => {
      const inspection = await this.ports.inspect();
      const selectedDirectory = await validateTargetDirectory(directory, inspection, this.config);
      this.customDirectory = selectedDirectory;
      this.update({ phase, inspection: { ...inspection, targetDirectory: selectedDirectory } });
    });
  }

  /** 保存用户是否卸载旧版的选择，默认不卸载。
   * @param remove - 是否在新版安装成功后打开旧版卸载程序。
   * @returns 无返回值，仅更新选项。
   */
  setRemoveLegacy(remove: boolean): void {
    if (this.active || this.legacyChoiceLocked || !['ready', 'prepared', 'complete', 'installed'].includes(this.state.phase)) return;
    this.update({ removeLegacy: remove });
  }

  /** 完成安装后重新确认备份、新程序和旧版卸载目标；调用即锁定卸载选择，失败时自动解锁。
   * @returns 用户明确选择卸载时的旧安装项，否则为空。
   */
  async legacyToRemove(): Promise<Installation | undefined> {
    this.legacyChoiceLocked = true;
    try {
      if (!this.state.removeLegacy) return undefined;
      if (!['complete', 'installed'].includes(this.state.phase) || !this.state.backup) fail('backupMissing');
      await verifyBackup(this.state.backup.directory, new AbortController().signal);
      const inspection = await this.ports.inspect();
      const installed = currentInstallation(inspection, this.state.release?.version || MINIMUM_TAURI_VERSION);
      if (!installed || !(await stat(join(installed.directory, 'eisland.exe')).catch(() => null))?.isFile()) fail('installNotConfirmed');
      await validateTargetDirectory(installed.directory, inspection, this.config);
      return legacyInstallation(inspection.installations, this.config.ownExecutable) || fail('legacyUnavailable');
    } catch (error) { this.legacyChoiceLocked = false; throw error; }
  }

  /** 启动交接失败后解除卸载选择锁定，允许用户重新选择。
   * @returns 无返回值。
   */
  releaseLegacyChoice(): void { this.legacyChoiceLocked = false; }

  /** 同一时刻只允许一个操作；取消和错误不会伪装成安装完成。
   * @param phase - 操作的初始阶段。
   * @param work - 执行流程。
   * @returns 操作结束（成功、错误或取消均已写入状态）后完成。
   */
  private async operation(phase: Phase, work: (signal: AbortSignal) => Promise<void>): Promise<void> {
    if (this.active) return;
    if (this.state.phase !== 'error') this.previousPhase = this.state.phase;
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
   * @returns 进入 ready 或 installed 后完成。
   */
  async inspect(source: SourceId, local?: { release: Release; file: string }): Promise<void> {
    await this.operation('inspecting', async (signal) => {
      if (!this.config.publicKey) fail('missingKey');
      if (source !== 'local' && !this.config.feeds[source]) fail('invalidSource');
      const inspection = await this.inspectConfigured();
      const installed = currentInstallation(inspection, MINIMUM_TAURI_VERSION);
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
      const inspection = await this.inspectConfigured();
      this.update({ inspection });
      if (inspection.running.length) fail('closeRunning');
      if (currentInstallation(inspection, release.version)) fail('alreadyCurrent');
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
   * @returns 仅在注册版本与程序文件均得到确认后进入 complete。
   */
  async install(): Promise<void> {
    if (this.state.phase !== 'prepared' || !this.installer || !this.state.release || !this.state.backup || !this.state.inspection) return;
    const {installer} = this;
    const {release} = this.state;
    const {backup} = this.state;
    const directory = this.state.inspection.targetDirectory;
    await this.operation('verifying', async (signal) => {
      const inspected = await this.inspectConfigured();
      if (inspected.running.length) fail('closeRunning');
      // 上次安装器已成功但确认步骤失败时，重试直接以已安装结果收尾，而不是卡在 alreadyCurrent。
      const existing = currentInstallation(inspected, release.version);
      if (existing) {
        this.installer = null;
        this.update({ phase: 'installed', inspection: { ...inspected, targetDirectory: existing.directory } });
        return;
      }
      if (resolve(inspected.targetDirectory).toLowerCase() !== resolve(directory).toLowerCase()) fail('dataChanged');
      await verifyBackup(backup.directory, signal);
      await this.ports.verify(release, installer, signal);
      signal.throwIfAborted();
      this.update({ phase: 'installing' });
      await this.ports.install(installer, directory);
      const installed = await this.ports.inspect();
      // 用户可在安装器中修改目录，以注册表实际登记的位置为准。
      const matching = currentInstallation(installed, release.version);
      if (!matching || !(await stat(join(matching.directory, 'eisland.exe')).catch(() => null))?.isFile()) fail('installNotConfirmed');
      // 安装器中改选的位置同样不能覆盖旧程序、数据、备份或助手自身。
      await validateTargetDirectory(matching.directory, installed, this.config);
      this.installer = null;
      this.update({ phase: 'complete', inspection: { ...installed, targetDirectory: matching.directory } });
    });
  }

  /** 只取消适配器拥有的准备工作，不终止用户或安装程序。
   * @returns 当前安装阶段不会被强制中断。
   */
  cancel(): void { if (this.state.phase !== 'installing') this.active?.abort(); }

  /** 关闭错误并恢复操作前的步骤，保留已完成的备份与安装准备。
   * @returns 运行中的任务不会被中断。
   */
  dismissError(): void {
    if (this.active || this.state.phase !== 'error') return;
    this.update({ phase: this.previousPhase, error: null, progress: { done: 0, total: null } });
  }
}
