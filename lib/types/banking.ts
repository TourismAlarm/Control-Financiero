export type BankType = 'bbva_sandbox' | 'bbva_production' | 'csv' | 'manual';
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';
export type SyncType = 'api' | 'csv' | 'manual';
export type SyncStatus = 'success' | 'error' | 'partial';

export interface BankConnection {
  id: string;
  user_id: string;
  bank_type: BankType;
  bank_name: string;
  display_name: string;
  account_id?: string;
  status: ConnectionStatus;
  last_sync?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportedTransaction {
  id: string;
  user_id: string;
  bank_connection_id?: string;
  transaction_id: string;
  fecha: string;
  concepto: string;
  monto: number;
  categoria?: string;
  source_type: 'bbva_api' | 'csv' | 'manual';
  es_ingreso: boolean;
  reviewed: boolean;
  ignored: boolean;
  expense_id?: string;
  raw_data?: any;
  created_at: string;
}

export interface SyncHistory {
  id: string;
  user_id: string;
  bank_connection_id?: string;
  sync_type: SyncType;
  status: SyncStatus;
  transactions_found: number;
  transactions_new: number;
  transactions_duplicated: number;
  transactions_error: number;
  error_message?: string;
  created_at: string;
}

export interface CSVTransaction {
  fecha: string;
  concepto: string;
  monto: number;
  es_ingreso: boolean;
}
