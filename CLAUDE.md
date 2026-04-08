# Baat-IA

Plateforme SaaS de création de datasets vocaux pour langues africaines (Wolof, Pulaar, Sereer, Bambara). Les entreprises et chercheurs uploadent des phrases, des locuteurs les lisent phrase par phrase depuis leur téléphone, la plateforme vérifie la qualité et exporte des datasets prêts pour l'entraînement de modèles ASR/TTS.

## Stack
- React 19, Vite, TypeScript strict
- TailwindCSS v4 (étendu avec des tokens custom)
- Supabase (auth, PostgreSQL, Storage S3, Edge Functions, Database Webhooks)
- tus-js-client pour les uploads resumable
- React Router v7
- Google Fonts : Plus Jakarta Sans (titres) + Inter (body)

## Commands
- `npm run dev` : Serveur de dev (port 5173)
- `npm run build` : Build production — lancer après chaque implémentation
- `npm run lint` : ESLint
- `npx supabase db push` : Appliquer les migrations
- `npx supabase functions serve` : Edge Functions en local

## Architecture
```
src/
├── components/
│   ├── ui/            # Composants UI réutilisables (Button, Input, Card, Badge, ProgressBar, AudioPlayer)
│   ├── layout/        # AppLayout (sidebar+content), PublicLayout (centré)
│   └── [métier]       # ProjectCard, PhraseDisplay, RecordButton, RecordingRow...
├── pages/             # 1 fichier par route (login-page, dashboard-page, project-page, record-page...)
├── hooks/             # useAuth, useProjects, useProject, useRecorder, useRealtimeRecordings, useExports
├── lib/
│   ├── supabase.ts    # Client Supabase singleton
│   ├── upload.ts      # Upload TUS resumable
│   └── text-parser.ts # Parse fichier texte en phrases
├── types/
│   └── database.ts    # Types TS miroir du schéma SQL
├── contexts/
│   └── auth-context.tsx
└── styles/
    ├── design-tokens.css  # Variables CSS couleurs, spacing, radius
    └── animations.css     # Keyframes réutilisables
supabase/
├── migrations/        # SQL numérotées (001_initial.sql, 002_rls.sql, 003_storage.sql)
└── functions/         # get-session/, submit-recording/
```

## Conventions code
- Named exports uniquement, jamais de default export
- Fichiers en kebab-case, composants en PascalCase
- Tailwind uniquement pour le style, CSS custom autorisé uniquement pour les animations complexes et gradients
- Types TypeScript stricts, jamais de `any`
- Chaque composant dans son propre fichier
- Hooks custom préfixés par `use`
- Erreurs gérées explicitement (try/catch), jamais silencieuses
- Les secrets sont dans .env, JAMAIS dans le code
- Git commits en français : "feat: ajout page dashboard", "fix: correction upload"

## Supabase
- Le client est un singleton dans src/lib/supabase.ts
- RLS est activé sur TOUTES les tables
- Le service_role key n'est JAMAIS côté client
- Les locuteurs accèdent via un token anonyme, PAS via auth Supabase
- Les INSERT recordings des locuteurs passent par une Edge Function qui utilise le service_role
- La communication avec le serveur Python passe par Database Webhooks, jamais en direct depuis le frontend
- Les uploads audio utilisent le protocole TUS (resumable) avec chunkSize 6MB

## Base de données — Tables

**profiles** : id (FK auth.users), full_name, organization, role (client/admin). Trigger auto-création à l'inscription.

**projects** : id, owner_id (FK profiles), name, description, target_language (ISO 639-3), language_label, usage_type (asr/tts/both), status (draft/active/processing/completed/archived), settings (JSONB).

**phrases** : id, project_id, position (INT, ordonné), content (la phrase), normalized_content. UNIQUE(project_id, position).

**recording_sessions** : id, project_id, token (UNIQUE, auto-généré 32 bytes hex), speaker_name, speaker_metadata (JSONB: age, gender, dialect, city), status, total_recorded, expires_at (default +30 jours).

