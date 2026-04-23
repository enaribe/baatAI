# Daandé — Prompts Claude Code
## Guide étape par étape pour générer l'application complète

---

## Règles d'or avant de commencer

**1. Toujours commencer par le CLAUDE.md** — C'est le fichier le plus important. Claude le lit à chaque session. Sans lui, chaque prompt repart de zéro.

**2. Un prompt = une tâche** — Ne mélange jamais "crée la DB + le frontend + l'auth" dans un seul prompt. Sépare.

**3. Explore → Plan → Implémente → Vérifie** — Pour chaque étape, utilise le mode Plan (Shift+Tab) d'abord, puis passe en mode Normal pour coder.

**4. Nouvelle session pour chaque phase** — Fais `/clear` entre les grandes phases. Un contexte propre donne de meilleurs résultats.

**5. Donne un feedback loop** — Termine chaque prompt par "lance les tests et corrige les erreurs avant de terminer."

**6. Référence les fichiers avec @** — Au lieu de décrire où est le code, pointe directement : `@src/lib/supabase.ts`

---

## Phase 0 : Setup du projet + CLAUDE.md

### Prompt 0.1 — Initialisation du projet

```
Initialise un nouveau projet React avec Vite et TypeScript.

Stack exacte :
- React 19 + Vite + TypeScript strict
- TailwindCSS v4
- React Router v7
- @supabase/supabase-js v2
- tus-js-client (pour les uploads resumable)
- lucide-react (icônes)

Structure de dossiers :
src/
├── components/     # Composants réutilisables
│   └── ui/         # Composants UI de base (Button, Input, Card...)
├── pages/          # Pages de l'app (1 fichier par route)
├── hooks/          # Custom React hooks
├── lib/            # Utilitaires (supabase client, helpers)
├── types/          # Types TypeScript partagés
└── contexts/       # React contexts (auth, etc.)

Conventions :
- Named exports uniquement (pas de default export)
- Fichiers en kebab-case (auth-context.tsx, use-auth.ts)
- Composants en PascalCase
- Pas de CSS custom, Tailwind uniquement
- Pas de any TypeScript

Initialise aussi le .gitignore, tsconfig strict, et un README basique.
```

### Prompt 0.2 — Créer le CLAUDE.md

```
Crée un fichier CLAUDE.md à la racine du projet avec le contenu suivant.
Ce fichier doit être concis (< 200 lignes) et structuré.

# Daandé

Plateforme SaaS de création de datasets vocaux pour langues africaines (Wolof, Pulaar, Sereer, Bambara).
React + Supabase + serveur Python externe pour le traitement audio.

## Stack
- React 19, Vite, TypeScript strict
- TailwindCSS v4
- Supabase (auth, PostgreSQL, Storage, Edge Functions, Database Webhooks)
- tus-js-client pour les uploads resumable
- React Router v7

## Commands
- `npm run dev` : Serveur de dev (port 5173)
- `npm run build` : Build production
- `npm run lint` : ESLint
- `npx supabase db push` : Appliquer les migrations
- `npx supabase functions serve` : Edge Functions en local

## Architecture
- `/src/pages/` : Pages (LoginPage, DashboardPage, ProjectPage, RecordPage, ExportPage)
- `/src/components/ui/` : Composants UI réutilisables
- `/src/components/` : Composants métier (ProjectCard, RecordingRow, PhraseDisplay...)
- `/src/hooks/` : Hooks custom (useAuth, useProject, useRecorder, useRealtimeRecordings)
- `/src/lib/supabase.ts` : Client Supabase (singleton)
- `/src/lib/upload.ts` : Upload TUS resumable
- `/src/types/` : Types DB (tables Supabase auto-générées)
- `/src/contexts/auth-context.tsx` : Context d'authentification
- `/supabase/migrations/` : Migrations SQL
- `/supabase/functions/` : Edge Functions (get-session, submit-recording)

## Conventions
- Named exports uniquement, jamais de default export
- Fichiers en kebab-case, composants en PascalCase
- Tailwind uniquement, pas de CSS custom
- Types TypeScript stricts, jamais de `any`
- Chaque composant dans son propre fichier
- Hooks custom préfixés par `use`
- Erreurs gérées explicitement (try/catch), jamais silencieuses
- Les secrets sont dans .env, JAMAIS dans le code

## Supabase
- Le client Supabase est un singleton dans src/lib/supabase.ts
- Utiliser supabase.auth pour l'authentification
- Utiliser supabase.from('table') pour les queries
- Utiliser supabase.storage.from('bucket') pour les fichiers
- RLS est activé sur TOUTES les tables
- Le service_role key n'est JAMAIS côté client

## Règles métier
- Un locuteur accède via un token anonyme, PAS via auth
- L'enregistrement est phrase par phrase (push-to-talk)
- L'audio est enregistré en WebM/Opus 32kbps côté navigateur
- Le traitement audio est fait par un serveur Python externe
- Le frontend ne parle JAMAIS directement au serveur Python
- La communication passe par Database Webhooks Supabase

## Git
- Branches : feature/nom-feature, fix/nom-fix
- Commits en français : "feat: ajout page dashboard", "fix: correction upload"
```

