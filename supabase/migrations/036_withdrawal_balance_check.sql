-- =============================================
-- Baat-IA — Migration 036 : protection des withdrawals
-- =============================================
-- Empêche au niveau DB :
--   1. Tout retrait avec un montant > solde du speaker
--   2. Tout retrait alors qu'un autre retrait est déjà PENDING
--      (anti double-spend en cas de race condition entre 2 requêtes)
--
-- Le check est fait avec un FOR UPDATE pour verrouiller la ligne
-- speaker_profiles le temps de la transaction. Postgres sérialise les
-- 2 requêtes concurrentes : la 2e attend, lit le solde mis à jour,
-- et lève une exception si le compte est déjà à 0 ou si un retrait
-- pending existe déjà.
-- =============================================

CREATE OR REPLACE FUNCTION public.check_withdrawal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance INT;
  v_pending_count INT;
BEGIN
  -- Refus si montant <= 0 (déjà couvert par CHECK constraint, mais explicite)
  IF NEW.amount_fcfa <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être strictement positif'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Verrouille la ligne speaker_profiles le temps de la transaction
  -- → toute autre INSERT concurrente sur ce même speaker_id attendra
  SELECT wallet_balance_fcfa
    INTO v_balance
    FROM public.speaker_profiles
    WHERE id = NEW.speaker_id
    FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Speaker introuvable'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Compte les retraits pending/approved du même speaker
  -- (un retrait approved mais pas encore paid bloque aussi le solde)
  SELECT COUNT(*)
    INTO v_pending_count
    FROM public.withdrawals
    WHERE speaker_id = NEW.speaker_id
      AND status IN ('pending', 'approved');

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'Un retrait est déjà en cours de traitement'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Vérification finale du solde
  IF NEW.amount_fcfa > v_balance THEN
    RAISE EXCEPTION 'Solde insuffisant : demandé % FCFA, disponible % FCFA',
      NEW.amount_fcfa, v_balance
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS withdrawal_balance_check ON public.withdrawals;

CREATE TRIGGER withdrawal_balance_check
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_withdrawal_balance();

COMMENT ON FUNCTION public.check_withdrawal_balance() IS
  'Trigger BEFORE INSERT sur withdrawals. Verrouille la ligne speaker_profiles avec FOR UPDATE pour empêcher les race conditions. Refuse si solde insuffisant ou si un autre retrait est déjà pending/approved.';