**recordings** : id, session_id, project_id, phrase_id, raw_storage_path, processed_storage_path, duration_seconds, file_size_bytes, processing_status (pending/processing/completed/failed), is_valid, snr_db, clipping_pct, silence_ratio, rejection_reasons (TEXT[]), qc_profile_used (asr/tts).

**exports** : id, project_id, format (ljspeech/huggingface/csv_wav), storage_path, total_segments, total_duration_seconds, file_size_bytes, filters_applied (JSONB), status (pending/generating/ready/failed).

## Storage Buckets
- `audio-raw` (privé) : WebM uploadés par les locuteurs
- `audio-processed` (privé) : WAV traités par le serveur Python
- `exports` (privé) : ZIP des datasets exportés

## Edge Functions (2 seulement)
- `get-session` : GET ?token=xxx → retourne session, phrases, recorded_phrase_ids, signed upload URL
- `submit-recording` : POST {session_token, phrase_id, storage_path} → INSERT recording via service_role

## Database Webhooks (2)
- INSERT sur `recordings` → POST au serveur Python /api/process-segment
- INSERT sur `exports` → POST au serveur Python /api/generate-export

## Contrat avec le serveur Python
Le serveur Python est géré par le data scientist. Il reçoit les webhooks et UPDATE directement la table recordings avec : processed_storage_path, processing_status, is_valid, snr_db, clipping_pct, silence_ratio, rejection_reasons, qc_profile_used, duration_seconds, processed_at. Le frontend écoute ces changements via Supabase Realtime.

## Routes
- `/login` → LoginPage (public)
- `/register` → RegisterPage (public)
- `/dashboard` → DashboardPage (protégé)
- `/project/new` → NewProjectPage (protégé)
- `/project/:id` → ProjectPage (protégé)
- `/record/:token` → RecordPage (public, AUCUN layout, fullscreen)

---

# Design System — Identité Visuelle Baat-IA

Tu es aussi un designer UI/UX senior. Chaque élément visuel que tu produis doit être intentionnel, jamais un template Tailwind par défaut. Le design reflète une fintech africaine moderne (pense Wave, Flutterwave), pas une startup Silicon Valley.

## Palette de couleurs

Inspirée de l'Afrique de l'Ouest — pas de bleu corporate.

