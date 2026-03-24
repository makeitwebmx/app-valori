-- Agrega columna de expiración de suscripción a profiles
-- Ejecutar una sola vez en Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para consultas de expiración
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at
  ON profiles (subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;
