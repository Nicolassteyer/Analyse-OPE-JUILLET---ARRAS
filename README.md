# FLAMS Analytics PRO

Application professionnelle d'analyse FLAMS pour comparer les operations OPE Juillet Arras entre 2025 et 2026.

## Stack

- Frontend: React, Vite, Tailwind CSS, Shadcn/UI-ready
- Backend: Node.js, Express
- Base de donnees: PostgreSQL, Prisma
- Graphiques: Recharts
- Upload: Multer
- Deploiement: Render

## Structure

```txt
client/   interface React
server/   API Express, parser FLAMS, Prisma, uploads
```

## Demarrage local

```bash
npm install
npm run install:all
npm run dev
```

Creer ensuite `server/.env` depuis `server/.env.example`.

## Render

Le fichier `render.yaml` declare:

- un Web Service Node.js pour l'API
- une base PostgreSQL
- les commandes de build et de demarrage

Le frontend est construit dans `client/dist` puis servi par Express en production.
