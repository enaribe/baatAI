# CLAUDE-SPEAKER.md — Guide d'implémentation du système comptes locuteurs

> Ce fichier complète `CLAUDE.md` à la racine. Il couvre la partie **marketplace de voix** : comptes locuteurs, invitations, portefeuille, validation croisée, certification.
> Lire `CLAUDE.md` d'abord pour la stack, le design system, et les conventions générales.
> Plan d'implémentation détaillé dans `docs/IMPLEMENTATION-PLAN-SPEAKER-ACCOUNTS.md`.

---

## Vue d'ensemble

Baat-IA a deux "mondes" qui coexistent :

1. **Monde "token anonyme"** (historique) : le client envoie un lien WhatsApp → locuteur anonyme enregistre. Routes : `/record/:token`. Aucun compte. Compatibilité rétro **obligatoire** — on ne casse pas les liens existants.

2. **Monde "compte locuteur"** (nouveau) : le locuteur s'inscrit, a un profil, reçoit des invitations, enregistre sur des projets publics/privés, gagne de l'argent. Routes : `/speaker/*`.

Les deux mondes partagent les mêmes tables `recordings`, `recording_sessions`, `phrases`, `projects`, `exports`. La différence se fait sur :
- `recording_sessions.speaker_id` : NULL = token anonyme, UUID = compte locuteur
- `projects.is_public` : TRUE = visible par tous les locuteurs approuvés
- `projects.rate_per_hour_fcfa` : rémunération (0 = bénévole, >0 = payé)

---

## Règles d'or

### Ne JAMAIS

- Casser la route `/record/:token` ni les Edge Functions `get-session`/`submit-recording` (compat rétro).
- Exposer `wallet_balance_fcfa`, `total_earned_fcfa`, `phone`, `date_of_birth` d'un locuteur à un autre utilisateur que lui-même ou un admin. Les RLS doivent le garantir, mais vérifier aussi côté app (select explicite des colonnes).
- Recalculer un solde portefeuille côté client — la source de vérité est la somme de `wallet_transactions`, maintenue par le trigger DB.
- Créditer un `wallet_transaction` depuis le frontend — uniquement via Edge Function avec service_role ou trigger Postgres.
- Laisser un locuteur valider ses propres recordings (trigger DB `prevent_self_validation` en place).
- Mettre à jour `speaker_profiles.is_certified = true` sans passer par l'admin.

### Toujours

- Ajouter `speaker_id` nullable dans les nouveaux liens pour préserver le flux token anonyme.
- Quand on ajoute une colonne sensible à `speaker_profiles`, ajouter la protection RLS correspondante dans la même migration.
- Quand on crée une Edge Function qui touche au wallet ou aux recordings, **valider l'auth en premier**, **vérifier les droits ensuite**, **puis seulement** muter.
- Utiliser `reliability_score` comme garde-fou : actions premium (validation croisée, projets certifiés) réservées aux `>= 0.7`.
- Convertir les durées en FCFA avec `ROUND((duration_seconds / 3600.0) * rate)` — entier toujours, pas de float dans les wallet_transactions.
- Chaque migration qui touche `wallet_transactions` doit préserver l'invariant : `wallet_balance = SUM(amount_fcfa WHERE status = 'confirmed')`.

---

## Rôles et navigation

### UserRole = 'client' | 'admin' | 'speaker'

Le rôle est dans `profiles.role`. Le `AuthContext` l'expose. La redirection après login dépend du rôle :

```
client   → /dashboard
speaker  → /speaker/dashboard  (ou /speaker/pending si verification_status != 'approved')
admin    → /admin
```

Un speaker **n'a pas accès** à `/dashboard`, `/project/*`, `/project/new`.
Un client **n'a pas accès** à `/speaker/*` (sauf `/speaker/register` pour se convertir — non supporté V1).

Implémentation : étendre `protected-route.tsx` pour accepter `allowedRoles: UserRole[]`.

---

## Structure de fichiers spécifique

