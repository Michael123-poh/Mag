-- EXEMPLE À REMPLACER : valeurs d'essai pour la page Rapport. À exécuter après migration_machines.sql (et seed.sql).
-- La XEROX7835 est maintenant lue directement sur le réseau (SNMP) : ses compteurs, ses magasins et ses toners viennent de la machine,
-- il n'y a donc plus rien à inventer pour elle sauf les deux réglages par défaut ci-dessous (la machine ne les donne pas).
-- Peut être relancé sans danger : ce qui existe déjà n'est pas modifié.
USE gaia;
SET NAMES utf8mb4;

UPDATE machines SET couleur_support = 'Blanc', mode_impression = 'Recto/Verso' WHERE id = 1 AND couleur_support IS NULL;
UPDATE machines SET couleur_support = 'Blanc', mode_impression = 'Recto'       WHERE id = 2 AND couleur_support IS NULL;

-- HP DeskJet 2710 (saisie à la main, pas de lecture réseau) : un magasin d'exemple, à remplacer. On ne remplit que s'il n'y en a pas déjà.
INSERT INTO machine_magasins (machine_id, nom, type_papier, couleur, dimension, position)
SELECT 2, 'Magasin 1', 'Standard', 'Blanc', 'A4 (210 x 297 mm)', 1
WHERE NOT EXISTS (SELECT 1 FROM machine_magasins WHERE machine_id = 2);
