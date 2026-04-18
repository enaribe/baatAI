# Plan d'implémentation — Baat-IA v2 : Comptes Locuteurs

> Pivot produit : passer d'un système de **liens WhatsApp jetables** vers une **marketplace de voix** où les locuteurs ont un compte, un profil, un portefeuille, et choisissent leurs projets.

---

## Vision produit

**Avant** : le client génère un token → envoie le lien par WhatsApp → locuteur anonyme enregistre → disparaît.

**Après** : 3 acteurs avec des flux qui se croisent.
- **Client** (Orange, startup IA, chercheur) : filtre des locuteurs par critères, les invite, suit la progression.
- **Locuteur inscrit** : profil riche (langues, dialectes, âge, genre, ville), choisit ses projets comme un freelance, gagne de l'argent sur un portefeuille, retire via Wave/Orange Money.
- **Admin Baat-IA** : valide les locuteurs, gère les projets publics (flywheel Lacuna/Mozilla), voit les stats globales.

**Compatibilité rétro** : les tokens anonymes continuent de fonctionner — on n'invalide aucun lien existant.

---

## Phasage (7 phases, par ordre de dépendance)

Les phases sont séquentielles — chacune dépend de la précédente. On peut néanmoins livrer une valeur après chaque phase.

```
Phase 1 : Socle DB + Auth locuteur         [BLOQUANT]
Phase 2 : Inscription + profil locuteur     [→ démo inscription]
Phase 3 : Espace locuteur (projets dispos)  [→ Use Case 2, 3 — flywheel]
Phase 4 : Recrutement côté client           [→ Use Case 1, 6, 7]
Phase 5 : Portefeuille + paiements          [→ Use Case 2 complet]
Phase 6 : Validation croisée                [→ Use Case 4]
Phase 7 : Experts + certification           [→ Use Case 5]
```

---

## Phase 1 — Socle DB + Auth locuteur

**Objectif** : ajouter le rôle `speaker`, les tables de profil, les invitations, le portefeuille. Aucun UI, juste la fondation.

### 1.1 Migration `017_speaker_accounts.sql`

