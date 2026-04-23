# Daandé

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

# Design System — Daandé (Linear-inspired dark-native)

**Source de vérité** : le fichier `design.md` à la racine du repo décrit tout le système (palette, typographie, composants, principes). Les tokens sont définis dans `src/styles/design-tokens.css`. À chaque création ou modification d'écran, se référer à `design.md` — ne jamais dévier sans raison.

## Principes non-négociables

- **Dark-mode natif** : tout le produit est en dark. Fond par défaut `#08090a`, pas d'alternative claire. Le toggle de dark mode est supprimé.
- **Typographie** : Inter Variable partout, avec `font-feature-settings: 'cv01', 'ss03'` activées. Weight 510 par défaut, 590 pour l'emphase forte, 400 pour la lecture. Jamais de 700.
- **Palette** : quasi-achromatique (blanc/gris sur fond near-black). Un seul accent chromatique : indigo-violet `#5e6ad2` (CTA primaire) et `#7170ff` (interactif). Réservé aux CTA et éléments actifs — jamais décoratif.
- **Bordures** : toujours semi-transparentes blanches (`rgba(255,255,255,0.05)` à `0.08`). Jamais de solides sombres sur fond sombre.
- **Surfaces** : stacking par luminance (tints `0.02 → 0.04 → 0.05`) — jamais de fond solide de couleur différente.
- **Texte** : `#f7f8f8` en primaire (pas `#ffffff` pur), `#d0d6e0` body, `#8a8f98` muted, `#62666d` disabled.
- **Mono** : JetBrains Mono pour les étiquettes techniques, metadata, codes.

## Composants clés (voir design.md §4)

- **Button** : `primary` (gradient blanc→gris, rare), `ghost` (défaut), `subtle`, `pill`, `toolbar`. Radius 6px. Jamais de fond coloré saturé.
- **Card** : tint `0.02`, border `0.08`, radius `8px` (ou `12px` pour featured).
- **Input** : fond tint `0.02`, border `0.08`, focus ring multi-layer.
- **Badge** : `neutral` (pill, border `#23252a`), `status` (avec dot), `subtle` (rect 2px radius).
- **Elevation** : communiquée par la luminance du fond, pas par des ombres sombres (qui sont invisibles sur fond sombre).

## Signature visuelle

- **Waveform animée** (voir `Sections.jsx` landing pour le pattern) : barres verticales en gradient blanc→gris, animation sinusoïdale. C'est la signature de marque.
- **Dataset preview** : panneau window chrome `#0f1011` avec 3 dots macOS et URL monospace dans un input pill — pour les démos produit.

## Règles globales

- Pas de pattern wax ni de motifs africains ornementaux
- Pas de gradient orange/vert ni de couleurs chaudes
- Pas d'emoji dans les écrans applicatifs (sauf signalé)
- Les composants doivent se conformer strictement au `design.md` — en cas de doute, ne pas improviser, demander ou référer au fichier

## Layouts

**AppLayout / SpeakerLayout** (authentifié) :
- Desktop ≥1024px : sidebar fixe 240px sur fond `#0f1011` (panel) + contenu sur fond `#08090a` (marketing). Item actif = fond tint `0.04` + texte `#f7f8f8`. Pas d'indicateur vertical coloré.
- Mobile <1024px : header fixe en haut (logo + badge Beta éventuel) + bottom nav (icônes, item actif lumineux). Contenu scroll entre les deux.

**PublicLayout** (login, register) : contenu centré, card `tint-02` avec border `0.08` radius `12px`, max 420px.

**RecordPage** : fullscreen, flex column, `100dvh`. Zone haute (20%) compteur de progression en mono, zone centrale (50%) LA PHRASE en Inter 510 `#f7f8f8`, zone basse (30%) bouton micro + waveform. Fond `#08090a` comme le reste — plus d'exception "fond clair".

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