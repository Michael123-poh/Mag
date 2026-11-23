-- À exécuter UNE SEULE FOIS si la base existe déjà (ces tables sont aussi dans schema.sql).
-- Création d'une prestation : grille des tarifs + lignes de la prestation.
-- Ensuite, exécuter database/tarifs.sql pour remplir la grille des tarifs.
USE gaia;

-- Grille des tarifs (catalogue des produits et finitions proposés en impression, photocopie…)
CREATE TABLE IF NOT EXISTS tarifs (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference        VARCHAR(30)  NOT NULL UNIQUE,   -- ex. IMP-A4-CO-170
  libelle          VARCHAR(200) NOT NULL,
  famille          VARCHAR(40)  NOT NULL,          -- Impression, Pelliculage, Enveloppe, Chemise, Plastification, Cartes de visite, Photocopie
  format_page      VARCHAR(40)  NULL,
  couleur_face     VARCHAR(40)  NULL,              -- Monochrome, Couleur, Recto seul, Recto/verso
  support_finition VARCHAR(60)  NULL,              -- 80g, Luxe, Mat, Soft touch…
  prix_unitaire    DECIMAL(14,0) NOT NULL DEFAULT 0,   -- en xaf
  actif            TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Lignes d'une prestation (ce qui a été commandé, avec le prix de l'unité au moment de la commande)
CREATE TABLE IF NOT EXISTS prestation_lignes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prestation_id INT UNSIGNED NOT NULL,
  tarif_id      INT UNSIGNED NULL,
  libelle       VARCHAR(255) NOT NULL,
  couleur       VARCHAR(20)  NULL,                 -- photocopie : N/B ou Quadri
  format_page   VARCHAR(40)  NULL,                 -- photocopie : A4, A3
  tirage        VARCHAR(20)  NULL,                 -- photocopie : Recto ou Recto/Verso
  quantite      INT UNSIGNED NOT NULL,             -- pages, feuilles ou unités
  prix_unitaire DECIMAL(14,0) NOT NULL,
  total         DECIMAL(14,0) NOT NULL,
  FOREIGN KEY (prestation_id) REFERENCES prestations(id) ON DELETE CASCADE,
  FOREIGN KEY (tarif_id)      REFERENCES tarifs(id)      ON DELETE SET NULL
);
