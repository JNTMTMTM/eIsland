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
 * @file dev-icon.test.ts
 * @description unit test
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  DEVICON_LANGUAGE_ALIASES,
  DevIcon,
  resolveDevIconByFileName,
  resolveDevIconByLanguage,
  resolveDevIconLanguage,
} from '../dev-icon';

describe('DEVICON_LANGUAGE_ALIASES', () => {
  it('maps common short aliases to canonical names', () => {
    expect(DEVICON_LANGUAGE_ALIASES['js']).toBe('javascript');
    expect(DEVICON_LANGUAGE_ALIASES['ts']).toBe('typescript');
    expect(DEVICON_LANGUAGE_ALIASES['jsx']).toBe('react');
    expect(DEVICON_LANGUAGE_ALIASES['tsx']).toBe('react');
    expect(DEVICON_LANGUAGE_ALIASES['py']).toBe('python');
    expect(DEVICON_LANGUAGE_ALIASES['yml']).toBe('yaml');
    expect(DEVICON_LANGUAGE_ALIASES['sh']).toBe('bash');
    expect(DEVICON_LANGUAGE_ALIASES['md']).toBe('markdown');
  });

  it('maps plaintext-like extensions to plaintext', () => {
    expect(DEVICON_LANGUAGE_ALIASES['txt']).toBe('plaintext');
    expect(DEVICON_LANGUAGE_ALIASES['log']).toBe('plaintext');
    expect(DEVICON_LANGUAGE_ALIASES['csv']).toBe('plaintext');
    expect(DEVICON_LANGUAGE_ALIASES['ini']).toBe('plaintext');
    expect(DEVICON_LANGUAGE_ALIASES['toml']).toBe('plaintext');
    expect(DEVICON_LANGUAGE_ALIASES['env']).toBe('plaintext');
  });
});

describe('DevIcon', () => {
  it('contains expected language keys', () => {
    const expectedKeys = [
      'javascript', 'typescript', 'react', 'python', 'java',
      'c', 'cplusplus', 'csharp', 'go', 'rust', 'php', 'ruby',
      'swift', 'kotlin', 'dart', 'html', 'css', 'sass', 'less',
      'vue', 'svelte', 'angular', 'json', 'yaml', 'xml',
      'bash', 'powershell', 'dockerfile', 'docker', 'sql', 'markdown',
    ];
    expectedKeys.forEach((key) => {
      expect(DevIcon).toHaveProperty(key);
    });
  });

  it('values are SVG path strings', () => {
    Object.values(DevIcon).forEach((value) => {
      expect(value).toMatch(/^\.\.\/svg\/devicons\/.+\.svg$/);
    });
  });
});

describe('resolveDevIconLanguage', () => {
  it('returns plaintext for empty string', () => {
    expect(resolveDevIconLanguage('')).toBe('plaintext');
  });

  it('resolves common aliases', () => {
    expect(resolveDevIconLanguage('js')).toBe('javascript');
    expect(resolveDevIconLanguage('ts')).toBe('typescript');
    expect(resolveDevIconLanguage('jsx')).toBe('react');
    expect(resolveDevIconLanguage('tsx')).toBe('react');
    expect(resolveDevIconLanguage('py')).toBe('python');
    expect(resolveDevIconLanguage('yml')).toBe('yaml');
    expect(resolveDevIconLanguage('sh')).toBe('bash');
  });

  it('returns lowercase original for unknown languages', () => {
    expect(resolveDevIconLanguage('unknown')).toBe('unknown');
    expect(resolveDevIconLanguage('XYZ')).toBe('xyz');
  });

  it('normalizes case before resolving', () => {
    expect(resolveDevIconLanguage('JS')).toBe('javascript');
    expect(resolveDevIconLanguage('Python')).toBe('python');
  });
});

describe('resolveDevIconByLanguage', () => {
  it('returns SVG path for known languages', () => {
    expect(resolveDevIconByLanguage('javascript')).toBe('../svg/devicons/javascript-original.svg');
    expect(resolveDevIconByLanguage('python')).toBe('../svg/devicons/python-original.svg');
    expect(resolveDevIconByLanguage('react')).toBe('../svg/devicons/react-original.svg');
  });

  it('resolves aliases then returns SVG path', () => {
    expect(resolveDevIconByLanguage('js')).toBe('../svg/devicons/javascript-original.svg');
    expect(resolveDevIconByLanguage('ts')).toBe('../svg/devicons/typescript-original.svg');
    expect(resolveDevIconByLanguage('py')).toBe('../svg/devicons/python-original.svg');
  });

  it('returns undefined for unknown languages', () => {
    expect(resolveDevIconByLanguage('unknown')).toBeUndefined();
    expect(resolveDevIconByLanguage('brainfuck')).toBeUndefined();
  });
});

describe('resolveDevIconByFileName', () => {
  it('resolves files with known extensions', () => {
    expect(resolveDevIconByFileName('app.ts')).toBe('../svg/devicons/typescript-original.svg');
    expect(resolveDevIconByFileName('index.js')).toBe('../svg/devicons/javascript-original.svg');
    expect(resolveDevIconByFileName('main.py')).toBe('../svg/devicons/python-original.svg');
    expect(resolveDevIconByFileName('style.css')).toBe('../svg/devicons/css3-original.svg');
    expect(resolveDevIconByFileName('page.html')).toBe('../svg/devicons/html5-original.svg');
  });

  it('handles files with multiple dots', () => {
    expect(resolveDevIconByFileName('config.test.ts')).toBe('../svg/devicons/typescript-original.svg');
    expect(resolveDevIconByFileName('app.spec.js')).toBe('../svg/devicons/javascript-original.svg');
  });

  it('returns undefined for files without extension', () => {
    expect(resolveDevIconByFileName('Makefile')).toBeUndefined();
    expect(resolveDevIconByFileName('Dockerfile')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(resolveDevIconByFileName('')).toBeUndefined();
  });
});
