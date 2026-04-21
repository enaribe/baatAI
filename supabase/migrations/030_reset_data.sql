-- =============================================
-- Baat-IA — Migration 030 : reset complet des données (schéma conservé)
-- =============================================
-- Vide toutes les tables applicatives et tous les utilisateurs.
-- Ne touche pas au schéma, aux RLS, aux fonctions RPC ni aux triggers.
-- =============================================

-- 1. Tables applicatives (ordre inverse des dépendances, CASCADE gère le reste)
TRUNCATE TABLE
  public.exports,
  public.recordings,
  public.recording_sessions,
  public.phrases,
  public.project_invitations,
  public.projects,
  public.peer_validations,
  public.notifications,
  public.wallet_transactions,
  public.withdrawals,
  public.speaker_profiles,
  public.profiles
RESTART IDENTITY CASCADE;

-- 2. Supprimer tous les utilisateurs auth (cascade vers profiles via FK)
DELETE FROM auth.users;
