-- Facultatif : version de la vue des stocks compatible avec tous les modes SQL (MySQL strict et MariaDB).
-- À exécuter seulement si la base a été créée avant cette modification.
USE gaia;

DROP VIEW IF EXISTS v_stocks;
CREATE VIEW v_stocks AS
SELECT s.*,
       COALESCE(m.total, 0) AS quantite_actuelle,
       COALESCE(m.total, 0) / s.conditionnement AS quantite_affichee,
       COALESCE(m.total, 0) <= s.seuil_alerte AS sous_le_seuil
FROM stocks s
LEFT JOIN (SELECT stock_id, SUM(delta) AS total FROM mouvements_stock GROUP BY stock_id) m ON m.stock_id = s.id;
