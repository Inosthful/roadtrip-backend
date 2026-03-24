# RoadTrip Collab — Backend

API REST construite avec **AdonisJS 6**, **PostgreSQL** et **TypeScript**.

## Prérequis

- [Node.js](https://nodejs.org/) >= 20.x
- [Docker](https://www.docker.com/products/docker-desktop) + Docker Compose

---

## Lancer le projet

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer PostgreSQL
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
APP_KEY=<votre_app_key>      # Fourni en privé (ou générer avec : node ace generate:key)

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=<votre_user>         # Fourni en privé
DB_PASSWORD=<votre_password> # Fourni en privé
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
- Connexion au serveur : host `localhost`, port `5432`, user `root`, password `root`, db `roadtrip`

---

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `node ace migration:run` | Lancer les migrations |
| `node ace migration:rollback` | Annuler la dernière migration |
| `docker-compose down` | Arrêter PostgreSQL |
| `docker-compose down -v` | Arrêter et **supprimer les données** ⚠️ |
