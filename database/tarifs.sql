-- Grille des tarifs (document « Prestation / Famille / Format / Couleur-Face / Support-Finition / Prix unitaire »).
-- À exécuter après migration_prestation.sql (ou après schema.sql). Peut être relancé sans danger :
-- une référence déjà présente n'est pas modifiée (pour changer un prix, modifiez-le directement dans la table).
USE gaia;

INSERT IGNORE INTO tarifs (reference, libelle, famille, format_page, couleur_face, support_finition, prix_unitaire) VALUES
  ('IMP-A4-NB-80',   'Impression A4 - Monochrome - Papier 80g',                   'Impression', 'A4',        'Monochrome', '80g',                  100),
  ('IMP-A4-NB-170',  'Impression A4 - Monochrome - Papier 170g-300g',             'Impression', 'A4',        'Monochrome', '170g-300g',            150),
  ('IMP-A4-NB-LUX',  'Impression A4 - Monochrome - Papier de luxe',               'Impression', 'A4',        'Monochrome', 'Luxe',                 200),
  ('IMP-A4-CO-80',   'Impression A4 - Couleur - Papier 80g',                      'Impression', 'A4',        'Couleur',    '80g',                  200),
  ('IMP-A4-CO-170',  'Impression A4 - Couleur - Papier 170g-300g',                'Impression', 'A4',        'Couleur',    '170g-300g',            300),
  ('IMP-A4-CO-LUX',  'Impression A4 - Couleur - Papier de luxe',                  'Impression', 'A4',        'Couleur',    'Luxe',                 400),
  ('IMP-A3-NB-80',   'Impression A3 - SRA3 - Monochrome - Papier 80g',            'Impression', 'A3 / SRA3', 'Monochrome', '80g',                  200),
  ('IMP-A3-NB-170',  'Impression A3 - SRA3 - Monochrome - Papier 170g-300g',      'Impression', 'A3 / SRA3', 'Monochrome', '170g-300g',            300),
  ('IMP-A3-NB-LUX',  'Impression A3 - SRA3 - Monochrome - Papier de luxe',        'Impression', 'A3 / SRA3', 'Monochrome', 'Luxe',                 400),
  ('IMP-A3-NB-VEL',  'Impression A3 - SRA3 - Monochrome - Papier autocollant (vélin)', 'Impression', 'A3 / SRA3', 'Monochrome', 'Autocollant (vélin)', 500),
  ('IMP-A3-CO-80',   'Impression A3 - SRA3 - Couleur - Papier 80g',               'Impression', 'A3 / SRA3', 'Couleur',    '80g',                  400),
  ('IMP-A3-CO-170',  'Impression A3 - SRA3 - Couleur - Papier 170g-300g',         'Impression', 'A3 / SRA3', 'Couleur',    '170g-300g',            500),
  ('IMP-A3-CO-LUX',  'Impression A3 - SRA3 - Couleur - Papier de luxe',           'Impression', 'A3 / SRA3', 'Couleur',    'Luxe',                 700),
  ('IMP-A3-CO-VEL',  'Impression A3 - SRA3 - Couleur - Papier autocollant (vélin)', 'Impression', 'A3 / SRA3', 'Couleur',  'Autocollant (vélin)',  800),
  ('PEL-MAT',        'Pelliculage mat',                                           'Pelliculage', 'A3 / SRA3', NULL,        'Mat',                  150),
  ('PEL-BRI',        'Pelliculage brillant',                                      'Pelliculage', 'A3 / SRA3', NULL,        'Brillant',             150),
  ('PEL-SOF',        'Pelliculage soft touch',                                    'Pelliculage', 'A3 / SRA3', NULL,        'Soft touch',           200),
  ('ENV-A4',         'Enveloppe A4',                                              'Enveloppe',  'A4',        NULL,         NULL,                   100),
  ('ENV-A3',         'Enveloppe A3',                                              'Enveloppe',  'A3',        NULL,         NULL,                   300),
  ('CHE-A4',         'Chemise A4',                                                'Chemise',    'A4',        NULL,         NULL,                   100),
  ('CHE-A3',         'Chemise A3',                                                'Chemise',    'A3',        NULL,         NULL,                   300),
  ('PLA-A4',         'Plastification A4',                                         'Plastification', 'A4',    NULL,         NULL,                   500),
  ('PLA-A3',         'Plastification A3',                                         'Plastification', 'A3',    NULL,         NULL,                  1000),
  ('CDV-R-SP',       'Cartes de visite recto seul - sans pelliculage',            'Cartes de visite', '85*55mm/90*55mm', 'Recto seul',   'Sans pelliculage',            30),
  ('CDV-R-PM',       'Cartes de visite recto seul - pelliculage mat/brillant',    'Cartes de visite', '85*55mm/90*55mm', 'Recto seul',   'Pelliculage mat/brillant',    50),
  ('CDV-R-PS',       'Cartes de visite recto seul - pelliculage soft touch',      'Cartes de visite', '85*55mm/90*55mm', 'Recto seul',   'Pelliculage soft touch',      70),
  ('CDV-RV-SP',      'Cartes de visite recto/verso - sans pelliculage',           'Cartes de visite', '85*55mm/90*55mm', 'Recto/verso',  'Sans pelliculage',            60),
  ('CDV-RV-PM',      'Cartes de visite recto/verso - pelliculage mat/brillant',   'Cartes de visite', '85*55mm/90*55mm', 'Recto/verso',  'Pelliculage mat/brillant',   100),
  ('CDV-RV-PS',      'Cartes de visite recto/verso - pelliculage soft touch',     'Cartes de visite', '85*55mm/90*55mm', 'Recto/verso',  'Pelliculage soft touch',     110),
  -- Photocopie : 50 xaf la page (hors document ; utilisé par le formulaire de photocopie)
  ('PHO-PAGE',       'Photocopie - la page',                                      'Photocopie', NULL,        NULL,         NULL,                    50);
