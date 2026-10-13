/**
 * Lógica pura (sin red ni BD) para convertir movimientos bancarios en
 * transacciones de la app y decidir qué tipo de movimiento son.
 * Está aislada para poder probarla sin conectar ningún banco.
 */
import { createHash } from 'crypto';
import type { EbBalance, EbTransaction } from './enableBanking';
import type { TransactionKind } from '@/lib/validations/schemas';

export interface MappedTransaction {
  external_id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  counterparty: string | null;
  counterpartyIban: string | null;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeIban(iban?: string | null): string | null {
  if (!iban) return null;
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.length >= 10 ? clean : null;
}

/** Devuelve null si el movimiento está pendiente (cambia de id al contabilizarse) o es inválido. */
export function mapTransaction(tx: EbTransaction, accountUid: string): MappedTransaction | null {
  if (tx.status && tx.status !== 'BOOK') return null;

  const rawAmount = parseFloat(tx.transaction_amount?.amount ?? '');
  if (!isFinite(rawAmount) || rawAmount === 0) return null;

  const date = (tx.booking_date || tx.value_date || tx.transaction_date || '').substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  // Algunos bancos mandan el importe con signo y el indicador; nos fiamos del indicador.
  const isDebit = tx.credit_debit_indicator ? tx.credit_debit_indicator === 'DBIT' : rawAmount < 0;
  const party = isDebit ? tx.creditor : tx.debtor;
  const partyAccount = isDebit ? tx.creditor_account : tx.debtor_account;
  const counterparty = party?.name?.trim() || null;

  const remittance = (tx.remittance_information || []).map((s) => s.trim()).filter(Boolean).join(' · ');
  const pieces = [counterparty, remittance].filter(Boolean) as string[];
  // Evita repetir el nombre si ya viene dentro del concepto
  const description =
    (pieces.length === 2 && normalizeText(pieces[1]!).includes(normalizeText(pieces[0]!))
      ? pieces[1]!
      : pieces.join(' · ')) ||
    tx.bank_transaction_code?.description?.trim() ||
    tx.note?.trim() ||
    'Movimiento bancario';

  const amount = Math.round(Math.abs(rawAmount) * 100) / 100;
  const ref = tx.entry_reference || tx.transaction_id;
  const fingerprint =
    ref ||
    createHash('sha1')
      .update([date, isDebit ? 'D' : 'C', amount.toFixed(2), normalizeText(description)].join('|'))
      .digest('hex')
      .substring(0, 20);

  return {
    external_id: `eb:${accountUid}:${fingerprint}`,
    type: isDebit ? 'expense' : 'income',
    amount,
    date,
    description: description.substring(0, 500),
    counterparty,
    counterpartyIban: normalizeIban(partyAccount?.iban),
  };
}

// ─── Clasificación ──────────────────────────────────────────────────────────

/** Exchanges y brokers: dinero que sale hacia aquí es inversión, no gasto. */
export const INVESTMENT_KEYWORDS = [
  'binance', 'kraken', 'coinbase', 'bitpanda', 'bit2me', 'bitvavo', 'crypto.com',
  'bitstamp', 'bybit', 'okx', 'kucoin', 'gemini', 'blockchain.com', 'young platform',
];

/** Operaciones de inversión dentro de Trade Republic. */
const TRADE_REPUBLIC_INVESTMENT = /(savings plan|sparplan|plan de inversion|plan de ahorro|buy trade|trade execution|ejecucion de orden|orden de compra|compra de valores)/;

/** Bancos propios: un movimiento hacia uno de ellos desde otra cuenta es un traspaso. */
const OWN_PROVIDERS: { key: string; pattern: RegExp }[] = [
  { key: 'trade republic', pattern: /trade ?republic/ },
  { key: 'revolut', pattern: /revolut/ },
  { key: 'bbva', pattern: /\bbbva\b/ },
];

export interface ClassifyContext {
  /** Banco de la cuenta donde aparece el movimiento (p.ej. 'BBVA'). */
  providerName: string;
  /** IBAN de todas tus cuentas vinculadas. */
  ownIbans: Set<string>;
  /** Tu nombre (y variantes) tal como sale en las transferencias. */
  ownNames: string[];
  /** Nombres de acreedores de tus deudas registradas (loans.contact_name). */
  loanNames: string[];
}

function matchesName(text: string, name: string, minTokens = 1): boolean {
  const tokens = normalizeText(name).split(' ').filter((t) => t.length >= 3);
  if (tokens.length < minTokens) return false;
  // Con un solo token (p.ej. "Cofidis") basta con que aparezca; con varios, todos.
  return tokens.every((t) => text.includes(t));
}

export function classifyKind(tx: MappedTransaction, ctx: ClassifyContext): TransactionKind {
  const text = normalizeText(`${tx.counterparty ?? ''} ${tx.description}`);
  const provider = normalizeText(ctx.providerName);

  // 1. Va o viene de un IBAN que es tuyo
  if (tx.counterpartyIban && ctx.ownIbans.has(tx.counterpartyIban)) return 'internal_transfer';

  // 2. Pago de una deuda registrada
  if (tx.type === 'expense' && ctx.loanNames.some((n) => n.trim().length >= 3 && matchesName(text, n))) {
    return 'debt_payment';
  }

  // 3. Dinero hacia un exchange o broker
  if (tx.type === 'expense' && INVESTMENT_KEYWORDS.some((k) => text.includes(k))) return 'investment';
  if (tx.type === 'expense' && /trade ?republic/.test(provider) && TRADE_REPUBLIC_INVESTMENT.test(text)) {
    return 'investment';
  }

  // 4. Movimiento hacia/desde otro banco tuyo (se ignora el nombre del propio banco)
  for (const own of OWN_PROVIDERS) {
    if (own.pattern.test(provider)) continue;
    if (own.pattern.test(text)) return 'internal_transfer';
  }

  // 5. Transferencia a/desde ti mismo (nombre + apellido como mínimo, para no
  //    confundirte con cualquier otro "Jordi")
  if (tx.counterparty && ctx.ownNames.some((n) => matchesName(normalizeText(tx.counterparty!), n, 2))) {
    return 'internal_transfer';
  }

  return 'regular';
}

// ─── Saldo ──────────────────────────────────────────────────────────────────

/**
 * Orden de preferencia del tipo de saldo: primero el contable (lo que ves en
 * la app del banco como saldo), luego el previsto y por último el disponible.
 */
const BALANCE_PRIORITY = ['ITBD', 'CLBD', 'XPCD', 'ITAV', 'CLAV', 'OPBD'];

export function pickBalance(balances: EbBalance[]): number | null {
  const valid = balances.filter((b) => isFinite(parseFloat(b.balance_amount?.amount ?? '')));
  if (valid.length === 0) return null;
  const rank = (b: EbBalance) => {
    const i = BALANCE_PRIORITY.indexOf((b.balance_type || '').toUpperCase());
    return i === -1 ? BALANCE_PRIORITY.length : i;
  };
  const best = [...valid].sort((a, b) => rank(a) - rank(b))[0]!;
  return Math.round(parseFloat(best.balance_amount.amount) * 100) / 100;
}
