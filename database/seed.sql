-- ============================================================================
-- GAIA — DONNÉES FICTIVES (jeu d'essai)
-- À exécuter APRÈS schema.sql, dans une seule session (le script utilise des variables @...).
-- Mot de passe de TOUS les comptes de démonstration : Gaia@2026!
--   Gérant (tous les droits) : michael@gaia.test      Caissière : simone@gaia.test
-- À supprimer / remplacer par les vraies informations en production.
--
-- Conventions :
--  * approvisionnements.quantite et prix_unitaire sont exprimés dans l'UNITÉ AFFICHÉE (ex. rames) ;
--    le mouvement de stock correspondant est en unité de base (quantite x conditionnement).
--  * Date du jour supposée : 2026-10-27 (variable APP_TODAY côté API).
-- ============================================================================

USE gaia;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

SET @tc_ent = (SELECT id FROM types_client WHERE libelle = 'Entreprise');
SET @tc_per = (SELECT id FROM types_client WHERE libelle = 'Personne');
SET @tp_imp = (SELECT id FROM types_prestation WHERE libelle = 'Impression');
SET @tp_pho = (SELECT id FROM types_prestation WHERE libelle = 'Photocopie');
SET @tp_sai = (SELECT id FROM types_prestation WHERE libelle = 'Saisie');
SET @tp_mep = (SELECT id FROM types_prestation WHERE libelle = 'Mise en page');
SET @tj_bra = (SELECT id FROM types_projet WHERE libelle = 'Branding');
SET @tj_log = (SELECT id FROM types_projet WHERE libelle = 'Logo');
SET @tj_pac = (SELECT id FROM types_projet WHERE libelle = 'Packaging');
SET @cpt_caisse = (SELECT id FROM comptes WHERE code = 'caisse');
SET @cpt_banque = (SELECT id FROM comptes WHERE code = 'banque');
SET @cpt_mobile = (SELECT id FROM comptes WHERE code = 'mobile');
SET @tt_pay = (SELECT id FROM types_transaction WHERE code = 'paiement_facture');
SET @tt_sal = (SELECT id FROM types_transaction WHERE code = 'salaire');
SET @tt_loy = (SELECT id FROM types_transaction WHERE code = 'loyer');
SET @tt_imp = (SELECT id FROM types_transaction WHERE code = 'impot');
SET @tt_epa = (SELECT id FROM types_transaction WHERE code = 'epargne');
SET @tt_ach = (SELECT id FROM types_transaction WHERE code = 'achat_stock');
SET @tt_aut = (SELECT id FROM types_transaction WHERE code = 'autre');

UPDATE parametres SET valeur = '160000' WHERE cle = 'objectif_mensuel';


-- --------------------------------------------------------------------------
-- 1. ÉQUIPE ET DROITS
-- --------------------------------------------------------------------------

INSERT INTO types_employe (id, libelle) VALUES
  (1, 'Gérant'),
  (2, 'Graphiste'),
  (3, 'Opérateur impression'),
  (4, 'Caissier');

INSERT INTO employes (id, matricule, nom, email, telephone, mot_de_passe_hash, type_employe_id, salaire, date_embauche) VALUES
  (1, 'EMP-001', 'Michael Fotso', 'michael@gaia.test', '+237 677 000 001', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa', 1, NULL, '2018-01-15'),
  (2, 'EMP-002', 'Yves Mailloré', 'yves@gaia.test', '+237 677 000 002', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa', 2, 90000, '2020-03-02'),
  (3, 'EMP-003', 'Rosine Laure', 'rosine@gaia.test', '+237 677 000 003', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa', 2, 85000, '2021-06-14'),
  (4, 'EMP-004', 'Christian Tamo', 'christian@gaia.test', '+237 677 000 004', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa', 3, 70000, '2022-01-10'),
  (5, 'EMP-005', 'Francky Nguema', 'francky@gaia.test', '+237 677 000 005', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa', 3, 60000, '2023-09-04'),
  (6, 'EMP-006', 'Simone Ekani', 'simone@gaia.test', '+237 677 000 006', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa', 4, 65000, '2024-02-19');

INSERT INTO employe_privileges (employe_id, privilege_id) SELECT 1, id FROM privileges;
INSERT INTO employe_privileges (employe_id, privilege_id) SELECT 2, id FROM privileges WHERE code IN ('gerer_clients','gerer_projets');
INSERT INTO employe_privileges (employe_id, privilege_id) SELECT 3, id FROM privileges WHERE code IN ('gerer_projets');
INSERT INTO employe_privileges (employe_id, privilege_id) SELECT 4, id FROM privileges WHERE code IN ('gerer_prestations','gerer_stock');
INSERT INTO employe_privileges (employe_id, privilege_id) SELECT 5, id FROM privileges WHERE code IN ('gerer_prestations');
INSERT INTO employe_privileges (employe_id, privilege_id) SELECT 6, id FROM privileges WHERE code IN ('gerer_caisse','gerer_factures','gerer_clients');


-- --------------------------------------------------------------------------
-- 2. CLIENTS
-- --------------------------------------------------------------------------

INSERT INTO clients (id, code, nom, type_client_id, telephone, email, adresse, created_at, updated_at) VALUES
  (1, 'CL-EN001', 'Nael Beauty', @tc_ent, '+237 692 337 876', 'contact@naelbeauty.cm', 'Bonapriso, Douala', '2025-11-03 09:00:00', '2026-10-22 16:30:00'),
  (2, 'CL-EN002', 'Well Done', @tc_ent, '+237 621 094 201', 'info@welldone.cm', 'Akwa, Douala', '2025-09-12 10:00:00', '2026-04-01 11:00:00'),
  (3, 'CL-PE003', 'Suzabe J.', @tc_per, '+237 671 224 771', 'suzabe.j@mail.cm', 'Bonamoussadi, Douala', '2026-02-18 14:00:00', '2026-10-17 15:20:00'),
  (4, 'CL-EN004', 'Homeyspace', @tc_ent, '+237 667 393 221', 'hello@homeyspace.cm', 'Makepe, Douala', '2025-06-24 09:30:00', '2026-10-26 10:10:00'),
  (5, 'CL-PE005', 'Maitre leonardo', @tc_per, '+237 699 118 450', 'leonardo@mail.cm', 'Deido, Douala', '2025-12-01 08:45:00', '2026-10-10 09:00:00'),
  (6, 'CL-EN006', 'Nat Care', @tc_ent, '+237 655 410 982', 'commande@natcare.cm', 'Bali, Douala', '2025-08-15 10:00:00', '2026-10-20 17:00:00'),
  (7, 'CL-EN007', 'Chococam', @tc_ent, '+237 233 421 500', 'marketing@chococam.cm', 'Zone industrielle, Douala', '2026-09-29 11:00:00', '2026-10-24 12:00:00'),
  (8, 'CL-PE008', 'Simone Atangana', @tc_per, '+237 690 552 310', 'simone.a@mail.cm', 'Logpom, Douala', '2025-10-05 13:00:00', '2026-09-02 10:00:00'),
  (9, 'CL-EN009', 'Atelier Mbella', @tc_ent, '+237 677 845 120', 'atelier.mbella@mail.cm', 'New Bell, Douala', '2026-03-09 09:00:00', '2026-10-15 14:00:00'),
  (10, 'CL-PE010', 'Léa Tchoua', @tc_per, '+237 698 204 771', 'lea.tchoua@mail.cm', 'Bepanda, Douala', '2026-10-14 10:30:00', '2026-10-24 11:15:00');


-- --------------------------------------------------------------------------
-- 3. PRESTATIONS
-- --------------------------------------------------------------------------

INSERT INTO prestations (id, reference, client_id, type_prestation_id, responsable_id, titre, details, quantite, tarif, cout, statut_production, date_echeance, date_livraison, created_at) VALUES
  (1, 'BP098RT26', 1, @tp_imp, 4, 'Impression de flyers', '500 exemplaires · couleur · pelliculage', 500, 85000, 52000, 'livre', '2026-10-20', '2026-10-19', '2026-10-12 09:00:00'),
  (2, 'BP098RT27', 5, @tp_pho, 5, 'Photocopies', '450 pages · noir/blanc', 450, 45000, 27000, 'en_cours', '2026-10-30', NULL, '2026-10-24 10:00:00'),
  (3, 'BP098RT28', 3, @tp_sai, 5, 'Saisie et impression de mémoire', '120 pages · reliure', 120, 140000, 80000, 'en_cours', '2026-11-04', NULL, '2026-10-19 11:00:00'),
  (4, 'BP098RT29', 4, @tp_imp, 4, 'Impression & reliure', '200 pages · noir/blanc · reliure', 200, 95000, 60000, 'a_faire', '2026-11-02', NULL, '2026-10-26 10:00:00'),
  (5, 'BP098RT30', 6, @tp_mep, 3, 'Mise en page catalogue', 'PAO 24 pages', 24, 180000, 100000, 'en_cours', '2026-10-31', NULL, '2026-10-21 14:00:00'),
  (6, 'BP098RT31', 9, @tp_mep, 2, 'Mise en page affiches', '6 affiches A3', 6, 60000, 30000, 'a_faire', '2026-11-05', NULL, '2026-10-25 09:00:00'),
  (7, 'BP098RT32', 10, @tp_sai, 5, 'Saisie de rapport de stage', '40 pages', 40, 35000, 18000, 'livre', '2026-10-23', '2026-10-23', '2026-10-20 15:00:00'),
  (8, 'BP098RT33', 7, @tp_imp, 4, 'Impression étiquettes', '5000 étiquettes couleur', 5000, 300000, 190000, 'en_cours', '2026-11-03', NULL, '2026-10-22 08:30:00'),
  (9, 'BP0126A', 1, @tp_imp, 4, 'Impression de documents', NULL, NULL, 279000, 167400, 'livre', '2026-01-20', '2026-01-18', '2026-01-05 09:00:00'),
  (10, 'BP0126B', 2, @tp_pho, 5, 'Photocopies en nombre', NULL, NULL, 153000, 91800, 'livre', '2026-01-20', '2026-01-18', '2026-01-14 09:00:00'),
  (11, 'BP0226A', 4, @tp_sai, 3, 'Saisie et mise au propre', NULL, NULL, 315000, 189000, 'livre', '2026-02-20', '2026-02-18', '2026-02-05 09:00:00'),
  (12, 'BP0226B', 6, @tp_mep, 2, 'Mise en page de documents', NULL, NULL, 203000, 121800, 'livre', '2026-02-20', '2026-02-18', '2026-02-14 09:00:00'),
  (13, 'BP0326A', 7, @tp_imp, 4, 'Impression de documents', NULL, NULL, 473000, 283800, 'livre', '2026-03-20', '2026-03-18', '2026-03-05 09:00:00'),
  (14, 'BP0326B', 9, @tp_pho, 5, 'Photocopies en nombre', NULL, NULL, 324000, 194400, 'livre', '2026-03-20', '2026-03-18', '2026-03-14 09:00:00'),
  (15, 'BP0426A', 3, @tp_sai, 3, 'Saisie et mise au propre', NULL, NULL, 360000, 216000, 'livre', '2026-04-20', '2026-04-18', '2026-04-05 09:00:00'),
  (16, 'BP0426B', 5, @tp_mep, 2, 'Mise en page de documents', NULL, NULL, 252000, 151200, 'livre', '2026-04-20', '2026-04-18', '2026-04-14 09:00:00'),
  (17, 'BP0526A', 10, @tp_imp, 4, 'Impression de documents', NULL, NULL, 293000, 175800, 'livre', '2026-05-20', '2026-05-18', '2026-05-05 09:00:00'),
  (18, 'BP0526B', 8, @tp_pho, 5, 'Photocopies en nombre', NULL, NULL, 176000, 105600, 'livre', '2026-05-20', '2026-05-18', '2026-05-14 09:00:00'),
  (19, 'BP0626A', 1, @tp_sai, 3, 'Saisie et mise au propre', NULL, NULL, 495000, 297000, 'livre', '2026-06-20', '2026-06-18', '2026-06-05 09:00:00'),
  (20, 'BP0626B', 2, @tp_mep, 2, 'Mise en page de documents', NULL, NULL, 351000, 210600, 'livre', '2026-06-20', '2026-06-18', '2026-06-14 09:00:00'),
  (21, 'BP0726A', 4, @tp_imp, 4, 'Impression de documents', NULL, NULL, 428000, 256800, 'livre', '2026-07-20', '2026-07-18', '2026-07-05 09:00:00'),
  (22, 'BP0726B', 6, @tp_pho, 5, 'Photocopies en nombre', NULL, NULL, 288000, 172800, 'livre', '2026-07-20', '2026-07-18', '2026-07-14 09:00:00'),
  (23, 'BP0826A', 7, @tp_sai, 3, 'Saisie et mise au propre', NULL, NULL, 189000, 113400, 'livre', '2026-08-20', '2026-08-18', '2026-08-05 09:00:00'),
  (24, 'BP0826B', 9, @tp_mep, 2, 'Mise en page de documents', NULL, NULL, 140000, 84000, 'livre', '2026-08-20', '2026-08-18', '2026-08-14 09:00:00'),
  (25, 'BP0926A', 3, @tp_imp, 4, 'Impression de documents', NULL, NULL, 396000, 237600, 'livre', '2026-09-20', '2026-09-18', '2026-09-05 09:00:00'),
  (26, 'BP0926B', 5, @tp_pho, 5, 'Photocopies en nombre', NULL, NULL, 270000, 162000, 'livre', '2026-09-20', '2026-09-18', '2026-09-14 09:00:00');


-- --------------------------------------------------------------------------
-- 4. PROJETS, ÉQUIPES, TÂCHES
-- --------------------------------------------------------------------------

INSERT INTO projets (id, reference, client_id, type_projet_id, titre, description, budget, cout, date_debut, date_fin, statut) VALUES
  (1, 'PR-2026-001', 1, @tj_pac, 'Nael Beauty Packaging + Flyers', 'Identité packaging de la gamme soins et flyers de lancement.', 450000, 270000, '2026-09-17', '2026-11-20', 'en_cours'),
  (2, 'PR-2026-002', 6, @tj_pac, 'Nat Care Foire', 'Supports de stand pour la foire : kakemono, totem, flyers.', 650000, 400000, '2026-09-27', '2026-12-05', 'en_cours'),
  (3, 'PR-2026-003', 4, @tj_log, 'Design Logo Application', 'Logo et déclinaisons pour l''application mobile.', 340000, 150000, '2026-08-20', '2026-10-10', 'termine'),
  (4, 'PR-2026-004', 7, @tj_bra, 'Branding Chococam', 'Refonte de la marque et charte graphique.', 900000, 520000, '2026-10-03', '2027-01-15', 'en_cours'),
  (5, 'PR-2026-005', 4, @tj_bra, 'Refonte HomeySpace', 'Refonte du site et de la communication.', 480000, 280000, '2026-09-14', '2026-11-30', 'en_cours');

INSERT INTO user_projet (projet_id, employe_id) VALUES
  (1, 2),
  (1, 3),
  (1, 4),
  (1, 5),
  (2, 2),
  (2, 3),
  (2, 4),
  (3, 2),
  (3, 3),
  (4, 2),
  (4, 3),
  (4, 4),
  (5, 3),
  (5, 4);

INSERT INTO taches_projet (id, projet_id, assignee_id, titre, statut, urgente, debut, fin) VALUES
  (1, 1, 2, 'Étude de la marque', 'fait', 0, '2026-09-17 09:00:00', '2026-09-17 11:00:00'),
  (2, 1, 3, 'Brief client', 'fait', 0, '2026-09-19 09:00:00', '2026-09-19 11:00:00'),
  (3, 1, 4, 'Recherche concurrentielle', 'fait', 0, '2026-09-21 09:00:00', '2026-09-21 11:00:00'),
  (4, 1, 5, 'Moodboard', 'fait', 0, '2026-09-23 09:00:00', '2026-09-23 11:00:00'),
  (5, 1, 2, 'Croquis packaging', 'fait', 0, '2026-09-25 09:00:00', '2026-09-25 11:00:00'),
  (6, 1, 3, 'Choix des couleurs', 'fait', 0, '2026-09-27 09:00:00', '2026-09-27 11:00:00'),
  (7, 1, 4, 'Choix de la typographie', 'fait', 0, '2026-09-29 09:00:00', '2026-09-29 11:00:00'),
  (8, 1, 5, 'Maquette flacon', 'fait', 0, '2026-10-02 09:00:00', '2026-10-02 11:00:00'),
  (9, 1, 2, 'Maquette boîte', 'fait', 0, '2026-10-04 09:00:00', '2026-10-04 11:00:00'),
  (10, 1, 3, 'Étiquettes', 'fait', 0, '2026-10-06 09:00:00', '2026-10-06 11:00:00'),
  (11, 1, 4, 'Rendu 3D', 'fait', 0, '2026-10-08 09:00:00', '2026-10-08 11:00:00'),
  (12, 1, 5, 'Retouches graphiques', 'fait', 0, '2026-10-10 09:00:00', '2026-10-10 11:00:00'),
  (13, 1, 2, 'Validation client V1', 'fait', 0, '2026-10-12 09:00:00', '2026-10-12 11:00:00'),
  (14, 1, 2, 'Corrections V1', 'en_cours', 1, '2026-10-26 08:00:00', '2026-10-26 10:00:00'),
  (15, 1, 4, 'Validation client V2', 'en_cours', 0, '2026-10-27 09:00:00', '2026-10-27 11:00:00'),
  (16, 1, 5, 'Préparation fichiers imprimeur', 'a_faire', 1, '2026-10-28 09:00:00', '2026-10-28 11:00:00'),
  (17, 1, 4, 'Flyers recto', 'a_faire', 0, '2026-10-29 10:30:00', '2026-10-29 12:30:00'),
  (18, 1, 2, 'Flyers verso', 'a_faire', 0, '2026-10-30 08:00:00', '2026-10-30 10:00:00'),
  (19, 1, 5, 'Épreuve imprimante', 'a_faire', 1, '2026-10-26 10:10:00', '2026-10-26 12:00:00'),
  (20, 1, 3, 'Livraison finale', 'a_faire', 0, '2026-11-06 09:00:00', '2026-11-06 11:00:00'),
  (21, 2, 2, 'Brief client', 'fait', 1, '2026-09-27 09:00:00', '2026-09-27 12:00:00'),
  (22, 2, 3, 'Moodboard stand', 'en_cours', 0, '2026-10-03 09:00:00', '2026-10-03 12:00:00'),
  (23, 2, 4, 'Croquis kakemono', 'a_faire', 0, '2026-10-09 09:00:00', '2026-10-09 12:00:00'),
  (24, 2, 5, 'Maquette flyer', 'a_faire', 1, '2026-10-15 09:00:00', '2026-10-15 12:00:00'),
  (25, 2, 2, 'Étiquettes produit', 'a_faire', 0, '2026-10-21 09:00:00', '2026-10-21 12:00:00'),
  (26, 2, 3, 'Totem', 'a_faire', 0, '2026-10-27 09:00:00', '2026-10-27 12:00:00'),
  (27, 2, 4, 'Affiche A1', 'a_faire', 1, '2026-11-02 09:00:00', '2026-11-02 12:00:00'),
  (28, 2, 5, 'Badges équipe', 'a_faire', 0, '2026-11-08 09:00:00', '2026-11-08 12:00:00'),
  (29, 2, 2, 'Validation client', 'a_faire', 0, '2026-11-14 09:00:00', '2026-11-14 12:00:00'),
  (30, 2, 3, 'Fichiers imprimeur', 'a_faire', 1, '2026-11-20 09:00:00', '2026-11-20 12:00:00'),
  (31, 3, 2, 'Brief et recherche', 'fait', 0, '2026-08-20 09:00:00', '2026-08-20 12:00:00'),
  (32, 3, 3, 'Pistes de logo', 'fait', 0, '2026-09-01 09:00:00', '2026-09-01 12:00:00'),
  (33, 3, 2, 'Choix du logo', 'fait', 0, '2026-09-13 09:00:00', '2026-09-13 12:00:00'),
  (34, 3, 3, 'Déclinaisons', 'fait', 0, '2026-09-25 09:00:00', '2026-09-25 12:00:00'),
  (35, 3, 2, 'Version finale', 'fait', 0, '2026-10-07 09:00:00', '2026-10-07 12:00:00'),
  (36, 3, 3, 'Livraison des fichiers', 'fait', 0, '2026-10-19 09:00:00', '2026-10-19 12:00:00'),
  (37, 4, 2, 'Audit de marque', 'fait', 0, '2026-10-05 14:00:00', '2026-10-05 17:00:00'),
  (38, 4, 3, 'Entretiens internes', 'a_faire', 1, '2026-10-14 14:00:00', '2026-10-14 17:00:00'),
  (39, 4, 4, 'Plateforme de marque', 'a_faire', 0, '2026-10-23 14:00:00', '2026-10-23 17:00:00'),
  (40, 4, 5, 'Territoire graphique', 'a_faire', 0, '2026-11-01 14:00:00', '2026-11-01 17:00:00'),
  (41, 4, 2, 'Pistes de logo', 'a_faire', 0, '2026-11-10 14:00:00', '2026-11-10 17:00:00'),
  (42, 4, 3, 'Palette et typographie', 'a_faire', 1, '2026-11-19 14:00:00', '2026-11-19 17:00:00'),
  (43, 4, 4, 'Charte graphique', 'a_faire', 0, '2026-11-28 14:00:00', '2026-11-28 17:00:00'),
  (44, 4, 5, 'Papeterie', 'a_faire', 0, '2026-12-07 14:00:00', '2026-12-07 17:00:00'),
  (45, 4, 2, 'Packaging gamme', 'a_faire', 0, '2026-12-16 14:00:00', '2026-12-16 17:00:00'),
  (46, 4, 3, 'Réseaux sociaux', 'a_faire', 1, '2026-12-25 14:00:00', '2026-12-25 17:00:00'),
  (47, 4, 4, 'Présentation finale', 'a_faire', 0, '2027-01-03 14:00:00', '2027-01-03 17:00:00'),
  (48, 4, 5, 'Remise des fichiers', 'a_faire', 0, '2027-01-12 14:00:00', '2027-01-12 17:00:00'),
  (49, 5, 3, 'Audit du site', 'fait', 0, '2026-09-14 09:00:00', '2026-09-14 12:00:00'),
  (50, 5, 4, 'Arborescence', 'fait', 0, '2026-09-19 09:00:00', '2026-09-19 12:00:00'),
  (51, 5, 5, 'Maquettes pages', 'fait', 0, '2026-09-24 09:00:00', '2026-09-24 12:00:00'),
  (52, 5, 2, 'Design système', 'fait', 0, '2026-09-29 09:00:00', '2026-09-29 12:00:00'),
  (53, 5, 3, 'Page accueil', 'fait', 0, '2026-10-04 09:00:00', '2026-10-04 12:00:00'),
  (54, 5, 4, 'Pages services', 'fait', 0, '2026-10-09 09:00:00', '2026-10-09 12:00:00'),
  (55, 5, 5, 'Page contact', 'fait', 0, '2026-10-14 09:00:00', '2026-10-14 12:00:00'),
  (56, 5, 2, 'Intégration', 'fait', 0, '2026-10-19 09:00:00', '2026-10-19 12:00:00'),
  (57, 5, 3, 'Recette interne', 'fait', 0, '2026-10-24 09:00:00', '2026-10-24 12:00:00'),
  (58, 5, 4, 'Corrections client', 'a_faire', 1, '2026-10-29 09:00:00', '2026-10-29 12:00:00'),
  (59, 5, 5, 'Mise en ligne', 'a_faire', 0, '2026-11-03 09:00:00', '2026-11-03 12:00:00');

INSERT INTO tache_notes (tache_id, contenu, position, fait, termine_le, termine_par) VALUES
  (14, 'Demander un brief de la marque au client', 1, 1, '2026-10-24 16:00:00', 2),
  (14, 'Ressortir avec un document clair de conception', 2, 0, NULL, NULL),
  (14, 'Valider la palette avec le gérant', 3, 0, NULL, NULL),
  (15, 'Comparer les deux propositions de couleur', 1, 1, '2026-10-25 11:00:00', 4),
  (15, 'Envoyer la version corrigée au client', 2, 0, NULL, NULL);


-- --------------------------------------------------------------------------
-- 5. SUIVI CLIENT DES PROJETS (accès, images, commentaires)
-- --------------------------------------------------------------------------

INSERT INTO comptes_client (id, client_id, nom, email, mot_de_passe_hash) VALUES
  (1, 1, 'Contact Nael Beauty', 'nael.client@gaia.test', '$2b$10$l4YG1Mqazcm3GQ6MdK5cZuHYJhJs/F6CGWoNVt72z2Q/TvMMlq1Oa');

INSERT INTO acces_projet_client (compte_client_id, projet_id, accorde_par, accorde_le, expire_le, revoque) VALUES
  (1, 1, 1, '2026-09-18 09:00:00', NULL, 0);

INSERT INTO fichiers (id, projet_id, titre, version, nom_original, chemin_stockage, mime_type, taille_octets, statut, valide_par, valide_le, commentaire_validation, envoye_par, created_at) VALUES
  (1, 1, 'Logo principal', 1, 'logo_nael_v1.png', 'uploads/projets/1/logo_nael_v1.png', 'image/png', 842311, 'modifications_demandees', 1, '2026-09-25 10:12:00', 'Reprendre la teinte du doré', 2, '2026-09-24 17:00:00'),
  (2, 1, 'Logo principal', 2, 'logo_nael_v2.png', 'uploads/projets/1/logo_nael_v2.png', 'image/png', 903884, 'soumise', NULL, NULL, NULL, 2, '2026-10-02 15:30:00'),
  (3, 1, 'Étiquette flacon', 1, 'etiquette_flacon_v1.png', 'uploads/projets/1/etiquette_flacon_v1.png', 'image/png', 1250412, 'approuvee', 1, '2026-10-09 09:40:00', 'Validé, merci', 3, '2026-10-08 14:20:00');

INSERT INTO commentaires_fichier (fichier_id, auteur_type, employe_id, compte_client_id, contenu, resolu, created_at) VALUES
  (1, 'client', NULL, 1, 'Le doré est trop clair, pouvez-vous reprendre la teinte ?', 1, '2026-09-25 10:15:00'),
  (1, 'employe', 2, NULL, 'Bien noté, nouvelle version envoyée avec la teinte corrigée.', 1, '2026-10-02 15:35:00'),
  (2, 'client', NULL, 1, 'Mieux ! Pouvez-vous agrandir légèrement le monogramme ?', 0, '2026-10-03 08:50:00');


-- --------------------------------------------------------------------------
-- 6. FOURNISSEURS, STOCK, MACHINES, RELEVÉS
-- --------------------------------------------------------------------------

INSERT INTO fournisseurs (id, nom, telephone, email) VALUES
  (1, 'Papeteria SARL', '+237 233 100 200', 'ventes@papeteria.cm'),
  (2, 'HP Cameroun', '+237 233 300 400', 'contact@hp.cm'),
  (3, 'Print Express', '+237 233 500 600', 'commande@printexpress.cm'),
  (4, 'Kraft & Co', '+237 233 700 800', 'info@kraftco.cm');

INSERT INTO stocks (id, code, nom, fournisseur_id, unite, seuil_alerte, unite_base, conditionnement, mode_decompte) VALUES
  (1, 'CS-PA001', 'Rame papier A4 80g', 1, 'rames', 15000, 'feuille', 500, 'machine'),
  (2, 'CS-PA004', 'Papier A3 couché 170g', 1, 'paquets', 5000, 'feuille', 250, 'machine'),
  (3, 'CS-PA010', 'Papier SRA3 250g', 1, 'paquets', 2500, 'feuille', 250, 'machine'),
  (4, 'CS-CT014', 'Cartouche noire HP 305', 2, 'unités', 4, 'unité', 1, 'commande'),
  (5, 'CS-TN021', 'Toner magenta Xerox', 3, 'unités', 5, 'unité', 1, 'machine'),
  (6, 'CS-TN022', 'Toner cyan Xerox', 3, 'unités', 2, 'unité', 1, 'machine'),
  (7, 'CS-EN007', 'Enveloppes A5 kraft', 4, 'pièces', 200, 'pièce', 1, 'commande'),
  (8, 'CS-CH003', 'Chemises cartonnées', 1, 'pièces', 100, 'pièce', 1, 'commande');

INSERT INTO machines (id, nom, modele, numero_serie, adresse_reseau, protocole, derniere_lecture_at) VALUES
  (1, 'XEROX7835', 'Xerox WorkCentre 7835 v1', '3912944793', '192.168.1.150', 'snmp', '2026-10-26 18:00:00'),
  (2, 'HP DeskJet 2710', 'HP DeskJet 2710', NULL, NULL, 'manuel', NULL);

INSERT INTO machine_stocks (machine_id, stock_id, compteur_code, mesure) VALUES
  (1, 1, 'MediaSize.A4', 'cumul'),
  (1, 2, 'MediaSize.A3', 'cumul'),
  (1, 3, 'MediaSize.SRA3', 'cumul'),
  (1, 5, 'Toner.M', 'niveau'),
  (1, 6, 'Toner.C', 'niveau'),
  (2, 4, 'Ink.Black', 'niveau');

INSERT INTO approvisionnements (id, stock_id, fournisseur_id, quantite, prix_unitaire, date_livraison) VALUES
  (1, 1, 1, 130, 3500, '2026-09-10'),
  (2, 1, 1, 80, 3500, '2026-10-22'),
  (3, 2, 1, 10, 12000, '2026-09-12'),
  (4, 2, 1, 10, 12000, '2026-10-20'),
  (5, 3, 1, 16, 15000, '2026-09-15'),
  (6, 4, 2, 10, 18500, '2026-10-15'),
  (7, 5, 3, 4, 45000, '2026-09-02'),
  (8, 6, 3, 4, 45000, '2026-09-02'),
  (9, 7, 4, 1000, 60, '2026-10-10'),
  (10, 8, 1, 300, 150, '2026-10-05');

INSERT INTO releves_machine (id, machine_id, releve_le, source) VALUES
  (1, 1, '2026-09-10 18:00:00', 'snmp'),
  (2, 1, '2026-09-24 18:00:00', 'snmp'),
  (3, 1, '2026-10-08 18:00:00', 'snmp'),
  (4, 1, '2026-10-22 18:00:00', 'snmp'),
  (5, 1, '2026-10-26 18:00:00', 'snmp');

INSERT INTO releve_valeurs (releve_id, code, valeur) VALUES
  (1, 'MediaSize.A4', 165915),
  (2, 'MediaSize.A4', 177915),
  (3, 'MediaSize.A4', 188915),
  (4, 'MediaSize.A4', 200915),
  (5, 'MediaSize.A4', 210915),
  (1, 'MediaSize.A3', 2216),
  (2, 'MediaSize.A3', 2566),
  (3, 'MediaSize.A3', 2866),
  (4, 'MediaSize.A3', 3216),
  (5, 'MediaSize.A3', 3466),
  (1, 'MediaSize.SRA3', 12924),
  (2, 'MediaSize.SRA3', 13074),
  (3, 'MediaSize.SRA3', 13174),
  (4, 'MediaSize.SRA3', 13324),
  (5, 'MediaSize.SRA3', 13424),
  (1, 'Counter.TotalImpressions', 231210),
  (2, 'Counter.TotalImpressions', 238540),
  (3, 'Counter.TotalImpressions', 246330),
  (4, 'Counter.TotalImpressions', 252690),
  (5, 'Counter.TotalImpressions', 257074),
  (1, 'Toner.K', 100),
  (2, 'Toner.K', 94),
  (3, 'Toner.K', 90),
  (4, 'Toner.K', 85),
  (5, 'Toner.K', 80),
  (1, 'Toner.C', 95),
  (2, 'Toner.C', 80),
  (3, 'Toner.C', 62),
  (4, 'Toner.C', 50),
  (5, 'Toner.C', 40),
  (1, 'Toner.M', 90),
  (2, 'Toner.M', 62),
  (3, 'Toner.M', 30),
  (4, 'Toner.M', 6),
  (5, 'Toner.M', 0),
  (1, 'Toner.Y', 98),
  (2, 'Toner.Y', 90),
  (3, 'Toner.Y', 78),
  (4, 'Toner.Y', 66),
  (5, 'Toner.Y', 60);

INSERT INTO mouvements_stock (stock_id, delta, source, approvisionnement_id, releve_id, prestation_id, employe_id, date_mouvement) VALUES
  (1, 65000, 'approvisionnement', 1, NULL, NULL, 4, '2026-09-10 09:00:00'),
  (1, 40000, 'approvisionnement', 2, NULL, NULL, 4, '2026-10-22 09:00:00'),
  (2, 2500, 'approvisionnement', 3, NULL, NULL, 4, '2026-09-12 09:00:00'),
  (2, 2500, 'approvisionnement', 4, NULL, NULL, 4, '2026-10-20 09:00:00'),
  (3, 4000, 'approvisionnement', 5, NULL, NULL, 4, '2026-09-15 09:00:00'),
  (4, 10, 'approvisionnement', 6, NULL, NULL, 4, '2026-10-15 09:00:00'),
  (5, 4, 'approvisionnement', 7, NULL, NULL, 4, '2026-09-02 09:00:00'),
  (6, 4, 'approvisionnement', 8, NULL, NULL, 4, '2026-09-02 09:00:00'),
  (7, 1000, 'approvisionnement', 9, NULL, NULL, 4, '2026-10-10 09:00:00'),
  (8, 300, 'approvisionnement', 10, NULL, NULL, 4, '2026-10-05 09:00:00'),
  (1, -12000, 'releve_machine', NULL, 2, NULL, NULL, '2026-09-24 18:00:00'),
  (1, -11000, 'releve_machine', NULL, 3, NULL, NULL, '2026-10-08 18:00:00'),
  (1, -12000, 'releve_machine', NULL, 4, NULL, NULL, '2026-10-22 18:00:00'),
  (1, -10000, 'releve_machine', NULL, 5, NULL, NULL, '2026-10-26 18:00:00'),
  (2, -350, 'releve_machine', NULL, 2, NULL, NULL, '2026-09-24 18:00:00'),
  (2, -300, 'releve_machine', NULL, 3, NULL, NULL, '2026-10-08 18:00:00'),
  (2, -350, 'releve_machine', NULL, 4, NULL, NULL, '2026-10-22 18:00:00'),
  (2, -250, 'releve_machine', NULL, 5, NULL, NULL, '2026-10-26 18:00:00'),
  (3, -150, 'releve_machine', NULL, 2, NULL, NULL, '2026-09-24 18:00:00'),
  (3, -100, 'releve_machine', NULL, 3, NULL, NULL, '2026-10-08 18:00:00'),
  (3, -150, 'releve_machine', NULL, 4, NULL, NULL, '2026-10-22 18:00:00'),
  (3, -100, 'releve_machine', NULL, 5, NULL, NULL, '2026-10-26 18:00:00'),
  (4, -4, 'commande', NULL, NULL, 2, 4, '2026-10-24 10:30:00'),
  (5, -1, 'ajustement', NULL, NULL, NULL, 4, '2026-09-30 15:00:00'),
  (7, -120, 'commande', NULL, NULL, 1, 4, '2026-10-12 10:00:00'),
  (7, -80, 'commande', NULL, NULL, 7, 5, '2026-10-23 10:00:00'),
  (8, -50, 'commande', NULL, NULL, 3, 5, '2026-10-21 10:00:00');

INSERT INTO prestation_releves (prestation_id, releve_debut_id, releve_fin_id) VALUES
  (1, 3, 4),
  (8, 4, NULL);


-- --------------------------------------------------------------------------
-- 7. FACTURES
-- --------------------------------------------------------------------------

INSERT INTO factures (id, numero, client_id, date_emission, periode_debut, date_limite) VALUES
  (1, 'FA-2026-0126', 1, '2026-01-05', '2026-01-05', '2026-02-04'),
  (2, 'FA-2026-0127', 2, '2026-01-14', '2026-01-14', '2026-02-13'),
  (3, 'FA-2026-0128', 4, '2026-02-05', '2026-02-05', '2026-03-07'),
  (4, 'FA-2026-0129', 6, '2026-02-14', '2026-02-14', '2026-03-16'),
  (5, 'FA-2026-0130', 7, '2026-03-05', '2026-03-05', '2026-04-04'),
  (6, 'FA-2026-0131', 9, '2026-03-14', '2026-03-14', '2026-04-13'),
  (7, 'FA-2026-0132', 3, '2026-04-05', '2026-04-05', '2026-05-05'),
  (8, 'FA-2026-0133', 5, '2026-04-14', '2026-04-14', '2026-05-14'),
  (9, 'FA-2026-0134', 10, '2026-05-05', '2026-05-05', '2026-06-04'),
  (10, 'FA-2026-0135', 8, '2026-05-14', '2026-05-14', '2026-06-13'),
  (11, 'FA-2026-0136', 1, '2026-06-05', '2026-06-05', '2026-07-05'),
  (12, 'FA-2026-0137', 2, '2026-06-14', '2026-06-14', '2026-07-14'),
  (13, 'FA-2026-0138', 4, '2026-07-05', '2026-07-05', '2026-08-04'),
  (14, 'FA-2026-0139', 6, '2026-07-14', '2026-07-14', '2026-08-13'),
  (15, 'FA-2026-0140', 7, '2026-08-05', '2026-08-05', '2026-09-04'),
  (16, 'FA-2026-0141', 9, '2026-08-14', '2026-08-14', '2026-09-13'),
  (17, 'FA-2026-0142', 3, '2026-09-05', '2026-09-05', '2026-10-05'),
  (18, 'FA-2026-0143', 5, '2026-09-14', '2026-09-14', '2026-10-14'),
  (19, 'FA-2026-0144', 6, '2026-10-05', '2026-10-05', '2026-11-05'),
  (20, 'FA-2026-0145', 5, '2026-10-10', '2026-10-10', '2026-10-25'),
  (21, 'FA-2026-0146', 4, '2026-10-15', '2026-10-15', '2026-10-30'),
  (22, 'FA-2026-0147', 3, '2026-10-20', '2026-10-20', '2026-11-04'),
  (23, 'FA-2026-0148', 1, '2026-10-22', '2026-10-22', '2026-11-20'),
  (24, 'FA-2026-0149', 4, '2026-10-26', '2026-10-26', '2026-11-10'),
  (25, 'FA-2026-0150', 10, '2026-10-23', '2026-10-23', '2026-10-31'),
  (26, 'FA-2026-0151', 7, '2026-10-24', '2026-10-24', '2026-11-14');

INSERT INTO lignes_facture (facture_id, prestation_id, projet_id, description, montant) VALUES
  (1, 9, NULL, 'Impression de documents', 279000),
  (2, 10, NULL, 'Photocopies en nombre', 153000),
  (3, 11, NULL, 'Saisie et mise au propre', 315000),
  (4, 12, NULL, 'Mise en page de documents', 203000),
  (5, 13, NULL, 'Impression de documents', 473000),
  (6, 14, NULL, 'Photocopies en nombre', 324000),
  (7, 15, NULL, 'Saisie et mise au propre', 360000),
  (8, 16, NULL, 'Mise en page de documents', 252000),
  (9, 17, NULL, 'Impression de documents', 293000),
  (10, 18, NULL, 'Photocopies en nombre', 176000),
  (11, 19, NULL, 'Saisie et mise au propre', 495000),
  (12, 20, NULL, 'Mise en page de documents', 351000),
  (13, 21, NULL, 'Impression de documents', 428000),
  (14, 22, NULL, 'Photocopies en nombre', 288000),
  (15, 23, NULL, 'Saisie et mise au propre', 189000),
  (16, 24, NULL, 'Mise en page de documents', 140000),
  (17, 25, NULL, 'Impression de documents', 396000),
  (18, 26, NULL, 'Photocopies en nombre', 270000),
  (19, NULL, 2, 'Nat Care Foire : supports de stand', 650000),
  (20, 2, NULL, 'Photocopies', 45000),
  (21, NULL, 3, 'Design Logo Application', 340000),
  (22, 3, NULL, 'Saisie et impression de mémoire', 140000),
  (23, 1, NULL, 'Impression de flyers', 85000),
  (23, NULL, 1, 'Packaging Nael Beauty : première tranche', 100000),
  (24, 4, NULL, 'Impression & reliure', 95000),
  (25, 7, NULL, 'Saisie de rapport de stage', 35000),
  (26, 8, NULL, 'Impression étiquettes', 300000);


-- --------------------------------------------------------------------------
-- 8. TRANSACTIONS, ÉPARGNE, AGENDA, NOTES
-- --------------------------------------------------------------------------

UPDATE comptes SET solde_initial = 90000 WHERE code = 'caisse';
UPDATE comptes SET solde_initial = 3760000 WHERE code = 'banque';
UPDATE comptes SET solde_initial = 410000 WHERE code = 'mobile';

INSERT INTO transactions (id, type_transaction_id, compte_id, montant, date_transaction, libelle, facture_id, approvisionnement_id, employe_id, created_by) VALUES
  (1, @tt_aut, @cpt_caisse, 25000, '2026-01-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (2, @tt_pay, @cpt_banque, 279000, '2026-01-11 11:00:00', 'Paiement FA-2026-0126', 1, NULL, NULL, 6),
  (3, @tt_pay, @cpt_banque, 76500, '2026-01-22 11:00:00', 'Acompte FA-2026-0127', 2, NULL, NULL, 6),
  (4, @tt_aut, @cpt_banque, 35000, '2026-01-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (5, @tt_loy, @cpt_banque, 100000, '2026-01-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (6, @tt_sal, @cpt_banque, 90000, '2026-01-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (7, @tt_sal, @cpt_mobile, 85000, '2026-01-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (8, @tt_sal, @cpt_banque, 70000, '2026-01-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (9, @tt_sal, @cpt_mobile, 60000, '2026-01-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (10, @tt_sal, @cpt_banque, 65000, '2026-01-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (11, @tt_pay, @cpt_mobile, 76500, '2026-02-03 15:00:00', 'Solde FA-2026-0127', 2, NULL, NULL, 6),
  (12, @tt_aut, @cpt_caisse, 25000, '2026-02-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (13, @tt_pay, @cpt_mobile, 315000, '2026-02-11 11:00:00', 'Paiement FA-2026-0128', 3, NULL, NULL, 6),
  (14, @tt_pay, @cpt_caisse, 101500, '2026-02-22 11:00:00', 'Acompte FA-2026-0129', 4, NULL, NULL, 6),
  (15, @tt_aut, @cpt_banque, 35000, '2026-02-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (16, @tt_loy, @cpt_banque, 100000, '2026-02-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (17, @tt_sal, @cpt_banque, 90000, '2026-02-28 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (18, @tt_sal, @cpt_mobile, 85000, '2026-02-28 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (19, @tt_sal, @cpt_banque, 70000, '2026-02-28 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (20, @tt_sal, @cpt_mobile, 60000, '2026-02-28 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (21, @tt_sal, @cpt_banque, 65000, '2026-02-28 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (22, @tt_pay, @cpt_banque, 101500, '2026-03-06 15:00:00', 'Solde FA-2026-0129', 4, NULL, NULL, 6),
  (23, @tt_aut, @cpt_caisse, 25000, '2026-03-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (24, @tt_pay, @cpt_banque, 473000, '2026-03-11 11:00:00', 'Paiement FA-2026-0130', 5, NULL, NULL, 6),
  (25, @tt_imp, @cpt_banque, 210000, '2026-03-15 10:00:00', 'Impôts trimestriels', NULL, NULL, NULL, 6),
  (26, @tt_pay, @cpt_banque, 162000, '2026-03-22 11:00:00', 'Acompte FA-2026-0131', 6, NULL, NULL, 6),
  (27, @tt_aut, @cpt_banque, 35000, '2026-03-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (28, @tt_loy, @cpt_banque, 100000, '2026-03-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (29, @tt_sal, @cpt_banque, 90000, '2026-03-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (30, @tt_sal, @cpt_mobile, 85000, '2026-03-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (31, @tt_sal, @cpt_banque, 70000, '2026-03-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (32, @tt_sal, @cpt_mobile, 60000, '2026-03-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (33, @tt_sal, @cpt_banque, 65000, '2026-03-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (34, @tt_pay, @cpt_banque, 162000, '2026-04-03 15:00:00', 'Solde FA-2026-0131', 6, NULL, NULL, 6),
  (35, @tt_aut, @cpt_caisse, 25000, '2026-04-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (36, @tt_pay, @cpt_banque, 360000, '2026-04-11 11:00:00', 'Paiement FA-2026-0132', 7, NULL, NULL, 6),
  (37, @tt_pay, @cpt_mobile, 126000, '2026-04-22 11:00:00', 'Acompte FA-2026-0133', 8, NULL, NULL, 6),
  (38, @tt_aut, @cpt_banque, 35000, '2026-04-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (39, @tt_loy, @cpt_banque, 100000, '2026-04-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (40, @tt_sal, @cpt_banque, 90000, '2026-04-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (41, @tt_sal, @cpt_mobile, 85000, '2026-04-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (42, @tt_sal, @cpt_banque, 70000, '2026-04-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (43, @tt_sal, @cpt_mobile, 60000, '2026-04-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (44, @tt_sal, @cpt_banque, 65000, '2026-04-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (45, @tt_epa, @cpt_banque, 35400, '2026-04-30 17:00:00', 'Épargne 2026-04', NULL, NULL, NULL, 6),
  (46, @tt_pay, @cpt_caisse, 126000, '2026-05-04 15:00:00', 'Solde FA-2026-0133', 8, NULL, NULL, 6),
  (47, @tt_aut, @cpt_caisse, 25000, '2026-05-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (48, @tt_pay, @cpt_caisse, 293000, '2026-05-11 11:00:00', 'Paiement FA-2026-0134', 9, NULL, NULL, 6),
  (49, @tt_pay, @cpt_banque, 88000, '2026-05-22 11:00:00', 'Acompte FA-2026-0135', 10, NULL, NULL, 6),
  (50, @tt_aut, @cpt_banque, 35000, '2026-05-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (51, @tt_loy, @cpt_banque, 100000, '2026-05-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (52, @tt_sal, @cpt_banque, 90000, '2026-05-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (53, @tt_sal, @cpt_mobile, 85000, '2026-05-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (54, @tt_sal, @cpt_banque, 70000, '2026-05-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (55, @tt_sal, @cpt_mobile, 60000, '2026-05-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (56, @tt_sal, @cpt_banque, 65000, '2026-05-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (57, @tt_pay, @cpt_banque, 88000, '2026-06-03 15:00:00', 'Solde FA-2026-0135', 10, NULL, NULL, 6),
  (58, @tt_aut, @cpt_caisse, 25000, '2026-06-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (59, @tt_pay, @cpt_banque, 495000, '2026-06-11 11:00:00', 'Paiement FA-2026-0136', 11, NULL, NULL, 6),
  (60, @tt_imp, @cpt_banque, 210000, '2026-06-15 10:00:00', 'Impôts trimestriels', NULL, NULL, NULL, 6),
  (61, @tt_pay, @cpt_banque, 175500, '2026-06-22 11:00:00', 'Acompte FA-2026-0137', 12, NULL, NULL, 6),
  (62, @tt_aut, @cpt_banque, 35000, '2026-06-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (63, @tt_loy, @cpt_banque, 100000, '2026-06-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (64, @tt_sal, @cpt_banque, 90000, '2026-06-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (65, @tt_sal, @cpt_mobile, 85000, '2026-06-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (66, @tt_sal, @cpt_banque, 70000, '2026-06-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (67, @tt_sal, @cpt_mobile, 60000, '2026-06-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (68, @tt_sal, @cpt_banque, 65000, '2026-06-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (69, @tt_epa, @cpt_banque, 5550, '2026-06-30 17:00:00', 'Épargne 2026-06', NULL, NULL, NULL, 6),
  (70, @tt_pay, @cpt_mobile, 175500, '2026-07-04 15:00:00', 'Solde FA-2026-0137', 12, NULL, NULL, 6),
  (71, @tt_aut, @cpt_caisse, 25000, '2026-07-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (72, @tt_pay, @cpt_mobile, 428000, '2026-07-11 11:00:00', 'Paiement FA-2026-0138', 13, NULL, NULL, 6),
  (73, @tt_pay, @cpt_caisse, 144000, '2026-07-22 11:00:00', 'Acompte FA-2026-0139', 14, NULL, NULL, 6),
  (74, @tt_aut, @cpt_banque, 35000, '2026-07-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (75, @tt_loy, @cpt_banque, 100000, '2026-07-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (76, @tt_sal, @cpt_banque, 90000, '2026-07-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (77, @tt_sal, @cpt_mobile, 85000, '2026-07-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (78, @tt_sal, @cpt_banque, 70000, '2026-07-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (79, @tt_sal, @cpt_mobile, 60000, '2026-07-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (80, @tt_sal, @cpt_banque, 65000, '2026-07-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (81, @tt_epa, @cpt_banque, 65250, '2026-07-30 17:00:00', 'Épargne 2026-07', NULL, NULL, NULL, 6),
  (82, @tt_pay, @cpt_banque, 144000, '2026-08-03 15:00:00', 'Solde FA-2026-0139', 14, NULL, NULL, 6),
  (83, @tt_aut, @cpt_caisse, 25000, '2026-08-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (84, @tt_pay, @cpt_banque, 189000, '2026-08-11 11:00:00', 'Paiement FA-2026-0140', 15, NULL, NULL, 6),
  (85, @tt_pay, @cpt_banque, 84000, '2026-08-22 11:00:00', 'Acompte FA-2026-0141', 16, NULL, NULL, 6),
  (86, @tt_aut, @cpt_banque, 35000, '2026-08-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (87, @tt_loy, @cpt_banque, 100000, '2026-08-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (88, @tt_sal, @cpt_banque, 90000, '2026-08-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (89, @tt_sal, @cpt_mobile, 85000, '2026-08-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (90, @tt_sal, @cpt_banque, 70000, '2026-08-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (91, @tt_sal, @cpt_mobile, 60000, '2026-08-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (92, @tt_sal, @cpt_banque, 65000, '2026-08-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (93, @tt_ach, @cpt_banque, 180000, '2026-09-02 12:00:00', 'Toner cyan', NULL, 8, NULL, 6),
  (94, @tt_aut, @cpt_caisse, 25000, '2026-09-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (95, @tt_ach, @cpt_banque, 455000, '2026-09-10 12:00:00', 'Achat papier A4', NULL, 1, NULL, 6),
  (96, @tt_pay, @cpt_banque, 396000, '2026-09-11 11:00:00', 'Paiement FA-2026-0142', 17, NULL, NULL, 6),
  (97, @tt_ach, @cpt_caisse, 120000, '2026-09-12 12:00:00', 'Achat papier A3', NULL, 3, NULL, 6),
  (98, @tt_imp, @cpt_banque, 210000, '2026-09-15 10:00:00', 'Impôts trimestriels', NULL, NULL, NULL, 6),
  (99, @tt_ach, @cpt_banque, 240000, '2026-09-15 12:00:00', 'Achat papier SRA3', NULL, 5, NULL, 6),
  (100, @tt_pay, @cpt_mobile, 135000, '2026-09-22 11:00:00', 'Acompte FA-2026-0143', 18, NULL, NULL, 6),
  (101, @tt_aut, @cpt_banque, 35000, '2026-09-27 10:00:00', 'Facture électricité', NULL, NULL, NULL, 6),
  (102, @tt_loy, @cpt_banque, 100000, '2026-09-28 10:00:00', 'Loyer du local', NULL, NULL, NULL, 6),
  (103, @tt_sal, @cpt_banque, 90000, '2026-09-30 16:00:00', 'Salaire Yves Mailloré', NULL, NULL, 2, 6),
  (104, @tt_sal, @cpt_mobile, 85000, '2026-09-30 16:00:00', 'Salaire Rosine Laure', NULL, NULL, 3, 6),
  (105, @tt_sal, @cpt_banque, 70000, '2026-09-30 16:00:00', 'Salaire Christian Tamo', NULL, NULL, 4, 6),
  (106, @tt_sal, @cpt_mobile, 60000, '2026-09-30 16:00:00', 'Salaire Francky Nguema', NULL, NULL, 5, 6),
  (107, @tt_sal, @cpt_banque, 65000, '2026-09-30 16:00:00', 'Salaire Simone Ekani', NULL, NULL, 6, 6),
  (108, @tt_ach, @cpt_caisse, 45000, '2026-10-05 12:00:00', 'Chemises cartonnées', NULL, 10, NULL, 6),
  (109, @tt_pay, @cpt_banque, 250000, '2026-10-06 10:00:00', 'Acompte FA-2026-0144', 19, NULL, NULL, 6),
  (110, @tt_aut, @cpt_caisse, 25000, '2026-10-10 10:00:00', 'Fournitures et divers', NULL, NULL, NULL, 6),
  (111, @tt_ach, @cpt_caisse, 60000, '2026-10-10 12:00:00', 'Enveloppes A5', NULL, 9, NULL, 6),
  (112, @tt_pay, @cpt_caisse, 45000, '2026-10-12 15:00:00', 'Paiement FA-2026-0145', 20, NULL, NULL, 6),
  (113, @tt_ach, @cpt_banque, 185000, '2026-10-15 12:00:00', 'Cartouches HP', NULL, 6, NULL, 6),
  (114, @tt_pay, @cpt_banque, 200000, '2026-10-20 10:00:00', 'Versement FA-2026-0144', 19, NULL, NULL, 6),
  (115, @tt_pay, @cpt_mobile, 70000, '2026-10-21 09:30:00', 'Acompte FA-2026-0147', 22, NULL, NULL, 6),
  (116, @tt_ach, @cpt_mobile, 50000, '2026-10-21 12:00:00', 'Acompte papier A3', NULL, 4, NULL, 6),
  (117, @tt_pay, @cpt_banque, 100000, '2026-10-22 11:00:00', 'Acompte FA-2026-0148', 23, NULL, NULL, 6),
  (118, @tt_ach, @cpt_banque, 280000, '2026-10-22 12:00:00', 'Achat papier A4', NULL, 2, NULL, 6),
  (119, @tt_aut, @cpt_caisse, 15000, '2026-10-24 10:00:00', 'Entretien machine', NULL, NULL, NULL, 6),
  (120, @tt_pay, @cpt_mobile, 35000, '2026-10-24 16:00:00', 'Paiement FA-2026-0150', 25, NULL, NULL, 6),
  (121, @tt_pay, @cpt_caisse, 180000, '2026-10-25 10:00:00', 'Acompte FA-2026-0151', 26, NULL, NULL, 6),
  (122, @tt_pay, @cpt_banque, 85000, '2026-10-25 14:00:00', 'Solde FA-2026-0148', 23, NULL, NULL, 6);

INSERT INTO epargnes (mois, benefice, taux, montant, transaction_id) VALUES
  ('2026-01-01', -174500, 30, 0, NULL),
  ('2026-02-01', -37000, 30, 0, NULL),
  ('2026-03-01', -3500, 30, 0, NULL),
  ('2026-04-01', 118000, 30, 35400, 45),
  ('2026-05-01', -23000, 30, 0, NULL),
  ('2026-06-01', 18500, 30, 5550, 69),
  ('2026-07-01', 217500, 30, 65250, 81),
  ('2026-08-01', -113000, 30, 0, NULL),
  ('2026-09-01', -1204000, 30, 0, NULL);

INSERT INTO agenda (titre, description, date_evenement, type, montant, compte_id, employe_id) VALUES
  ('Facture électricité', 'Prélèvement Banque', '2026-10-27', 'engagement', 35000, @cpt_banque, 6),
  ('Loyer du local', 'Virement Banque', '2026-10-28', 'engagement', 100000, @cpt_banque, 6),
  ('Salaires', '5 employés · Mobile', '2026-10-30', 'engagement', 370000, @cpt_mobile, 6),
  ('Épargne mensuelle', '30 % du bénéfice · Banque', '2026-10-30', 'engagement', 91500, @cpt_banque, 1),
  ('Impôts', 'Trimestriel · Banque', '2026-11-15', 'engagement', 210000, @cpt_banque, 6),
  ('Rendez-vous Simone Atangana', 'Devis affiches', '2026-10-28', 'rendez_vous', NULL, NULL, 1);

INSERT INTO notes (employe_id, contenu, created_at) VALUES
  (1, 'Simone veut un rendez-vous demain.', '2026-10-26 17:00:00'),
  (1, 'Changer l''imprimante laser.', '2026-10-25 09:00:00'),
  (1, 'Relancer Homeyspace pour la facture FA-2026-0146.', '2026-10-24 11:00:00');


SET FOREIGN_KEY_CHECKS = 1;
