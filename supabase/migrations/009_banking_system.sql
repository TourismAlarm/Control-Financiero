-- ============================================
-- SISTEMA DE CONEXIÓN BANCARIA
-- ============================================

-- 1. Tabla de conexiones bancarias
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- Tipo y nombre del banco
  bank_type TEXT NOT NULL CHECK (bank_type IN ('bbva_sandbox', 'bbva_production', 'csv', 'manual')),
  bank_name TEXT NOT NULL,
  display_name TEXT NOT NULL, -- Nombre para mostrar al usuario

  -- Para APIs bancarias (BBVA, etc.)
  account_id TEXT, -- ID de cuenta en el banco
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Estado y metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_sync TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de transacciones importadas
CREATE TABLE IF NOT EXISTS imported_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bank_connection_id UUID REFERENCES bank_connections ON DELETE CASCADE,

  -- Identificación única
  transaction_id TEXT NOT NULL, -- ID único (del banco o generado para CSV)

  -- Datos de la transacción
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  categoria TEXT,

  -- Clasificación
  source_type TEXT NOT NULL CHECK (source_type IN ('bbva_api', 'csv', 'manual')),
  es_ingreso BOOLEAN DEFAULT false,

  -- Estado de revisión
  reviewed BOOLEAN DEFAULT false,
  ignored BOOLEAN DEFAULT false,

  -- Relación con expense
  expense_id UUID REFERENCES expenses ON DELETE SET NULL,

  -- Datos originales por si acaso
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar duplicados
  UNIQUE(user_id, transaction_id)
);

-- 3. Historial de sincronizaciones
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bank_connection_id UUID REFERENCES bank_connections ON DELETE CASCADE,

  -- Tipo de sincronización
  sync_type TEXT NOT NULL CHECK (sync_type IN ('api', 'csv', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),

  -- Estadísticas
  transactions_found INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  transactions_duplicated INTEGER DEFAULT 0,
  transactions_error INTEGER DEFAULT 0,

  -- Errores
  error_message TEXT,
  error_details JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE INDEX idx_bank_connections_type ON bank_connections(bank_type);

CREATE INDEX idx_imported_transactions_user ON imported_transactions(user_id);
CREATE INDEX idx_imported_transactions_bank ON imported_transactions(bank_connection_id);
CREATE INDEX idx_imported_transactions_fecha ON imported_transactions(fecha DESC);
CREATE INDEX idx_imported_transactions_reviewed ON imported_transactions(reviewed) WHERE reviewed = false;
CREATE INDEX idx_imported_transactions_ignored ON imported_transactions(ignored) WHERE ignored = false;
CREATE INDEX idx_imported_transactions_expense ON imported_transactions(expense_id);

CREATE INDEX idx_sync_history_user ON sync_history(user_id);
CREATE INDEX idx_sync_history_bank ON sync_history(bank_connection_id);
CREATE INDEX idx_sync_history_created ON sync_history(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Policies para bank_connections
CREATE POLICY "Users can view own bank connections"
  ON bank_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank connections"
  ON bank_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank connections"
  ON bank_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank connections"
  ON bank_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para imported_transactions
CREATE POLICY "Users can view own imported transactions"
  ON imported_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own imported transactions"
  ON imported_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own imported transactions"
  ON imported_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own imported transactions"
  ON imported_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para sync_history
CREATE POLICY "Users can view own sync history"
  ON sync_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync history"
  ON sync_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