```sql
-- Ajouter 'speaker' aux rôles possibles
ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_role_check,
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('client', 'admin', 'speaker'));

-- Profil étendu locuteur (1-1 avec profiles)
CREATE TABLE public.speaker_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Identité
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  city TEXT,
  country TEXT DEFAULT 'SN',

  -- Compétences linguistiques (array langues ISO 639-3)
  languages TEXT[] NOT NULL DEFAULT '{}',
  dialects JSONB DEFAULT '{}',  -- { "wol": ["dakar","saint-louis"], "pul": ["fouta"] }

  -- Qualité
  reliability_score FLOAT DEFAULT 1.0 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  total_recordings INT DEFAULT 0,
  total_validated INT DEFAULT 0,
  total_duration_seconds FLOAT DEFAULT 0,
  is_certified BOOLEAN DEFAULT FALSE,
  certified_at TIMESTAMPTZ,
  certified_by UUID REFERENCES public.profiles(id),

  -- Portefeuille (source de vérité = somme wallet_transactions)
  wallet_balance_fcfa INT DEFAULT 0,
  total_earned_fcfa INT DEFAULT 0,
  total_withdrawn_fcfa INT DEFAULT 0,

  -- État du compte
  is_available BOOLEAN DEFAULT TRUE,   -- dispo pour recevoir des invitations
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projets publics vs privés + rémunération
ALTER TABLE public.projects
  ADD COLUMN is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN rate_per_hour_fcfa INT DEFAULT 0,
  ADD COLUMN min_speakers INT,
  ADD COLUMN max_speakers INT,
  ADD COLUMN required_languages TEXT[] DEFAULT '{}',
  ADD COLUMN required_dialects TEXT[] DEFAULT '{}',
  ADD COLUMN required_gender TEXT CHECK (required_gender IN ('male', 'female', 'any')),
  ADD COLUMN age_min INT,
  ADD COLUMN age_max INT,
  ADD COLUMN funding_source TEXT;   -- 'lacuna', 'mozilla', 'client:xxx'

-- Invitations locuteur ↔ projet
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id),
  message TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  UNIQUE (project_id, speaker_id)
);

-- Lier les sessions à un compte locuteur (nullable pour compat rétro avec tokens)
ALTER TABLE public.recording_sessions
  ADD COLUMN speaker_id UUID REFERENCES public.speaker_profiles(id),
  ADD COLUMN invitation_id UUID REFERENCES public.project_invitations(id);

CREATE INDEX idx_sessions_speaker ON public.recording_sessions(speaker_id);

-- Transactions portefeuille (append-only, source de vérité pour balance)
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id),
  amount_fcfa INT NOT NULL,   -- positif = crédit, négatif = débit
  type TEXT NOT NULL CHECK (type IN (
    'recording_validated',  -- +X FCFA par heure validée
    'validation_reward',    -- +X FCFA par session de validation
    'bonus',                -- ajustement manuel admin
    'withdrawal_request',   -- -X FCFA demande retrait
    'withdrawal_paid',      -- confirmation paiement (pas de delta, juste trace)
    'withdrawal_refund'     -- retour si paiement échoué
  )),
  status TEXT DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'failed')),
  reference_table TEXT,     -- 'recordings' | 'peer_validations' | 'withdrawals'
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_speaker ON public.wallet_transactions(speaker_id, created_at DESC);

-- Demandes de retrait (séparées pour workflow admin)
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES public.speaker_profiles(id),
  amount_fcfa INT NOT NULL CHECK (amount_fcfa > 0),
  method TEXT NOT NULL CHECK (method IN ('wave', 'orange_money', 'free_money', 'bank')),
  destination TEXT NOT NULL,   -- numéro tel ou IBAN
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'failed')),
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  transaction_reference TEXT,  -- ID externe du paiement
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger : maintenir wallet_balance en cohérence avec wallet_transactions
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.speaker_profiles
  SET
    wallet_balance_fcfa = wallet_balance_fcfa + NEW.amount_fcfa,
    total_earned_fcfa = CASE
      WHEN NEW.amount_fcfa > 0 AND NEW.type IN ('recording_validated','validation_reward','bonus')
      THEN total_earned_fcfa + NEW.amount_fcfa
      ELSE total_earned_fcfa
    END,
    total_withdrawn_fcfa = CASE
      WHEN NEW.type = 'withdrawal_paid'
      THEN total_withdrawn_fcfa + ABS(NEW.amount_fcfa)
      ELSE total_withdrawn_fcfa
    END,
    updated_at = now()
  WHERE id = NEW.speaker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER wallet_balance_update
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION public.update_wallet_balance();
```

### 1.2 Migration `018_speaker_rls.sql`

