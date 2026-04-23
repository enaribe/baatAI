# Checklist de tests — Daandé

> Plan de test exhaustif avant lancement beta. Tester dans l'ordre : les flows critiques (auth, paiement, enregistrement) en priorité.
> Légende : ✅ OK · ❌ KO · ⚠️ Comportement à valider

---

## 0. Prérequis & environnement de test

- [ ] Compte client de test créé (`client.test@daande.com`)
- [ ] Compte locuteur de test 1 (`speaker1.test@daande.com`) — Wolof
- [ ] Compte locuteur de test 2 (`speaker2.test@daande.com`) — Pulaar
- [ ] Compte admin (`admin@daande.com`)
- [ ] Téléphone Android (Samsung A14 ou équivalent) avec Chrome → réseau 3G simulé
- [ ] Téléphone iPhone (Safari) → vérifier compat micro
- [ ] Desktop : Chrome + Firefox + Safari
- [ ] Discord webhook actif (vérifier alertes en fin de session)
- [ ] Python service Railway healthy (`/healthcheck` retourne `hmac_secret_set=True`)
- [ ] Tunnel internet stable + un test sur 4G dégradé

---

## 1. Authentification & inscription

### 1.1 Page /login
- [ ] Affichage correct desktop + mobile
- [ ] Toggle theme (dark/light) fonctionne et persiste
- [ ] Login avec mauvais email → message "Email ou mot de passe incorrect"
- [ ] Login avec mauvais mot de passe → même message (pas de leak d'existence email)
- [ ] Login client → redirection `/dashboard`
- [ ] Login locuteur → redirection `/speaker/dashboard`
- [ ] Login admin → redirection `/admin/withdrawals`
- [ ] Bouton "Mot de passe oublié" affiche bien quelque chose (à confirmer si stub ou fonctionnel)
- [ ] Lien "Créer un compte" → `/register`
- [ ] Saisie clavier : Tab navigation correcte, Enter soumet le formulaire
- [ ] Refresh de la page après login → reste connecté

### 1.2 Page /register (choix client/locuteur)
- [ ] Deux options visuelles claires : Client / Locuteur
- [ ] Choix "Client" → formulaire inscription client (email, mdp 8+, nom, organisation)
- [ ] Choix "Locuteur" → redirection `/speaker/register`
- [ ] Client : email déjà utilisé → erreur explicite
- [ ] Client : mot de passe < 8 caractères → erreur de validation
- [ ] Création client réussie → email confirmation envoyé
- [ ] Confirmation email → connexion auto + redirection `/dashboard`

### 1.3 Inscription locuteur (5 étapes)
- [ ] Étape 1 (Compte) : email + mdp + téléphone + adresse
- [ ] Étape 2 (Identité) : genre, date naissance, ville
- [ ] Étape 3 (Langues) : peut sélectionner 1+ langues, dialectes optionnels par langue
- [ ] Étape 4 (Bio) : 400 caractères max, compteur visible
- [ ] Étape 5 (Récap) : tous les champs affichés
- [ ] Bouton "Précédent" garde les valeurs saisies
- [ ] Erreur si aucune langue choisie
- [ ] Inscription réussie → email confirmation
- [ ] **Bug historique à revérifier** : après inscription, redirection vers espace client au lieu de speaker
- [ ] Confirmation email → redirection `/speaker/onboarding`

### 1.4 Onboarding locuteur
- [ ] Demande permission micro → enregistrement échantillon 10-30s
- [ ] Refus micro → message d'erreur clair + possibilité réessayer
- [ ] Réenregistrer un sample (replace) fonctionne
- [ ] Submit final → `/speaker/dashboard`

### 1.5 Logout
- [ ] Bouton logout dans sidebar/menu visible
- [ ] Logout → redirection `/`
- [ ] Tentative d'accès `/dashboard` après logout → redirect `/login`
- [ ] Token JWT invalidé (impossible de réutiliser)

### 1.6 Suppression compte locuteur
- [ ] Page `/account` accessible
- [ ] Modal s'ouvre depuis "Zone dangereuse"
- [ ] Modal mobile : bottom sheet (`items-end`), rounded-t-2xl
- [ ] Modal desktop : centré, max 28rem
- [ ] Champ confirmation "SUPPRIMER" en majuscules requis
- [ ] Bouton désactivé tant que confirmation incomplète
- [ ] Mot de passe incorrect → "Mot de passe incorrect"
- [ ] Avec retrait pending → bloqué avec message explicite
- [ ] Suppression OK → toast "Données anonymisées" + logout + redirect /login
- [ ] **Vérifier en DB** : `speaker_profiles.full_name` devient anonyme, recordings conservés mais speaker_name nullé

### 1.7 Suppression compte client
- [ ] Avec projet actif → bloqué "Archivez vos projets actifs"
- [ ] Tous projets archivés → suppression OK
- [ ] Suppression cascade : projects, phrases, recordings, invitations bien supprimés
- [ ] Logout + redirect /login

---

## 2. Espace CLIENT

### 2.1 Dashboard `/dashboard`
- [ ] Affichage stats globales (projets, phrases, recordings, %valid)
- [ ] Compteurs corrects (vérifier en DB)
- [ ] Tabs all / active / archived filtrent correctement
- [ ] Recherche par nom de projet fonctionne (case-insensitive)
- [ ] Toggle Grid/List → état persisté en localStorage
- [ ] Cards projet : nom, langue, status, progress, nb recordings
- [ ] Click card → `/project/:id`
- [ ] Bouton "Créer projet" → `/project/new`
- [ ] État vide : empty state avec CTA création
- [ ] Mobile : layout responsive (card 1 col)

### 2.2 Création projet `/project/new`
**Étape 1 — Infos**
- [ ] Champs : nom (requis), description, langue (dropdown 4+ langues), usage_type (radio ASR/TTS/both), tarif FCFA
- [ ] Tarif minimum 2000 FCFA → erreur si en dessous
- [ ] Toggle "Volontaire" (rate=0) supprime le minimum
- [ ] Toggle "Public" pour matching automatique
- [ ] Bouton suivant désactivé si champs requis vides

**Étape 2 — Phrases**
- [ ] Upload .txt → parse correct (1 phrase par ligne)
- [ ] Upload .pdf → parse correct
- [ ] Upload .docx → parse correct
- [ ] Saisie manuelle textarea → split par newline
- [ ] Fichier > 10 MB → rejeté avec message
- [ ] MIME invalide (.exe, .zip) → rejeté
- [ ] Preview affiche les N premières phrases parsées
- [ ] Compteur nb phrases visible
- [ ] 0 phrase parsée → erreur

**Étape 3 — Récap**
- [ ] Tous les champs récapitulés
- [ ] Bouton "Créer" → INSERT projects + phrases batch
- [ ] Loading state visible pendant création
- [ ] Erreur réseau → message + possibilité réessayer
- [ ] Création OK → redirect `/project/:id`

### 2.3 Page projet — Tab Phrases
- [ ] Liste paginée si > 50 phrases
- [ ] Recherche dans phrases
- [ ] Édition inline d'une phrase → UPDATE
- [ ] Suppression phrase → DELETE (soft ou hard ?)
- [ ] Ajout phrase manuel
- [ ] Export CSV téléchargeable
- [ ] Statut par phrase : recorded count

### 2.4 Page projet — Tab Sessions
- [ ] Liste sessions avec speaker_name, total_recorded, status
- [ ] Click session → détail
- [ ] Filtres status (active/completed)
- [ ] Affichage anonyme correct si session token-based

### 2.5 Page projet — Tab Recordings
- [ ] Liste avec QC metrics (SNR, clipping %, silence ratio)
- [ ] Filtres : valid / invalid / pending
- [ ] Audio player intégré (lecture WAV processed)
- [ ] **Realtime** : INSERT d'un nouveau recording → apparaît live sans refresh
- [ ] **Realtime** : UPDATE QC (processing → completed) → badge change live
- [ ] Recordings rejetés affichent rejection_reasons[]
- [ ] Téléchargement audio individuel

### 2.6 Page projet — Tab Recruitment / Discover
- [ ] Affichage cartes locuteurs avec match score
- [ ] Filtres : recherche nom/ville, gender, certified only
- [ ] Voice sample player fonctionne (signed URL bucket)
- [ ] Badge "Certifié" visible si applicable
- [ ] Click "Inviter" → POST /invite-speaker → toast success
- [ ] Sélection multiple (checkboxes) → BulkActionBar apparaît
- [ ] Bulk send → InviteDrawer avec message optionnel
- [ ] Bulk send 3 locuteurs → 3 invitations créées en DB
- [ ] Locuteur déjà invité → désactivé/non sélectionnable
- [ ] Locuteur sans langue compatible → exclu de la liste
- [ ] Compteur "X trouvés" exact

### 2.7 Page projet — Tab Recruitment / Sent
- [ ] Liste invitations triées par date
- [ ] Filtres status : all / pending / accepted / declined / cancelled
- [ ] Compteurs par status corrects
- [ ] Status pending : badge orange + animation pulse
- [ ] Action "Relancer" : envoyée 1x → cooldown 7 jours visible "Déjà relancé"
- [ ] Action "Annuler" : invitation passe à cancelled
- [ ] Annulation crée notification côté speaker
- [ ] Date d'expiration affichée (relativeTime)

### 2.8 Page projet — Tab Recruitment / Team
- [ ] Liste speakers ayant accepté
- [ ] Stats par speaker : sessions, recordings, validés
- [ ] Click → `/speakers/:id`

### 2.9 Page projet — Tab Exports
- [ ] Modal "Nouveau export" → choix format (LJSpeech, HF, CSV+WAV)
- [ ] Filtre min_snr_db optionnel
- [ ] Création export → status pending → generating → ready
- [ ] Webhook Python correctement déclenché (vérifier logs Railway)
- [ ] Bouton download .zip une fois ready
- [ ] Statut failed affiche message d'erreur

### 2.10 Page projet — Tab Settings
- [ ] Modification nom + description
- [ ] Changement statut (draft → active → archived)
- [ ] Suppression projet : modal de confirmation
- [ ] Suppression cascade : phrases, sessions, recordings supprimés
- [ ] Redirect dashboard après suppression

### 2.11 Validation peer (`/speaker/validate`)
- [ ] Liste recordings à valider (pas les siens, reliability ≥ 0.5)
- [ ] Lecture audio + affichage phrase
- [ ] Vote OK/KO + confidence (certain/unsure)
- [ ] Submit → +10 FCFA wallet
- [ ] Recording déjà voté → désactivé
- [ ] Self-validation → erreur "Cannot validate own recording"
- [ ] Reliability < 0.5 → page bloquée avec message
- [ ] Rate limit 100/h → erreur après 100 votes

---

## 3. Espace LOCUTEUR

### 3.1 Dashboard speaker `/speaker/dashboard`
- [ ] Stats : invitations pending count, recordings récents, gain total, balance wallet
- [ ] Quick actions visibles
- [ ] Cards : design dark-locked respecté
- [ ] Mobile : bottom nav fonctionne, header visible

### 3.2 Liste invitations `/speaker/invitations`
- [ ] Tabs : Toutes / En attente / Acceptées / Terminées
- [ ] Compteur "En attente N" badge
- [ ] Tri par date (récent en premier)
- [ ] Status icon par invitation
- [ ] Tarif affiché en FCFA/h
- [ ] Badge "Expire dans X jours" si <= 3 jours
- [ ] Click row → `/speaker/invitations/:id`
- [ ] Empty state si aucune invitation

### 3.3 Détail invitation `/speaker/invitations/:id`
- [ ] Affichage projet, langue, tarif, durée estimée, message client
- [ ] Code court "INV-XXXX" affiché
- [ ] Alerte "Expire bientôt" si <= 3 jours
- [ ] Alerte "Expirée" si dépassée
- [ ] Bouton Accepter → status accepted + notification client
- [ ] Bouton Décliner → status declined + notification client
- [ ] Acceptée → bouton "Démarrer enregistrement" → /speaker/record/:sessionId
- [ ] Si invitation expirée/cancelled → boutons grisés
- [ ] Erreur réseau pendant accept → message + reset

### 3.4 Page enregistrement `/speaker/record/:sessionId`
- [ ] Demande permission micro (premier accès)
- [ ] Refus micro → message + lien settings
- [ ] Phrase courante centrée, font 24px+ mobile
- [ ] Compteur progression (X / Y) en mono
- [ ] Bouton record gros (>= 80px), zone tactile 96px+
- [ ] Tap record → décompte ou démarrage immédiat
- [ ] Waveform anime pendant enregistrement
- [ ] Tap stop → fichier WAV uploadé via TUS
- [ ] Authorization Bearer envoyé dans submit-recording
- [ ] Phrase suivante automatique après upload OK
- [ ] Skip phrase → passe sans enregistrer
- [ ] **Auto-retry** : recording en pending > 30s → badge orange "Traitement plus long que prévu" + boutons Relancer / Supprimer
- [ ] Bouton Relancer → retry_recording RPC → re-déclenche webhook
- [ ] Bouton Supprimer → delete_recording RPC → fichier Storage supprimé + recording row supprimée
- [ ] Session expirée pendant l'enregistrement → message + redirect
- [ ] Réseau coupé pendant upload → retry TUS automatique au retour
- [ ] Espace clavier (Space) start/stop ✓ accessibility
- [ ] Test sur 3G simulé : upload doit aboutir (lent mais OK)
- [ ] iPhone Safari : enregistrement WAV fonctionnel
- [ ] Pas de scroll horizontal nulle part

### 3.5 Notifications `/speaker/notifications`
- [ ] Cloche dans top bar avec badge unread count
- [ ] Click cloche → page notifications
- [ ] **Realtime** : nouvelle notif push (INSERT) → apparaît live + badge incrémenté
- [ ] Liste avec icône par type (invitation_received, reminder, accepted, declined, rejected, completed)
- [ ] Notif unread : dot violet visible
- [ ] Click notif → navigation vers /invitations/:id
- [ ] "Tout marquer lu" → tous les unread passés à read
- [ ] Click une notif → marquée read individuellement
- [ ] relativeTime correct (à l'instant, il y a X min/h/j)
- [ ] Empty state si aucune notification

### 3.6 Wallet `/speaker/wallet`
- [ ] Solde animé (countup)
- [ ] Historique transactions paginé
- [ ] Types affichés correctement avec signe (+/-)
- [ ] Filtres par type (optionnel)
- [ ] Export CSV historique (si présent)
- [ ] Bouton "Demander un retrait"

### 3.7 Demande retrait
- [ ] Modal s'ouvre
- [ ] Champ montant : minimum 5000 FCFA
- [ ] Solde disponible affiché
- [ ] Méthodes : Wave / Orange Money / Free Money / Banque
- [ ] Champ destination : tel pour mobile money, IBAN pour banque
- [ ] Validation tel format Sénégal (+221...)
- [ ] Validation IBAN format
- [ ] Submit avec montant > solde → "Solde insuffisant : demandé X, disponible Y"
- [ ] Submit avec retrait déjà pending → "Un retrait est déjà en cours"
- [ ] Submit OK → withdrawal pending + débit wallet visible
- [ ] Rate limit : 6e tentative en 1h → "Trop de tentatives, réessayez plus tard"
- [ ] Notification client (admin) ?

### 3.8 Profil locuteur `/speaker/profile`
- [ ] Édition nom, bio, ville, gender, DOB
- [ ] Édition langues + dialectes
- [ ] Avatar upload (max 2 MB, image uniquement)
- [ ] Voice sample : remplacer / supprimer
- [ ] Save → UPDATE speaker_profiles
- [ ] Erreurs validation visibles

### 3.9 Compte (shared) `/account`
- [ ] Voir 1.6 (suppression compte)

---

## 4. Edge Functions — tests directs

### 4.1 CORS & preflight
- [ ] OPTIONS depuis `localhost:5173` → 200 + headers ACAO
- [ ] OPTIONS depuis `baat-ai.vercel.app` → 200
- [ ] OPTIONS depuis origin non whitelistée → headers absents ou refusés
- [ ] Reproduire avec un fetch depuis console browser

### 4.2 Auth obligatoire
Pour chaque edge function avec auth :
- [ ] Sans Authorization header → 401 "Non authentifié"
- [ ] Token JWT invalide → 401
- [ ] Token expiré → 401
- [ ] Token valide mais mauvais rôle → 403

### 4.3 Rate limiting
- [ ] `request-withdrawal` : 6e tentative/h → 429
- [ ] `submit-validation` : 101e vote/h → 429
- [ ] `invite-speaker-bulk` : 11e batch/h → 429
- [ ] Reset après fenêtre

### 4.4 submit-recording
- [ ] Avec Bearer + session_id : speaker_id == auth user → OK
- [ ] Avec Bearer + session_id : speaker_id != auth user → 403
- [ ] Storage path inexistant → erreur claire
- [ ] Phrase déjà enregistrée → is_redo=true (overwrite)

### 4.5 delete-account
- [ ] Sans password → 400
- [ ] Sans confirmation = "SUPPRIMER" → 400
- [ ] Mot de passe incorrect → 403
- [ ] Speaker avec retrait pending → 400 bloqué
- [ ] Client avec projet actif → 400 bloqué
- [ ] Admin → 403 (pas de self-service)

### 4.6 invite-speaker-bulk
- [ ] Bulk 50 speakers OK → 50 invitations créées
- [ ] Bulk 51 → erreur "max 50"
- [ ] Speakers déjà invités → exclus, count `failed` retourné

---

## 5. Webhooks Python

### 5.1 process-segment (recording)
- [ ] Insertion d'un recording → POST Python reçu (vérifier logs Railway)
- [ ] X-Webhook-Timestamp + X-Webhook-Signature présents
- [ ] HMAC vérifié côté Python (200 OK)
- [ ] Timestamp > 5 min → 401 (anti-replay)
- [ ] Mauvaise signature → 401
- [ ] WAV processed généré + uploadé bucket audio-processed
- [ ] UPDATE recording avec QC metrics + is_valid + processing_status=completed
- [ ] Recording rejeté : rejection_reasons[] non vide
- [ ] Auto-retry après 5 min stuck (cron) : retry_count incrémenté

### 5.2 generate-export
- [ ] Insertion export → POST Python reçu
- [ ] HMAC vérifié
- [ ] Format LJSpeech : metadata.csv + wavs/ correct
- [ ] Format HuggingFace : dataset structure correct
- [ ] Format CSV+WAV : flat structure
- [ ] Filtre min_snr_db respecté
- [ ] .zip uploadé bucket exports
- [ ] UPDATE export status=ready
- [ ] Erreur Python → status=failed avec message

---

## 6. Cron jobs (pg_cron)

### 6.1 auto_retry_stuck_recordings (10 min)
- [ ] Forcer un recording en pending depuis > 5 min → cron le rejoue
- [ ] retry_count incrémenté
- [ ] Après 2 retries → reste en pending sans nouveau retry

### 6.2 cleanup_audio_raw_daily (03:00 UTC)
- [ ] Recording valid + processed_at > 30 jours → fichier raw supprimé du bucket
- [ ] Recording invalid → fichier raw conservé
- [ ] Recording < 30 jours → conservé
- [ ] Vérifier avec `SELECT * FROM cleanup_audio_raw_test()` (si fonction de test existe)

### 6.3 health_watch_critical (15 min)
- [ ] Forcer 1 recording stuck > 30 min → alerte Discord reçue
- [ ] Forcer 1 export stuck > 1h → alerte Discord
- [ ] Aucun problème → silence (pas de spam)

### 6.4 health_watch_warnings (hourly)
- [ ] Forcer withdrawal pending > 24h → alerte Discord
- [ ] Forcer ratio invalid > 50% sur 24h → alerte Discord

### 6.5 health_watch_digest (09:00 UTC)
- [ ] Digest reçu une fois par jour
- [ ] Stats : recordings/exports/withdrawals/active speakers du jour

---

## 7. Realtime Supabase

### 7.1 useRealtimeRecordings
- [ ] Ouvrir `/project/:id` tab Recordings dans 2 onglets
- [ ] Insérer recording dans onglet 1 → onglet 2 voit la nouvelle ligne
- [ ] UPDATE QC dans onglet 1 → badge change dans onglet 2
- [ ] Pas de re-subscribe storm (vérifier devtools network)

### 7.2 useNotifications
- [ ] Speaker connecté avec page notifications ouverte
- [ ] Client envoie une invitation → notif apparaît live + badge count
- [ ] StrictMode (dev) : pas de double subscribe (channel name unique)

### 7.3 useProjectInvitations (live team tab)
- [ ] Speaker accepte une invitation → tab Sent passe à "accepted" live
- [ ] Speaker decline → idem

---

## 8. Sécurité

### 8.1 RLS
- [ ] Speaker A ne peut pas SELECT recordings de Speaker B
- [ ] Client A ne peut pas SELECT projects de Client B
- [ ] Tentative INSERT recording avec speaker_id usurpé → bloqué
- [ ] Tentative UPDATE wallet_balance directement (sans transaction) → bloqué

### 8.2 Triggers SQL critiques
- [ ] Withdrawal balance check : 2 requêtes simultanées avec solde tout juste suffisant → 1 seule passe (FOR UPDATE lock)
- [ ] Withdrawal montant <= 0 → erreur
- [ ] Withdrawal pendant un autre pending → erreur

### 8.3 Validation MIME / taille
- [ ] Upload phrases avec .exe → rejeté
- [ ] Upload phrases > 10 MB → rejeté
- [ ] Avatar > 2 MB → rejeté

### 8.4 Secrets
- [ ] `service_role_key` absente du bundle JS final (vérifier dans devtools sources)
- [ ] HMAC secret en vault uniquement, pas en clair

### 8.5 XSS
- [ ] Saisir `<script>alert(1)</script>` dans nom projet → escapé à l'affichage
- [ ] Saisir HTML dans bio speaker → escapé
- [ ] Saisir HTML dans message invitation → escapé

---

## 9. UI / Design system

### 9.1 Theme (dark-locked dans la plupart, adaptive sur landing/auth)
- [ ] `/` (landing) : toggle dark/light fonctionne
- [ ] `/login`, `/register` : toggle dark/light fonctionne
- [ ] `/speaker/*` : dark-locked (toggle absent ou dark forcé)
- [ ] `/dashboard`, `/project/*` : variables CSS appliquées
- [ ] Pas de texte gris sur fond blanc en light mode (lisibilité AA)
- [ ] Pas de texte foncé sur fond violet (CTAs)

### 9.2 Cards waveform speaker (dark-locked)
- [ ] `/speakers` : cards en dark même si light mode actif
- [ ] `/speakers/:id` : idem

### 9.3 Modals mobile
- [ ] Tous les modals : `items-end sm:items-center`, `rounded-t-2xl sm:rounded-2xl`, `max-h-[92dvh]`
- [ ] DeleteAccountModal ✓
- [ ] InviteDrawer ✓
- [ ] Modal withdrawal ✓
- [ ] Modal export ✓

### 9.4 Responsive
- [ ] sm (640px) : layout 1 col
- [ ] md (768px) : tablet OK
- [ ] lg (1024px) : sidebar + content
- [ ] xl (1280px) : largeur max contenue
- [ ] Aucun scroll horizontal sur 360px (Galaxy A14)
- [ ] Bottom nav locuteur ne masque pas le contenu

### 9.5 Accessibilité
- [ ] Tab navigation cohérente sur tous les forms
- [ ] Focus ring visible (pas outline:none sans alternative)
- [ ] aria-label sur boutons icône-only (cloche, menu, etc.)
- [ ] Bouton record : Space/Enter start/stop
- [ ] Contrast AA tous les textes

### 9.6 Performance
- [ ] Lighthouse mobile score > 80
- [ ] Initial bundle < 400 kB
- [ ] Lazy chunks chargent sans erreur (refresh page → pas de "Failed to fetch")
- [ ] Auto-reload après deploy (chunk hash mismatch) fonctionne
- [ ] Fonts pré-chargées (pas de FOUT visible)

---

## 10. Edge cases & robustesse

### 10.1 Réseau dégradé
- [ ] 3G simulé : login < 5s
- [ ] Upload TUS sur 3G : aboutit même lent
- [ ] Coupure réseau pendant upload : reprise auto au retour
- [ ] Pas de double-submit (debounce ou disable button)

### 10.2 Sessions concurrentes
- [ ] Même speaker connecté sur 2 devices → enregistrements n'écrasent pas
- [ ] Logout sur device 1 → device 2 reste connecté (pas de session globale)

### 10.3 Données limites
- [ ] Projet avec 1000 phrases → page Phrases reste fluide
- [ ] Projet avec 5000 recordings → tab Recordings paginé
- [ ] Speaker avec 200 invitations → liste paginée

### 10.4 Erreurs serveur
- [ ] Supabase down → message d'erreur global, pas page blanche
- [ ] Edge function 500 → toast erreur + log console
- [ ] Python service down → recordings restent pending → cron retry

---

## 11. Tests régression critiques (smoke test express)

> À refaire après chaque déploiement (15 min)

- [ ] Login client + créer 1 projet (1 phrase)
- [ ] Login speaker + accepter invitation reçue
- [ ] Enregistrer 1 phrase + vérifier upload + QC en < 30s
- [ ] Login admin + voir 1 retrait pending
- [ ] Vérifier alerte Discord arrive si recording stuck (forcé)

---

## 12. Tests à programmer (post-beta)

- [ ] Charge : 20 locuteurs simultanés enregistrent (Python webhook scaling)
- [ ] Charge : 100 invitations bulk envoyées
- [ ] Charge : 50 exports concurrents (Python timeout ?)
- [ ] Tests E2E automatisés (Playwright) sur les flows critiques
