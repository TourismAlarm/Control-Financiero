-- ============================================================================
-- MIGRACIÓN SQL PARA AGENTES INTELIGENTES
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Copia y pega este contenido completo
-- 3. Click en "Run" o presiona Ctrl+Enter
-- ============================================================================

-- Create agent_notifications table
CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'budget_warning', 'budget_exceeded', 'spending_spike', 'anomaly', etc.
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',  -- Datos adicionales específicos del tipo de notificación
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_notifications_user_id ON agent_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_created_at ON agent_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_priority ON agent_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_is_read ON agent_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_user_unread ON agent_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON agent_notifications FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications"
  ON agent_notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON agent_notifications FOR DELETE
  USING (auth.uid()::text = user_id);

-- System can insert notifications (service role)
CREATE POLICY "System can insert notifications"
  ON agent_notifications FOR INSERT
  WITH CHECK (true);

-- Add comments to table
COMMENT ON TABLE agent_notifications IS 'Notificaciones generadas automáticamente por agentes inteligentes';
COMMENT ON COLUMN agent_notifications.type IS 'Tipo de notificación: budget_warning, anomaly, insight, etc.';
COMMENT ON COLUMN agent_notifications.priority IS 'Prioridad: high, medium, low';
COMMENT ON COLUMN agent_notifications.data IS 'Datos adicionales en formato JSON para cada tipo de notificación';
COMMENT ON COLUMN agent_notifications.is_read IS 'Indica si el usuario ha leído la notificación';
COMMENT ON COLUMN agent_notifications.is_dismissed IS 'Indica si el usuario ha descartado la notificación';
