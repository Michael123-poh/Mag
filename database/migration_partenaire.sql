-- À exécuter UNE SEULE FOIS si la base existe déjà (ces colonnes sont aussi dans schema.sql).
-- Fiche « Nouveau partenaire » : ville, forme juridique, activité, chiffre d'affaire.
USE gaia;

ALTER TABLE clients
  ADD COLUMN ville            VARCHAR(80)   NULL AFTER adresse,
  ADD COLUMN forme_juridique  VARCHAR(40)   NULL AFTER ville,
  ADD COLUMN activite         VARCHAR(60)   NULL AFTER forme_juridique,
  ADD COLUMN chiffre_affaire  DECIMAL(14,0) NULL AFTER activite;
