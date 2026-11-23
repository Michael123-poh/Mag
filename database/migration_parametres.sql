-- À exécuter une fois si la base existe déjà (ces éléments sont aussi dans schema.sql). Peut être relancé sans danger.
-- Page Paramètre : fonction d'un employé (ce qu'il fait) et réglages de la lecture des machines.
USE gaia;

ALTER TABLE employes ADD COLUMN IF NOT EXISTS fonction VARCHAR(255) NULL AFTER type_employe_id;   -- ce que fait l'employé (ses tâches)

-- Lecture des machines : on ne remplace pas un réglage déjà présent
INSERT IGNORE INTO parametres (cle, valeur) VALUES
  ('machines_intervalle_secondes', '20'),   -- secondes entre deux lectures de la machine
  ('machines_releve_minutes',      '5');    -- un relevé enregistré au plus toutes les X minutes
