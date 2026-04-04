import { supabaseServer } from '@/lib/supabase/server';
import type { PublicAuthUser } from '@/lib/auth/public-user';

type WriteAuditEntryParams = {
  actor: PublicAuthUser;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEntry({
  actor,
  action,
  entityType,
  entityId = null,
  metadata = {},
}: WriteAuditEntryParams) {
  try {
    const { error } = await supabaseServer.from('audit_log').insert([
      {
        actor_user_id: actor.id,
        actor_email: actor.email,
        actor_role: actor.role,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      },
    ]);

    if (error) {
      console.warn('[audit] Failed to write audit entry:', error.message);
    }
  } catch (error) {
    console.warn('[audit] Failed to write audit entry:', error);
  }
}
