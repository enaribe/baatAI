# Daandé — Contexte du projet

> Document de référence à fournir au Project Claude pour qu'il comprenne ce qui a été construit, dans quel ordre, et où on en est. Mis à jour : avril 2026.

---

## 1. Pitch & positionnement

**Daandé** est une plateforme SaaS de **collecte de datasets vocaux** pour les langues africaines. Basée à Dakar (Sénégal).

- **4 langues au lancement** : Wolof, Pulaar, Sereer, Bambara (avec dialectes pris en charge).
- **Deux audiences** :
  - **Clients** (entreprises, chercheurs, labos NLP) qui veulent un dataset audio annoté pour entraîner des modèles ASR ou TTS.
  - **Locuteurs natifs** qui enregistrent depuis leur téléphone et sont rémunérés via Wave / Orange Money à la phrase validée.
- **Statut** : beta privée. Premiers projets pilotes en cours. Pas de chiffres de traction publics. Lancement public visé Q2 2026.
- **Modèle économique pressenti** : forfait par projet, tarification à la phrase validée, marge sur la rémunération locuteurs.

---

## 2. Le flux complet (utilisateur → dataset)

1. **Le client crée un projet** depuis son dashboard : nom, langue cible (wol/pul/srr/bam), type d'usage (asr / tts / both), liste de phrases (upload .txt, .csv, .pdf, .docx, ou copier-coller).
2. **Le serveur Python parse** le fichier et insère les phrases en base, normalisées, ordonnées.
3. **Le client invite des locuteurs** : recherche par langue/dialecte/genre/ville, envoi d'invitations, suivi des réponses.
4. **Le locuteur accepte** depuis son espace locuteur, enregistre depuis son téléphone phrase par phrase.
5. **Upload TUS résumable** (chunkSize 6 MB) sur Supabase Storage bucket `audio-raw` (WebM).
6. **Database webhook → serveur Python** sur INSERT recordings : conversion WebM → WAV 16 kHz mono, calcul SNR, clipping, ratio silence, énergie, DNSMOS. Verdict valid/invalid + raisons de rejet. Le résultat est UPDATE-é directement sur la ligne `recordings`.
7. **Le frontend écoute via Supabase Realtime** les changements et affiche le statut au locuteur (validé / à recommencer).
8. **Validation par le client** : écoute, validation manuelle ou auto, rejet possible.
9. **Validation entre pairs (peer validation)** : autres locuteurs peuvent valider.
10. **Export du dataset** : ZIP au format LJSpeech / HuggingFace / CSV+WAV. Webhook → Python qui génère le ZIP, upload bucket `exports`, UPDATE `exports.storage_path`.
11. **Locuteur demande un retrait** de ses gains via Wave / Orange Money. Admin valide.

---

## 3. Stack technique

### Frontend (`/Users/macbookair/Desktop/projets/myProjects/baatAI`)

- **React 19**, **Vite**, **TypeScript strict**
- **TailwindCSS v4** (avec tokens custom dans `src/styles/design-tokens.css`)
- **React Router v7**
- **tus-js-client** pour les uploads résumables
- **Supabase JS SDK** (auth, postgres, storage, realtime, edge functions)
- **Lucide React** pour les icônes
- **Inter Variable** + **JetBrains Mono** (Google Fonts, préchargées dans `index.html`)

Architecture typique :
```
src/
├── components/
│   ├── ui/               # Button, Input, Field, Toast, ThemeToggle, Logo, Waveform, StaticWaveform
│   ├── layout/           # AppLayout (client), SpeakerLayout, PublicLayout
│   ├── recruitment/      # invite-drawer, recruitment-panel, sent-tab, team-tab, speaker-match-card, etc.
│   ├── phrase-list.tsx
│   ├── recording-list.tsx
│   ├── session-list.tsx
│   ├── voice-sample-section.tsx
│   ├── speaker-sample-player.tsx
│   └── export-panel.tsx
├── pages/                # 1 fichier par route, kebab-case
├── hooks/                # useAuth, useProjects, useSpeakerProfile, useRecorder, useNotifications, useDarkMode, useSpeakerGuard, useToast, etc.
├── lib/
│   ├── supabase.ts       # client singleton
│   ├── upload.ts         # TUS resumable
│   ├── languages.ts      # config langues + dialectes
│   └── text-parser.ts
├── types/database.ts     # types miroirs du schéma SQL
├── contexts/             # auth-context, toast-context
└── styles/               # design-tokens.css, theme-remap.css, animations.css
```

