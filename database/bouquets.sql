-- Catalogue des services d'un projet et les trois bouquets (Graine, Éclosion, Canopée).
-- À exécuter après migration_projet.sql (ou après schema.sql). Peut être relancé sans danger : ce qui existe déjà n'est pas modifié.
-- Prix : celui du bouquet est ici (modifiable ensuite directement dans la table) ; le prix de chaque service est donné à la création du projet
-- (la somme des services d'un bouquet doit égaler le prix du bouquet).
USE gaia;
SET NAMES utf8mb4;   -- les accents restent corrects quel que soit le client utilisé pour exécuter ce fichier

-- a_la_carte = 0 : service vendu uniquement dans un bouquet (pour le proposer aussi à la carte, passez-le à 1)
INSERT IGNORE INTO services_projet (code, libelle, saisie, a_la_carte, position) VALUES
  ('logo',           'Logo',                         'aucune',   1, 1),
  ('identite',       'Identité visuelle',            'aucune',   1, 2),
  ('charte',         'Charte graphique',             'aucune',   1, 3),
  ('pack',           'Pack visuel',                  'quantite', 1, 4),
  ('templates',      'Templates',                    'template', 1, 5),
  ('cover',          'Cover réseaux sociaux',        'reseaux',  1, 6),
  ('concept',        'Concept',                      'texte',    1, 7),
  ('analyse',        'Analyse de marque',            'aucune',   0, 8),
  ('strategie',      'Stratégie de marque complète', 'aucune',   0, 9),
  ('positionnement', 'Positionnement + marketing',   'aucune',   0, 10),
  ('maquette_web',   'Maquette de site web',         'aucune',   0, 11),
  ('direction',      'Direction créative',           'aucune',   0, 12);

INSERT IGNORE INTO bouquets (code, nom, prix, position) VALUES
  ('graine',   'Graine',   250000,  1),
  ('eclosion', 'Éclosion', 500000,  2),
  ('canopee',  'Canopée',  1000000, 3);

-- Bouquets créés avant l'ajout des prix : on ne renseigne que ceux qui n'ont pas encore de prix
UPDATE bouquets SET prix = 250000  WHERE code = 'graine'   AND prix = 0;
UPDATE bouquets SET prix = 500000  WHERE code = 'eclosion' AND prix = 0;
UPDATE bouquets SET prix = 1000000 WHERE code = 'canopee'  AND prix = 0;

-- Contenu des bouquets : on ne remplit que si le bouquet est encore vide
INSERT INTO bouquet_services (bouquet_id, service_id, quantite, detail, position)
SELECT b.id, s.id, x.quantite, x.detail, x.position
FROM (
  SELECT 'graine' AS b, 'logo' AS s, NULL AS quantite, NULL AS detail, 1 AS position
  UNION ALL SELECT 'graine', 'identite', NULL, NULL, 2
  UNION ALL SELECT 'graine', 'charte',   NULL, NULL, 3
  UNION ALL SELECT 'graine', 'pack',     5,    NULL, 4
  UNION ALL SELECT 'graine', 'cover',    NULL, 'Facebook, LinkedIn', 5

  UNION ALL SELECT 'eclosion', 'analyse',   NULL, NULL, 1
  UNION ALL SELECT 'eclosion', 'logo',      NULL, NULL, 2
  UNION ALL SELECT 'eclosion', 'identite',  NULL, NULL, 3
  UNION ALL SELECT 'eclosion', 'charte',    NULL, NULL, 4
  UNION ALL SELECT 'eclosion', 'pack',      10,   NULL, 5
  UNION ALL SELECT 'eclosion', 'templates', NULL, 'Post + Stories', 6
  UNION ALL SELECT 'eclosion', 'cover',     NULL, NULL, 7                         -- réseau(x) à préciser à la création du projet
  UNION ALL SELECT 'eclosion', 'concept',   1,    'Campagne de lancement', 8

  UNION ALL SELECT 'canopee', 'strategie',      NULL, NULL, 1
  UNION ALL SELECT 'canopee', 'positionnement', NULL, NULL, 2
  UNION ALL SELECT 'canopee', 'identite',       NULL, NULL, 3
  UNION ALL SELECT 'canopee', 'charte',         NULL, NULL, 4
  UNION ALL SELECT 'canopee', 'pack',           20,   NULL, 5
  UNION ALL SELECT 'canopee', 'concept',        1,    'Campagne', 6
  UNION ALL SELECT 'canopee', 'maquette_web',   1,    NULL, 7
  UNION ALL SELECT 'canopee', 'direction',      1,    NULL, 8
) x
JOIN bouquets b ON b.code = x.b
JOIN services_projet s ON s.code = x.s
WHERE NOT EXISTS (SELECT 1 FROM bouquet_services bs WHERE bs.bouquet_id = b.id);
