/**
 * Cliente mínimo de la API de Enable Banking (agregador PSD2).
 * Docs: https://enablebanking.com/docs/api/reference/
 *
 * Variables de entorno:
 *   ENABLE_BANKING_APP_ID       → id de la aplicación (va en el `kid` del JWT)
 *   ENABLE_BANKING_PRIVATE_KEY  → clave privada PEM descargada al registrar la app
 *                                 (se aceptan saltos de línea escapados como \n)
 *
 * Solo se usa en el servidor.
 */
import { createSign } from 'crypto';

const API_BASE = 'https://api.enablebanking.com';

export class EnableBankingError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = 'EnableBankingError';
  }
}

export function isEnableBankingConfigured(): boolean {
  return Boolean(process.env.ENABLE_BANKING_APP_ID && process.env.ENABLE_BANKING_PRIVATE_KEY);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** JWT RS256 firmado con la clave de la app. Vale 1 hora (el máximo permitido es 24 h). */
export function createJwt(now: number = Math.floor(Date.now() / 1000)): string {
  const appId = process.env.ENABLE_BANKING_APP_ID;
  const privateKey = process.env.ENABLE_BANKING_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!appId || !privateKey) {
    throw new Error('Faltan ENABLE_BANKING_APP_ID o ENABLE_BANKING_PRIVATE_KEY');
  }

  const header = base64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }));
  const payload = base64url(
    JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = base64url(signer.sign(privateKey));
  return `${header}.${payload}.${signature}`;
}

async function ebFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${createJwt()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // respuesta no JSON: se deja como texto
  }

  if (!res.ok) {
    const detail =
      (body && typeof body === 'object' && 'message' in body && String((body as { message: unknown }).message)) ||
      res.statusText;
    throw new EnableBankingError(`Enable Banking ${res.status}: ${detail}`, res.status, body);
  }
  return body as T;
}

// ─── Tipos (solo los campos que usamos) ──────────────────────────────────────

export interface Aspsp {
  name: string;
  country: string;
  logo?: string;
  maximum_consent_validity?: number; // segundos
}

export interface EbAccount {
  uid: string;
  account_id?: { iban?: string | null } | null;
  name?: string | null;
  details?: string | null;
  currency?: string | null;
}

export interface EbSession {
  session_id: string;
  accounts: EbAccount[];
  aspsp: { name: string; country: string };
  access: { valid_until: string };
}

export interface EbParty {
  name?: string | null;
}

export interface EbTransaction {
  entry_reference?: string | null;
  transaction_id?: string | null;
  transaction_amount: { currency: string; amount: string };
  credit_debit_indicator: 'CRDT' | 'DBIT';
  status?: string | null; // BOOK, PDNG...
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  creditor?: EbParty | null;
  creditor_account?: { iban?: string | null } | null;
  debtor?: EbParty | null;
  debtor_account?: { iban?: string | null } | null;
  remittance_information?: string[] | null;
  bank_transaction_code?: { description?: string | null } | null;
  note?: string | null;
  merchant_category_code?: string | null;
}

interface TransactionsPage {
  transactions: EbTransaction[];
  continuation_key?: string | null;
}

// ─── Llamadas ───────────────────────────────────────────────────────────────

export async function listAspsps(country: string): Promise<Aspsp[]> {
  const data = await ebFetch<{ aspsps: Aspsp[] }>(
    `/aspsps?country=${encodeURIComponent(country)}&psu_type=personal`
  );
  return data.aspsps || [];
}

/** Inicia la autorización: devuelve la URL del banco a la que hay que mandar al usuario. */
export async function startAuthorization(params: {
  aspspName: string;
  aspspCountry: string;
  state: string;
  redirectUrl: string;
  validUntil: Date;
}): Promise<string> {
  const data = await ebFetch<{ url: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({
      access: { valid_until: params.validUntil.toISOString() },
      aspsp: { name: params.aspspName, country: params.aspspCountry },
      state: params.state,
      redirect_url: params.redirectUrl,
      psu_type: 'personal',
    }),
  });
  return data.url;
}

/** Cambia el `code` del callback por una sesión con las cuentas autorizadas. */
export async function createSession(code: string): Promise<EbSession> {
  return ebFetch<EbSession>('/sessions', { method: 'POST', body: JSON.stringify({ code }) });
}

/** Todas las transacciones de una cuenta desde `dateFrom` (YYYY-MM-DD), paginando. */
export async function getAllTransactions(accountUid: string, dateFrom: string): Promise<EbTransaction[]> {
  const all: EbTransaction[] = [];
  let continuationKey: string | null | undefined;
  let pages = 0;

  do {
    const qs = new URLSearchParams({ date_from: dateFrom });
    if (continuationKey) qs.set('continuation_key', continuationKey);
    const page = await ebFetch<TransactionsPage>(
      `/accounts/${encodeURIComponent(accountUid)}/transactions?${qs.toString()}`
    );
    all.push(...(page.transactions || []));
    continuationKey = page.continuation_key;
    pages++;
  } while (continuationKey && pages < 50);

  return all;
}
