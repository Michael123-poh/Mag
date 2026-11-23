-- À exécuter UNE SEULE FOIS si migration_projet.sql a déjà été exécuté AVANT l'ajout du prix des bouquets.
-- Ensuite, relancer database/bouquets.sql (il renseigne les prix : Graine, Éclosion, Canopée).
USE gaia;

ALTER TABLE bouquets ADD COLUMN IF NOT EXISTS prix DECIMAL(14,0) NOT NULL DEFAULT 0 AFTER nom;