### Serveur Python (`/Users/macbookair/desktop/projets/myProjects/baat-ia-server`)

- **Flask 3** + **Gunicorn** (déployé sur Railway)
- **librosa**, **scipy**, **numpy**, **pydub**, **soundfile** pour le traitement audio
- **onnxruntime** pour DNSMOS (qualité perceptuelle)
- **PyPDF2**, **python-docx** pour parser les fichiers de phrases
- **Supabase Python SDK** (service_role key)

Routes :
- `GET /api/health`
- `POST /api/process-segment` — appelé par webhook Supabase sur INSERT recordings. Convertit WebM→WAV, calcule SNR/clipping/silence/DNSMOS, UPDATE la ligne.
- `POST /api/generate-export` — appelé sur INSERT exports. Génère le ZIP au format demandé, upload bucket `exports`.
- `POST /api/upload-phrases` — parse fichier (txt/csv/pdf/docx) en phrases, insère en base.

Services :
- `audio_converter.py` — WebM → WAV 16 kHz mono via ffmpeg/pydub
- `quality_check.py` + `quality_profiles.py` — métriques + verdict selon profil ASR/TTS
- `post_processing.py` — normalisation, trim silences
- `text_extractor.py` — parsing des fichiers texte
- `exporter.py` — packaging ZIP
- `supabase_client.py` — wrapper service_role

### Backend / infra (Supabase)

- **PostgreSQL** avec RLS (Row Level Security) activé sur toutes les tables
- **Storage** : 3 buckets privés (`audio-raw`, `audio-processed`, `exports`)
- **Edge Functions** (Deno/TypeScript) : 12 fonctions
  - `get-session` — récupère session anonyme (compat rétro avec ancien flow tokens)
  - `submit-recording` — INSERT recording côté locuteur via service_role
  - `submit-validation` — INSERT validation entre pairs
  - `upload-phrases` — proxy vers serveur Python
  - `accept-project`, `invite-speaker`, `invite-speaker-bulk`, `cancel-invitation`, `remind-invitation`
  - `request-withdrawal`, `delete-account`, `get-recording-status`
- **Database Webhooks** (via `pg_net`) : INSERT recordings → serveur Python ; INSERT exports → serveur Python
- **35 migrations SQL** (`001_initial_schema` → `035_match_speakers_with_sample`) — historique complet : init schéma, RLS, storage policies, comptes locuteurs, webhooks, peer validations, invitations, notifications, account deletion, échantillon vocal, favoris, etc.

### Tables principales (Postgres)

- **profiles** — auth.users + full_name, organization, role (`client` / `speaker` / `admin`). Trigger auto-création.
- **speaker_profiles** — id (FK profiles), phone, gender, dob, city, languages[], dialects (jsonb), bio, avatar_url, sample_storage_path, sample_duration_seconds, verification_status, is_available, is_certified, total_validated, reliability_score, wallet_balance_fcfa.
- **projects** — owner_id, name, description, target_language (ISO 639-3), language_label, usage_type (`asr`/`tts`/`both`), status (`draft`/`active`/`processing`/`completed`/`archived`), settings (jsonb).
- **phrases** — project_id, position, content, normalized_content. UNIQUE(project_id, position).
- **recording_sessions** — project_id, speaker_id (FK speaker_profiles, OU token anonyme legacy), status, total_recorded, expires_at.
- **recordings** — session_id, project_id, phrase_id, raw_storage_path, processed_storage_path, duration_seconds, file_size_bytes, processing_status, is_valid, snr_db, clipping_pct, silence_ratio, energy_db, dnsmos_score, rejection_reasons (text[]), qc_profile_used.
- **invitations** — project_id, speaker_id, status (`pending`/`accepted`/`declined`/`cancelled`/`expired`), invited_at, responded_at, message.
- **notifications** — speaker_id, type, title, body, is_read, related_id.
- **peer_validations** — recording_id, validator_speaker_id, verdict, comment.
- **withdrawals** — speaker_id, amount_fcfa, payment_method (`wave`/`orange_money`), phone, status (`pending`/`approved`/`rejected`/`paid`), processed_by_admin_id.
- **client_favorite_speakers** — client_id, speaker_id.
- **exports** — project_id, format (`ljspeech`/`huggingface`/`csv_wav`), storage_path, total_segments, total_duration_seconds, file_size_bytes, filters_applied (jsonb), status (`pending`/`generating`/`ready`/`failed`).

---

