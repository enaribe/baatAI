-- =============================================
-- Baat-IA — Migration 026 : le trigger handle_new_user lit le role
-- =============================================
-- Problème : le trigger insérait systématiquement role='client' par défaut.
-- Pour inscrire un speaker, le frontend devait ensuite UPDATE profiles.
-- Race condition : l'onAuthStateChange déclenche fetchRole AVANT que l'UPDATE
-- ait eu le temps de s'exécuter → l'utilisateur voit brièvement la page client.
--
-- Solution : le trigger lit raw_user_meta_data->>'role' à l'insert.
-- Le frontend passe le role dans options.data.role au signUp.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- Sécurité : limiter aux rôles connus
  IF v_role NOT IN ('client', 'speaker', 'admin') THEN
    v_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, full_name, organization, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'organization',
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
