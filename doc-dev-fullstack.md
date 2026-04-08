# Baat-IA — Architecture Technique
## Document Développeur Fullstack

**Version** : 1.0 — MVP  
**Dernière mise à jour** : Avril 2026  
**Destinataire** : Développeur fullstack (React + Supabase + intégration Python)

---

## 1. Vue d'ensemble de ta responsabilité

Tu es responsable de **tout sauf le pipeline audio**. Concrètement :

- Frontend React (dashboard client + interface locuteur)
- Supabase (auth, DB, storage, webhooks)
- Intégration avec le serveur Python du data scientist
- Export et téléchargement des datasets
- Déploiement et infra

Le data scientist te fournit un serveur Python (FastAPI) avec un seul endpoint. Tu n'as pas besoin de comprendre comment le traitement audio fonctionne — juste comment l'appeler et récupérer les résultats.

---

## 2. Stack technique

| Couche | Techno | Pourquoi |
|--------|--------|----------|
| Frontend | React + Vite + TailwindCSS | Léger, rapide, fonctionne bien sur mobile |
| Auth | Supabase Auth | Email/password pour clients, token anonyme pour locuteurs |
| Base de données | Supabase PostgreSQL | RLS natif, realtime, zero config |
| Stockage fichiers | Supabase Storage (S3) | Upload TUS resumable, CDN intégré |
| Déclencheur traitement | Supabase Database Webhook | Insert dans `recordings` → POST au serveur Python |
| Serveur audio | FastAPI sur Railway | Géré par le data scientist, tu appelles/reçois du JSON |
| Hébergement frontend | Vercel ou Netlify | Deploy automatique sur git push |

---

## 3. Modèle de données complet

### 3.1 Tables

```sql
-- =====================
-- PROFILES (extension de auth.users)
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  organization TEXT,
  role TEXT CHECK (role IN ('client', 'admin')) DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger auto-création du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- PROJECTS
-- =====================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  target_language TEXT NOT NULL,          -- code ISO 639-3 : 'wol', 'fuc', 'srr'
  language_label TEXT,                    -- label lisible : 'Wolof', 'Pulaar'
  usage_type TEXT DEFAULT 'asr'
    CHECK (usage_type IN ('asr', 'tts', 'both')),
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','active','processing','completed','archived')),
  settings JSONB DEFAULT '{
    "sample_rate": 16000,
    "export_format": "ljspeech"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PHRASES (texte à lire)
-- =====================
CREATE TABLE public.phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position INT NOT NULL,
  content TEXT NOT NULL,                  -- la phrase à lire
  normalized_content TEXT,                -- version normalisée (optionnel)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, position)
);

-- =====================
-- RECORDING SESSIONS (1 session = 1 locuteur invité)
-- =====================
CREATE TABLE public.recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  speaker_name TEXT,
  speaker_metadata JSONB DEFAULT '{}',    -- { age, gender, dialect, city }
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed')),
  total_recorded INT DEFAULT 0,           -- compteur de phrases enregistrées
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- =====================
-- RECORDINGS (1 enregistrement = 1 phrase lue par 1 locuteur)
-- =====================
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  phrase_id UUID NOT NULL REFERENCES public.phrases(id),
  raw_storage_path TEXT NOT NULL,          -- chemin WebM dans Storage
  processed_storage_path TEXT,             -- chemin WAV après traitement (rempli par Python)
  duration_seconds FLOAT,
  file_size_bytes BIGINT,
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending','processing','completed','failed')),
  -- Champs remplis par le serveur Python après QC :
  is_valid BOOLEAN,
  snr_db FLOAT,
  clipping_pct FLOAT,
  silence_ratio FLOAT,
  rejection_reasons TEXT[],
  qc_profile_used TEXT,                    -- 'asr' ou 'tts'
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- =====================
-- EXPORTS
-- =====================
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  format TEXT NOT NULL
    CHECK (format IN ('ljspeech', 'huggingface', 'csv_wav')),
  storage_path TEXT,                       -- chemin du ZIP dans Storage
  total_segments INT,
  total_duration_seconds FLOAT,
  file_size_bytes BIGINT,
  filters_applied JSONB DEFAULT '{}',      -- ex: { "min_snr": 20, "usage_type": "tts" }
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- INDEX
-- =====================
CREATE INDEX idx_phrases_project ON public.phrases(project_id, position);
CREATE INDEX idx_recordings_session ON public.recordings(session_id);
CREATE INDEX idx_recordings_project ON public.recordings(project_id);
CREATE INDEX idx_recordings_phrase ON public.recordings(phrase_id);
CREATE INDEX idx_recordings_status ON public.recordings(processing_status);
CREATE INDEX idx_recordings_valid ON public.recordings(project_id, is_valid);
CREATE INDEX idx_sessions_token ON public.recording_sessions(token);
CREATE INDEX idx_sessions_project ON public.recording_sessions(project_id);
CREATE INDEX idx_exports_project ON public.exports(project_id);
```

