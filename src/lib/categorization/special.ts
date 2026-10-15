/**
 * Categorías especiales: no son gasto ni ingreso de verdad.
 *
 *   Entre cuentas (ingreso y gasto) → dinero que va de una cuenta tuya a otra y el banco
 *                                     no lo marcó como traspaso. Al ponerla, el movimiento
 *                                     pasa a ser traspaso (kind = internal_transfer).
 *   Devoluciones (ingreso)          → te devuelven dinero (un Bizum que no quieren, una
 *                                     compra devuelta). No es ingreso: resta del gasto.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';

import { REFUND_CATEGORY, TRANSFER_CATEGORY } from './special-names';
export * from './special-names';

const SPECIAL = [
  { name: TRANSFER_CATEGORY, type: 'income', icon: '⇄', color: '#5B6070' },
  { name: TRANSFER_CATEGORY, type: 'expense', icon: '⇄', color: '#5B6070' },
  { name: REFUND_CATEGORY, type: 'income', icon: '↩', color: '#17694A' },
] as const;

const ensured = new Set<string>();

/** Crea las categorías especiales si el usuario no las tiene. */
export async function ensureSpecialCategories(userId: string): Promise<void> {
  if (ensured.has(userId)) return;
  const { error } = await supabaseAdmin.from('categories').upsert(
    SPECIAL.map((c) => ({ ...c, user_id: userId, is_system: true })),
    { onConflict: 'user_id,name,type', ignoreDuplicates: true }
  );
  if (error) {
    console.error('❌ ensureSpecialCategories:', error.message);
    return;
  }
  ensured.add(userId);
}
