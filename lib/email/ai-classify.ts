import 'server-only';

import { getOpenAiApiKey } from '@/lib/settings/openai-key';
import { parseAiVerdicts, type AiVerdict } from '@/lib/email/ai-classify-parse';

export type ClassifiableEmail = { uid: string; from: string; fromEmail: string; subject: string };

const BATCH = 40;

const SYSTEM_PROMPT = `You sort inbound email for the front desk of Crown Dental Studio, a family and cosmetic dental practice in Durban North, South Africa. For each email you get the sender name, sender address and subject line only.

Use what you know about the sender organisation and the wording of the subject to decide, the way an experienced receptionist would:
- group: one of appointments, lab, accounts, suppliers, patient_enquiries, marketing, other.
  appointments = a patient or staff member about a booking; lab = a dental laboratory about cases, impressions, crowns, dentures, invoices from the lab; accounts = banks, card statements, medical aid schemes, invoices or payments the practice must act on; suppliers = dental or office suppliers about orders, deliveries or quotes the practice asked for; patient_enquiries = a member of the public asking about treatment, prices or emergencies; marketing = newsletters, promotions, cold outreach, marketplace pitches (Alibaba, GoDaddy upsells, SaaS trials), social media and app notifications; other = anything else.
- important: true only if a person at the practice should read it soon. Money owed or due, patient or lab matters, medical aid, regulatory or bank notices are important. Promotions, cold sales pitches, domain or hosting upsells, automatic renewal FYIs, social notifications, newsletters, receipts for subscriptions already paid and system alerts are not important.
- reason: one short plain sentence a receptionist would find useful, naming what the sender is (e.g. "GoDaddy domain upsell", "Diners Club card statement", "Ridge Dental lab invoice").
- sender_kind: two or three words describing the sender type (e.g. "Dental lab", "Bank", "Domain registrar", "Patient", "Supplier marketplace").

Respond ONLY as JSON: {"emails":[{"uid":"...","group":"...","important":true,"reason":"...","sender_kind":"..."}]} with one entry per uid you were given.`;

async function classifyBatch(apiKey: string, model: string, batch: ClassifiableEmail[]): Promise<AiVerdict[]> {
  const list = batch
    .map((email) => `uid=${email.uid} | from="${email.from.replace(/"/g, '')}" <${email.fromEmail}> | subject="${email.subject.replace(/"/g, '').slice(0, 200)}"`)
    .join('\n');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Sort these ${batch.length} emails:\n${list}` },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `OpenAI returned ${response.status}`);
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return parseAiVerdicts(payload.choices?.[0]?.message?.content || '', batch.map((email) => email.uid));
}

/**
 * Asks the model to sort a list of emails. Returns a map by uid; emails the model
 * did not answer for are simply absent, so callers keep their rule-based verdict.
 * Returns null when no OpenAI key is configured.
 */
export async function classifyEmailsWithAi(emails: ClassifiableEmail[]): Promise<Map<string, AiVerdict> | null> {
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) return null;
  const model = process.env.OPENAI_CLASSIFY_MODEL || process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini';
  const verdicts = new Map<string, AiVerdict>();
  for (let index = 0; index < emails.length; index += BATCH) {
    const batch = emails.slice(index, index + BATCH);
    try {
      (await classifyBatch(apiKey, model, batch)).forEach((verdict) => verdicts.set(verdict.uid, verdict));
    } catch (error) {
      console.error('[inbox] AI classification batch failed:', error);
      // Keep going; the rule-based verdicts cover whatever the model missed.
    }
  }
  return verdicts;
}
