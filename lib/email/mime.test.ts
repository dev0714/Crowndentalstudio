import assert from 'node:assert/strict';
import { test } from 'node:test';
import { htmlToText, parseMimeMessage, sanitizeEmailHtml } from './mime';

test('multipart/alternative with quoted-printable text and base64 html', () => {
  const html = '<p>Hello <b>there</b> – invoice attached</p>';
  const raw = [
    'Message-ID: <abc@lab.co.za>',
    'Content-Type: multipart/alternative; boundary="B1"',
    '',
    '--B1',
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    'Hello there =E2=80=93 invoice=',
    ' attached',
    '--B1',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64'),
    '--B1--',
    '',
  ].join('\r\n');
  const parsed = parseMimeMessage(raw);
  assert.equal(parsed.text, 'Hello there – invoice attached');
  assert.equal(parsed.html, html);
  assert.equal(parsed.messageId, '<abc@lab.co.za>');
  assert.equal(parsed.hasAttachments, false);
});

test('multipart/mixed marks attachments and keeps the text', () => {
  const raw = [
    'Content-Type: multipart/mixed; boundary=XYZ',
    '',
    '--XYZ',
    'Content-Type: text/plain',
    '',
    'See attached.',
    '--XYZ',
    'Content-Type: application/pdf; name="inv.pdf"',
    'Content-Disposition: attachment; filename="inv.pdf"',
    'Content-Transfer-Encoding: base64',
    '',
    'JVBERi0=',
    '--XYZ--',
  ].join('\n');
  const parsed = parseMimeMessage(raw);
  assert.equal(parsed.text, 'See attached.');
  assert.equal(parsed.hasAttachments, true);
});

test('plain single-part message and latin1 charset', () => {
  const raw = 'Content-Type: text/plain; charset=iso-8859-1\nContent-Transfer-Encoding: 8bit\n\nCafé';
  assert.equal(parseMimeMessage(raw).text, 'Café');
  assert.equal(parseMimeMessage('Subject: x\n\njust text').text, 'just text');
});

test('sanitizeEmailHtml removes scripts and handlers and opens links in a new tab', () => {
  const out = sanitizeEmailHtml('<p onclick="x()">hi</p><script>alert(1)</script><a href="javascript:evil()">a</a><a href="https://x.com">b</a>');
  assert.equal(out.includes('<script'), false);
  assert.equal(out.includes('onclick'), false);
  assert.equal(out.includes('javascript:'), false);
  assert.equal(out.includes('target="_blank"'), true);
  assert.equal(htmlToText('<p>One</p><p>Two &amp; three</p>'), 'One\nTwo & three');
});
