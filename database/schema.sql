-- ============================================================================
-- GAIA — schéma MySQL 8.0+ (InnoDB, utf8mb4)            VERSION 3 (machines réseau, suivi client, coût de revient)
-- Fichier de description : rien n'a été exécuté, aucune base n'a été créée.
-- Montants en XAF (entiers, sans décimales).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS gaia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gaia;

-- ----------------------------------------------------------------------------
-- 1. ÉQUIPE ET DROITS
-- ----------------------------------------------------------------------------
CREATE TABLE types_employe (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE employes (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricule         VARCHAR(20)  NOT NULL UNIQUE,
  nom               VARCHAR(120) NOT NULL,
  email             VARCHAR(160) NOT NULL UNIQUE,
  telephone         VARCHAR(30)  NULL,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  type_employe_id   INT UNSIGNED NOT NULL,       -- titre du poste (Gérant, Graphiste…)
  fonction          VARCHAR(255) NULL,           -- ce que fait l'employé (ses tâches)
  salaire           DECIMAL(14,0) NULL,          -- sert au décaissement « Salaires »
  date_embauche     DATE NULL,
  actif             TINYINT(1) NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (type_employe_id) REFERENCES types_employe(id)
);

CREATE TABLE privileges (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code    VARCHAR(60)  NOT NULL UNIQUE,          -- ex. gerer_caisse
  libelle VARCHAR(120) NOT NULL
);

-- Les privilèges sont donnés employé par employé (pas de rôles).
CREATE TABLE employe_privileges (
  employe_id   INT UNSIGNED NOT NULL,
  privilege_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (employe_id, privilege_id),
  FOREIGN KEY (employe_id)   REFERENCES employes(id)   ON DELETE CASCADE,
  FOREIGN KEY (privilege_id) REFERENCES privileges(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2. CLIENTS
-- ----------------------------------------------------------------------------
CREATE TABLE types_client (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(60) NOT NULL UNIQUE            -- Entreprise, Personne
);

CREATE TABLE clients (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(20)  NOT NULL UNIQUE,   -- ex. CL-PE001D18
  nom            VARCHAR(160) NOT NULL,
  type_client_id INT UNSIGNED NOT NULL,
  telephone      VARCHAR(30)  NULL,
  email          VARCHAR(160) NULL,
  adresse        VARCHAR(255) NULL,
  ville          VARCHAR(80)  NULL,
  forme_juridique VARCHAR(40) NULL,              -- Particulier, SARL, SA… (« Particulier » = client de type Personne)
  activite       VARCHAR(60)  NULL,
  chiffre_affaire DECIMAL(14,0) NULL,            -- en xaf
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (type_client_id) REFERENCES types_client(id)
  -- Le solde d'un client n'est PAS stocké : il se calcule (voir v_clients_solde).
);

-- ----------------------------------------------------------------------------
-- 3. PRESTATIONS (production) — distinctes des PROJETS
-- ----------------------------------------------------------------------------
CREATE TABLE types_prestation (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(60) NOT NULL UNIQUE            -- Impression, Photocopie, Saisie, Mise en page
);

CREATE TABLE prestations (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference          VARCHAR(20)  NOT NULL UNIQUE,   -- ex. BP098RT26 (numéro du bon de production)
  client_id          INT UNSIGNED NOT NULL,
  type_prestation_id INT UNSIGNED NOT NULL,
  responsable_id     INT UNSIGNED NULL,
  titre              VARCHAR(200) NOT NULL,
  details            TEXT NULL,                      -- ex. 500 exemplaires, couleur, pelliculage
  quantite           INT UNSIGNED NULL,
  tarif              DECIMAL(14,0) NOT NULL DEFAULT 0,
  cout               DECIMAL(14,0) NOT NULL DEFAULT 0,   -- coût de revient ; gain = tarif - cout
  statut_production  ENUM('a_faire','en_cours','livre') NOT NULL DEFAULT 'a_faire',
  date_echeance      DATE NULL,
  date_livraison     DATE NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id)          REFERENCES clients(id),
  FOREIGN KEY (type_prestation_id) REFERENCES types_prestation(id),
  FOREIGN KEY (responsable_id)     REFERENCES employes(id)
  -- Ce qui a été commandé (pages, produits, prix) est dans prestation_lignes ; les prix viennent de la grille « tarifs ».
);

-- Grille des tarifs (catalogue des produits et finitions proposés en impression, photocopie…)
CREATE TABLE tarifs (
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
CREATE TABLE prestation_lignes (
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

-- ----------------------------------------------------------------------------
-- 4. PROJETS (créatif) — distincts des PRESTATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE types_projet (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(60) NOT NULL UNIQUE            -- Branding, Logo, Packaging…
);

CREATE TABLE projets (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference      VARCHAR(20)  NOT NULL UNIQUE,
  client_id      INT UNSIGNED NOT NULL,
  type_projet_id INT UNSIGNED NOT NULL,
  titre          VARCHAR(200) NOT NULL,
  description    TEXT NULL,
  budget         DECIMAL(14,0) NOT NULL DEFAULT 0,
  cout           DECIMAL(14,0) NOT NULL DEFAULT 0,   -- coût de revient ; gain = budget - cout
  date_debut     DATE NULL,
  date_fin       DATE NULL,
  statut         ENUM('en_cours','termine','annule') NOT NULL DEFAULT 'en_cours',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id)      REFERENCES clients(id),
  FOREIGN KEY (type_projet_id) REFERENCES types_projet(id)
  -- L'avancement (%) se calcule à partir des tâches (voir v_projets_avancement).
);

CREATE TABLE user_projet (
  projet_id   INT UNSIGNED NOT NULL,
  employe_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (projet_id, employe_id),
  FOREIGN KEY (projet_id)  REFERENCES projets(id)  ON DELETE CASCADE,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
);

CREATE TABLE taches_projet (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id   INT UNSIGNED NOT NULL,
  assignee_id INT UNSIGNED NULL,
  titre       VARCHAR(200) NOT NULL,
  statut      ENUM('a_faire','en_cours','fait') NOT NULL DEFAULT 'a_faire',
  urgente     TINYINT(1) NOT NULL DEFAULT 0,
  position    INT NOT NULL DEFAULT 0,             -- ordre dans sa colonne (À faire / En cours / Faites)
  debut       DATETIME NULL,                      -- créneau dans le planning
  fin         DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id)   REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES employes(id),
  CHECK (fin IS NULL OR debut IS NULL OR fin >= debut)
);

CREATE TABLE tache_notes (                        -- sous-étapes d'une tâche, cochables
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tache_id    INT UNSIGNED NOT NULL,
  contenu     VARCHAR(255) NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- ordre d'affichage
  fait        TINYINT(1) NOT NULL DEFAULT 0,          -- case cochée = sous-étape terminée
  termine_le  DATETIME NULL,
  termine_par INT UNSIGNED NULL,
  FOREIGN KEY (tache_id)    REFERENCES taches_projet(id) ON DELETE CASCADE,
  FOREIGN KEY (termine_par) REFERENCES employes(id)
);

-- Catalogue des services d'un projet (logo, identité visuelle, pack visuel…)
CREATE TABLE services_projet (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(30)  NOT NULL UNIQUE,         -- ex. logo, pack, cover
  libelle    VARCHAR(80)  NOT NULL,
  saisie     ENUM('aucune','quantite','template','reseaux','texte') NOT NULL DEFAULT 'aucune',
                                                   -- ce qu'il faut préciser : un nombre (pack visuel), le type de template,
                                                   -- les réseaux sociaux (cover), ou un texte libre (concept)
  a_la_carte TINYINT(1)   NOT NULL DEFAULT 1,      -- 0 = vendu uniquement dans un bouquet
  position   SMALLINT UNSIGNED NOT NULL DEFAULT 0
);

CREATE TABLE bouquets (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code     VARCHAR(30) NOT NULL UNIQUE,
  nom      VARCHAR(80) NOT NULL,
  prix     DECIMAL(14,0) NOT NULL DEFAULT 0,       -- prix du bouquet : les prix des services du projet doivent en faire la somme
  position SMALLINT UNSIGNED NOT NULL DEFAULT 0
);

-- Ce que contient chaque bouquet (quantité / précision déjà fixées, ou NULL = à préciser à la création du projet)
CREATE TABLE bouquet_services (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bouquet_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  quantite   INT UNSIGNED NULL,
  detail     VARCHAR(120) NULL,
  position   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (bouquet_id) REFERENCES bouquets(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services_projet(id)
);

-- Les services vendus dans un projet, chacun avec son prix. Le budget du projet = la somme de ces prix.
-- Le paiement se valide service par service (transactions.projet_service_id).
CREATE TABLE projet_services (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id  INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  bouquet_id INT UNSIGNED NULL,                    -- bouquet d'où vient ce service (NULL = choisi à la carte)
  quantite   INT UNSIGNED NULL,
  detail     VARCHAR(120) NULL,
  libelle    VARCHAR(200) NOT NULL,                -- texte affiché : « Pack visuel × 10 », « Cover — Facebook, LinkedIn »…
  prix       DECIMAL(14,0) NOT NULL DEFAULT 0,
  position   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (projet_id)  REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services_projet(id),
  FOREIGN KEY (bouquet_id) REFERENCES bouquets(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 4 bis. SUIVI CLIENT DES PROJETS : accès client, images (version + validation), commentaires
-- ----------------------------------------------------------------------------
-- Accès du client : un compte n'existe que si l'entreprise décide de donner accès,
-- et chaque projet auquel il accède est ouvert (et révocable) séparément.
CREATE TABLE comptes_client (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id         INT UNSIGNED NOT NULL,
  nom               VARCHAR(120) NOT NULL,
  email             VARCHAR(160) NOT NULL UNIQUE,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  actif             TINYINT(1) NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE acces_projet_client (
  compte_client_id INT UNSIGNED NOT NULL,
  projet_id        INT UNSIGNED NOT NULL,
  accorde_par      INT UNSIGNED NULL,
  accorde_le       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_le        DATETIME NULL,                   -- NULL = sans limite de durée
  revoque          TINYINT(1) NOT NULL DEFAULT 0,   -- 1 = accès retiré
  PRIMARY KEY (compte_client_id, projet_id),
  FOREIGN KEY (compte_client_id) REFERENCES comptes_client(id) ON DELETE CASCADE,
  FOREIGN KEY (projet_id)        REFERENCES projets(id)        ON DELETE CASCADE,
  FOREIGN KEY (accorde_par)      REFERENCES employes(id)
);

-- Images du projet, stockées dans un dossier du serveur (10 Mo maximum par fichier).
-- Une seule table pour le fichier, sa version et la décision du client :
--   titre   = l'image concernée (ex. « Logo principal ») ; version = v1, v2, v3…
--   statut  = brouillon -> soumise -> approuvee / refusee / modifications_demandees
CREATE TABLE fichiers (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projet_id              INT UNSIGNED NULL,
  titre                  VARCHAR(200) NULL,
  version                SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  nom_original           VARCHAR(255) NOT NULL,
  chemin_stockage        VARCHAR(500) NOT NULL,
  mime_type              VARCHAR(100) NULL,
  taille_octets          INT UNSIGNED NOT NULL DEFAULT 0,
  empreinte_sha256       CHAR(64) NULL,
  statut                 ENUM('brouillon','soumise','approuvee','refusee','modifications_demandees') NOT NULL DEFAULT 'brouillon',
  valide_par             INT UNSIGNED NULL,          -- compte client qui a donné son appréciation
  valide_le              DATETIME NULL,
  commentaire_validation VARCHAR(500) NULL,
  envoye_par             INT UNSIGNED NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fichier_version (projet_id, titre, version),
  FOREIGN KEY (projet_id)  REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (valide_par) REFERENCES comptes_client(id),
  FOREIGN KEY (envoye_par) REFERENCES employes(id),
  CHECK (taille_octets <= 10485760)                  -- 10 Mo
);

-- Commentaires sur une image : écrits par l'équipe ou par le client (compte client).
CREATE TABLE commentaires_fichier (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fichier_id       INT UNSIGNED NOT NULL,
  auteur_type      ENUM('employe','client') NOT NULL,
  employe_id       INT UNSIGNED NULL,
  compte_client_id INT UNSIGNED NULL,
  contenu          TEXT NOT NULL,
  resolu           TINYINT(1) NOT NULL DEFAULT 0,    -- retour pris en compte
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fichier_id)       REFERENCES fichiers(id) ON DELETE CASCADE,
  FOREIGN KEY (employe_id)       REFERENCES employes(id),
  FOREIGN KEY (compte_client_id) REFERENCES comptes_client(id),
  CHECK ((auteur_type = 'employe' AND employe_id IS NOT NULL AND compte_client_id IS NULL)
      OR (auteur_type = 'client'  AND compte_client_id IS NOT NULL AND employe_id IS NULL))
);

-- ----------------------------------------------------------------------------
-- 5. STOCK (consommables d'impression) ET MACHINES
-- ----------------------------------------------------------------------------
CREATE TABLE fournisseurs (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom       VARCHAR(160) NOT NULL,
  telephone VARCHAR(30)  NULL,
  email     VARCHAR(160) NULL
);

CREATE TABLE stocks (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(20)  NOT NULL UNIQUE,    -- ex. CS-PA001
  nom            VARCHAR(160) NOT NULL,
  fournisseur_id INT UNSIGNED NULL,               -- fournisseur habituel
  unite          VARCHAR(30)  NOT NULL,           -- rames, unités, pièces…
  seuil_alerte   INT UNSIGNED NOT NULL DEFAULT 0,   -- exprimé en unité de base
  -- Quantités et mouvements comptés en UNITÉ DE BASE (ex. feuilles) ;
  -- conditionnement = nombre d'unités de base dans l'unité affichée (ex. 500 feuilles par rame).
  unite_base     VARCHAR(30)  NOT NULL DEFAULT 'unité',
  conditionnement INT UNSIGNED NOT NULL DEFAULT 1,
  -- Qui fait baisser le stock ?
  --   machine  : le chiffre vient des compteurs de la machine, lus sur le réseau (papier, encre…)
  --   commande : le chiffre vient de la commande (enveloppes, chemises…)
  mode_decompte  ENUM('machine','commande') NOT NULL DEFAULT 'commande',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id)
  -- La quantité actuelle n'est PAS stockée : somme des mouvements (voir v_stocks).
);

CREATE TABLE machines (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(120) NOT NULL,         -- ex. XEROX7835
  modele           VARCHAR(120) NULL,             -- ex. Xerox WorkCentre 7835 v1
  numero_serie     VARCHAR(60)  NULL UNIQUE,
  adresse_reseau   VARCHAR(120) NULL,             -- ex. 192.168.1.150 (le serveur doit être sur le même réseau)
  protocole        ENUM('snmp','http','csv','manuel') NOT NULL DEFAULT 'snmp',
  -- Les identifiants d'accès (communauté SNMP, mot de passe) ne sont PAS stockés ici : variables d'environnement du backend.
  derniere_lecture_at DATETIME NULL,
  actif            TINYINT(1) NOT NULL DEFAULT 1,
  image            VARCHAR(255) NULL,             -- nom du fichier placé dans public/machines/ (ex. xerox7835.png)
  couleur_support  VARCHAR(60)  NULL,             -- couleur du support par défaut (ex. Blanc)
  mode_impression  VARCHAR(60)  NULL              -- mode d'impression par défaut (ex. Recto, Recto/Verso)
);

-- Magasins = bacs à papier de la machine : le type de feuilles et leur dimension (page Rapport)
CREATE TABLE machine_magasins (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id  INT UNSIGNED NOT NULL,
  nom         VARCHAR(60) NOT NULL,                -- ex. Magasin 1
  type_papier VARCHAR(80) NULL,                    -- ex. Standard
  couleur     VARCHAR(40) NULL,                    -- couleur du papier, ex. Blanc
  dimension   VARCHAR(60) NULL,                    -- format et dimensions, ex. A4 (210 x 297 mm)
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

-- Quel compteur de la machine alimente quel consommable.
--   mesure = 'cumul'  : compteur qui ne fait que monter (ex. MediaSize.A4 = feuilles A4 utilisées)
--                       -> consommation = valeur actuelle - valeur du relevé précédent
--   mesure = 'niveau' : niveau restant en % (ex. Toner.M) -> sert aux alertes, pas aux mouvements
CREATE TABLE machine_stocks (
  machine_id    INT UNSIGNED NOT NULL,
  stock_id      INT UNSIGNED NOT NULL,
  compteur_code VARCHAR(80)  NOT NULL,            -- ex. MediaSize.A4, MediaSize.A3, MediaSize.SRA3, Toner.K
  mesure        ENUM('cumul','niveau') NOT NULL DEFAULT 'cumul',
  PRIMARY KEY (machine_id, stock_id),
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id)   REFERENCES stocks(id)   ON DELETE CASCADE
);

-- Remise à zéro des compteurs affichés sur la page Rapport : on garde les compteurs de la machine à cet instant, et la page
-- n'affiche plus que ce qui a été fait DEPUIS (compteur actuel - compteur gardé). Les compteurs de la machine, eux, ne sont jamais modifiés.
-- Chaque remise est conservée (historique) ; c'est la plus récente qui s'applique.
CREATE TABLE machine_remises_a_zero (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id INT UNSIGNED NOT NULL,
  remise_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  par        INT UNSIGNED NULL,                    -- employé qui a fait la remise à zéro
  valeurs    JSON NOT NULL,                        -- compteurs de la machine à cet instant : { "TotalImpressions": 258008, … }
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
  FOREIGN KEY (par)        REFERENCES employes(id),
  INDEX idx_remise_machine (machine_id, remise_le)
);

CREATE TABLE approvisionnements (                 -- achats / livraisons de consommables
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_id       INT UNSIGNED NOT NULL,
  fournisseur_id INT UNSIGNED NOT NULL,
  quantite       INT UNSIGNED NOT NULL,
  prix_unitaire  DECIMAL(14,0) NOT NULL,
  date_livraison DATE NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id)       REFERENCES stocks(id),
  FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id)
  -- Payé / non payé = somme des décaissements liés (transactions.approvisionnement_id).
);

-- Un relevé = une lecture complète de la machine à un instant T.
-- L'heure vient du SERVEUR (l'horloge de la machine est fausse : elle indique l'an 2000).
CREATE TABLE releves_machine (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  machine_id INT UNSIGNED NOT NULL,
  releve_le  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source     ENUM('snmp','http','csv','manuel') NOT NULL,
  brut       JSON NULL,                            -- copie de la lecture brute, utile pour diagnostiquer
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  INDEX idx_releve_machine_date (machine_id, releve_le)
);

-- Valeurs lues : une ligne par compteur (ex. 'MediaSize.A4' = 210915, 'Toner.M' = 0).
CREATE TABLE releve_valeurs (
  releve_id INT UNSIGNED NOT NULL,
  code      VARCHAR(80)  NOT NULL,
  valeur    DECIMAL(20,2) NOT NULL,
  PRIMARY KEY (releve_id, code),
  FOREIGN KEY (releve_id) REFERENCES releves_machine(id) ON DELETE CASCADE
);

-- Consommation d'une prestation = écart entre le relevé pris au début et celui pris à la fin.
CREATE TABLE prestation_releves (
  prestation_id    INT UNSIGNED PRIMARY KEY,
  releve_debut_id  INT UNSIGNED NOT NULL,
  releve_fin_id    INT UNSIGNED NULL,
  FOREIGN KEY (prestation_id)   REFERENCES prestations(id) ON DELETE CASCADE,
  FOREIGN KEY (releve_debut_id) REFERENCES releves_machine(id),
  FOREIGN KEY (releve_fin_id)   REFERENCES releves_machine(id)
);

-- Journal de tous les mouvements : delta > 0 = entrée, delta < 0 = sortie.
CREATE TABLE mouvements_stock (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_id             INT UNSIGNED NOT NULL,
  delta                INT NOT NULL,
  source               ENUM('approvisionnement','releve_machine','commande','ajustement') NOT NULL,
  approvisionnement_id INT UNSIGNED NULL,         -- source = approvisionnement
  releve_id            INT UNSIGNED NULL,         -- source = releve_machine
  prestation_id        INT UNSIGNED NULL,         -- source = commande (ou imputation)
  employe_id           INT UNSIGNED NULL,
  date_mouvement       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id)             REFERENCES stocks(id),
  FOREIGN KEY (approvisionnement_id) REFERENCES approvisionnements(id),
  FOREIGN KEY (releve_id)            REFERENCES releves_machine(id),
  FOREIGN KEY (prestation_id)        REFERENCES prestations(id),
  FOREIGN KEY (employe_id)           REFERENCES employes(id),
  CHECK (delta <> 0)
);

-- ----------------------------------------------------------------------------
-- 6. FACTURES
-- ----------------------------------------------------------------------------
CREATE TABLE factures (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero         VARCHAR(20)  NOT NULL UNIQUE,    -- ex. FA-2026-0148
  client_id      INT UNSIGNED NOT NULL,
  date_emission  DATE NOT NULL,
  periode_debut  DATE NULL,                       -- début de la plage de paiement
  date_limite    DATE NOT NULL,                   -- fin de la plage = date limite
  created_by     INT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id)  REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES employes(id),
  CHECK (periode_debut IS NULL OR date_limite >= periode_debut)
);

-- Une facture peut couvrir des prestations ET des projets : chaque ligne vise l'un OU l'autre.
CREATE TABLE lignes_facture (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  facture_id    INT UNSIGNED NOT NULL,
  prestation_id INT UNSIGNED NULL,
  projet_id     INT UNSIGNED NULL,
  description   VARCHAR(255) NOT NULL,
  montant       DECIMAL(14,0) NOT NULL,
  FOREIGN KEY (facture_id)    REFERENCES factures(id)    ON DELETE CASCADE,
  FOREIGN KEY (prestation_id) REFERENCES prestations(id),
  FOREIGN KEY (projet_id)     REFERENCES projets(id),
  CHECK ((prestation_id IS NULL) <> (projet_id IS NULL))
);

-- ----------------------------------------------------------------------------
-- 7. ARGENT : COMPTES, TRANSACTIONS, ÉPARGNE
-- ----------------------------------------------------------------------------
-- Exactement 3 comptes (insérés plus bas, pas d'écran pour en ajouter).
CREATE TABLE comptes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          ENUM('caisse','banque','mobile') NOT NULL UNIQUE,
  libelle       VARCHAR(60) NOT NULL,
  solde_initial DECIMAL(14,0) NOT NULL DEFAULT 0
);

CREATE TABLE types_transaction (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code    VARCHAR(40)  NOT NULL UNIQUE,           -- paiement_facture, salaire, loyer, impot, epargne…
  libelle VARCHAR(80)  NOT NULL,
  sens    ENUM('encaissement','decaissement') NOT NULL
);

CREATE TABLE transactions (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type_transaction_id  INT UNSIGNED NOT NULL,
  compte_id            INT UNSIGNED NOT NULL,
  montant              DECIMAL(14,0) NOT NULL,    -- toujours positif ; le sens vient du type
  date_transaction     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  libelle              VARCHAR(200) NULL,
  facture_id           INT UNSIGNED NULL,         -- encaissement d'une facture (acompte, solde…)
  approvisionnement_id INT UNSIGNED NULL,         -- paiement d'un achat de stock
  projet_service_id    INT UNSIGNED NULL,         -- encaissement d'un service de projet
  employe_id           INT UNSIGNED NULL,         -- bénéficiaire (salaire)
  created_by           INT UNSIGNED NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (type_transaction_id)  REFERENCES types_transaction(id),
  FOREIGN KEY (compte_id)            REFERENCES comptes(id),
  FOREIGN KEY (facture_id)           REFERENCES factures(id),
  FOREIGN KEY (approvisionnement_id) REFERENCES approvisionnements(id),
  FOREIGN KEY (projet_service_id)    REFERENCES projet_services(id),
  FOREIGN KEY (employe_id)           REFERENCES employes(id),
  FOREIGN KEY (created_by)           REFERENCES employes(id),
  CHECK (montant > 0)
);

-- Épargne du mois : le taux appliqué est conservé (le taux courant, modifiable, est dans parametres).
CREATE TABLE epargnes (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mois           DATE NOT NULL UNIQUE,            -- 1er jour du mois
  benefice       DECIMAL(14,0) NOT NULL,
  taux           DECIMAL(5,2)  NOT NULL,          -- ex. 30.00
  montant        DECIMAL(14,0) NOT NULL,
  transaction_id INT UNSIGNED NULL,               -- virement vers l'épargne, une fois fait
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  CHECK (taux BETWEEN 0 AND 100)
);

CREATE TABLE parametres (
  cle    VARCHAR(60)  PRIMARY KEY,                -- taux_epargne, objectif_mensuel…
  valeur VARCHAR(255) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. AGENDA, NOTES, HISTORIQUE
-- ----------------------------------------------------------------------------
CREATE TABLE agenda (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre          VARCHAR(200) NOT NULL,
  description    VARCHAR(255) NULL,
  date_evenement DATE NOT NULL,
  type           ENUM('engagement','rendez_vous','rappel') NOT NULL DEFAULT 'engagement',
  montant        DECIMAL(14,0) NULL,              -- engagement financier prévu
  compte_id      INT UNSIGNED NULL,
  employe_id     INT UNSIGNED NULL,
  transaction_id INT UNSIGNED NULL,               -- rempli quand l'engagement est réglé
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compte_id)      REFERENCES comptes(id),
  FOREIGN KEY (employe_id)     REFERENCES employes(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE notes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employe_id INT UNSIGNED NOT NULL,
  contenu    VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
);

CREATE TABLE journal (                            -- historique des opérations sensibles
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employe_id INT UNSIGNED NULL,
  action     VARCHAR(60)  NOT NULL,
  entite     VARCHAR(60)  NOT NULL,
  entite_id  INT UNSIGNED NULL,
  details    JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employe_id) REFERENCES employes(id)
);

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

-- ----------------------------------------------------------------------------
-- 9. VUES (valeurs calculées, jamais stockées)
-- ----------------------------------------------------------------------------
CREATE VIEW v_stocks AS
SELECT s.*,
       COALESCE(m.total, 0) AS quantite_actuelle,                         -- en unité de base
       COALESCE(m.total, 0) / s.conditionnement AS quantite_affichee,     -- ex. en rames
       COALESCE(m.total, 0) <= s.seuil_alerte AS sous_le_seuil
FROM stocks s
LEFT JOIN (SELECT stock_id, SUM(delta) AS total FROM mouvements_stock GROUP BY stock_id) m ON m.stock_id = s.id;

CREATE VIEW v_factures AS
SELECT f.*,
       COALESCE(l.total, 0)      AS total,
       COALESCE(p.encaisse, 0)   AS encaisse,
       COALESCE(l.total, 0) - COALESCE(p.encaisse, 0) AS reste,
       COALESCE(p.versements, 0) AS versements,
       CASE
         WHEN COALESCE(l.total, 0) > 0 AND COALESCE(p.encaisse, 0) >= l.total THEN 'payee'
         WHEN COALESCE(p.encaisse, 0) > 0 THEN 'partielle'
         ELSE 'impayee'
       END AS statut
FROM factures f
LEFT JOIN (SELECT facture_id, SUM(montant) AS total
           FROM lignes_facture GROUP BY facture_id) l ON l.facture_id = f.id
LEFT JOIN (SELECT facture_id, SUM(montant) AS encaisse, COUNT(*) AS versements
           FROM transactions WHERE facture_id IS NOT NULL GROUP BY facture_id) p ON p.facture_id = f.id;

CREATE VIEW v_clients_solde AS
SELECT c.id AS client_id, COALESCE(SUM(vf.reste), 0) AS solde_du
FROM clients c
LEFT JOIN v_factures vf ON vf.client_id = c.id
GROUP BY c.id;

CREATE VIEW v_projets_avancement AS
SELECT p.id AS projet_id,
       COUNT(t.id) AS nb_taches,
       COALESCE(ROUND(100 * SUM(t.statut = 'fait') / NULLIF(COUNT(t.id), 0)), 0) AS avancement
FROM projets p
LEFT JOIN taches_projet t ON t.projet_id = p.id
GROUP BY p.id;

-- ----------------------------------------------------------------------------
-- 10. DONNÉES DE DÉPART
-- ----------------------------------------------------------------------------
INSERT INTO comptes (code, libelle) VALUES ('caisse','Caisse'), ('banque','Banque'), ('mobile','Mobile');

INSERT INTO types_transaction (code, libelle, sens) VALUES
  ('paiement_facture', 'Paiement de facture',      'encaissement'),
  ('salaire',          'Salaire',                  'decaissement'),
  ('loyer',            'Loyer',                    'decaissement'),
  ('impot',            'Impôt',                    'decaissement'),
  ('epargne',          'Épargne',                  'decaissement'),
  ('achat_stock',      'Achat de consommables',    'decaissement'),
  ('paiement_projet',  'Paiement de projet',       'encaissement'),
  ('autre',            'Autre dépense',            'decaissement');

INSERT INTO types_client (libelle)     VALUES ('Entreprise'), ('Personne');
INSERT INTO types_prestation (libelle) VALUES ('Impression'), ('Photocopie'), ('Saisie'), ('Mise en page');
INSERT INTO types_projet (libelle)     VALUES ('Branding'), ('Logo'), ('Packaging');

INSERT INTO parametres (cle, valeur) VALUES ('taux_epargne', '30'), ('objectif_mensuel', '1200000'), ('machines_intervalle_secondes', '20'), ('machines_releve_minutes', '5');

INSERT INTO privileges (code, libelle) VALUES
  ('gerer_clients',     'Gérer les clients'),
  ('gerer_prestations', 'Gérer les prestations'),
  ('gerer_projets',     'Gérer les projets'),
  ('gerer_stock',       'Gérer le stock'),
  ('gerer_caisse',      'Gérer la caisse et les transactions'),
  ('gerer_factures',    'Gérer les factures'),
  ('voir_rapports',     'Consulter les rapports'),
  ('administrer',       'Administration (employés, droits, paramètres)');