### Prompt 0.3 — Créer les règles scoped

```
Crée les fichiers de règles scoped dans .claude/rules/ :

1. .claude/rules/components.md — pour les fichiers dans src/components/ :
   - Chaque composant accepte des props typées avec une interface
   - Utiliser les variants Tailwind pour les états (hover, focus, disabled)
   - Les composants UI de base dans /ui/ sont génériques et réutilisables
   - Les composants métier hors /ui/ sont spécifiques à Daandé
   - Pas de logique métier dans les composants UI

2. .claude/rules/supabase.md — pour les fichiers dans supabase/ :
   - Les migrations sont numérotées : 001_initial.sql, 002_rls.sql
   - RLS obligatoire sur chaque table
   - Les Edge Functions valident toujours le token/auth en premier
   - Les Edge Functions utilisent le service_role pour les opérations admin
   - Retour JSON standardisé : { data, error }
```

---

## Phase 1 : Base de données + Auth (Semaine 1)

### Prompt 1.1 — Migration initiale

```
Crée la migration Supabase pour le schéma complet de Daandé.
Fichier : supabase/migrations/001_initial_schema.sql

Lis @docs/architecture-dev.md pour le schéma complet des tables.

Tables à créer :
- profiles (extension de auth.users, avec trigger auto-création)
- projects (avec usage_type: asr/tts/both)
- phrases (texte à lire, position ordonnée)
- recording_sessions (token unique, métadonnées locuteur)
- recordings (1 audio = 1 phrase, avec champs QC remplis par Python)
- exports (format, filtres, status)

Inclus :
- Tous les CHECK constraints
- Tous les index nécessaires
- Le trigger handle_new_user pour auto-créer le profil
- Les types ENUM si pertinent

Ne crée PAS encore les politiques RLS — ce sera dans la migration suivante.
```

### Prompt 1.2 — Politiques RLS

```
Crée la migration RLS.
Fichier : supabase/migrations/002_rls_policies.sql

Lis @supabase/migrations/001_initial_schema.sql pour connaître les tables.

Règles :
- profiles : chaque user lit/modifie son propre profil
- projects : seul le owner peut CRUD
- phrases : lecture par les owners du projet parent
- recording_sessions : gestion par les owners du projet parent
- recordings : lecture par les owners du projet parent
  (les INSERT sont faits par le service_role via Edge Function, pas par le client)
- exports : gestion par les owners du projet parent

Active RLS sur chaque table.
Les politiques doivent utiliser auth.uid() et des subqueries sur projects.owner_id.
```

### Prompt 1.3 — Storage buckets

```
Crée la migration pour les Storage buckets.
Fichier : supabase/migrations/003_storage.sql

3 buckets :
- audio-raw (privé) : WebM uploadés par les locuteurs
- audio-processed (privé) : WAV traités par le serveur Python
- exports (privé) : ZIP des datasets

Politiques Storage :
- audio-raw : upload autorisé pour les utilisateurs anon (via signed URL)
- audio-processed : lecture autorisée pour les users authentifiés
- exports : lecture autorisée pour les users authentifiés
```

### Prompt 1.4 — Client Supabase + types

