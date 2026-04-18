-- =============================================
-- Baat-IA — Migration 019 : Validation croisée
-- =============================================

CREATE TABLE public.peer_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES public.speaker_profiles(id),
  vote BOOLEAN NOT NULL,
  confidence TEXT CHECK (confidence IN ('certain', 'unsure')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (recording_id, validator_id)
);

CREATE INDEX idx_peer_validations_recording ON public.peer_validations(recording_id);
CREATE INDEX idx_peer_validations_validator ON public.peer_validations(validator_id);

ALTER TABLE public.peer_validations ENABLE ROW LEVEL SECURITY;

-- Un validateur ne peut pas voter sur ses propres recordings
CREATE OR REPLACE FUNCTION public.prevent_self_validation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.recordings r
    JOIN public.recording_sessions rs ON rs.id = r.session_id
    WHERE r.id = NEW.recording_id AND rs.speaker_id = NEW.validator_id
  ) THEN
    RAISE EXCEPTION 'Un locuteur ne peut pas valider ses propres enregistrements';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_self_validation
  BEFORE INSERT ON public.peer_validations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_validation();

-- Consensus : si 3 validateurs unanimes → override is_valid
CREATE OR REPLACE FUNCTION public.apply_peer_consensus()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
  v_votes INT;
BEGIN
  SELECT COUNT(*), SUM(CASE WHEN vote THEN 1 ELSE 0 END)
    INTO v_count, v_votes
    FROM public.peer_validations
    WHERE recording_id = NEW.recording_id;

  -- 3 votes unanimes
  IF v_count >= 3 AND (v_votes = v_count OR v_votes = 0) THEN
    UPDATE public.recordings
    SET is_valid = (v_votes = v_count)
    WHERE id = NEW.recording_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_peer_validation_inserted
  AFTER INSERT ON public.peer_validations
  FOR EACH ROW EXECUTE FUNCTION public.apply_peer_consensus();

-- RLS
CREATE POLICY "Speaker reads own validations"
  ON public.peer_validations FOR SELECT
  USING (validator_id = auth.uid());

CREATE POLICY "Admin reads all validations"
  ON public.peer_validations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
