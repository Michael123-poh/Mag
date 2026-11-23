-- Coordonnées de l'entreprise affichées sur le modèle de facture (en-tête et pied de page).
-- À exécuter, puis à REMPLIR : remplacez les valeurs vides ('') par les vôtres. Une valeur vide n'est pas affichée sur la facture.
-- Peut être relancé sans danger : une clé déjà présente n'est pas modifiée (pour changer une valeur : UPDATE parametres SET valeur = '…' WHERE cle = '…';).
USE gaia;
SET NAMES utf8mb4;

INSERT IGNORE INTO parametres (cle, valeur) VALUES
  ('entreprise_nom',          'GAIA'),   -- nom affiché en haut de la facture
  ('entreprise_slogan',       'Connecting brands to people'),       -- ex. Studio créatif & imprimerie
  ('entreprise_adresse',      'Rue Castelnau, Akwa'),       -- ex. Rue …, Douala
  ('entreprise_telephone',    '+(237) 693 613 437'),       -- ex. +237 6 00 00 00 00
  ('entreprise_email',        'info@gaiaimagine.com'),
  ('entreprise_site',         'https://www.gaiaimagine.com'),
  ('entreprise_niu',          'NIU-12345'),       -- numéro d'identifiant unique
  ('entreprise_rccm',         'RCCM-67890'),       -- registre du commerce
  ('facture_paiement_banque', ''),       -- ex. Banque … — IBAN / RIB …
  ('facture_paiement_mobile', '693 613 437/ 673 432 128'),       -- ex. Orange Money / MTN MoMo : 6 .. .. .. ..
  ('facture_conditions',      'Paiement à réception de la facture'),       -- ex. Paiement à réception de la facture
  ('facture_mentions',        'Mentions légales, pénalités de retard…');       -- ex. mentions légales, pénalités de retard…