```
src/
├── pages/
│   ├── record-page.tsx                    # ⚠️ HISTORIQUE — ne pas supprimer, route /record/:token
│   ├── speaker-record-page.tsx            # NOUVEAU — route /speaker/record/:sessionId
│   ├── speaker-register-page.tsx
│   ├── speaker-onboarding-page.tsx
│   ├── speaker-dashboard-page.tsx
│   ├── speaker-projects-page.tsx
│   ├── speaker-invitations-page.tsx
│   ├── speaker-wallet-page.tsx
│   ├── speaker-validate-page.tsx
│   ├── speaker-profile-page.tsx
│   ├── speaker-pending-page.tsx
│   ├── admin-speakers-page.tsx
│   ├── admin-withdrawals-page.tsx
│   └── admin-certifications-page.tsx
├── components/
│   ├── speaker/
│   │   ├── language-selector.tsx
│   │   ├── dialect-selector.tsx
│   │   ├── voice-demo-recorder.tsx
│   │   ├── project-card-speaker.tsx
│   │   ├── invitation-card.tsx
│   │   ├── earnings-summary.tsx
│   │   ├── verification-badge.tsx
│   │   └── withdrawal-form.tsx
│   ├── project/
│   │   ├── speaker-search.tsx             # Filtres pour client (Use Case 1)
│   │   ├── speakers-progress.tsx          # Suivi temps réel (Use Case 6)
│   │   └── invite-speakers-modal.tsx
│   └── layout/
│       └── speaker-layout.tsx             # Sidebar dédiée locuteur
├── hooks/
│   ├── use-speaker-profile.ts
│   ├── use-available-projects.ts
│   ├── use-speaker-invitations.ts
│   ├── use-speaker-sessions.ts
│   ├── use-wallet.ts
│   └── use-peer-validation.ts
└── lib/
    └── languages.ts                       # Langues + dialectes supportés
```

---

## Modèle de données — aide-mémoire

### speaker_profiles (1-1 avec profiles)
- Source de vérité pour le profil locuteur (différent de `profiles` qui est générique).
- `verification_status` : `pending` → `approved` (admin valide la démo vocale) ou `rejected`.
- `reliability_score` : recalculé périodiquement, jamais modifié directement depuis l'app.
- `wallet_balance_fcfa` : cache maintenu par trigger. Ne pas modifier à la main.

### project_invitations
- Clé unique `(project_id, speaker_id)` — pas de doublon.
- Expire après 14 jours si non-répondue → statut `expired`.
- Un client voit ses invitations envoyées ; un locuteur voit celles qu'il a reçues.

### wallet_transactions (append-only)
- On n'UPDATE JAMAIS une transaction confirmée.
- Pour annuler, on insère une transaction inverse.
- `status = 'confirmed'` déclenche le trigger de mise à jour du solde.
- Types à utiliser :
  - `recording_validated` : crédit auto quand `recordings.is_valid` passe à TRUE
  - `validation_reward` : crédit pour validation croisée
  - `bonus` : ajustement admin
  - `withdrawal_request` : débit immédiat quand le locuteur demande
  - `withdrawal_paid` : marque (montant 0 ou trace) quand admin paie
  - `withdrawal_refund` : crédit si paiement échoué

### withdrawals
- Workflow : `pending` → `approved` → `paid` (admin manuel) ou `rejected` / `failed`.
- V1 : le paiement est fait à la main par l'admin via Wave/OM hors plateforme.

### peer_validations
- Unique `(recording_id, validator_id)` — un validateur ne vote qu'une fois par recording.
- Trigger DB empêche de voter sur ses propres recordings.
- Consensus : 3 votes unanimes → override `recordings.is_valid`.

---

## Edge Functions à créer

Toutes les Edge Functions liées aux comptes locuteurs :

| Function | Auth | Action |
|----------|------|--------|
| `accept-project` | speaker | Créer une session rattachée au speaker + marquer invitation acceptée |
| `invite-speakers` | client (owner projet) | Insérer N invitations + envoyer notifications |
| `request-withdrawal` | speaker | Créer withdrawal + débiter wallet |
| `submit-validation` | speaker | Enregistrer un vote peer + créditer |
| `approve-speaker` | admin | Passer verification_status à approved |
| `send-invitation-notification` | interne | Envoyer email + SMS |

