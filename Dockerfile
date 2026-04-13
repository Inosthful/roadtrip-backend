FROM node:20-alpine

WORKDIR /app

# Installer les dépendances (couche cachée séparément du code)
COPY package*.json ./
RUN npm ci

# Copier le reste du code source
COPY . .

EXPOSE 3333

# Lancer les migrations puis démarrer le serveur de développement
CMD ["sh", "-c", "node ace migration:run && npm run dev"]
