import 'server-only';

import { getOpenAiApiKey } from '@/lib/settings/openai-key';
import { EMAIL_GROUP_LABELS, type EmailGroupSummary } from '@/lib/email/email-grouping';

export type EmailDigest = {
  summary: string;
  highlights: string[];
};

// Builds the compact, PII-light payload the model summarizes: subject + sender + group.
function buildPromptInput(groups: EmailGroupSummary[]) {
  return groups
    .map((group) => {
      const lines = group.emails
        .slice(0, 25)
        .map((email) => `- (${email.from || email.fromEmail}) ${email.subject}`)
        .join('\n');
      return `## ${group.label} (${group.count})\n${lines}`;
    })
    .join('\n\n');
}

export async function summarizeEmailDigest(groups: EmailGroupSummary[]): Promise<EmailDigest | null> {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  if (total === 0) {
    return { summary: 'No emails were received in the selected period.', highlights: [] };
  }

  const apiKey = await getOpenAiApiKey();
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini';
  const groupList = Object.values(EMAIL_GROUP_LABELS).join(', ');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant for a dental practice front desk. You are given the last 48 hours of inbound emails, already sorted into groups (' +
            groupList +
            '). Write a concise operational summary for staff. Respond ONLY as JSON with keys "summary" (2-4 sentence string overview) and "highlights" (array of up to 6 short strings, each a specific item that needs attention, most urgent first). Do not invent emails that are not listed.',
        },
        {
          role: 'user',
          content: `Here are the ${total} emails from the last 48 hours by group:\n\n${buildPromptInput(groups)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `OpenAI returned ${response.status}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as { summary?: string; highlights?: unknown };
    return {
      summary: String(parsed.summary || '').trim() || 'Summary unavailable.',
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.map((item) => String(item)).filter(Boolean).slice(0, 6)
        : [],
    };
  } catch {
    return { summary: content.trim(), highlights: [] };
  }
}