### 3.2 Row Level Security (RLS)

```sql
-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage projects" ON public.projects
  FOR ALL USING (auth.uid() = owner_id);

-- PHRASES
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project owners read phrases" ON public.phrases
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Project owners insert phrases" ON public.phrases
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- RECORDING SESSIONS
ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage sessions" ON public.recording_sessions
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- RECORDINGS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read recordings" ON public.recordings
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
-- Note : les INSERT sur recordings sont faits par le service_role
-- (via Edge Function pour les locuteurs anonymes)

-- EXPORTS
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage exports" ON public.exports
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
```

### 3.3 Storage Buckets

```sql
-- Créer les buckets via le dashboard ou SQL
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('audio-raw', 'audio-raw', false),           -- WebM uploadés par les locuteurs
  ('audio-processed', 'audio-processed', false), -- WAV traités par Python
  ('exports', 'exports', false);                 -- ZIP des datasets exportés

-- Politique : locuteurs anonymes peuvent uploader dans audio-raw
-- (via signed upload URL générée par Edge Function)

-- Politique : clients authentifiés peuvent lire audio-processed et exports
CREATE POLICY "Clients read processed audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-processed' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Clients read exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND
    auth.uid() IS NOT NULL
  );
```

---

## 4. Flux applicatifs détaillés

### 4.1 Inscription et création de projet

```
1. Client s'inscrit → Supabase Auth (email/password)
2. Trigger crée le profil automatiquement
3. Client crée un projet :
   - POST /rest/v1/projects (via supabase-js)
   - Champs : name, target_language, usage_type
4. Client uploade un fichier texte (.txt, une phrase par ligne)
5. Tu parses le fichier côté client (React) :
   - Split par ligne
   - Filtrer les lignes vides
   - Insérer chaque ligne comme une phrase avec sa position
   - INSERT batch dans public.phrases
```

### 4.2 Génération de lien d'enregistrement

```
1. Client clique "Générer un lien" dans le dashboard
2. INSERT dans recording_sessions avec les métadonnées du locuteur
3. Le token est auto-généré par la DB (gen_random_bytes)
4. Tu construis l'URL : https://baat-ia.com/record/{token}
5. Le client copie ce lien et l'envoie au locuteur (WhatsApp, SMS, etc.)
```

### 4.3 Parcours du locuteur (interface d'enregistrement)

```
1. Le locuteur ouvre le lien /record/{token}
2. Tu fais un appel à une Edge Function : GET /functions/v1/session/{token}
   - Vérifie que le token existe et n'est pas expiré
   - Retourne : project_id, phrases[], speaker_metadata
   - Retourne aussi un signed upload URL pour Supabase Storage
3. L'interface affiche la première phrase non enregistrée
4. Le locuteur appuie sur le bouton (push-to-talk) → MediaRecorder démarre
5. Il relâche → MediaRecorder stoppe → Blob WebM créé
6. Upload du Blob via TUS vers Supabase Storage (audio-raw/)
7. Edge Function POST insère un row dans recordings :
   - session_id, project_id, phrase_id, raw_storage_path
   - processing_status = 'pending'
8. L'insert dans recordings déclenche le Database Webhook
   → POST vers le serveur Python du data scientist
9. La phrase suivante s'affiche automatiquement
10. Le locuteur peut quitter et reprendre plus tard
    (on track total_recorded dans la session)
```

### 4.4 Retour du serveur Python

