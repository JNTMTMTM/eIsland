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
 * @file qrcGolden.test.ts
 * @description QQ QRC 独立密文固定向量及真实 TripleDES、inflate 联合边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { decryptQRC } from '../qrc';
import { qrcTripleDesDecrypt } from '../qrcDes';

// 固定向量由 QQMusicDecoder 官方 C# 加密入口与 Node zlib 独立生成。
// https://github.com/WXRIW/QQMusicDecoder/blob/master/QQMusicDecoder/DESHelper.cs
const cipher = 'D6A2BE95D6447372A98925F6DC680E047092AA6F26860A3A399AB1398EB9B8A4';

describe('QRC independent ciphertext golden vectors', () => {
  it.each([
    [cipher, '[1000,500]Hello(1000,500)'],
    ['8FE1DB631378FCC5F411328AF1BA94C2', 'untimed'],
    ['D6A2BE95D6447372A98925F6DC680E0410850A742519975A3FD1120F4E9299D053AD9A872EA13321', '[1000,500]Hello(1000,500)\n[2000,500]untimed'],
  ])('decrypts and inflates independent ciphertext %s', async (input, text) => {
    expect(await decryptQRC(input)).toBe(text);
  });
  it('keeps the independent compressed byte vector before inflation', () => {
    const compressed = Buffer.from(qrcTripleDesDecrypt(cipher));
    expect(compressed.subarray(0, 2).toString('hex')).toBe('789c');
    expect(compressed).toHaveLength(32);
  });
  it('accepts whitespace in the public hexadecimal decoder', () => {
    expect(qrcTripleDesDecrypt(` \n${  cipher.match(/.{8}/g)!.join(' \t')  }\n`)).toEqual(qrcTripleDesDecrypt(cipher));
  });
  it.each(['A', 'GG', '00'])('rejects malformed cipher %s before inflate', async (input) => {
    await expect(decryptQRC(input)).rejects.toThrow('QRC:');
  });
  it.each([0, 8, 128, 136])('includes the appropriate diagnosis for %s invalid compressed bytes', async (length) => {
    const promise = decryptQRC('00'.repeat(length));
    await expect(promise).rejects.toThrow(length <= 128 ? '可能是此曲无 QRC' : '更可能是解压兼容差异或密文不匹配');
    await expect(promise).rejects.toThrow(`ciphertext 长度=${  length  }B`);
  });
});
