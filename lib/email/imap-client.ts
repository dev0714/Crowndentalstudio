import 'server-only';

import net from 'node:net';
import tls from 'node:tls';
import type { ImapConfig } from '@/lib/settings/email-inbox';

export type FetchedEmail = {
  uid: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// IMAP SEARCH SINCE wants a DD-Mon-YYYY date.
function imapDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, '0')}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function quote(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Decodes a small subset of RFC 2047 encoded-words used in email headers.
function decodeMimeWords(value: string) {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return Buffer.from(text, 'base64').toString('utf8');
      }
      const q = text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      return Buffer.from(q, 'binary').toString('utf8');
    } catch {
      return text;
    }
  });
}

function parseAddress(rawFrom: string) {
  const value = decodeMimeWords(rawFrom.trim());
  const angle = value.match(/<([^>]+)>/);
  const email = (angle ? angle[1] : value).trim();
  let name = angle ? value.slice(0, angle.index).trim() : '';
  name = name.replace(/^"|"$/g, '').trim();
  return { name: name || email, email };
}

// A single logical IMAP command/response, with literal-aware framing so we never
// stop reading in the middle of a {n}-byte literal.
class ImapSession {
  private socket: net.Socket;
  private buffer = '';
  private tagCounter = 0;

  constructor(socket: net.Socket) {
    this.socket = socket;
  }

  static async connect(config: ImapConfig, timeoutMs = 15000): Promise<ImapSession> {
    const socket: net.Socket = await new Promise((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      const s = config.tls
        ? tls.connect({ host: config.host, port: config.port, servername: config.host }, () => resolve(s))
        : net.connect({ host: config.host, port: config.port }, () => resolve(s));
      s.setTimeout(timeoutMs, () => s.destroy(new Error('IMAP connection timed out')));
      s.once('error', onError);
    });
    socket.setEncoding('latin1');
    const session = new ImapSession(socket);
    await session.waitForGreeting(timeoutMs);
    return session;
  }

  private waitForGreeting(timeoutMs: number) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for IMAP greeting')), timeoutMs);
      const onData = (chunk: string) => {
        this.buffer += chunk;
        if (this.buffer.includes('\r\n')) {
          clearTimeout(timer);
          this.socket.removeListener('data', onData);
          this.buffer = '';
          resolve();
        }
      };
      this.socket.on('data', onData);
      this.socket.once('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // Returns true when a complete tagged response for `tag` is present in `text`,
  // skipping over any {n} literals so literal content is never misread as protocol.
  private static isComplete(text: string, tag: string) {
    let i = 0;
    while (i < text.length) {
      const nl = text.indexOf('\r\n', i);
      if (nl === -1) return false;
      const line = text.slice(i, nl);
      const literal = line.match(/\{(\d+)\}$/);
      if (literal) {
        i = nl + 2 + Number(literal[1]);
        if (i > text.length) return false;
        continue;
      }
      if (line.startsWith(`${tag} `)) return true;
      i = nl + 2;
    }
    return false;
  }

  run(command: string, timeoutMs = 20000): Promise<string> {
    this.tagCounter += 1;
    const tag = `A${this.tagCounter}`;
    return new Promise((resolve, reject) => {
      let response = this.buffer;
      this.buffer = '';
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`IMAP command timed out: ${command.split(' ')[0]}`));
      }, timeoutMs);
      const onData = (chunk: string) => {
        response += chunk;
        if (ImapSession.isComplete(response, tag)) {
          cleanup();
          const status = new RegExp(`^${tag} (OK|NO|BAD)(.*)$`, 'm').exec(response);
          if (status && status[1] !== 'OK') {
            const detail = (status[2] || '').trim();
            const command0 = command.split(' ')[0];
            reject(new Error(detail ? `${command0} failed: ${detail}` : `${command0} failed (IMAP ${status[1]})`));
            return;
          }
          resolve(response);
        }
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.socket.removeListener('data', onData);
        this.socket.removeListener('error', onError);
      };
      this.socket.on('data', onData);
      this.socket.once('error', onError);
      this.socket.write(`${tag} ${command}\r\n`);
    });
  }

  close() {
    try {
      this.socket.write(`Z999 LOGOUT\r\n`);
    } catch {
      /* ignore */
    }
    this.socket.destroy();
  }
}

function parseHeaderBlock(block: string) {
  // Unfold folded header lines (continuation lines begin with whitespace).
  const unfolded = block.replace(/\r\n[ \t]+/g, ' ');
  const headers: Record<string, string> = {};
  unfolded.split('\r\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
  });
  return headers;
}

function parseFetchResponse(response: string): FetchedEmail[] {
  const emails: FetchedEmail[] = [];
  // Walk literals by declared size so header content never breaks parsing.
  const marker = /UID (\d+)[^{]*\{(\d+)\}\r\n/g;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(response)) !== null) {
    const uid = match[1];
    const size = Number(match[2]);
    const start = match.index + match[0].length;
    const block = response.slice(start, start + size);
    const headers = parseHeaderBlock(block);
    const { name, email } = parseAddress(headers.from || '');
    emails.push({
      uid,
      from: name,
      fromEmail: email,
      subject: decodeMimeWords(headers.subject || '(no subject)'),
      date: headers.date || '',
    });
    marker.lastIndex = start + size;
  }
  return emails;
}

// Verifies the configured mailbox can be reached: connect, login, select.
// Returns the number of messages the server reports in the mailbox.
export async function testImapConnection(config: ImapConfig): Promise<{ messageCount: number }> {
  const session = await ImapSession.connect(config);
  try {
    await session.run(`LOGIN ${quote(config.user)} ${quote(config.password)}`);
    const selectResponse = await session.run(`SELECT ${quote(config.mailbox)}`);
    const existsLine = selectResponse.split('\r\n').find((line) => /^\* \d+ EXISTS/.test(line));
    const messageCount = existsLine ? Number(existsLine.replace(/[^\d]/g, '')) : 0;
    return { messageCount: Number.isFinite(messageCount) ? messageCount : 0 };
  } finally {
    session.close();
  }
}

// Pulls emails received since `sinceDate` from the configured mailbox.
export async function fetchRecentEmails(
  config: ImapConfig,
  sinceDate: Date,
  opts: { max?: number } = {},
): Promise<FetchedEmail[]> {
  const max = opts.max ?? 200;
  const session = await ImapSession.connect(config);
  try {
    await session.run(`LOGIN ${quote(config.user)} ${quote(config.password)}`);
    await session.run(`SELECT ${quote(config.mailbox)}`);

    const searchResponse = await session.run(`UID SEARCH SINCE ${imapDate(sinceDate)}`);
    const searchLine = searchResponse.split('\r\n').find((line) => line.startsWith('* SEARCH'));
    const uids = (searchLine ? searchLine.replace('* SEARCH', '').trim().split(/\s+/) : [])
      .filter((value) => /^\d+$/.test(value));

    if (uids.length === 0) {
      return [];
    }

    // Newest first, capped.
    const selected = uids.map(Number).sort((a, b) => b - a).slice(0, max);
    const fetchResponse = await session.run(
      `UID FETCH ${selected.join(',')} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])`,
    );

    const emails = parseFetchResponse(fetchResponse);
    // Filter again on the parsed Date header in case the server is generous with SINCE.
    const cutoff = sinceDate.getTime();
    return emails
      .filter((email) => {
        const time = email.date ? new Date(email.date).getTime() : Number.NaN;
        return Number.isNaN(time) ? true : time >= cutoff;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } finally {
    session.close();
  }
}