**Pattern type Edge Function** (à respecter pour toutes) :
```ts
serve(async (req) => {
  try {
    // 1. CORS
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    // 2. Auth : récupérer user depuis le JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)
    const supabase = createClient(url, serviceKey, { global: { headers: { Authorization: authHeader }}})
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // 3. Autorisation : vérifier le rôle / la propriété
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'speaker') return json({ error: 'Forbidden' }, 403)

    // 4. Validation du body
    const body = await req.json()
    // ... validate schema

    // 5. Mutation avec service_role si besoin (ex: wallet_transactions)
    const admin = createClient(url, serviceKey)
    // ... insert / update

    return json({ data: result, error: null })
  } catch (e) {
    console.error(e)
    return json({ data: null, error: e.message }, 500)
  }
})
```

---

## Design système — spécificités locuteur

Hérite du design system principal. Spécificités :

### Layout locuteur
- Sidebar différente (plus courte) : Accueil, Projets dispos, Invitations, Mes gains, Validation, Profil.
- Badge verification_status en haut de sidebar.
- En mobile (priorité !) : bottom nav avec 4 items max + un bouton central "Enregistrer".

### Éléments signature
- **Carte projet locuteur** : rate mis en avant (gros chiffre orange), durée estimée, langue/dialecte en badge.
- **Widget gains** : count-up animé, différenciation claire entre "disponible" (retirable) et "en validation" (pas encore confirmé).
- **Page validation** : interface ultra-simplifiée. Pas de sidebar. Juste phrase + audio + 2 boutons. Optimisée mobile.
- **Badge certifié** : accent indigo + pictogramme couronne subtil.

### Couleurs fonctionnelles
- **Gains validés** : vert (secondaire)
- **Gains en attente** : ambre (warning)
- **Invitation pending** : indigo (accent)
- **Invitation expirée** : gris neutre

---

## Conventions code spécifiques

### Hooks locuteur
- Préfixe `useSpeaker*` pour tout hook accédant à des données privées locuteur.
- Les hooks réutilisés entre client et locuteur (ex: `useProject`) gardent leur nom mais DOIVENT respecter les RLS (le useProject existant ne doit pas casser pour un speaker qui consulte un projet auquel il a accès).

### Typage
- Pas de `any` sur les nouvelles interfaces.
- Enums SQL → unions TS (cf. `UserRole`, `Gender`).
- `wallet_balance_fcfa` et autres montants : `number` (entier), jamais `float`.

### Gestion d'erreur utilisateur
- Erreurs paiement/wallet : afficher un toast `error` + logger côté serveur. Ne jamais laisser l'utilisateur dans un état ambigu sur son solde.
- Erreur de matching (locuteur non éligible à un projet) : message clair "Ce projet nécessite : Wolof dialecte Dakar, femme 25-45 ans. Votre profil : …"
- Erreur d'invitation expirée : proposer de contacter le client.

### Texte & i18n
- Tout en français dans l'UI.
- Les labels de langue passent par `src/lib/languages.ts` (avec code ISO 639-3).
- Les montants : format `2 000 FCFA` (espace insécable, pas de virgule).

---

## Flux critiques (pas-à-pas)

### Inscription locuteur
1. `/speaker/register` → Supabase auth.signUp avec `role: 'speaker'` en user_metadata
2. Trigger `on_auth_user_created` crée `profiles`
3. Redirection → `/speaker/onboarding`
4. Wizard en 4 étapes crée `speaker_profiles` (INSERT côté client via RLS `Speaker inserts own profile`)
5. Upload 3 démos vocales vers `audio-raw/demo/{speaker_id}/`
6. Soumission → `verification_status = 'pending'`
7. Redirection → `/speaker/pending`
8. Admin valide → `verification_status = 'approved'` → locuteur reçoit email → peut accéder au dashboard

### Enregistrement sur projet public (flywheel)
1. Locuteur approuvé ouvre `/speaker/dashboard`
2. Hook `useAvailableProjects` appelle RPC `get_available_projects(auth.uid())`
3. Clique "Corpus Wolof 10 000h"
4. Edge Function `accept-project` crée `recording_sessions` avec `speaker_id = auth.uid()`, `project_id = X`
5. Redirection `/speaker/record/:sessionId`
6. `speaker-record-page` charge phrases, enregistre, upload TUS (flux identique à `record-page` existant)
7. Webhook Postgres → serveur Python traite
8. Python UPDATE `recordings.is_valid = TRUE` + `duration_seconds`
9. Trigger `on_recording_validated` insère `wallet_transactions` avec le montant
10. Trigger `wallet_balance_update` met à jour le cache solde
11. Locuteur voit ses gains en Realtime

