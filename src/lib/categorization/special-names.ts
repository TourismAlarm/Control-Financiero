/**
 * Nombres de las categorías especiales (sin dependencias: se usa también en el navegador).
 * Ver special.ts.
 */
export const TRANSFER_CATEGORY = 'Entre cuentas';
export const REFUND_CATEGORY = 'Devoluciones';

const norm = (s: string | null | undefined) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const isTransferCategory = (name?: string | null) => norm(name) === norm(TRANSFER_CATEGORY);
export const isRefundCategory = (name?: string | null) => norm(name) === norm(REFUND_CATEGORY);
export const isSpecialCategory = (name?: string | null) => isTransferCategory(name) || isRefundCategory(name);