```
Crée le client Supabase et les types TypeScript.

1. src/lib/supabase.ts — Client singleton avec les variables d'env VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

2. src/types/database.ts — Types TypeScript qui reflètent exactement le schéma SQL :
   - type Profile, Project, Phrase, RecordingSession, Recording, Export
   - type ProjectUsageType = 'asr' | 'tts' | 'both'
   - type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'
   - type ExportFormat = 'ljspeech' | 'huggingface' | 'csv_wav'

Lis @supabase/migrations/001_initial_schema.sql pour t'assurer que les types correspondent exactement aux colonnes SQL.
```

### Prompt 1.5 — Auth context + pages login/register

```
Crée le système d'authentification complet.

1. src/contexts/auth-context.tsx
   - AuthProvider qui wrap l'app
   - Expose : user, session, loading, signIn, signUp, signOut
   - Écoute onAuthStateChange pour la session
   - Gère le loading initial

2. src/hooks/use-auth.ts
   - Hook qui consomme le AuthContext
   - Throw si utilisé hors du Provider

3. src/pages/login-page.tsx
   - Formulaire email + mot de passe
   - Bouton "Se connecter"
   - Lien vers l'inscription
   - Gestion des erreurs (email invalide, mot de passe incorrect)
   - Redirection vers /dashboard après connexion

4. src/pages/register-page.tsx
   - Formulaire : nom complet, email, mot de passe, organisation (optionnel)
   - Bouton "Créer un compte"
   - Passe le full_name dans les user_metadata pour le trigger
   - Redirection vers /dashboard après inscription

5. src/components/protected-route.tsx
   - Wrapper qui redirige vers /login si pas authentifié
   - Affiche un loader pendant le chargement initial

Assure-toi que le design est responsive et fonctionne sur mobile.
Utilise Tailwind pour le style. Pas de librairie UI externe.
Lance `npm run build` pour vérifier qu'il n'y a pas d'erreurs TypeScript.
```

---

## Phase 2 : CRUD Projets + Upload texte (Semaine 2)

### Prompt 2.1 — Dashboard

```
Crée la page dashboard.

src/pages/dashboard-page.tsx :
- Affiche la liste des projets du user connecté
- Chaque projet montre : nom, langue, usage_type, nombre de phrases, nombre de recordings, date de création
- Bouton "Nouveau projet" qui redirige vers /project/new
- Si aucun projet : message vide avec CTA

src/hooks/use-projects.ts :
- Fetch les projets via Supabase
- Inclut le count de phrases et recordings (utilise une query avec agrégation ou des queries séparées)
- Retourne { projects, loading, error, refetch }

src/components/project-card.tsx :
- Card cliquable qui redirige vers /project/:id
- Affiche les stats du projet
- Badge coloré selon le status (draft, active, completed)
- Badge selon usage_type (ASR, TTS, Les deux)

Design : cards en grille responsive (1 col mobile, 2 cols tablette, 3 cols desktop).
Lance `npm run build` après pour vérifier.
```

### Prompt 2.2 — Création de projet + parsing texte

```
Crée le formulaire de création de projet et le parsing du fichier texte.

src/pages/new-project-page.tsx :
Formulaire en 3 étapes :

Étape 1 — Infos du projet :
- Nom du projet (requis)
- Description (optionnel)
- Langue cible : sélecteur avec les options (Wolof/wol, Pulaar/fuc, Sereer/srr, Bambara/bam, Autre + champ custom)
- Usage : radio buttons (ASR — reconnaissance vocale, TTS — synthèse vocale, Les deux)

Étape 2 — Upload du texte :
- Zone de drag & drop pour fichier .txt
- OU zone de texte libre (textarea)
- Prévisualisation : nombre de phrases détectées, les 5 premières phrases
- Parsing : split par ligne, filtrer les lignes vides, trim

Étape 3 — Confirmation :
- Résumé : nom, langue, usage, nombre de phrases
- Bouton "Créer le projet"
- Au clic : INSERT project dans Supabase, puis INSERT batch des phrases avec leur position

src/lib/text-parser.ts :
- Fonction parsePhrases(text: string): string[]
- Split par \n, trim chaque ligne, filtrer les vides
- Retourne un tableau de phrases avec leur position

Après création, redirige vers /project/:id
```

### Prompt 2.3 — Page détail projet

