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
 * @file collect-build-sizes.ts
 * @description Collects build output file sizes (raw + gzip) from the out/ directory.
 * Outputs JSON to the path specified by --output, or stdout by default.
 * @author 鸡哥
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

/** File size record with raw and gzip sizes */
interface FileSize {
  path: string;
  raw: number;
  gzip: number;
}

/** CLI argument: --output <path> */
const outputIdx = process.argv.indexOf('--output');
const outputPath = outputIdx !== -1 ? process.argv[outputIdx + 1] : null;

const outDir = join(process.cwd(), 'out');
const extensions = new Set(['.js', '.css', '.html']);

/**
 * Recursively collect file sizes from a directory
 * @param dir - directory to walk
 * @param baseDir - root dir for relative path calculation
 * @returns list of file size records
 */
function collectSizes(dir: string, baseDir: string): FileSize[] {
  const results: FileSize[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSizes(fullPath, baseDir));
    } else if (extensions.has(extname(entry.name))) {
      const stat = statSync(fullPath);
      const raw = stat.size;
      const gzip = gzipSync(readFileSync(fullPath)).length;
      results.push({
        path: relative(baseDir, fullPath).replace(/\\/g, '/'),
        raw,
        gzip,
      });
    }
  }

  return results;
}

const sizes = collectSizes(outDir, outDir);
const json = JSON.stringify(sizes, null, 2);

if (outputPath) {
  writeFileSync(outputPath, json, 'utf8');
  console.log(`Wrote ${sizes.length} entries to ${outputPath}`);
} else {
  console.log(json);
}
