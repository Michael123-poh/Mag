-- À exécuter UNE SEULE FOIS si la base existe déjà (la table est aussi dans schema.sql).
USE gaia;

-- Filtres personnalisés des cartes « dossier » (3 par page et par employé), conservés jusqu'à ce qu'il les change.
CREATE TABLE filtres_cartes (
  employe_id INT UNSIGNED NOT NULL,
  page       VARCHAR(30)  NOT NULL,              -- clients, prestations
  slot       TINYINT UNSIGNED NOT NULL,          -- 0, 1 ou 2 : position de la carte
  filtres    JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employe_id, page, slot),
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
);