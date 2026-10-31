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
 * @file getNavLabel.test.ts
 * @description getNavLabel 工具函数单元测试
 * @author 鸡哥
 */

import { describe, it, expect, vi } from 'vitest'
import { getNavLabel } from '../getNavLabel'

describe('getNavLabel', () => {
  /** 创建一个可追踪的翻译函数 mock */
  const createMockT = () => vi.fn((key: string) => key)

  describe('happy path — known tab values', () => {
    it('should call t with key "expanded.nav.hover" and defaultValue "返回"', () => {
      const t = createMockT()
      getNavLabel('hover', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.hover', { defaultValue: '返回' })
    })

    it('should call t with key "expanded.nav.overview" and defaultValue "总览"', () => {
      const t = createMockT()
      getNavLabel('overview', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.overview', { defaultValue: '总览' })
    })

    it('should call t with key "expanded.nav.song" and defaultValue "歌曲"', () => {
      const t = createMockT()
      getNavLabel('song', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.song', { defaultValue: '歌曲' })
    })

    it('should call t with key "expanded.nav.tools" and defaultValue "工具"', () => {
      const t = createMockT()
      getNavLabel('tools', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.tools', { defaultValue: '工具' })
    })

    it('should call t with key "expanded.nav.translation" and defaultValue "翻译"', () => {
      const t = createMockT()
      getNavLabel('translation', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.translation', { defaultValue: '翻译' })
    })

    it('should call t with key "expanded.nav.performanceMonitor" and defaultValue "性能监控"', () => {
      const t = createMockT()
      getNavLabel('performanceMonitor', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.performanceMonitor', { defaultValue: '性能监控' })
    })

    it('should call t with key "expanded.nav.agentUsage" and defaultValue "Agent用量"', () => {
      const t = createMockT()
      getNavLabel('agentUsage', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.agentUsage', { defaultValue: 'Agent用量' })
    })

    it('should call t with key "expanded.nav.maxExpand" and defaultValue "最大展开"', () => {
      const t = createMockT()
      getNavLabel('maxExpand', t)
      expect(t).toHaveBeenCalledWith('expanded.nav.maxExpand', { defaultValue: '最大展开' })
    })
  })

  describe('return value', () => {
    it('should return whatever t() returns', () => {
      const t = vi.fn(() => 'translated-label')
      const result = getNavLabel('hover', t)
      expect(result).toBe('translated-label')
    })

    it('should return a different value when t returns differently per call', () => {
      const t = vi.fn()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second')
      expect(getNavLabel('hover', t)).toBe('first')
      expect(getNavLabel('overview', t)).toBe('second')
    })
  })

  describe('edge cases — fallback default value', () => {
    it('should use "最大展开" as defaultValue for any unrecognized tab value', () => {
      const t = createMockT()
      // Pass an unexpected string to trigger the final else branch
      getNavLabel('unknownTab' as never, t)
      expect(t).toHaveBeenCalledWith('expanded.nav.unknownTab', { defaultValue: '最大展开' })
    })

    it('should use "最大展开" as defaultValue for an empty string tab', () => {
      const t = createMockT()
      getNavLabel('' as never, t)
      expect(t).toHaveBeenCalledWith('expanded.nav.', { defaultValue: '最大展开' })
    })
  })

  describe('i18n key format', () => {
    it('should always prefix the key with "expanded.nav."', () => {
      const t = createMockT()
      const tabs = ['hover', 'overview', 'song', 'tools', 'translation', 'performanceMonitor', 'agentUsage', 'maxExpand'] as const
      tabs.forEach((tab) => {
        t.mockClear()
        getNavLabel(tab, t)
        const calledKey = t.mock.calls[0][0] as string
        expect(calledKey.startsWith('expanded.nav.')).toBe(true)
      })
    })

    it('should embed the tab ID directly after the prefix', () => {
      const t = createMockT()
      getNavLabel('song', t)
      expect(t.mock.calls[0][0]).toBe('expanded.nav.song')
    })
  })
})
