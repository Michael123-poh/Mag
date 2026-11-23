-- À exécuter si la base existe déjà (ces colonnes et cette table sont aussi dans schema.sql). Peut être relancé sans danger.
-- Page Rapport (contrôle des machines) : image, couleur du support et mode d'impression par défaut, magasins (bacs à papier).
-- Les compteurs affichés (feuilles A4 / A3 / SRA3 / A5, imprimé / copie, couleur / noir et blanc, recto / recto verso) viennent du dernier relevé de la machine :
--   MediaSize.A4 · MediaSize.A3 · MediaSize.SRA3 · MediaSize.A5 · Impressions.Imprime · Impressions.Copie · Couleur.Couleur · Couleur.NB · Faces.Recto · Faces.RectoVerso
USE gaia;

ALTER TABLE machines ADD COLUMN IF NOT EXISTS image           VARCHAR(255) NULL;   -- nom du fichier placé dans public/machines/ (ex. xerox7835.png)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS couleur_support VARCHAR(60)  NULL;   -- couleur du support par défaut (ex. Blanc)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS mode_impression VARCHAR(60)  NULL;   -- mode d'impression par défaut (ex. Recto, Recto/Verso)

-- Magasins = bacs à papier de la machine : le type de feuilles et leur dimension
CREATE TABLE IF NOT EXISTS machine_magasins (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id  INT UNSIGNED NOT NULL,
  nom         VARCHAR(60) NOT NULL,                -- ex. Magasin 1
  type_papier VARCHAR(80) NULL,                    -- ex. Standard
  couleur     VARCHAR(40) NULL,                    -- couleur du papier, ex. Blanc
  dimension   VARCHAR(60) NULL,                    -- format et dimensions, ex. A4 (210 x 297 mm)
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Base déjà migrée avant l'ajout de la couleur du papier
ALTER TABLE machine_magasins ADD COLUMN IF NOT EXISTS couleur VARCHAR(40) NULL AFTER type_papier;
ALTER TABLE machine_magasins MODIFY dimension VARCHAR(60) NULL;