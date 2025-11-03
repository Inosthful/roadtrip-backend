# 🚗 Roadtrip Backend - API REST

Backend du planificateur de roadtrip collaboratif construit avec **AdonisJS 6**, **PostgreSQL** et **TypeScript**.

## 📋 Prérequis

- **Node.js** >= 20.x
- **Docker** et **Docker Compose** (pour PostgreSQL)
- **npm** ou **yarn**

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone <url-du-repo>
cd roadtrip-backend
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Le fichier `.env` est partagé directement (projet étudiant).

⚠️ **Important** : Ne jamais commit le `.env` en production !

### 4. Démarrer PostgreSQL avec Docker

Lancer PostgreSQL en arrière-plan :

```bash
docker-compose up -d
```

Vérifier que PostgreSQL est bien démarré :

```bash
docker-compose ps
```

Tu devrais voir :
```
NAME                 STATUS
roadtrip-postgres    Up (healthy)
roadtrip-pgadmin     Up
```

### 5. Exécuter les migrations

```bash
node ace migration:run
```

### 6. Lancer le serveur de développement

```bash
npm run dev
```

Le serveur démarre sur **http://localhost:3333**

## 🐳 Commandes Docker utiles

| Commande | Description |
|----------|-------------|
| `docker-compose up -d` | Démarrer PostgreSQL en arrière-plan |
| `docker-compose down` | Arrêter PostgreSQL |
| `docker-compose logs postgres` | Voir les logs PostgreSQL |
| `docker-compose restart postgres` | Redémarrer PostgreSQL |
| `docker-compose down -v` | Arrêter et **supprimer les données** ⚠️ |

## 🗄️ Accéder à la base de données

### Option 1 : pgAdmin (Interface Web)

- URL : **http://localhost:5050**
- Email : `admin@roadtrip.local`
- Password : `admin`

Pour ajouter le serveur PostgreSQL dans pgAdmin :
- Host : `postgres` (nom du service Docker)
- Port : `5432`
- Database : `roadtrip`
- Username : `root`
- Password : `root`

### Option 2 : CLI PostgreSQL

```bash
docker exec -it roadtrip-postgres psql -U root -d roadtrip
```

## 🛠️ Commandes AdonisJS

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement avec hot-reload |
| `npm run build` | Build de production |
| `npm start` | Lancer le serveur en production |
| `npm test` | Lancer les tests |
| `node ace migration:run` | Exécuter les migrations |
| `node ace migration:rollback` | Annuler la dernière migration |
| `node ace migration:status` | Voir l'état des migrations |
| `node ace make:model <Name>` | Créer un nouveau modèle |
| `node ace make:controller <Name>` | Créer un nouveau contrôleur |

## 📁 Structure du projet

```
roadtrip-backend/
├── app/
│   ├── controllers/       # Gestion des requêtes HTTP
│   ├── models/            # Modèles de données (User, Trip, Stop, Expense)
│   ├── middleware/        # Intercepteurs (auth, validation)
│   └── validators/        # Validation des données (VineJS)
├── database/
│   └── migrations/        # Schéma de la base de données
├── start/
│   └── routes.ts          # Définition des routes API
├── config/                # Configuration (DB, auth, CORS)
└── docker-compose.yml     # Configuration PostgreSQL
```

## 🔧 Troubleshooting

### PostgreSQL ne démarre pas

Vérifier que le port 5432 n'est pas déjà utilisé :

```bash
# Windows
netstat -ano | findstr :5432

# Mac/Linux
lsof -i :5432
```

### Erreur de connexion à la base de données

Vérifier que PostgreSQL est bien démarré et accessible :

```bash
docker-compose ps
docker-compose logs postgres
```

### Reset complet de la base de données

```bash
# Arrêter et supprimer les données
docker-compose down -v

# Redémarrer
docker-compose up -d

# Re-exécuter les migrations
node ace migration:run
```

## 📚 Documentation

- [AdonisJS Documentation](https://docs.adonisjs.com/)
- [Lucid ORM](https://lucid.adonisjs.com/)
- [VineJS Validation](https://vinejs.dev/)

## 👥 Équipe

Projet réalisé dans le cadre du cours de développement fullstack - YNOV M1
