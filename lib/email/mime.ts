/**
 * A small MIME reader for displaying email in the CRM. Handles the shapes real
 * inboxes produce (multipart/alternative, multipart/mixed with attachments,
 * base64 and quoted-printable bodies, common charsets) without any dependency.
 */

export type ParsedMessage = {
  text: string;
  html: string;
  hasAttachments: boolean;
  messageId: string;
  contentType: string;
};

type Headers = Record<string, string>;

function splitHeadersAndBody(raw: string): { headers: Headers; body: string } {
  const normalised = raw.replace(/\r\n/g, '\n');
  const cut = normalised.indexOf('\n\n');
  const headerBlock = cut === -1 ? normalised : normalised.slice(0, cut);
  const body = cut === -1 ? '' : normalised.slice(cut + 2);
  const headers: Headers = {};
  let current = '';
  headerBlock.split('\n').forEach((line) => {
    if (/^[ \t]/.test(line) && current) {
      headers[current] += ' ' + line.trim();
      return;
    }
    const colon = line.indexOf(':');
    if (colon === -1) return;
    current = line.slice(0, colon).trim().toLowerCase();
    headers[current] = (headers[current] ? headers[current] + ', ' : '') + line.slice(colon + 1).trim();
  });
  return { headers, body };
}

function param(headerValue: string | undefined, name: string): string {
  if (!headerValue) return '';
  const match = headerValue.match(new RegExp(`${name}\\*?=("([^"]*)"|([^;\\s]+))`, 'i'));
  if (!match) return '';
  const value = match[2] ?? match[3] ?? '';
  // RFC 2231 form: charset''value
  return value.includes("''") ? decodeURIComponent(value.split("''")[1]) : value;
}

function decodeQuotedPrintable(input: string): Uint8Array {
  const cleaned = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (char === '=' && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(index + 1, index + 3))) {
      bytes.push(parseInt(cleaned.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(char.charCodeAt(0) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

function bytesToString(bytes: Uint8Array, charset: string): string {
  const label = (charset || 'utf-8').toLowerCase().replace(/^"|"$/g, '');
  const known = ['utf-8', 'utf8', 'iso-8859-1', 'latin1', 'windows-1252', 'us-ascii', 'ascii'];
  try {
    return new TextDecoder(known.includes(label) ? (label === 'us-ascii' || label === 'ascii' ? 'utf-8' : label) : 'utf-8', { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function decodeBody(body: string, encoding: string, charset: string): string {
  const enc = (encoding || '').trim().toLowerCase();
  if (enc === 'base64') {
    return bytesToString(Uint8Array.from(Buffer.from(body.replace(/[^A-Za-z0-9+/=]/g, ''), 'base64')), charset);
  }
  if (enc === 'quoted-printable') {
    return bytesToString(decodeQuotedPrintable(body), charset);
  }
  // 7bit / 8bit / binary: the transport already gave us characters.
  return charset && !/utf-?8|ascii/i.test(charset) ? bytesToString(Uint8Array.from(Buffer.from(body, 'binary')), charset) : body;
}

type Collected = { text: string; html: string; attachments: number };

function walk(raw: string, into: Collected, depth = 0) {
  if (depth > 8) return;
  const { headers, body } = splitHeadersAndBody(raw);
  const contentType = (headers['content-type'] || 'text/plain').toLowerCase();
  const disposition = (headers['content-disposition'] || '').toLowerCase();
  const isAttachment = disposition.startsWith('attachment') || (Boolean(param(headers['content-disposition'], 'filename')) && !contentType.startsWith('text/'));

  if (contentType.startsWith('multipart/')) {
    const boundary = param(headers['content-type'], 'boundary');
    if (!boundary) return;
    const parts = body.split(`--${boundary}`).slice(1);
    parts.forEach((part) => {
      if (part.startsWith('--')) return; // closing marker
      walk(part.replace(/^\n/, ''), into, depth + 1);
    });
    return;
  }

  if (isAttachment) {
    into.attachments += 1;
    return;
  }

  const charset = param(headers['content-type'], 'charset');
  const decoded = decodeBody(body, headers['content-transfer-encoding'] || '', charset);
  if (contentType.startsWith('text/plain') && !into.text) into.text = decoded.trim();
  else if (contentType.startsWith('text/html') && !into.html) into.html = decoded.trim();
  else if (contentType.startsWith('message/rfc822')) walk(body, into, depth + 1);
  else if (!contentType.startsWith('text/')) into.attachments += 1;
}

export function parseMimeMessage(raw: string): ParsedMessage {
  const { headers } = splitHeadersAndBody(raw);
  const collected: Collected = { text: '', html: '', attachments: 0 };
  walk(raw, collected);
  return {
    text: collected.text,
    html: collected.html,
    hasAttachments: collected.attachments > 0,
    messageId: (headers['message-id'] || '').trim(),
    contentType: (headers['content-type'] || '').split(';')[0].trim().toLowerCase(),
  };
}

/** Makes HTML safe to show inside a sandboxed iframe: no scripts, handlers or javascript: URLs. */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<(object|embed|form|input|button|meta)[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, '$1=$2#$2')
    .replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer"');
}

export function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textToHtml(text: string): string {
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${escapeText(text)}</div>`;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