## 4. Routes du frontend (état actuel)

### Public
- `/` — Landing (Linear-inspired, dark + light mode, panneaux moniteur dark-locked, contenu honnête sans faux chiffres)
- `/login` — connexion
- `/register` — choix profil (client / locuteur) + formulaire client
- `/speaker/register` — inscription locuteur 5 étapes (compte → identité → langues → bio → récap)
- `/record/:token` — enregistrement legacy via token anonyme (compat rétro)

### Client (sous AppLayout, role `client` ou `admin`)
- `/dashboard` — liste des projets (vue grille avec ProjectCard waveform dark-locked, OU vue liste)
- `/project/new` — création de projet (steps : infos → phrases → résumé)
- `/project/:id` — détail projet : phrases, sessions, recordings, recruitment, export
- `/speakers` — annuaire des locuteurs (grille SpeakerCard dark-locked OU liste). Filtres langue/genre/ville, favoris, certifiés, récents.
- `/speakers/:id` — fiche locuteur détaillée : hero waveform dark-locked, échantillon vocal, stats, bio, langues, modal d'invitation à un projet.
- `/account` — gestion du compte (info, suppression compte avec confirmation).

### Locuteur (sous SpeakerLayout, role `speaker`)
- `/speaker/onboarding` — finalisation profil (4 étapes) si pas encore créé
- `/speaker/dashboard` — accueil avec invitations en cours, projets actifs, gains
- `/speaker/projects` — liste des projets en cours
- `/speaker/invitations` — liste des invitations reçues
- `/speaker/invitations/:id` — détail invitation, accepter/refuser
- `/speaker/notifications` — toutes les notifications
- `/speaker/wallet` — solde, historique paiements, demande de retrait
- `/speaker/validate` — validation entre pairs (écoute des recordings d'autres locuteurs)
- `/speaker/profile` — édition profil + échantillon vocal (60s max, 30s recommandé)
- `/speaker/record/:sessionId` — enregistrement plein écran (mobile-first)

### Admin
- `/admin/withdrawals` — file des demandes de retrait à approuver

---

## 5. Design system

**Source de vérité** : `design.md` (à la racine du repo) + `src/styles/design-tokens.css` + `src/styles/theme-remap.css`.

### Principes
- **Dark-natif Linear-inspired**, avec **light mode adaptatif** sur les écrans client + landing + auth.
- Les écrans **locuteur** restent en dark fixe (verrouillés via `data-theme="dark"` + classe `dark-lock`).
- **Typographie** : Inter Variable (`cv01`, `ss03` activés), weights 400 / 510 / 590. Jamais 700.
- **Palette quasi-achromatique** : near-black `#08090a` à `#191a1b` en dark, blanc + gris foncé en light.
- **Accent unique** : indigo-violet `#5e6ad2` (CTA primaire) et `#7170ff` (interactif).
- **Bordures semi-transparentes blanches** en dark (`rgba(255,255,255,0.05-0.08)`), inversées en light.
- **Surfaces stackées par luminance** (tints `0.02 → 0.04 → 0.05`).

### Tokens sémantiques (`--t-*` qui switchent dark/light)
- Surfaces : `--t-bg`, `--t-bg-panel`, `--t-surface`, `--t-surface-hover`, `--t-surface-active`, `--t-surface-2`
- Texte : `--t-fg`, `--t-fg-2`, `--t-fg-3`, `--t-fg-4`, `--t-fg-5`
- Bordures : `--t-border`, `--t-border-subtle`, `--t-border-strong`
- Topbar : `--t-topbar-bg`
- Accent : `--t-accent`, `--t-accent-hover`, `--t-accent-muted-bg`, `--t-accent-text`
- Sémantique : `--t-success`, `--t-danger`, `--t-warning`, `--t-success-muted-bg`, etc.
- CTA solide : `--t-solid-bg` (blanc en dark, noir en light), `--t-solid-fg` (inverse)

### Cartes verrouillées en dark même en light
- ProjectCard du dashboard (avec waveform statique)
- SpeakerCard du speakers-page (avec waveform)
- Hero card du speaker-detail-page
- Panneaux moniteur de la landing (dataset preview, code/file tree)
- BrandSide (panneau gauche) du PublicLayout

### Toggle thème
- Composant `ThemeToggle` (`src/components/ui/theme-toggle.tsx`) — Sun/Moon icon
- Hook `useDarkMode` — persiste en localStorage (clé `baat-theme` conservée pour rétro-compat utilisateurs), fallback `prefers-color-scheme`
- Intégré dans : sidebar AppLayout (desktop+mobile), Nav landing, coin haut-droit PublicLayout

---

## 6. Conventions code

- **Named exports uniquement** (pas de default export)
- **Fichiers en kebab-case**, **composants en PascalCase**
- **Un composant par fichier**
- **Hooks custom préfixés `use`**
- **Tailwind only** pour le style (pas de CSS séparé sauf design-tokens, theme-remap, animations)
- **Types TS stricts** — jamais `any`
- **Erreurs gérées explicitement** (try/catch + console.error + toast utilisateur si pertinent)
- **Secrets dans `.env`**, jamais commités
- **Commits en français** : `feat: ajout page X`, `fix: correction Y`, `refactor: nettoyage Z`

---

## 7. Sécurité Supabase

- **RLS activé sur TOUTES les tables**
- **Service_role key JAMAIS côté client** — uniquement dans Edge Functions et serveur Python
- **Locuteurs accèdent via auth Supabase** (anciennement via tokens anonymes — compat rétro maintenue via `/record/:token`)
- **INSERT recordings** par locuteurs passe **toujours par Edge Function `submit-recording`** qui utilise service_role
- **Communication serveur Python** uniquement via Database Webhooks (pas d'appel direct frontend → Python)
- **Storage uploads** signés par tokens limités dans le temps

---

## 8. Performance & contraintes locales

- **Cible mobile** : Samsung Galaxy A14 (360×800, Chrome Android, 3G/4G instable)
- **Bouton enregistrement** : 80px min, zone tactile 96px
- **Phrase à lire** : 24px min sur mobile
- **Upload TUS resumable** avec chunks 6 MB pour résister aux coupures
- **Pas de scroll horizontal** nulle part
- **Skeleton loaders** pendant chargements
- **Animations GPU-friendly** (transform, opacity uniquement)

---

## 9. Ce qui est fait, ce qui reste

### ✅ Fait
- Schéma DB complet (35 migrations)
- Authentification multi-rôle (client / speaker / admin)
- Inscription client + locuteur (5 étapes) + onboarding
- Dashboard client (grille + liste, filtres, search)
- Création de projet (parsing fichiers, upload phrases)
- Annuaire locuteurs avec recherche/filtres/favoris/certifiés
- Fiche locuteur détaillée avec échantillon vocal jouable
- Recrutement (invite-drawer, recommandations, invitation en masse)
- Espace locuteur complet (dashboard, projets, invitations, notifications, wallet, profil, validation entre pairs)
- Enregistrement audio depuis téléphone (MediaRecorder API + TUS upload)
- Pipeline qualité serveur Python (SNR, clipping, silence, DNSMOS)
- Validation client + validation entre pairs
- Échantillon vocal locuteur (max 60s)
- Demandes de retrait Wave / Orange Money
- Admin withdrawals
- Suppression de compte
- Notifications temps réel (Supabase Realtime)
- Light mode adaptatif sur tout le client + landing + auth
- Landing pivotée honnête (sans faux chiffres ni faux témoignages)

### ⏳ À faire / à clarifier
- **Premiers projets pilotes réels** (recruter clients beta)
- **Tarification** définitive (pas encore actée)
- **Conformité CDP Sénégal + RGPD** (consentement locuteurs, propriété données, licences datasets)
- **Conditions générales d'utilisation** + politique de confidentialité
- **Intégration paiement réelle** Wave / Orange Money (actuellement les retraits sont juste tracés, paiement manuel par l'admin)
- **Onboarding client guidé** (les premiers clients vont avoir besoin d'aide)
- **Documentation utilisateur** (clients + locuteurs)
- **Stratégie d'acquisition** clients ET locuteurs
- **Branding final** (logo actuel basique)
- **Email transactionnels** (invitations, confirmations, paiements) — pas encore configurés
- **Monitoring / observabilité** serveur Python
- **Tests automatisés** (frontend + backend) — quasi-inexistants
- **Stratégie d'extension** à d'autres langues africaines

---

## 10. Profil du fondateur

Développeur basé au Sénégal, premier produit SaaS lancé. Travaille seul ou avec une très petite équipe. Bootstrap (pas de levée de fonds prévue à court terme). Connaît bien le terrain local (langues, contraintes connectivité, paiements mobile money).

**Besoins de conseil prioritaires** : positionnement marketing, acquisition client B2B, modèle économique, conformité légale, recrutement locuteurs, choix techniques structurants.