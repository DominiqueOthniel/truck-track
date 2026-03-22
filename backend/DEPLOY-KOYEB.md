# Déployer le backend Truck Track sur Koyeb

Koyeb propose un **free tier** avec 1 service web + 1 base de données. Ce guide décrit comment déployer l’API NestJS sur Koyeb à partir de GitHub.

---

## Prérequis

- Un compte [Koyeb](https://www.koyeb.com) (connexion GitHub recommandée).
- Une base **PostgreSQL** : par exemple [Supabase](https://supabase.com) (gratuit). Récupère l’URL en mode **Transaction (pooler)** : bouton **Connect** → URI, port **6543**. Si le mot de passe contient `#`, remplace-le par `%23` dans l’URL.
- Le dépôt GitHub du projet (ex. `DominiqueOthniel/truck-track`).

---

## Déploiement depuis le tableau de bord Koyeb

### 1. Créer un Web Service

1. Va sur [app.koyeb.com](https://app.koyeb.com).
2. Clique sur **Create Web Service**.
3. Choisis **GitHub** comme source et autorise Koyeb si besoin.
4. Sélectionne le dépôt **truck-track** (ou colle l’URL du repo public).

### 2. Configurer le build (Builder buildpack)

Dans la section **Builder** :

- **Builder** : **Buildpack** (par défaut).
- **Work directory** : `backend`  
  → Koyeb va builder uniquement le dossier `backend` (monorepo).
- **Build command** (optionnel, si besoin de forcer) :  
  `NPM_CONFIG_PRODUCTION=false npm install && npm run build`  
  → Garde les devDependencies pour que `npx nest build` fonctionne.
- **Run command** : `npm run start:prod`  
  → Lance `node dist/main`. Tu peux aussi mettre `node dist/main` si tu préfères.

### 3. Variables d’environnement

Dans **Environment variables**, ajoute :

| Variable         | Valeur | Secret |
|------------------|--------|--------|
| `NODE_ENV`       | `production` | Non |
| `DATABASE_URL`   | Ta chaîne PostgreSQL (Supabase, mode Transaction, port 6543). Mot de passe avec `#` → `%23`. | Oui (recommandé) |
| `FRONTEND_URL`   | URL du front (ex. `https://trucky-tracky.netlify.app`) | Non |
| `DB_SYNCHRONIZE` | `true` au **premier** déploiement (création des tables), puis `false` | Non |

**Port** : Koyeb injecte `PORT` automatiquement ; le backend utilise déjà `process.env.PORT || 3000`.

### 4. Health check (recommandé)

Dans **Health checks** (ou section avancée) :

- **Path** : `/api/health`
- **Port** : celui exposé par le service (souvent 8000 ou la valeur de `PORT`).

Cela permet à Koyeb de considérer le service comme healthy une fois l’API prête.

### 5. Lancer le déploiement

- Donne un **nom** à l’application et au service (ex. `truck-track-api`).
- Clique sur **Deploy**. Koyeb clone le repo, build le dossier `backend`, puis lance `npm run start:prod`.

Une fois le déploiement terminé, l’API est accessible à une URL du type :  
`https://truck-track-api-xxx.koyeb.app`

À vérifier :

- **GET** `https://ton-url.koyeb.app/` → JSON d’accueil
- **GET** `https://ton-url.koyeb.app/api/health` → `{"status":"ok"}`

---

## Déploiement avec la CLI Koyeb

Si tu préfères la ligne de commande (après [installation de la CLI](https://www.koyeb.com/docs/build-and-deploy/cli/installation)) :

```bash
koyeb app init truck-track-api \
  --git github.com/DominiqueOthniel/truck-track \
  --git-branch main \
  --git-workdir backend \
  --git-buildpack-build-command "NPM_CONFIG_PRODUCTION=false npm install && npm run build" \
  --git-buildpack-run-command "npm run start:prod" \
  --ports 8000:http \
  --routes "/:8000" \
  --env NODE_ENV=production \
  --env DATABASE_URL="postgresql://..." \
  --env FRONTEND_URL="https://ton-site.netlify.app" \
  --env DB_SYNCHRONIZE=true
```

Remplace `DATABASE_URL` et `FRONTEND_URL` par tes valeurs. Pour les secrets, utilise l’interface Koyeb ou `--env` avec des variables déjà définies.

---

## Après le premier déploiement

1. Passe **DB_SYNCHRONIZE** à `false` dans les variables d’environnement du service (évite que TypeORM modifie le schéma en prod).
2. Configure le front pour appeler l’API Koyeb :  
   `VITE_API_URL=https://ton-service.koyeb.app/api`
3. Sur Render (ou autre front), mets à jour **FRONTEND_URL** si tu changes de domaine.

---

## Dépannage

- **Build : `nest: not found`**  
  Le build doit s’exécuter dans le **Work directory** `backend` et installer les devDependencies. Utilise `NPM_CONFIG_PRODUCTION=false` dans la commande de build (voir ci‑dessus).

- **Cannot connect to database**  
  Vérifie que `DATABASE_URL` utilise l’URL **Supabase en mode Transaction (pooler)** (port **6543**, hôte `*.pooler.supabase.com`). En cas de mot de passe avec `#`, encode-le en `%23`.

- **CORS**  
  Le backend autorise déjà `*.onrender.com` et les origines définies par `FRONTEND_URL`. Pour un front hébergé ailleurs, définis `FRONTEND_URL` avec l’URL exacte du site (ex. Netlify).

---

## Récap des URLs utiles

- [Koyeb](https://www.koyeb.com) — inscription et dashboard  
- [Doc Koyeb – Deploy with GitHub](https://www.koyeb.com/docs/build-and-deploy/deploy-with-git)  
- [Doc Koyeb – Node.js](https://www.koyeb.com/docs/build-and-deploy/build-from-git/nodejs)  
- [Doc Koyeb – Monorepo (work directory)](https://www.koyeb.com/docs/build-and-deploy/monorepo)
