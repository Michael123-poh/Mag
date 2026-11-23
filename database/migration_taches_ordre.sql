-- À exécuter UNE SEULE FOIS si la base existe déjà (cette colonne est aussi dans schema.sql).
-- Ordre des tâches dans les colonnes « À faire / Faites / En cours » (glisser-déposer façon Trello).
USE gaia;

ALTER TABLE taches_projet ADD COLUMN position INT NOT NULL DEFAULT 0 AFTER urgente;
UPDATE taches_projet SET position = id;   -- ordre de départ : celui de création
