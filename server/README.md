# API GAIA

Serveur Node.js (Express) entre le site (React) et la base MySQL.

## Démarrer

1. Base de données : exécuter `database/schema.sql`, puis `database/seed.sql` (données fictives) dans MySQL.
   Si la base a été créée avec l'ancienne version du schéma : exécuter d'abord `database/migration_cout.sql`.
2. Réglages : copier `server/.env.example` en `server/.env` (déjà fait en local) et vérifier `DB_USER` / `DB_PASSWORD`.
3. Installer et lancer (depuis la racine du projet) :
   ```
   npm run api:install
   npm run api          # API sur http://127.0.0.1:3001
   npm run dev          # site sur http://localhost:5173 (transmet /api à l'API)
   ```
4. Se connecter avec `michael@gaia.test` / `Gaia@2026!` (comptes de démonstration, voir `database/seed.sql`).

## Sécurité en place

- Session dans un cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en production), jeton signé, 8 h.
- Mots de passe chiffrés avec bcrypt ; message d'erreur unique à la connexion ; 10 essais ratés / 15 min / adresse.
- Droits vérifiés côté serveur à chaque requête, par rubrique (`gerer_clients`, `gerer_stock`, …).
- Requêtes SQL toujours paramétrées ; entrées validées (zod) ; identifiants d'URL contrôlés.
- En-têtes de sécurité (helmet), limite de débit, corps de requête limité à 10 Ko, erreurs internes jamais détaillées.
- Toute écriture exige l'en-tête `X-Requested-With: gaia` (protection contre les requêtes venues d'un autre site).

## Avant la mise en production

- Supprimer les comptes de démonstration, générer un nouveau `JWT_SECRET`, vider `APP_TODAY`.
- Servir le site et l'API en HTTPS, mettre `NODE_ENV=production` et `COOKIE_SECURE=true`.
- Créer un utilisateur MySQL dédié (droits limités à la base `gaia`) au lieu de `root`.
