-- À exécuter une fois si la base existe déjà (cette table est aussi dans schema.sql). Peut être relancé sans danger.
USE gaia;

-- Remise à zéro des compteurs affichés sur la page Rapport : on garde les compteurs de la machine à cet instant, et la page
-- n'affiche plus que ce qui a été fait DEPUIS (compteur actuel - compteur gardé). Les compteurs de la machine, eux, ne sont jamais modifiés.
-- Chaque remise est conservée (historique) ; c'est la plus récente qui s'applique.
CREATE TABLE IF NOT EXISTS machine_remises_a_zero (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id INT UNSIGNED NOT NULL,
  remise_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  par        INT UNSIGNED NULL,                    -- employé qui a fait la remise à zéro
  valeurs    JSON NOT NULL,                        -- compteurs de la machine à cet instant : { "TotalImpressions": 258008, … }
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (par)        REFERENCES employes(id),
  INDEX idx_remise_machine (machine_id, remise_le)
);
