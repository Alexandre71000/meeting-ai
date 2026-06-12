# MeetingAI — Guide de déploiement

Application web de retranscription et comptes rendus automatiques pour technico-commerciaux.

---

## Déploiement en 4 étapes (15 minutes)

### Étape 1 — Créer le dépôt GitHub

1. Allez sur [github.com](https://github.com) et connectez-vous (ou créez un compte gratuit)
2. Cliquez sur **"New repository"**
3. Nommez-le `meeting-ai`
4. Laissez-le en **Public** (requis pour Vercel gratuit)
5. Cliquez **"Create repository"**
6. Uploadez tous les fichiers de ce dossier via **"uploading an existing file"**

### Étape 2 — Obtenir la clé API Anthropic

1. Allez sur [console.anthropic.com](https://console.anthropic.com)
2. Créez un compte (vous recevez 5$ de crédit gratuit)
3. Allez dans **"API Keys"** → **"Create Key"**
4. Copiez la clé (commence par `sk-ant-...`)
5. Gardez-la de côté, vous en aurez besoin à l'étape 4

### Étape 3 — Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub
2. Cliquez **"Add New Project"**
3. Sélectionnez votre dépôt `meeting-ai`
4. Laissez tous les paramètres par défaut
5. Cliquez **"Deploy"**

### Étape 4 — Configurer la clé API

1. Dans Vercel, allez dans votre projet → **"Settings"** → **"Environment Variables"**
2. Ajoutez une variable :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : votre clé API (`sk-ant-...`)
3. Cliquez **"Save"**
4. Allez dans **"Deployments"** → cliquez sur les **3 points** → **"Redeploy"**

✅ Votre app est en ligne sur `https://meeting-ai-xxx.vercel.app`

---

## Installer sur votre téléphone (PWA)

### Sur iPhone (Safari) :
1. Ouvrez l'URL de votre app dans Safari
2. Appuyez sur le bouton **Partager** (carré avec flèche)
3. Faites défiler → **"Sur l'écran d'accueil"**
4. Appuyez **"Ajouter"**

### Sur Android (Chrome) :
1. Ouvrez l'URL dans Chrome
2. Appuyez sur les **3 points** en haut à droite
3. **"Ajouter à l'écran d'accueil"**
4. Appuyez **"Ajouter"**

L'app s'installe comme une vraie application, sans passer par l'App Store.

---

## Fonctionnalités

- 🎙 Retranscription audio en temps réel (français)
- 🤖 Génération automatique de compte rendu via Claude
- 💾 Sauvegarde locale de toutes les réunions
- 👥 Gestion des clients avec historique
- 🔍 Recherche dans les réunions passées
- 📋 Copie en un clic du compte rendu
- 💡 Restauration automatique en cas de fermeture accidentelle
- 📱 Installable sur iPhone et Android

---

## Coûts

| Service | Coût |
|---------|------|
| GitHub | Gratuit |
| Vercel | Gratuit |
| Retranscription (Web Speech API) | Gratuit |
| Comptes rendus (API Anthropic) | ~0,002€ par réunion |

Pour 50 réunions/mois → **moins de 0,10€/mois**

---

## Navigateurs compatibles

La retranscription audio fonctionne sur :
- ✅ Google Chrome (recommandé)
- ✅ Microsoft Edge
- ❌ Safari / Firefox (retranscription non supportée)

---

## Support

En cas de problème, vérifiez :
1. Que la variable `ANTHROPIC_API_KEY` est bien configurée dans Vercel
2. Que vous utilisez Chrome ou Edge
3. Que vous avez autorisé l'accès au microphone dans le navigateur