```
Le serveur Python reçoit le webhook, traite l'audio, puis fait
un UPDATE direct dans Supabase (il a le service_role key) :

UPDATE recordings SET
  processed_storage_path = 'audio-processed/{project_id}/{recording_id}.wav',
  processing_status = 'completed',
  is_valid = true,
  snr_db = 24.5,
  clipping_pct = 0.0,
  silence_ratio = 0.12,
  qc_profile_used = 'tts',
  processed_at = now()
WHERE id = '{recording_id}';

Toi tu n'as rien à faire — tu écoutes juste les changements
via Supabase Realtime pour mettre à jour le dashboard en temps réel.
```

### 4.5 Export du dataset

```
1. Le client va dans le dashboard et clique "Exporter"
2. Il choisit : format (ljspeech, huggingface, csv_wav) + filtres (SNR min, etc.)
3. Tu insères dans la table exports (status = 'pending')
4. Un Database Webhook appelle le serveur Python : POST /api/generate-export
5. Le serveur Python :
   - Récupère tous les recordings validés selon les filtres
   - Télécharge les WAV depuis audio-processed/
   - Génère metadata.csv + structure de dossier
   - Crée un ZIP
   - Uploade le ZIP vers le bucket exports/
   - UPDATE exports SET status = 'ready', storage_path = '...'
6. Le client voit le bouton "Télécharger" apparaître
7. Tu génères un signed URL temporaire pour le téléchargement
```

---

## 5. Pages et composants React

### 5.1 Pages client (authentifié)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email/password, Supabase Auth |
| `/register` | Register | Inscription + nom + organisation |
| `/dashboard` | Dashboard | Liste des projets, stats globales |
| `/project/new` | NewProject | Formulaire : nom, langue, usage_type, upload texte |
| `/project/:id` | ProjectDetail | Stats, liste sessions, liste recordings, QC |
| `/project/:id/sessions` | Sessions | Liens générés, statut par locuteur |
| `/project/:id/recordings` | Recordings | Tableau : phrase, locuteur, SNR, valid/rejeté, écoute |
| `/project/:id/export` | Export | Choix format, filtres, téléchargement |

### 5.2 Page locuteur (anonyme)

| Route | Page | Description |
|-------|------|-------------|
| `/record/:token` | RecordingInterface | Affiche phrase, bouton push-to-talk, progression |

### 5.3 Composant d'enregistrement (le plus critique)

```jsx
// Points clés de l'implémentation :

// 1. MediaRecorder config
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});

const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/webm';

const recorder = new MediaRecorder(stream, {
  mimeType,
  audioBitsPerSecond: 32000
});

// 2. Push-to-talk : onPointerDown = start, onPointerUp = stop
// (fonctionne sur mobile tactile et desktop souris)

// 3. Upload via TUS (resumable)
// Utilise tus-js-client avec l'URL signée de Supabase
// chunkSize: 6 * 1024 * 1024 (obligatoire Supabase)

// 4. Après upload réussi :
// - Appeler Edge Function pour insérer dans recordings
// - Incrémenter total_recorded dans la session
// - Passer à la phrase suivante

// 5. Gestion hors-ligne (v2) :
// - Stocker les blobs en IndexedDB si pas de réseau
// - Sync quand la connexion revient
```

### 5.4 Contraintes UX mobile

- Police de la phrase : **minimum 24px**, bien contrastée
- Bouton d'enregistrement : **minimum 64x64px**, zone tactile 80x80px
- Pas de scroll horizontal
- Feedback visuel d'enregistrement : animation pulsante rouge
- Compteur de progression : "47 / 250 phrases"
- Possibilité de réécouter le dernier enregistrement avant de passer au suivant
- Message d'erreur clair si le micro est refusé

---

## 6. Edge Functions nécessaires

Tu n'as besoin que de **2 Edge Functions** :

### 6.1 `get-session` — Accès locuteur anonyme

```typescript
// supabase/functions/get-session/index.ts
// GET /functions/v1/get-session?token=abc123

// 1. Vérifie le token dans recording_sessions
// 2. Vérifie que la session n'est pas expirée
// 3. Récupère les phrases du projet (avec position)
// 4. Récupère les phrase_ids déjà enregistrés par cette session
// 5. Génère un signed upload URL pour Supabase Storage
// 6. Retourne : { session, phrases, recorded_ids, upload_url }
```

### 6.2 `submit-recording` — Insert recording pour locuteur anonyme

