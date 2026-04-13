# RoadTrip Collab — Backend

API REST construite avec **AdonisJS 6**, **PostgreSQL** et **TypeScript**.

## Prérequis

- [Node.js](https://nodejs.org/) >= 20.x
- [Docker](https://www.docker.com/products/docker-desktop) + Docker Compose

---

## Lancer tout le projet (backend + frontend)

Le fichier `docker-compose.full.yml` démarre l'ensemble de la stack en une seule commande.

> **Prérequis** : `roadTripCollab_front/` doit être cloné dans le même dossier parent que ce dépôt.

```bash
# 1. Configurer l'environnement (une seule fois)
cp .env.example .env
```

Renseigner ensuite `APP_KEY` dans `.env`. Sans Node.js sur la machine, générer la clé via Docker :

```bash
docker run --rm node:20-alpine node -e \
  "const {randomBytes}=require('crypto');console.log(randomBytes(32).toString('base64url'))"
```

```bash
# 2. Lancer tous les services
docker-compose -f docker-compose.full.yml up --build
```

| Service | URL |
|---------|-----|
| Frontend (Vue) | http://localhost:5173 |
| Backend (AdonisJS) | http://localhost:3333 |
| pgAdmin | http://localhost:5050 |

Les migrations sont exécutées automatiquement au démarrage du backend.

Les modifications du code source sont prises en compte à chaud (hot reload). Seul un `--build` est nécessaire après un changement de `package.json`.

```bash
docker-compose -f docker-compose.full.yml down      # Arrêter (données conservées)
docker-compose -f docker-compose.full.yml down -v   # Arrêter et supprimer les données ⚠️
```

---

## Lancer uniquement le backend (développement local)

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer PostgreSQL (base de données uniquement)
docker-compose up -d

# 3. Créer le fichier d'environnement
cp .env.example .env
# Renseigner APP_KEY, DB_USER, DB_PASSWORD dans .env (voir section ci-dessous)

# 4. Lancer les migrations
node ace migration:run

# 5. Démarrer le serveur
npm run dev
```

L'API est accessible sur **http://localhost:3333**

---

## Configuration `.env`

Valeurs à renseigner après `cp .env.example .env` :

```env
APP_KEY=<votre_app_key>      # Générer avec : node ace generate:key

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=root                 # Correspond à POSTGRES_USER dans docker-compose
DB_PASSWORD=root             # Correspond à POSTGRES_PASSWORD dans docker-compose
DB_DATABASE=roadtrip

FRONTEND_URL=http://localhost:5173
```

Les variables SMTP (email) et `GOOGLE_PLACES_API_KEY` sont optionnelles — l'application fonctionne sans.

---

## Accès administrateur

Après avoir créé un compte via le frontend, passer l'utilisateur en admin :

```bash
docker exec -it roadtrip-postgres psql -U root -d roadtrip -c "UPDATE users SET is_admin = true WHERE email = 'votre@email.com';"
```

Le lien **"Administration"** apparaît alors dans la navbar du frontend.

---

## Base de données (pgAdmin)

Interface web disponible sur **http://localhost:5050**
- Email : `admin@roadtrip.local` — Mot de passe : `admin`
- Connexion au serveur : host `postgres`, port `5432`, user `root`, password `root`, db `roadtrip`

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `node ace migration:run` | Lancer les migrations |
| `node ace migration:rollback` | Annuler la dernière migration |
| `docker-compose up -d` | Démarrer PostgreSQL uniquement |
| `docker-compose down` | Arrêter PostgreSQL |
| `docker-compose down -v` | Arrêter et **supprimer les données** ⚠️ |
