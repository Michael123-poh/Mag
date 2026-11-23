-- À exécuter UNE SEULE FOIS si la base existe déjà (ces tables sont aussi dans schema.sql).
-- Création d'un projet : services, bouquets, services vendus dans un projet, paiements par service.
-- Ensuite, exécuter database/bouquets.sql pour remplir le catalogue des services et les bouquets.
USE gaia;

-- Catalogue des services d'un projet (logo, identité visuelle, pack visuel…)
CREATE TABLE IF NOT EXISTS services_projet (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(30)  NOT NULL UNIQUE,         -- ex. logo, pack, cover
  libelle    VARCHAR(80)  NOT NULL,
  saisie     ENUM('aucune','quantite','template','reseaux','texte') NOT NULL DEFAULT 'aucune',
                                                   -- ce qu'il faut préciser : un nombre (pack visuel), le type de template,
                                                   -- les réseaux sociaux (cover), ou un texte libre (concept)
  a_la_carte TINYINT(1)   NOT NULL DEFAULT 1,      -- 0 = vendu uniquement dans un bouquet
  position   SMALLINT UNSIGNED NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bouquets (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code     VARCHAR(30) NOT NULL UNIQUE,
  nom      VARCHAR(80) NOT NULL,
  prix     DECIMAL(14,0) NOT NULL DEFAULT 0,       -- prix du bouquet : les prix des services du projet doivent en faire la somme
  position SMALLINT UNSIGNED NOT NULL DEFAULT 0
);

-- Ce que contient chaque bouquet (quantité / précision déjà fixées, ou NULL = à préciser à la création du projet)
CREATE TABLE IF NOT EXISTS bouquet_services (
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
CREATE TABLE IF NOT EXISTS projet_services (
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

-- Un encaissement peut maintenant être rattaché à un service de projet
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS projet_service_id INT UNSIGNED NULL AFTER approvisionnement_id;
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_projet_service FOREIGN KEY (projet_service_id) REFERENCES projet_services(id);

INSERT INTO types_transaction (code, libelle, sens)
SELECT 'paiement_projet', 'Paiement de projet', 'encaissement'
WHERE NOT EXISTS (SELECT 1 FROM types_transaction WHERE code = 'paiement_projet');