```
Crée la page détail d'un projet.

src/pages/project-page.tsx (route /project/:id) :

Layout avec des onglets ou sections :

Section "Vue d'ensemble" :
- Infos du projet (nom, langue, usage_type, date)
- Stats en cards : total phrases, total recordings, validés, rejetés, taux de validation, durée totale
- Barre de progression globale

Section "Locuteurs" :
- Liste des recording_sessions
- Pour chaque session : nom du locuteur, progression (enregistré/total), date, lien copiable
- Bouton "Générer un nouveau lien"
- Modal pour saisir les métadonnées du locuteur (nom, âge, genre, dialecte, ville)
- Copier le lien dans le presse-papier au clic

Section "Enregistrements" :
- Tableau paginé des recordings
- Colonnes : phrase (tronquée), locuteur, durée, SNR, statut (valid/rejeté/pending), bouton écouter
- Filtre par : statut (tous, validés, rejetés, pending), locuteur
- Lecteur audio inline pour écouter chaque segment

Section "Export" :
- Choix du format (LJSpeech, HuggingFace, CSV+WAV)
- Filtres optionnels (SNR minimum)
- Bouton "Générer l'export"
- Liste des exports précédents avec bouton télécharger

Hooks nécessaires :
- src/hooks/use-project.ts (données du projet + stats)
- src/hooks/use-recordings.ts (liste paginée avec filtres)
- src/hooks/use-realtime-recordings.ts (Supabase Realtime pour les mises à jour live)

Le hook use-realtime-recordings doit écouter les changements sur la table recordings filtrés par project_id, pour que le dashboard se mette à jour en temps réel quand le serveur Python termine un traitement.

Lance `npm run build` après.
```

---

## Phase 3 : Interface d'enregistrement locuteur (Semaine 3)

### Prompt 3.1 — Edge Functions

```
Crée les 2 Edge Functions Supabase.

1. supabase/functions/get-session/index.ts
   - Reçoit : query param ?token=abc123
   - Utilise le service_role pour query la DB (le locuteur n'est pas authentifié)
   - Vérifie que le token existe dans recording_sessions
   - Vérifie que expires_at > now()
   - Récupère les phrases du projet (ordonnées par position)
   - Récupère les phrase_ids déjà enregistrés par cette session
   - Génère un signed upload URL pour le bucket audio-raw (expire dans 2h)
   - Retourne : { session, project, phrases, recorded_phrase_ids, upload_url }
   - Si token invalide ou expiré : retourne 404

2. supabase/functions/submit-recording/index.ts
   - Reçoit : POST body { session_token, phrase_id, storage_path, file_size_bytes }
   - Valide le token
   - INSERT dans recordings via service_role
   - UPDATE recording_sessions SET total_recorded = total_recorded + 1
   - Retourne : { success: true, recording_id }

Les deux fonctions doivent :
- Gérer les erreurs proprement (try/catch, messages explicites)
- Retourner du JSON avec { data, error }
- Logger les erreurs avec console.error
```

### Prompt 3.2 — Page d'enregistrement locuteur

