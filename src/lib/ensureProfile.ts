import type { Session } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Usuarios cuyo perfil ya se ha comprobado en esta instancia del servidor. */
const checked = new Set<string>();

/**
 * Garantiza que existe la fila de profiles del usuario de la sesión.
 * Normalmente se crea al iniciar sesión, pero si la sesión es anterior a la
 * BD (o falló aquel insert) todo lo demás rompería por clave foránea.
 * Un trigger en la BD crea las categorías por defecto al insertarlo.
 */
export async function ensureProfile(session: Session | null): Promise<void> {
  const user = session?.user;
  if (!user?.id || checked.has(user.id)) return;

  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      id: user.id,
      email: user.email || `${user.id}@sin-email.local`,
      full_name: user.name ?? null,
      avatar_url: user.image ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (error) {
    console.error('❌ ensureProfile:', error.message);
    return; // se reintenta en la siguiente petición
  }
  checked.add(user.id);
}
