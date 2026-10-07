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
 * @file ToolboxPanel.tsx
 * @description 工具箱首页和各工具页面的组合展示。
 * @author 鸡哥
 */

import { DownloadToolSection } from '../../tools/components/DownloadToolSection';
import { EncodingServiceToolSection } from '../../tools/components/EncodingServiceToolSection';
import { FileCompressionToolSection } from '../../tools/components/FileCompressionToolSection';
import { FileServiceToolSection } from '../../tools/components/FileServiceToolSection';
import { NetworkServiceToolSection } from '../../tools/components/NetworkServiceToolSection';
import { SoftwareToolSection } from '../../tools/components/SoftwareToolSection';
import { FormatFactoryToolSection } from '../../tools/components/FormatFactoryToolSection';
import { TranslateToolSection } from '../../tools/components/TranslateToolSection';
import { TOOLBOX_SIDEBAR_ITEMS } from '../config/toolboxSidebarConfig';
import { ToolboxIndex } from './ToolboxIndex';
import type { ReactElement } from 'react';
import type { ToolboxPanelProps } from '../types';

/**
 * 渲染当前工具页面及对应子页标题。
 * @param props - 面板展示输入。
 * @param props.t - 当前语言翻译函数。
 * @param props.navigation - 页面选择状态及导航操作。
 * @param props.onSoftwareFeedbackNavigate - 软件反馈页面跳转操作。
 * @returns 当前工具面板。
 */
export function ToolboxPanel({ t, navigation, onSoftwareFeedbackNavigate }: ToolboxPanelProps): ReactElement {
  const {
    activeSidebar, downloadPage, setDownloadPage, fileCompressionPage, setFileCompressionPage,
    formatFactoryPage, setFormatFactoryPage,
  } = navigation;
  const downloadPageLabel = activeSidebar === 'download'
    ? t(`maxExpand.toolbox.download.pages.${downloadPage}`, {
      defaultValue: downloadPage === 'history'
        ? t('maxExpand.toolbox.download.tasks.title')
        : t('maxExpand.toolbox.download.title'),
    })
    : '';
  const fileCompressionPageLabel = activeSidebar === 'fileCompression'
    ? t(`maxExpand.toolbox.fileCompression.pages.${fileCompressionPage}`)
    : '';
  const formatFactoryPageLabel = activeSidebar === 'formatFactory'
    ? t(`maxExpand.toolbox.formatFactory.pages.${formatFactoryPage}`)
    : '';
  const activeSidebarItem = TOOLBOX_SIDEBAR_ITEMS.find((item) => item.key === activeSidebar);
  return (
    <div className="max-expand-settings-panel settings-scrollbar-thin">
      {activeSidebar !== 'index' && (
        <div className="max-expand-settings-title toolbox-panel-title settings-app-title-line">
          <span>{activeSidebarItem ? t(activeSidebarItem.labelKey) : ''}</span>
          {activeSidebar === 'download' && downloadPageLabel && (
            <span className="settings-app-title-sub">- {downloadPageLabel}</span>
          )}
          {activeSidebar === 'fileCompression' && fileCompressionPageLabel && (
            <span className="settings-app-title-sub">- {fileCompressionPageLabel}</span>
          )}
          {activeSidebar === 'formatFactory' && formatFactoryPageLabel && (
            <span className="settings-app-title-sub">- {formatFactoryPageLabel}</span>
          )}
        </div>
      )}
      {activeSidebar === 'index' && <ToolboxIndex t={t} navigation={navigation} />}
      {activeSidebar === 'download' && (
        <DownloadToolSection
          downloadPage={downloadPage}
          setDownloadPage={setDownloadPage}
        />
      )}
      {activeSidebar === 'translate' && <TranslateToolSection />}
      {activeSidebar === 'software' && (
        <SoftwareToolSection onFeedbackNavigate={onSoftwareFeedbackNavigate} />
      )}
      {activeSidebar === 'fileService' && <FileServiceToolSection />}
      {activeSidebar === 'encodingService' && <EncodingServiceToolSection />}
      {activeSidebar === 'networkService' && <NetworkServiceToolSection />}
      {activeSidebar === 'fileCompression' && (
        <FileCompressionToolSection
          fileCompressionPage={fileCompressionPage}
          setFileCompressionPage={setFileCompressionPage}
        />
      )}
      {activeSidebar === 'formatFactory' && (
        <FormatFactoryToolSection
          formatFactoryPage={formatFactoryPage}
          setFormatFactoryPage={setFormatFactoryPage}
        />
      )}
    </div>
  );
}
