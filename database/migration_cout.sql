-- À exécuter UNE SEULE FOIS si la base a été créée avec la version 2 du schéma
-- (la version 3 de schema.sql contient déjà ces colonnes).
USE gaia;

ALTER TABLE prestations ADD COLUMN cout DECIMAL(14,0) NOT NULL DEFAULT 0 AFTER tarif;
ALTER TABLE projets     ADD COLUMN cout DECIMAL(14,0) NOT NULL DEFAULT 0 AFTER budget;
