/** URL a la que el banco devuelve al usuario tras autorizar. Debe estar en la whitelist de Enable Banking. */
export function getRedirectUrl(): string {
  if (process.env.ENABLE_BANKING_REDIRECT_URL) return process.env.ENABLE_BANKING_REDIRECT_URL;
  const base = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/banking/callback`;
}

/** Duración por defecto del permiso si el banco no indica máximo (180 días, lo habitual con PSD2). */
export const DEFAULT_CONSENT_SECONDS = 180 * 24 * 3600;