- **Primaire** : orange/ambre chaud (soleil sahélien, énergie, confiance). Utilisé pour les CTA, liens, éléments actifs.
- **Secondaire** : vert profond (baobab, croissance). Utilisé pour les états de succès, validations.
- **Accent** : indigo/violet profond (technologie, innovation). Utilisé pour les badges, accents visuels.
- **Neutres** : gris chauds tirant vers le sable, pas des gris bleutés froids.
- **Sémantiques** : succès=vert, erreur=rouge terre cuite, warning=ambre, info=indigo.
- **Dark mode** : fonds sombres CHAUDS (ex: #1C1917, pas du #000 ni du gris bleuté). Texte blanc cassé (#F5F0E8), pas du #FFF pur. Les cards ont un fond légèrement plus clair que le background avec un border subtil.

Chaque couleur a une échelle de 50 à 950 définie dans design-tokens.css et étendue dans tailwind.config.ts.

## Typographie

- **Titres** : "Plus Jakarta Sans", weight 700-800, line-height serré (0.95-1.05)
  - H1 : clamp(2rem, 5vw, 3.5rem)
  - H2 : clamp(1.5rem, 3vw, 2.25rem)
  - H3 : clamp(1.125rem, 2vw, 1.5rem)
- **Body** : "Inter", 16px, weight 400, line-height 1.65
- **Chiffres/stats** : "Inter" avec font-variant-numeric tabular-nums
- **Page locuteur** : la phrase à lire en clamp(20px, 5vw, 32px), weight 600

## Composants UI — Règles de style

**Button** : 3 variantes (primary avec gradient subtil, secondary, ghost), 3 tailles (sm/md/lg). Hover = scale(1.02) + shadow grandissante + transition 200ms ease-out. Active = scale(0.98). Disabled = opacity 0.5. Loading state avec spinner intégré. Les boutons ont du caractère — pas des rectangles plats ennuyeux.

**Card** : border-radius 16px, shadow subtile, border 1px opacity 0.08. Hover = translateY(-2px) + shadow augmentée. Fond légèrement différent du background (pas du blanc pur sur blanc pur).

**Input** : focus ring en couleur accent (pas le ring bleu par défaut navigateur). Label au-dessus. État erreur avec message rouge et icône. Transition smooth sur le focus.

**Badge** : pill shape, texte petit uppercase. Couleurs distinctes par statut : ASR=indigo, TTS=orange, validé=vert, rejeté=rouge, pending=gris.

**ProgressBar** : gradient dans la barre, animation de remplissage fluide.

**AudioPlayer** : mini lecteur inline compact (play/pause, barre de progression, durée), intégrable dans un tableau.

**Tableaux** : jamais des `<table>` HTML bruts. Stylés avec header sticky, rows alternées subtiles, hover highlight sur les rows. Pagination stylée.

## Éléments signature

- **Pattern wax** : un motif SVG ondulé inspiré des textiles ouest-africains. Utilisé en fond TRÈS léger (opacity 0.03-0.05) sur certaines sections, ou comme border décoratif. Jamais envahissant.
- **Icône micro animée** : pulse quand on enregistre. C'est l'icône centrale de la marque.
- **Transition de page** : fade-in-up 200ms sur le contenu au changement de route.
- **Count-up** : les gros chiffres du dashboard s'animent de 0 à leur valeur au chargement.

## Animations

Toutes les animations utilisent uniquement transform et opacity (GPU-friendly).
Toutes respectent `@media (prefers-reduced-motion: reduce)`.

- `pulse-record` : pulsation rouge pour le bouton d'enregistrement actif
- `fade-in-up` : translateY(20px) + opacity 0→1, durée 400ms, ease-out
- `slide-in-right` : pour les modales et drawers
- `progress-fill` : remplissage de barre de progression
- `shimmer` : skeleton loading pour les états pending
- `scale-in` : scale(0.95→1) + opacity, pour les modales et confirmations

## Layouts

**AppLayout** (pages authentifiées) :
- Desktop ≥1024px : sidebar fixe 240px à gauche + contenu principal. Sidebar = logo + nav verticale avec icônes + profil utilisateur en bas. Item actif = fond coloré + indicateur vertical gauche 3px couleur primaire.
- Mobile <1024px : header fixe en haut (logo + dark mode toggle) + bottom navigation (icônes, item actif coloré). Contenu scroll entre les deux.

**PublicLayout** (login, register) : contenu centré verticalement, card max 420px, fond avec pattern wax en filigrane léger.

**RecordPage** : AUCUN layout. Fullscreen. Flex column. height: 100dvh. Pas de scroll. Zone haute 20% (compteur progression), zone centrale 50% (LA PHRASE en gros), zone basse 30% (bouton micro + contrôles).

## Dark mode

- Toggle soleil/lune dans la navigation
- Respecte prefers-color-scheme comme défaut
- Stocké en localStorage
- Fonds sombres CHAUDS, texte blanc cassé, cards avec border subtil
- Pas de dark mode sur la page /record/:token — fond clair uniquement pour lisibilité maximale

## Responsive

- Mobile-first toujours
- Breakpoints : sm 640px, md 768px, lg 1024px, xl 1280px
- La page /record/:token est conçue pour un Samsung Galaxy A14 (360x800, Chrome Android, 3G)
- Bouton d'enregistrement : 80px minimum, zone tactile 96px
- Phrase à lire : 24px minimum sur mobile
- Aucun scroll horizontal nulle part

## Performance

- Fonts préchargées dans index.html (link preload)
- Lazy loading des images
- Animations GPU-friendly uniquement (transform, opacity)
- Skeleton/shimmer pour les états de chargement
- Upload TUS avec retry pour les connexions instables

## Accessibilité

- Contrast ratio AA minimum partout
- Focus visible sur tous les éléments interactifs (ring coloré, pas outline par défaut)
- aria-labels sur les boutons icône-only
- Bouton d'enregistrement utilisable par pointeur ET clavier (Space/Enter pour start/stop)