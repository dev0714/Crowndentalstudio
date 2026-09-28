import 'server-only';

import { getOpenAiApiKey } from '@/lib/settings/openai-key';
import { parseAiVerdicts, type AiVerdict } from '@/lib/email/ai-classify-parse';

export type ClassifiableEmail = { uid: string; from: string; fromEmail: string; subject: string };

const BATCH = 40;

const SYSTEM_PROMPT = `You sort inbound email for the front desk of Crown Dental Studio, a family and cosmetic dental practice in Durban North, South Africa. The mailbox is the principal dentist's Gmail, so practice mail is mixed with personal mail. For each email you get the sender name, sender address and subject line only.

Use what you know about the sender organisation and the wording of the subject to decide, the way an experienced receptionist would:
- group: one of appointments, lab, accounts, suppliers, patient_enquiries, marketing, personal, other.
  appointments = a patient or staff member about a dental booking (NOT hotel, flight or ride bookings);
  lab = a dental laboratory about cases, impressions, crowns, dentures, or a lab's invoice;
  accounts = banks and cards (Investec, Nedbank, Standard Bank, Absa, FNB, Capitec, Amex, Diners Club, PayPal, iKhokha, Yoco), medical aid schemes and claim switches (Mediswitch, eMD, Discovery, Momentum, Bonitas, GEMS, Healthbridge), SARS, invoices, statements, remittances or payments the practice must watch;
  suppliers = dental or office suppliers (KZN Dental, Wright-Millners, Dentiphoto, Henry Schein, Dentsply, Ivoclar) about orders, deliveries, quotes or invoices the practice asked for;
  patient_enquiries = a member of the public or an existing patient writing about THEIR OWN care: asking about treatment, prices, an emergency, a referral, a complaint or a follow-up. Other dental clinics, dental product companies, training courses and conference invitations are NEVER patient_enquiries; they are marketing;
  marketing = newsletters (Media24, Beehiiv, Substack), promotions, cold outreach, marketplace pitches (Alibaba, GoDaddy upsells, hosting, SaaS trials), dental association circulars (SADA, CAPP), software and app notifications (Grammarly, Adobe, Dropbox, Google, Microsoft), supplier promotions;
  personal = the dentist's private life: LinkedIn, Facebook, Instagram, WhatsApp, Uber, Bolt, Booking.com, Airbnb, airlines, Skyscanner, online shops (Takealot, Bob Shop, Builders, NetFlorist), streaming, fitness, personal purchases and receipts;
  other = anything that fits none of these, including LeadSync (the practice's own CRM vendor: its notifications, outstanding-items digests and support tickets) and mail from the practice's own staff addresses (crowndentalstudio09@gmail.com, info@crowndentalstudio.co.za, @leadsync.co.za staff).
- important: true only if a person at the practice should read it soon. Every patient_enquiries email is important without exception. Mail from the practice's own staff and LeadSync support tickets are important. Money owed or due, bank and card statements, medical aid remittances and claim reports, patient or lab matters, regulatory notices and supplier invoices are important. Promotions, cold sales pitches, domain or hosting upsells, automatic renewal FYIs, social and app notifications, newsletters, personal mail, ride and travel receipts, and generic security or sign-in alerts are not important.
- reason: one short plain sentence a receptionist would find useful, naming what the sender is (e.g. "GoDaddy domain upsell", "Investec payment confirmation", "Mediswitch daily claims report", "LinkedIn notification", "Uber ride receipt").
- sender_kind: two or three words describing the sender type (e.g. "Dental lab", "Bank", "Medical aid switch", "Domain registrar", "Patient", "Social network", "Ride hailing", "Newsletter").

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
