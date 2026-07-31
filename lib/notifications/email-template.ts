export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Renders a simple, email-client-safe HTML shell shared by all patient notifications.
export function renderNotificationEmailHtml(heading: string, bodyLines: string[]) {
  const paragraphs = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(line).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="background:linear-gradient(90deg,#2563eb,#0891b2);padding:24px 28px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(heading)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">${paragraphs}</td>
      </tr>
    </table>
  </body>
</html>`;
}

export function bodyLinesToText(bodyLines: string[]) {
  return bodyLines.join('\n\n');
}