```
Crée l'interface d'enregistrement pour les locuteurs.

src/pages/record-page.tsx (route /record/:token) :

C'est la page la plus critique de l'app. Elle doit fonctionner sur un Samsung Galaxy A14 avec Chrome Android en 3G.

Flux :
1. Au chargement : appeler l'Edge Function get-session avec le token
2. Si token invalide : afficher un message "Ce lien est invalide ou expiré"
3. Si valide : afficher la première phrase NON enregistrée
4. Le locuteur appuie (tactile) sur le bouton micro → enregistrement démarre
5. Il relâche → enregistrement stoppe → upload automatique
6. Phrase suivante affichée automatiquement
7. Possibilité de réécouter le dernier enregistrement
8. Compteur de progression "47 / 250"
9. Le locuteur peut quitter et reprendre plus tard (les phrases déjà enregistrées sont skippées)

src/hooks/use-recorder.ts :
- Gère le MediaRecorder (start/stop)
- Config : mono, 16kHz si supporté, echoCancellation, noiseSuppression, autoGainControl
- Mime type : audio/webm;codecs=opus (fallback audio/webm)
- audioBitsPerSecond: 32000
- Retourne : { isRecording, startRecording, stopRecording, audioBlob, audioUrl }

src/lib/upload.ts :
- Upload via tus-js-client vers Supabase Storage
- Utilise le signed upload URL de l'Edge Function
- chunkSize: 6 * 1024 * 1024 (obligatoire Supabase)
- Retry : [0, 3000, 5000, 10000, 20000]
- Progress callback pour la barre de progression
- En cas d'échec : retry automatique 3 fois, puis message d'erreur

src/components/phrase-display.tsx :
- Affiche la phrase en GROS (font-size minimum 24px, font-weight bold)
- Centré verticalement
- Bon contraste (texte foncé sur fond clair)

src/components/record-button.tsx :
- Gros bouton rond (minimum 80x80px tactile)
- onPointerDown = startRecording, onPointerUp = stopRecording
- Animation pulsante rouge pendant l'enregistrement
- Feedback haptique si l'API Vibration est disponible
- Désactivé pendant l'upload (avec loader)

Contraintes UX :
- Pas de scroll horizontal
- Tout doit tenir dans un seul écran (pas de scroll vertical non plus si possible)
- Pas de menu, pas de header complexe — juste la phrase, le bouton, et le compteur
- Messages d'erreur en français et clairs ("Autorisez l'accès au microphone pour enregistrer")
- Si le navigateur ne supporte pas MediaRecorder : message "Votre navigateur ne supporte pas l'enregistrement audio. Utilisez Chrome."

Après chaque upload réussi :
- Appeler l'Edge Function submit-recording
- Passer à la phrase suivante
- Mettre à jour le compteur

Lance `npm run build` après.
```

---

## Phase 4 : Intégration serveur Python (Semaine 4-5)

### Prompt 4.1 — Database Webhooks

```
Documente la configuration des Database Webhooks Supabase.
Crée un fichier docs/webhooks-setup.md avec les instructions exactes.

Webhook 1 : "on-recording-inserted"
- Table : recordings
- Event : INSERT
- Method : POST
- URL : variable d'env PYTHON_SERVER_URL + /api/process-segment
- Headers : Authorization: Bearer {API_SECRET}
- Payload : le record complet de la row insérée

Webhook 2 : "on-export-requested"
- Table : exports
- Event : INSERT
- Method : POST
- URL : variable d'env PYTHON_SERVER_URL + /api/generate-export
- Headers : Authorization: Bearer {API_SECRET}
- Payload : le record complet de la row insérée

Inclus des screenshots textuels du chemin dans le dashboard Supabase :
Database → Webhooks → Create Webhook → ...

Note : ces webhooks ne peuvent pas être configurés par migration SQL.
Ils doivent être créés manuellement dans le dashboard Supabase.
```

### Prompt 4.2 — Realtime pour le dashboard

```
Implémente l'écoute Realtime pour mettre à jour le dashboard en temps réel.

src/hooks/use-realtime-recordings.ts :
- S'abonne aux changements (UPDATE) sur la table recordings filtré par project_id
- Quand un recording passe de 'pending' à 'completed' ou 'failed' :
  → mettre à jour la liste locale des recordings
  → mettre à jour les stats (compteurs validés/rejetés)
- Utilise supabase.channel() avec postgres_changes
- Cleanup du channel dans le useEffect return

Teste en simulant un UPDATE dans le SQL editor de Supabase :
UPDATE recordings SET processing_status = 'completed', is_valid = true, snr_db = 22.0
WHERE id = 'un-id-existant';

Vérifie que le dashboard se met à jour sans refresh.
```

---

## Phase 5 : Export + finitions (Semaine 6)

### Prompt 5.1 — Page export

```
Crée la fonctionnalité d'export.

Dans la section Export de @src/pages/project-page.tsx :

1. Formulaire d'export :
   - Sélecteur de format : LJSpeech, HuggingFace Datasets, CSV + WAV
   - Filtre SNR minimum (slider de 0 à 40 dB, défaut selon usage_type)
   - Affichage du nombre de segments qui passent le filtre (query COUNT en temps réel)
   - Bouton "Générer l'export"
   - Au clic : INSERT dans la table exports avec status 'pending' et filters_applied en JSONB
     (le Database Webhook déclenche le serveur Python automatiquement)

2. Liste des exports :
   - Affiche les exports précédents avec : format, date, nombre de segments, taille, status
   - Bouton "Télécharger" quand status = 'ready'
   - Le téléchargement utilise un signed URL temporaire (1h) depuis Supabase Storage

3. src/hooks/use-exports.ts :
   - Fetch les exports du projet
   - Écoute Realtime pour le changement de status (pending → generating → ready)
   - Fonction downloadExport(exportId) qui génère le signed URL et déclenche le download

Lance `npm run build` après.
```

