-- =============================================
-- Truck Track - Schéma complet pour Supabase (PostgreSQL)
-- Exécuter dans SQL Editor de Supabase (Dashboard → SQL Editor → New query)
-- =============================================

-- 1. third_parties (aucune FK)
CREATE TABLE IF NOT EXISTS third_parties (
  id UUID PRIMARY KEY,
  nom VARCHAR NOT NULL,
  telephone VARCHAR,
  email VARCHAR,
  adresse TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('proprietaire', 'client', 'fournisseur')),
  notes TEXT
);

-- 2. drivers (aucune FK)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY,
  nom VARCHAR NOT NULL,
  prenom VARCHAR NOT NULL,
  telephone VARCHAR NOT NULL,
  cni VARCHAR,
  photo VARCHAR
);

-- 3. driver_transactions (FK → drivers)
CREATE TABLE IF NOT EXISTS driver_transactions (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('apport', 'sortie')),
  montant DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  "driverId" UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_driver_transactions_driver_id ON driver_transactions("driverId");

-- 4. trucks (FK → third_parties, drivers)
CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY,
  immatriculation VARCHAR NOT NULL,
  modele VARCHAR NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('tracteur', 'remorqueuse')),
  statut VARCHAR(20) NOT NULL CHECK (statut IN ('actif', 'inactif')),
  "dateMiseEnCirculation" DATE NOT NULL,
  photo VARCHAR,
  "proprietaireId" UUID REFERENCES third_parties(id),
  "chauffeurId" UUID REFERENCES drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_trucks_proprietaire ON trucks("proprietaireId");
CREATE INDEX IF NOT EXISTS idx_trucks_chauffeur ON trucks("chauffeurId");

-- 5. trips (FK → trucks x2, drivers)
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY,
  "tracteurId" UUID REFERENCES trucks(id),
  "remorqueuseId" UUID REFERENCES trucks(id),
  origine VARCHAR NOT NULL,
  destination VARCHAR NOT NULL,
  "origineLat" DECIMAL(10, 7),
  "origineLng" DECIMAL(10, 7),
  "destinationLat" DECIMAL(10, 7),
  "destinationLng" DECIMAL(10, 7),
  "chauffeurId" UUID NOT NULL REFERENCES drivers(id),
  "dateDepart" DATE NOT NULL,
  "dateArrivee" DATE,
  recette DECIMAL(15, 2) NOT NULL,
  prefinancement DECIMAL(15, 2),
  client VARCHAR,
  marchandise VARCHAR,
  description TEXT,
  statut VARCHAR(20) NOT NULL CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule'))
);

CREATE INDEX IF NOT EXISTS idx_trips_tracteur ON trips("tracteurId");
CREATE INDEX IF NOT EXISTS idx_trips_remorqueuse ON trips("remorqueuseId");
CREATE INDEX IF NOT EXISTS idx_trips_chauffeur ON trips("chauffeurId");

-- 6. expenses (FK → trucks, third_parties)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  "camionId" UUID NOT NULL REFERENCES trucks(id),
  "tripId" UUID,
  "chauffeurId" UUID,
  categorie VARCHAR NOT NULL,
  "sousCategorie" VARCHAR,
  "fournisseurId" UUID REFERENCES third_parties(id),
  montant DECIMAL(15, 2) NOT NULL,
  quantite DECIMAL(12, 2),
  "prixUnitaire" DECIMAL(12, 2),
  date DATE NOT NULL,
  description TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_camion ON expenses("camionId");
CREATE INDEX IF NOT EXISTS idx_expenses_fournisseur ON expenses("fournisseurId");

-- 7. invoices (références trajetId, expenseId sans FK pour souplesse)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  numero VARCHAR NOT NULL,
  "trajetId" UUID,
  "expenseId" UUID,
  statut VARCHAR(20) NOT NULL CHECK (statut IN ('en_attente', 'payee')),
  "montantHT" DECIMAL(15, 2) NOT NULL,
  remise DECIMAL(5, 2),
  "montantHTApresRemise" DECIMAL(15, 2),
  tva DECIMAL(15, 2),
  tps DECIMAL(15, 2),
  "montantTTC" DECIMAL(15, 2) NOT NULL,
  "montantPaye" DECIMAL(15, 2),
  "dateCreation" DATE NOT NULL,
  "datePaiement" DATE,
  "modePaiement" VARCHAR,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_trajet ON invoices("trajetId");
CREATE INDEX IF NOT EXISTS idx_invoices_expense ON invoices("expenseId");

-- 8. bank_accounts (aucune FK)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY,
  nom VARCHAR NOT NULL,
  "numeroCompte" VARCHAR NOT NULL,
  banque VARCHAR NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('courant', 'epargne', 'professionnel')),
  "soldeInitial" DECIMAL(15, 2) NOT NULL,
  "soldeActuel" DECIMAL(15, 2) NOT NULL,
  devise VARCHAR(10) DEFAULT 'FCFA',
  iban VARCHAR,
  swift VARCHAR,
  notes TEXT
);

-- 9. bank_transactions (FK → bank_accounts)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY,
  "compteId" UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('depot', 'retrait', 'virement', 'prelevement', 'frais')),
  montant DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR,
  beneficiaire VARCHAR,
  categorie VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_compte ON bank_transactions("compteId");

-- =============================================
-- Optionnel : activer les extensions si besoin
-- =============================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pour générer des UUID côté base (ex. pour des triggers) :
-- uuid_generate_v4()
