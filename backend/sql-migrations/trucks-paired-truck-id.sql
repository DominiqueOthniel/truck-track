-- Jumelage tracteur ↔ remorqueuse (optionnel)
ALTER TABLE trucks
ADD COLUMN IF NOT EXISTS "pairedTruckId" UUID;

CREATE INDEX IF NOT EXISTS idx_trucks_paired ON trucks ("pairedTruckId");
