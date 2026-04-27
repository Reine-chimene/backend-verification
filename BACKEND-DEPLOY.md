# 🚀 DÉPLOIEMENT BACKEND SUR RENDER

## 📦 Dépôt backend séparé

Votre backend est dans le dépôt : **https://github.com/Reine-chimene/verification-backend**

 Fichiers inclus :
- `server.js` - API Express
- `package.json` - Dépendances
- `render.yaml` - Config Render (optionnelle)
- `.env.example` - Template de configuration

---

## 🔧 ÉTAPES RENDER

### 1. Connecter le dépôt

1. Aller sur https://render.com
2. **New** → **Web Service**
3. **Connect a repository** → GitHub
4. Autoriser si nécessaire
5. Sélectionner **`verification-backend`**
6. Cliquer **"Next"**

### 2. Configuration du service

| Champ | Valeur |
|-------|--------|
| **Name** | `verification-backend` (ou `vygc-backend`) |
| **Environment** | `Node` |
| **Region** | `Frankfurt` (ou le plus proche) |
| **Branch** | `main` |
| **Root Directory** | `.` (laisser vide car server.js à la racine) |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | `Free` |

⚠️ **Important :** `Root Directory` = **vide** (pas `backend` car on est déjà dans le dossier backend du dépôt)

### 3. Variables d'environnement

Cliquer **"Advanced"** → **"Add Environment Variable"**

Ajouter :

```
SUPABASE_URL = https://ptqvcyeiofzrlyygjsuv.supabase.co
SUPABASE_ANON_KEY = [votre anon key de Supabase]
SUPABASE_SERVICE_ROLE_KEY = [votre service role key]
JWT_SECRET = [générer aléatoire : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
CLIENT_URL = https://verification.vercel.app
NODE_ENV = production
```

**Où trouver les clés Supabase :**
- Dashboard → Settings (roue dentée) → API
- Copier `anon public key` et `service_role key`

### 4. Créer le service

Cliquer **"Create Web Service"**

⏳ Render va builder (~1 min) puis déployer (~2 min)

---

## ✅ VÉRIFICATION

Après déploiement, les logs doivent afficher :
```
✅ Connected to Supabase successfully
🚀 VYGC Backend Server running on port 3000
```

L'URL du backend sera du type :
```
https://verification-backend.onrender.com
```

**Notez cette URL.**

---

## 🔗 CONNECTER FRONTEND → BACKEND

Maintenant que le backend est en ligne, mettez à jour le frontend :

### Étape 1 : Modifier vygc-api.js

Dans le dépôt **verification** (frontend), éditez `vygc-api.js` :

```javascript
// Ligne 7-11, remplacez par :
this.baseURL = baseURL || 'https://verification-backend.onrender.com/api';
```

(Remplacez `verification-backend.onrender.com` par votre URL réelle)

### Étape 2 : Commit & push

```bash
cd C:\Users\DELL\Verification
git add vygc-api.js
git commit -m "Configure production backend URL (Render)"
git push
```

✅ Vercel redéploie automatiquement le frontend

---

## 🧪 TEST FINAL

1. **Frontend** : https://verification.vercel.app/index.html
2. **Admin** : https://verification.vercel.app/admin.html
3. **Create Admin** → créer compte
4. **Soumettre** un code depuis index.html
5. **Vérifier** dans admin.html que la soumission apparaît

---

## 🐛 Dépannage Render

| Problème | Solution |
|----------|----------|
| **`Cannot find module '/opt/render/project/src/server.js'`** | Start Command doit être `node server.js` et Root Directory vide |
| **Supabase connection failed** | Vérifier les clés d'env dans Render dashboard |
| **404 on /api/health** | Backend pas encore démarré → vérifier les logs |
| **CORS error** | `CLIENT_URL` doit être exactement `https://verification.vercel.app` |

**Voir les logs :** Render dashboard → Logs (en direct)

---

## 📞 Récapitulatif

```
Frontend  : https://verification.vercel.app       (dépôt: verification)
Backend   : https://verification-backend.onrender.com  (dépôt: verification-backend)
Database  : Supabase (ptqvcyeiofzrlyygjsuv)
```

**Prochaines étapes :**
1. Déployer `verification-backend` sur Render
2. Copier l'URL Render
3. Modifier `vygc-api.js` dans le dépôt `verification`
4. Push → Vercel redéploie
5. Tester

---

*Prêt ? Démarrez le déploiement Render du dépôt `verification-backend`*
