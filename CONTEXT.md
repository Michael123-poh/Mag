# CONTEXT — GAIA : gestion d'un studio créatif & imprimerie

> Document de référence vivant : fonctionnement, processus, charte. Ne contient que ce qui définit le système.
> Source : brief de référence v1.0 (22 oct. 2026) + précisions de l'utilisateur.

## 1. Activité

Studio créatif (branding, logos, visuels…) **et** imprimerie (impression de documents).
Application web de gestion intégrée : clients, prestations, projets, stock, caisse, facturation, rapports.

## 2. Phasage

1. **Phase actuelle : vues uniquement** (à partir des maquettes de l'utilisateur). Pas de logique métier ni de backend.
2. Logique + backend : seulement quand toutes les vues sont terminées.
3. Les maquettes sont des wireframes conceptuels, pas des règles métier validées.

## 3. Règle structurante

- Le **Bon de production** (fiche papier) concerne les **PRESTATIONS** (impression, papier, finition, rebut, créa/PAO facturée comme prestation).
- Il ne définit **pas** le workflow des **PROJETS**. Les deux restent distincts dans le modèle et dans l'interface, sauf décision explicite de l'utilisateur.

## 4. Modules

| Module | Responsabilité |
|---|---|
| Dashboard | Vue rapide de la journée et des points à traiter |
| Client | Identité et historique du client |
| Prestation | Travail de production, de la demande à la livraison |
| Projets | Travaux créatifs en phases/tâches (branding, packaging, supports) |
| Stock | **Consommables d'impression uniquement** : formats de papier, cartouches, enveloppes, chemises… ; mouvements et approvisionnements |
| Caisse | Mouvements d'argent (entrées / sorties) |
| Facture | Pièces financières et suivi |
| Rapport | Pilotage et contrôle |
| Paramètre / Aide | Administration, support |

**Hors périmètre : la vente de produits** (pas de module Ventes).

## 5. Objets métier

- **Prestation** : service commandé par un client — tarif, volume, responsable, délai, état d'avancement.
- **Bon de production** : document opérationnel d'une prestation — spécifications, supports, opérations, rebuts, éléments financiers.
- **Projet** : phases, tâches, fichiers, retours, validations ; avancement en %.
- **Consommable (stock)** : référence, unité, quantité, seuil d'alerte, mouvements.
- **Facture / paiement** : la facture = dû ; le paiement = encaissé. Acomptes et soldes restants distingués. Montants suivis : facturé, encaissé, décaissé.

## 6. Principes

- Données partagées entre modules : un client n'est jamais recréé ; un règlement met à jour la situation financière ; une sortie de stock est rattachée à une opération identifiable (prestation).
- États d'avancement, responsables, échéances, livraisons suivis.
- Stock et pertes traçables ; opérations sensibles limitées par rôle ; historique conservé.

## 7. Charte graphique

- **Style** : Workspace moderne, calme et professionnel ; priorité desktop, adaptation tablette/mobile pour consultation.
- **Structure d'écran** : sidebar à gauche (≈260 px, mode réduit envisagé), topbar (recherche, « + Nouveau », notifications, profil), zone de contenu à droite. Panneaux gris clair à grands arrondis (≈28 px) sur fond blanc.
- **Couleurs** : bleu GAIA — foncé `#09305d` (cartes, titres ; texte `#07264a`), moyen `#2f6fb8`, clair `#b7d0ee` ; **orange `#ef7a1b` en accent décoratif discret**, alterné avec le bleu (alertes, séries de graphiques, boutons secondaires) ; surface `#f2f2f2` ; libellés secondaires gris `#a3a3a3` ; rouge pour avancement faible.
- **Typographie** : Anton (logo, titres forts), Barlow Condensed (texte).
- **Navigation** : Principal (Dashboard) · Activité (Client, Prestation, Projets) · Gestion (Stock, Caisse, Facture) · Analyse (Rapport) · Parametre, Aide.

## 8. Dashboard (contenu maquetté)

Salutation + date du jour ; Entrées / Sorties (caisse, période Weekly) ; Projets (en cours / terminés / total) ; Impression (volumes par format A4, A3, A5) ; Alerte stock (nb de produits concernés) ; Progression (% de hausse) ; Note rapide ; Projets en cours (nom, date de début, % d'avancement) ; graphique mensuel Facturé / Encaissé / Décaissé sur une période ; Gains net par produit ; deux blocs encore vides dans la maquette.

## 9. Questions ouvertes

- Sections du brief non reçues : détail du processus Prestations, processus Projets, Clients, rôles/droits, décisions.
- Fiche papier « Bon de production » non fournie.
- Rôles et droits des utilisateurs à confirmer ; périmètre de lancement à prioriser.