### Prompt 5.2 — Routing final + responsive

```
Crée le routing complet et vérifie le responsive.

src/App.tsx — Routes :
- / → redirige vers /dashboard si connecté, /login sinon
- /login → LoginPage
- /register → RegisterPage
- /dashboard → DashboardPage (protégé)
- /project/new → NewProjectPage (protégé)
- /project/:id → ProjectPage (protégé)
- /record/:token → RecordPage (PAS protégé, accès anonyme)

Vérifie que :
- Toutes les pages protégées redirigent vers /login si pas de session
- La page /record/:token fonctionne SANS authentification
- Le responsive est correct sur mobile (375px), tablette (768px), desktop (1280px)
- Le layout a un sidebar sur desktop et un bottom nav sur mobile pour les pages protégées
- Il n'y a aucune erreur TypeScript (npm run build)
- La navigation entre pages est fluide (pas de flash blanc)
```

---

## Phase 6 : Tests + déploiement (Semaine 7)

### Prompt 6.1 — Tests critiques

```
Crée des tests pour les parties critiques de l'application.

Utilise Vitest (déjà inclus avec Vite).

Tests prioritaires :

1. src/lib/__tests__/text-parser.test.ts
   - Parsing normal (1 phrase par ligne)
   - Lignes vides ignorées
   - Trim des espaces
   - Fichier vide → tableau vide
   - Caractères spéciaux Wolof (ë, ñ, à, etc.)

2. src/hooks/__tests__/use-recorder.test.ts
   - Mock du MediaRecorder
   - Start/stop produit un blob
   - Mime type correct

3. src/lib/__tests__/upload.test.ts
   - Mock de tus-js-client
   - Upload réussit → callback appelé
   - Upload échoue → retry

Lance les tests avec `npm run test` et corrige les échecs.
```

### Prompt 6.2 — Déploiement

```
Configure le déploiement.

1. Crée un fichier vercel.json pour le déploiement frontend sur Vercel :
   - Rewrites pour le SPA (toutes les routes → index.html)

2. Crée un fichier .env.example avec toutes les variables nécessaires (sans les valeurs) :
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

3. Mets à jour le README.md avec :
   - Description du projet
   - Instructions d'installation locale
   - Comment configurer Supabase (créer le projet, appliquer les migrations)
   - Comment créer les webhooks
   - Comment déployer sur Vercel
   - Variables d'environnement nécessaires

4. Vérifie une dernière fois :
   - npm run build → 0 erreur
   - npm run lint → 0 warning
   - Tous les .env.example sont présents
   - Le .gitignore inclut .env, node_modules, dist
```

---

## Commandes Claude Code utiles pendant le dev

```bash
# Explorer le code
claude "Explique la structure de ce projet et les dépendances entre les fichiers"

# Vérifier la cohérence
claude "Lis @supabase/migrations/001_initial_schema.sql et @src/types/database.ts. Est-ce que les types TS correspondent exactement au schéma SQL ? Corrige les différences."

# Debug un problème
claude "L'upload TUS échoue avec l'erreur 403. Lis @src/lib/upload.ts et @supabase/functions/get-session/index.ts. Trouve le problème."

# Review avant commit
claude "Review tous les fichiers modifiés (git diff). Cherche : erreurs de sécurité, fuites de secrets, types manquants, erreurs de logique."

# Optimiser
claude "Lis @src/pages/project-page.tsx. Cette page fait trop de queries Supabase. Optimise en réduisant le nombre d'appels réseau."
```

---

## Checklist finale

Après chaque phase, vérifie :
- [ ] `npm run build` passe sans erreur
- [ ] `npm run lint` passe sans warning
- [ ] Les types TypeScript sont stricts (pas de `any`)
- [ ] Le RLS est activé sur toutes les tables
- [ ] Les secrets ne sont jamais côté client
- [ ] Le responsive fonctionne sur 375px (mobile)
- [ ] Git commit propre avec un message en français