```typescript
// supabase/functions/submit-recording/index.ts
// POST /functions/v1/submit-recording

// Le locuteur n'a pas de JWT → il ne peut pas INSERT directement
// Cette Edge Function utilise le service_role key pour :
// 1. Valider le token de session
// 2. INSERT dans recordings (raw_storage_path, phrase_id, etc.)
// 3. UPDATE recording_sessions SET total_recorded = total_recorded + 1
// 4. Le Database Webhook se déclenche automatiquement sur l'INSERT
```

---

## 7. Database Webhook

```
Supabase Dashboard → Database → Webhooks

Webhook 1 : "on-recording-inserted"
  Table : recordings
  Event : INSERT
  URL : https://ton-serveur-railway.up.railway.app/api/process-segment
  Headers : { "Authorization": "Bearer {API_SECRET}" }
  Payload : la row insérée (id, raw_storage_path, project_id, phrase_id)

Webhook 2 : "on-export-requested"
  Table : exports
  Event : INSERT
  URL : https://ton-serveur-railway.up.railway.app/api/generate-export
  Headers : { "Authorization": "Bearer {API_SECRET}" }
  Payload : la row insérée (id, project_id, format, filters_applied)
```

---

## 8. Variables d'environnement

### Frontend (.env)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Edge Functions (Supabase secrets)
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
PYTHON_SERVER_URL=https://baat-ia-server.up.railway.app
API_SECRET=une-cle-secrete-partagee-avec-python
```

### Ce que le data scientist a besoin de toi :
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  (pour lire/écrire dans la DB et Storage)
API_SECRET=une-cle-secrete-partagee     (pour valider les webhooks entrants)
```

---

## 9. Contrat d'interface avec le serveur Python

### Ce que le serveur Python reçoit (webhook payload)

```json
// POST /api/process-segment
{
  "type": "INSERT",
  "table": "recordings",
  "record": {
    "id": "uuid",
    "session_id": "uuid",
    "project_id": "uuid",
    "phrase_id": "uuid",
    "raw_storage_path": "audio-raw/project_id/session_id/phrase_001.webm",
    "processing_status": "pending"
  }
}
```

### Ce que le serveur Python écrit dans ta DB

```json
// UPDATE recordings WHERE id = '...'
{
  "processed_storage_path": "audio-processed/project_id/rec_id.wav",
  "processing_status": "completed",  // ou "failed"
  "is_valid": true,                  // ou false
  "snr_db": 24.5,
  "clipping_pct": 0.0,
  "silence_ratio": 0.12,
  "rejection_reasons": [],           // ou ["low_snr", "too_short"]
  "qc_profile_used": "tts",
  "duration_seconds": 3.2,
  "processed_at": "2026-04-02T12:00:00Z"
}
```

Tu n'as pas besoin de savoir comment il calcule le SNR. Tu affiches juste les résultats.

---

## 10. Plan de développement — Ton scope

| Semaine | Tâche | Détails |
|---------|-------|---------|
| 1 | Setup projet | Supabase project, schéma DB, RLS, buckets Storage, repo React |
| 2 | Auth + CRUD projets | Login/register, création projet, upload texte, parsing phrases |
| 3 | Interface locuteur | Page /record/:token, push-to-talk, upload TUS, Edge Functions |
| 4 | Dashboard + Realtime | Liste recordings, stats QC, écoute audio, Supabase Realtime |
| 5 | Intégration Python | Database Webhooks, tests de bout en bout avec le serveur du DS |
| 6 | Export + polish | Page export, génération ZIP (via Python), téléchargement, responsive |
| 7 | Tests + déploiement | Tests mobile Android, déploiement Vercel + Railway, monitoring |

**Total : ~7 semaines** en parallèle avec le data scientist.

---

## 11. Checklist avant production

- [ ] RLS activé sur TOUTES les tables
- [ ] Service role key JAMAIS exposée côté client
- [ ] Upload TUS avec retry et progress bar
- [ ] Interface locuteur testée sur Samsung Galaxy A14 (Chrome Android)
- [ ] Interface locuteur testée en 3G throttled (Chrome DevTools)
- [ ] Signed URLs pour les téléchargements (pas de bucket public)
- [ ] Rate limiting sur les Edge Functions
- [ ] Webhook secret validé côté Python
- [ ] Monitoring Railway (logs, uptime)
- [ ] Backup DB Supabase activé (plan Pro)
