-- À exécuter pour que TOUTES les tâches « à faire » et « en cours » apparaissent dans « Gestion des tâches ».
-- Une tâche sans date ne peut pas être placée dans le planning : on lui donne un créneau de 2 h
-- (9h-11h), 14 jours avant la fin de son projet. Les tâches qui ont déjà une date ne changent pas.
-- Peut être relancé sans danger.
USE gaia;

UPDATE taches_projet t
  JOIN projets p ON p.id = t.projet_id
   SET t.debut = TIMESTAMP(DATE_SUB(p.date_fin, INTERVAL 14 DAY), '09:00:00'),
       t.fin   = TIMESTAMP(DATE_SUB(p.date_fin, INTERVAL 14 DAY), '11:00:00')
 WHERE t.statut IN ('a_faire', 'en_cours')
   AND t.debut IS NULL
   AND p.date_fin IS NOT NULL;