### Client invite des locuteurs
1. Client sur `/project/:id` → onglet "Locuteurs" → sous-onglet "Trouver"
2. Filtres : langue, dialecte, genre, âge → requête sur `speaker_profiles` (RLS filtre auto à approved)
3. Sélection multi + bouton "Inviter"
4. Modal : message personnalisé + rappel rémunération
5. Edge Function `invite-speakers` :
   - INSERT N `project_invitations`
   - Trigger notifications (email + SMS)
6. Locuteurs voient invitation dans `/speaker/invitations`
7. Acceptation → Edge Function `accept-project` (avec `invitation_id`)

### Retrait
1. Locuteur sur `/speaker/wallet` → "Demander un retrait"
2. Form : montant, méthode, numéro
3. Edge Function `request-withdrawal` :
   - Vérifie `wallet_balance_fcfa >= amount`
   - INSERT `withdrawals` (pending)
   - INSERT `wallet_transactions` de type `withdrawal_request` avec `amount = -montant` (débite immédiatement)
4. Admin sur `/admin/withdrawals` voit la demande
5. Admin paie hors plateforme (Wave/OM) → marque "payé" avec référence
6. Edge Function `confirm-withdrawal-paid` : UPDATE `withdrawals.status = 'paid'` + INSERT trace `withdrawal_paid`

### Validation croisée
1. Locuteur sur `/speaker/validate`
2. RPC `get_next_recording_to_validate(speaker_id)` retourne un recording où :
   - `validator_id != recording.speaker_id`
   - Pas déjà validé par lui
   - `is_valid IS NULL` ou < 3 votes
3. Locuteur écoute, vote
4. Edge Function `submit-validation` :
   - INSERT `peer_validations`
   - INSERT `wallet_transactions` +10 FCFA
   - Si 3 votes unanimes → UPDATE `recordings.is_valid` en conséquence

---

## Tests à prévoir

### RLS (critique)
- Speaker A ne peut PAS lire le profil speaker B (sauf colonnes publiques via RLS client).
- Client ne peut PAS lire `wallet_balance` d'un speaker.
- Speaker ne peut PAS lire un projet privé où il n'est pas invité.
- Speaker ne peut PAS INSERT dans `wallet_transactions`.
- Admin peut tout lire et modifier.

### Flux
- Inscription → onboarding → pending → approval → dashboard
- Invitation → acceptation → enregistrement → gains crédités
- Retrait → balance décrémentée → admin paie → statut paid
- Validation croisée → 3 votes unanimes → is_valid mis à jour

### Compat rétro
- Route `/record/:token` fonctionne toujours avec les tokens existants.
- Un recording avec `speaker_id = NULL` n'essaie pas de créditer un wallet (trigger `credit_speaker_on_validation` skip si NULL).

---

## Checklist avant merge d'une phase

Avant de merger une phase, vérifier :

- [ ] Migrations SQL exécutables en local via `npx supabase db push`
- [ ] Types TS à jour dans `src/types/database.ts`
- [ ] RLS testé pour chaque rôle (`client`, `admin`, `speaker`)
- [ ] `npm run build` passe sans erreur
- [ ] `npm run lint` passe
- [ ] Dev server lancé (`npm run dev`), flux testé en browser manuellement
- [ ] Mobile responsive (Samsung A14 en priorité)
- [ ] Aucun secret en dur dans le code
- [ ] Les Edge Functions gèrent 401 / 403 / 500 proprement
- [ ] Compat rétro : l'ancien flux `/record/:token` fonctionne toujours
- [ ] Aucune mutation du wallet depuis le client (tout passe par Edge Function ou trigger)

---

## Références externes

- **Corpus publics HuggingFace** : https://huggingface.co/datasets (pour diffuser les datasets publics CC-BY-4.0)
- **Wave API** (V2) : https://docs.wave.com
- **Orange Money API** (V2) : https://developer.orange.com
- **Twilio SMS** : https://www.twilio.com/docs/sms
- **Resend email** : https://resend.com/docs