```sql
-- SPEAKER_PROFILES
ALTER TABLE public.speaker_profiles ENABLE ROW LEVEL SECURITY;

-- Le locuteur lit/modifie son propre profil
CREATE POLICY "Speaker reads own profile" ON public.speaker_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Speaker updates own profile" ON public.speaker_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Speaker inserts own profile" ON public.speaker_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Les clients authentifiés peuvent VOIR les profils approuvés (pour le matching)
-- Ils ne voient PAS wallet_balance, total_earned (vues filtrées côté app)
CREATE POLICY "Clients browse approved speakers" ON public.speaker_profiles
  FOR SELECT USING (
    verification_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('client', 'admin')
    )
  );

-- Admin voit tout
CREATE POLICY "Admin manages speakers" ON public.speaker_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROJECTS : les projets publics sont visibles par tous les locuteurs approuvés
CREATE POLICY "Speakers see public projects" ON public.projects
  FOR SELECT USING (
    is_public = TRUE
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.speaker_profiles
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

-- PROJECTS : les locuteurs invités voient les projets privés qui les concernent
CREATE POLICY "Invited speakers see private projects" ON public.projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM public.project_invitations
      WHERE speaker_id = auth.uid() AND status IN ('pending','accepted')
    )
  );

-- PHRASES : un locuteur lit les phrases d'un projet où il est invité/public
CREATE POLICY "Speakers read phrases of accessible projects" ON public.phrases
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE is_public = TRUE
         OR id IN (
           SELECT project_id FROM public.project_invitations
           WHERE speaker_id = auth.uid() AND status = 'accepted'
         )
    )
  );

-- INVITATIONS
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Speaker reads own invitations" ON public.project_invitations
  FOR SELECT USING (speaker_id = auth.uid());
CREATE POLICY "Speaker updates own invitation status" ON public.project_invitations
  FOR UPDATE USING (speaker_id = auth.uid())
  WITH CHECK (speaker_id = auth.uid());
CREATE POLICY "Project owner manages invitations" ON public.project_invitations
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- RECORDING_SESSIONS : le locuteur voit ses sessions
CREATE POLICY "Speaker reads own sessions" ON public.recording_sessions
  FOR SELECT USING (speaker_id = auth.uid());

-- RECORDINGS : le locuteur lit ses propres recordings
CREATE POLICY "Speaker reads own recordings" ON public.recordings
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.recording_sessions WHERE speaker_id = auth.uid()
    )
  );

-- WALLET_TRANSACTIONS : lecture seule pour le locuteur
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Speaker reads own transactions" ON public.wallet_transactions
  FOR SELECT USING (speaker_id = auth.uid());
-- INSERT/UPDATE : service_role uniquement (via Edge Function)

-- WITHDRAWALS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Speaker manages own withdrawals" ON public.withdrawals
  FOR ALL USING (speaker_id = auth.uid());
CREATE POLICY "Admin manages all withdrawals" ON public.withdrawals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 1.3 Types TypeScript — mise à jour `src/types/database.ts`

Ajouter :
- `UserRole = 'client' | 'admin' | 'speaker'`
- Types `Gender`, `VerificationStatus`, `InvitationStatus`, `WithdrawalMethod`, `WithdrawalStatus`, `WalletTransactionType`
- Interfaces `SpeakerProfile`, `ProjectInvitation`, `WalletTransaction`, `Withdrawal`
- Étendre `Project` avec `is_public`, `rate_per_hour_fcfa`, `required_languages`, etc.
- Étendre `RecordingSession` avec `speaker_id`, `invitation_id`
- Ajouter ces tables dans `Database.public.Tables`

**Livrables Phase 1** :
- [ ] `017_speaker_accounts.sql`
- [ ] `018_speaker_rls.sql`
- [ ] `src/types/database.ts` à jour
- [ ] `npx supabase db push` OK en local
- [ ] `npm run build` OK

---

## Phase 2 — Inscription + profil locuteur

**Objectif** : un locuteur peut créer son compte, renseigner son profil, et être en attente de validation admin.

### 2.1 Routes + pages

```
/speaker/register        → SpeakerRegisterPage (email + mot de passe + téléphone)
/speaker/onboarding      → SpeakerOnboardingPage (wizard profil langues/dialectes/démo vocale)
/speaker/profile         → SpeakerProfilePage (édition profil)
/speaker/pending         → SpeakerPendingPage (écran "en attente de validation")
```

### 2.2 Composants à créer

- `src/pages/speaker-register-page.tsx` — inscription Supabase auth + création speaker_profile
- `src/pages/speaker-onboarding-page.tsx` — wizard 4 étapes
  - Étape 1 : infos perso (date naissance, genre, ville)
  - Étape 2 : langues + dialectes (multi-select par langue)
  - Étape 3 : démo vocale (3 phrases à enregistrer pour validation admin)
  - Étape 4 : conditions + soumission
- `src/pages/speaker-profile-page.tsx` — édition
- `src/components/speaker/language-selector.tsx` — multi-select langues/dialectes
- `src/components/speaker/dialect-selector.tsx` — sélection dialectes par langue choisie
- `src/components/speaker/voice-demo-recorder.tsx` — enregistrement 3 phrases de démo
- `src/components/speaker/verification-badge.tsx` — badge "en attente / approuvé / certifié"

### 2.3 Hook + contexte

- `src/hooks/use-speaker-profile.ts` — `{profile, loading, update(), isApproved}`
- Modifier `src/hooks/use-auth.ts` pour exposer le rôle et rediriger correctement.
- `src/contexts/auth-context.tsx` : ajouter `role` et `speakerProfile` au contexte.

### 2.4 Constantes

- `src/lib/languages.ts` — liste des langues supportées avec codes ISO et dialectes connus :
  ```ts
  export const LANGUAGES = {
    wol: { label: 'Wolof', dialects: ['Dakar','Saint-Louis','Thiès','Kaolack'] },
    pul: { label: 'Pulaar', dialects: ['Fouta','Toucouleur','Peul du Sud'] },
    srr: { label: 'Sereer', dialects: ['Sine','Ndut','Saafi','Non'] },
    bam: { label: 'Bambara', dialects: ['Standard','Bamako','Ségou'] },
  }
  ```

### 2.5 Admin validation

- Migration `019_admin_speaker_views.sql` — une vue `pending_speakers` pour faciliter le listing admin.
- Page `/admin/speakers` (admin only) :
  - Liste des locuteurs en attente
  - Bouton "approuver" / "rejeter" avec raison
  - Écoute des 3 phrases de démo

**Livrables Phase 2** :
- [ ] 4 pages locuteur (register, onboarding, profile, pending)
- [ ] Page admin de validation
- [ ] Hook `useSpeakerProfile`
- [ ] Navigation conditionnelle selon le rôle
- [ ] Test : créer un compte, remplir le profil, admin valide, statut passe à `approved`

---

## Phase 3 — Espace locuteur : projets disponibles (flywheel)

**Objectif** : un locuteur approuvé voit la liste des projets publics + ses invitations, peut commencer à enregistrer. C'est LE moteur de collecte publique.

### 3.1 Routes + pages

```
/speaker/dashboard              → SpeakerDashboardPage (accueil, projets dispos, invitations, gains)
/speaker/projects               → SpeakerProjectsPage (catalogue complet projets publics)
/speaker/invitations            → SpeakerInvitationsPage (invitations reçues)
/speaker/record/:sessionId      → SpeakerRecordPage (fork de record-page, auth Supabase)
```

### 3.2 Logique métier

**Matching projet ↔ locuteur** : une fonction PostgreSQL côté DB.

```sql
-- Migration 020_matching_function.sql
CREATE OR REPLACE FUNCTION public.get_available_projects(p_speaker_id UUID)
RETURNS TABLE (
  project_id UUID,
  name TEXT,
  language_label TEXT,
  rate_per_hour_fcfa INT,
  is_public BOOLEAN,
  phrase_count BIGINT,
  match_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.language_label,
    p.rate_per_hour_fcfa,
    p.is_public,
    COUNT(ph.id) AS phrase_count,
    CASE
      WHEN sp.languages && p.required_languages THEN 1.0
      ELSE 0.0
    END AS match_score
  FROM public.projects p
  JOIN public.speaker_profiles sp ON sp.id = p_speaker_id
  LEFT JOIN public.phrases ph ON ph.project_id = p.id
  WHERE p.status = 'active'
    AND (
      -- Projet public : matcher langues requises
      (p.is_public = TRUE AND sp.languages && p.required_languages)
      -- OU invitation acceptée/pending
      OR p.id IN (
        SELECT project_id FROM public.project_invitations
        WHERE speaker_id = p_speaker_id AND status IN ('pending','accepted')
      )
    )
    AND (p.required_gender IS NULL OR p.required_gender = 'any' OR p.required_gender::text = sp.gender)
  GROUP BY p.id, sp.languages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Nouvelle Edge Function `accept-project`

```
POST /functions/v1/accept-project
Body: { project_id: uuid, invitation_id?: uuid }
Auth: Bearer <supabase_access_token>
```

Actions :
1. Vérifier que le locuteur est approuvé.
2. Vérifier qu'il matche les critères (langue, genre, âge).
3. Créer une `recording_session` avec `speaker_id` (et `invitation_id` si privé).
4. Marquer l'invitation comme `accepted` si applicable.
5. Retourner `{ session_id, token }` pour rediriger vers `/speaker/record/:sessionId`.

### 3.4 Fork de record-page

Créer `src/pages/speaker-record-page.tsx` à partir de `record-page.tsx` :
- **Différences** :
  - Auth via `useAuth()` + `useSpeakerProfile()` au lieu de token URL
  - La session est rattachée au `speaker_id` courant
  - Ajouter un bandeau en haut : "Projet X · Rémunération 2000 FCFA/h · Mes gains aujourd'hui : 3500 FCFA"
  - Après chaque recording validé côté serveur Python, un webhook crée automatiquement une `wallet_transaction` (cf. Phase 5)
  - Permettre de quitter et reprendre plus tard (session réutilisable tant que non complétée)

### 3.5 Composants

- `src/components/speaker/project-card-speaker.tsx` — card projet avec rate, langue, nb phrases restantes
- `src/components/speaker/invitation-card.tsx` — card invitation (accepter/décliner)
- `src/components/speaker/earnings-summary.tsx` — mini widget gains (aujourd'hui, semaine, total)
- `src/components/layout/speaker-layout.tsx` — layout spécifique locuteur (sidebar différente)

### 3.6 Hooks

- `src/hooks/use-available-projects.ts` — liste projets matchables
- `src/hooks/use-speaker-invitations.ts` — invitations en cours
- `src/hooks/use-speaker-sessions.ts` — sessions en cours du locuteur

### 3.7 Corpus public Baat-IA

Créer le premier projet public via script SQL :
```sql
INSERT INTO public.projects (
  owner_id,   -- un compte admin Baat-IA
  name,
  description,
  target_language,
  language_label,
  is_public,
  rate_per_hour_fcfa,
  required_languages,
  funding_source,
  status
) VALUES (
  '<admin_uuid>',
  'Corpus Wolof Général — 10 000 heures',
  'Corpus ouvert financé par Lacuna Fund. Dataset publié sous CC-BY-4.0.',
  'wol',
  'Wolof',
  TRUE,
  2000,
  ARRAY['wol'],
  'lacuna',
  'active'
);
```

**Livrables Phase 3** :
- [ ] 4 pages locuteur
- [ ] Edge Function `accept-project`
- [ ] Fork `speaker-record-page.tsx`
- [ ] Sidebar locuteur
- [ ] Projet public "Corpus Wolof" seed
- [ ] Test E2E : Moussa s'inscrit → admin valide → voit "Corpus Wolof" → clique → enregistre → recording visible en DB avec speaker_id

---

## Phase 4 — Recrutement côté client

**Objectif** : le client filtre les locuteurs de la plateforme, les invite en 1 clic, suit leur progression en temps réel.

### 4.1 Pages / onglets

Ajouter à `project-page.tsx` :
- Nouvel onglet **"Locuteurs"** (remplace ou complète "Sessions")
  - Sous-onglet "Invités" : qui a accepté, qui est en cours, qui n'a pas commencé
  - Sous-onglet "Trouver" : recherche de locuteurs

### 4.2 Page de recherche

- `src/components/project/speaker-search.tsx` — panneau de recherche avec filtres :
  - Langue (obligatoire)
  - Dialectes (multi)
  - Genre
  - Fourchette d'âge
  - Ville
  - Score de fiabilité min
  - Certifié uniquement
- Affichage en grille : avatar, nom, langues, score, heures totales, statut dispo.
- Bouton "Inviter" par locuteur → ouvre modal (message personnalisé + rémunération déjà héritée du projet).

### 4.3 Edge Function `invite-speakers`

```
POST /functions/v1/invite-speakers
Body: { project_id: uuid, speaker_ids: uuid[], message: string }
Auth: owner du projet
```

Actions :
1. Vérifier que l'user est owner du projet.
2. Insérer N `project_invitations` (idempotent via UNIQUE).
3. Trigger notifications (email + SMS via Twilio — cf. 4.5).
4. Retourner `{ invited: N, skipped: M }`.

### 4.4 Suivi temps réel (Use Case 6)

- `src/components/project/speakers-progress.tsx` :
  - Tableau : nom, % phrases enregistrées, phrases validées, taux rejet, dernière activité
  - Realtime via `useRealtimeRecordings(projectId)` déjà existant
  - Bouton "Relancer" → envoie SMS de rappel
  - Bouton "Inviter plus de locuteurs"

### 4.5 Notifications

Edge Function `send-invitation-notification` (interne, appelée par `invite-speakers`) :
- Email via Resend ou SendGrid (selon le choix déjà fait)
- SMS via Twilio ou Orange API
- Template FR : "Bonjour {name}, {client} vous invite sur le projet '{project}'. Rémunération : {rate} FCFA/h. Accepter : {link}"

Stocker les secrets dans Supabase Vault, pas en dur.

**Livrables Phase 4** :
- [ ] Onglet "Locuteurs" sur project-page
- [ ] Recherche avec filtres
- [ ] Edge Function `invite-speakers`
- [ ] Notifications email + SMS
- [ ] Suivi temps réel (tableau progression par locuteur)
- [ ] Test : Orange crée un projet Wolof → filtre Dakar femme 25-45 → invite 10 locuteurs → les locuteurs reçoivent un SMS → acceptent → enregistrent → Orange voit leur progression

---

## Phase 5 — Portefeuille + paiements

**Objectif** : les gains s'accumulent automatiquement à chaque recording validé, le locuteur peut demander un retrait.

### 5.1 Calcul automatique des gains

Déclencheur : le serveur Python met à jour `recordings.is_valid = true` et `duration_seconds`.

Ajouter un trigger Postgres `on_recording_validated` :
```sql
-- Migration 021_wallet_credit_trigger.sql
CREATE OR REPLACE FUNCTION public.credit_speaker_on_validation()
RETURNS TRIGGER AS $$
DECLARE
  v_speaker_id UUID;
  v_rate INT;
  v_amount INT;
BEGIN
  IF NEW.is_valid = TRUE AND (OLD.is_valid IS NULL OR OLD.is_valid = FALSE) THEN
    SELECT rs.speaker_id, p.rate_per_hour_fcfa
      INTO v_speaker_id, v_rate
      FROM public.recording_sessions rs
      JOIN public.projects p ON p.id = rs.project_id
      WHERE rs.id = NEW.session_id;

    IF v_speaker_id IS NOT NULL AND v_rate > 0 AND NEW.duration_seconds IS NOT NULL THEN
      v_amount := ROUND((NEW.duration_seconds / 3600.0) * v_rate);
      IF v_amount > 0 THEN
        INSERT INTO public.wallet_transactions (
          speaker_id, amount_fcfa, type, status,
          reference_table, reference_id, description
        ) VALUES (
          v_speaker_id, v_amount, 'recording_validated', 'confirmed',
          'recordings', NEW.id,
          'Recording validé (' || ROUND(NEW.duration_seconds)::text || 's)'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_recording_validated
  AFTER UPDATE OF is_valid ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.credit_speaker_on_validation();
```

### 5.2 Pages locuteur

- `/speaker/wallet` → SpeakerWalletPage
  - Solde actuel (gros chiffre animé count-up)
  - Historique transactions (paginated)
  - Bouton "Demander un retrait"
- `/speaker/wallet/withdraw` → WithdrawRequestPage
  - Montant (min 5000 FCFA)
  - Méthode (Wave, Orange Money, Free Money)
  - Numéro de téléphone

### 5.3 Edge Function `request-withdrawal`

```
POST /functions/v1/request-withdrawal
Body: { amount_fcfa, method, destination }
Auth: speaker
```

Actions :
1. Vérifier solde >= montant.
2. Créer entrée `withdrawals` (status pending).
3. Créer `wallet_transaction` négative (`withdrawal_request`, status confirmed — débite immédiatement le solde).
4. Notifier admin.

### 5.4 Admin

Page `/admin/withdrawals` :
- Liste demandes en attente
- Bouton "Marquer payé" (avec référence transaction externe) → insère `withdrawal_paid` (trace, pas de delta car déjà débité)
- Bouton "Rejeter" → crée `withdrawal_refund` (rétablit le solde)

**Attention** : l'intégration directe avec Wave/Orange Money API est hors scope V1 — paiement manuel par l'admin au début, puis automatisation plus tard.

**Livrables Phase 5** :
- [ ] Trigger de crédit automatique
- [ ] Page wallet locuteur
- [ ] Page demande retrait
- [ ] Page admin retraits
- [ ] Test : recording validé → gains ajoutés → locuteur demande retrait → admin approuve → paie manuellement → marque payé

---

## Phase 6 — Validation croisée

**Objectif** : un locuteur qui a épuisé son quota peut gagner de l'argent en validant les recordings des autres.

### 6.1 Migration `022_peer_validations.sql`

```sql
CREATE TABLE public.peer_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES public.speaker_profiles(id),
  vote BOOLEAN NOT NULL,              -- TRUE = phrase bien lue
  confidence TEXT CHECK (confidence IN ('certain','unsure')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (recording_id, validator_id)
);

-- Un validateur ne peut pas valider ses propres recordings
CREATE OR REPLACE FUNCTION public.prevent_self_validation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.recordings r
    JOIN public.recording_sessions rs ON rs.id = r.session_id
    WHERE r.id = NEW.recording_id AND rs.speaker_id = NEW.validator_id
  ) THEN
    RAISE EXCEPTION 'Cannot validate own recording';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_self_validation
  BEFORE INSERT ON public.peer_validations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_validation();
```

### 6.2 Page `/speaker/validate`

Interface de validation simplifiée :
- Affiche une phrase attendue
- Joue l'audio (lecteur audio custom)
- 2 gros boutons : "Bien lu" / "Mal lu"
- Option "Pas sûr" (compte pour la moitié)
- Stat : "Vous avez validé 12 segments aujourd'hui — 300 FCFA gagnés"

### 6.3 Edge Function `submit-validation`

- Insert `peer_validations`.
- Si 3 validateurs ont voté et le vote est unanime → override `recordings.is_valid`.
- Rémunération : `wallet_transaction` de +10 FCFA par validation (config globale).

### 6.4 Algorithme de sélection des recordings à valider

- Prioriser les recordings où `is_valid = NULL` après QC auto.
- Répartir : 3 validateurs différents par recording.
- Exclure les validateurs avec `reliability_score < 0.7`.

**Livrables Phase 6** :
- [ ] Table + trigger
- [ ] Page validation
- [ ] Edge Function `submit-validation`
- [ ] Logique de consensus (3 votes → override)
- [ ] Rémunération automatique

---

## Phase 7 — Experts + certification

**Objectif** : créer un marché premium avec les meilleurs locuteurs.

### 7.1 Calcul du reliability_score

Job périodique (pg_cron ou Edge Function CRON) :
```
reliability_score = (validated / total) * 0.7
                  + (peer_agreement_rate) * 0.3
                  - (0.1 * rejected_with_cause)
```

### 7.2 Test de certification

- Page `/speaker/certification` :
  - 10 phrases de référence curées par un linguiste
  - Enregistrement obligatoire
  - Envoi pour évaluation manuelle admin

### 7.3 Admin

Page `/admin/certifications` :
- Liste demandes en attente
- Écoute + formulaire d'évaluation
- Bouton "Certifier" → `is_certified = TRUE`, `certified_at = now()`

### 7.4 Badge + filtre client

- Ajouter `is_certified = true` comme filtre dans la recherche client (Phase 4)
- Badge "Locuteur certifié" dans les cards
- Taux horaire potentiellement majoré pour les certifiés (config au projet)

---

## Ce qui reste intact (compat rétro)

- L'ancienne `record-page.tsx` avec token URL reste fonctionnelle
- Les liens WhatsApp déjà envoyés continuent de marcher
- Les projets existants n'ont pas `is_public = true` par défaut, donc pas de changement
- Les Edge Functions `get-session` et `submit-recording` sont conservées pour les tokens anonymes
- Les hooks existants (`useProject`, `useRealtimeRecordings`) sont étendus, pas cassés

---

## Décisions techniques à valider avant de démarrer

1. **SMS provider** : Twilio (global, cher) ou Orange API (local, moins cher) ? Twilio d'abord pour prototyper.
2. **Email provider** : Resend (moderne) vs SendGrid ? **Resend** recommandé.
3. **Paiement V1 manuel** : l'admin paie à la main via Wave/OM, puis marque `paid`. Automatisation API Wave/OM en V2.
4. **Wallet balance cohérence** : source de vérité = `wallet_transactions` (append-only) + colonne cache `wallet_balance_fcfa` maintenue par trigger. Permet audit et reconstruction.
5. **Seuil retrait min** : 5000 FCFA (limite les frais de transaction).
6. **Démo vocale onboarding** : stockée dans `audio-raw` sous `demo/{speaker_id}/phrase_{n}.webm`.
7. **Domaine d'URL** : `/speaker/*` vs `/s/*` — `/speaker/*` plus explicite.

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Fraude (locuteurs qui enregistrent sans lire) | QC automatique déjà en place + validation croisée (Phase 6) |
| Collusion validateurs ↔ enregistreurs | Algo de sélection exclut les sessions liées, anonymise les recordings |
| Abus retraits (enregistrements bidons) | Délai 7 jours avant éligibilité au retrait + score fiabilité min |
| Locuteurs fantômes (inscription sans profil complet) | Statut `verification_status = pending` tant que démo non validée |
| Charge sur le serveur Python (multiplication des recordings) | Déjà limité par débit des locuteurs humains — pas d'explosion brutale |
| Conflit RLS projets publics/privés | Tests RLS dédiés avec plusieurs rôles simulés avant deploy |

---

## Estimation d'effort (ordre de grandeur)

| Phase | Effort | Livrable démontrable |
|-------|--------|----------------------|
| 1 | 2 jours | Migrations + types, DB prête |
| 2 | 4 jours | Inscription locuteur fonctionnelle |
| 3 | 5 jours | Flywheel public démarrable |
| 4 | 5 jours | Client peut recruter via filtres |
| 5 | 3 jours | Wallet + retrait manuel |
| 6 | 4 jours | Validation croisée |
| 7 | 3 jours | Certification + filtre expert |
| **Total** | **~26 jours** | Système complet |

---

## Prochaine étape

Si le plan est validé, on commence **Phase 1.1** : écriture des migrations `017` et `018`, mise à jour des types TS, puis `npx supabase db push` en local pour vérifier.
