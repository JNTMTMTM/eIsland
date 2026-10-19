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
 */

/**
 * @file mail.spec.ts
 * @description 通过本地 IMAP 服务验证真实邮件库、preload 与主进程 IPC 的协议兼容性。
 * @author 鸡哥
 */

import { createServer, type Socket } from 'node:net';
import { test, expect } from './fixtures';

test('lists IMAP envelopes through the real Electron bridge without downloading message bodies', async ({ desktop }) => {
  const commands: string[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    socket.write('* PREAUTH [CAPABILITY IMAP4rev1] Local test mailbox ready\r\n');
    let buffered = '';
    socket.on('data', (chunk: string) => {
      buffered += chunk;
      let end: number;
      while ((end = buffered.indexOf('\r\n')) >= 0) {
        const line = buffered.slice(0, end);
        buffered = buffered.slice(end + 2);
        commands.push(line);
        const [tag, command, sequence] = line.split(' ');
        switch (command?.toUpperCase()) {
          case 'CAPABILITY':
            socket.write('* CAPABILITY IMAP4rev1\r\n');
            break;
          case 'LIST':
            socket.write('* LIST (\\HasNoChildren) "/" "INBOX"\r\n');
            break;
          case 'SELECT':
            socket.write('* FLAGS (\\Seen)\r\n* 2 EXISTS\r\n* OK [UIDVALIDITY 99] Mailbox generation\r\n');
            break;
          case 'FETCH': {
            const number = Number(sequence);
            if (number !== 1 && number !== 2) {
              socket.write(`${tag} BAD Unexpected message sequence\r\n`);
              continue;
            }
            const envelope = `("Mon, 19 Oct 2026 12:00:00 +0000" "Dependency message ${number}" (("Sender" NIL "sender" "example.test")) NIL NIL ((NIL NIL "reader" "example.test")) NIL NIL NIL "<${number}@example.test>")`;
            socket.write(`* ${number} FETCH (UID ${100 + number} FLAGS () RFC822.SIZE 128 ENVELOPE ${envelope})\r\n`);
            break;
          }
          case 'LOGOUT':
            socket.end(`* BYE Closing local mailbox\r\n${tag} OK LOGOUT completed\r\n`);
            continue;
          default:
            socket.write(`${tag} BAD Unexpected command\r\n`);
            continue;
        }
        socket.write(`${tag} OK ${command} completed\r\n`);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing loopback IMAP address.');
    const result = await desktop.main.evaluate((port) => window.api.mailInboxList({
      imapHost: '127.0.0.1', imapPort: String(port), imapSecure: false,
      authUser: 'local-test', authSecret: 'local-test', emailAddress: 'reader@example.test',
    }, 2), address.port);
    expect(result.ok, result.message).toBe(true);
    expect(result.items.map(({ uid, uidValidity, subject, from, body }) => ({ uid, uidValidity, subject, from, body }))).toEqual([
      { uid: '102', uidValidity: '99', subject: 'Dependency message 2', from: 'Sender <sender@example.test>', body: '' },
      { uid: '101', uidValidity: '99', subject: 'Dependency message 1', from: 'Sender <sender@example.test>', body: '' },
    ]);
    expect(commands.some((line) => /FETCH.*BODY/i.test(line))).toBe(false);
    expect(commands.some((line) => /LOGOUT/i.test(line))).toBe(true);
    expect(desktop.rendererErrors).toEqual([]);
  } finally {
    sockets.forEach((socket) => socket.destroy());
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
