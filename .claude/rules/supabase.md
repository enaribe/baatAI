---
description: Règles pour les fichiers Supabase (migrations, Edge Functions)
globs: supabase/**
---

# Règles Supabase

## Migrations
- Numérotées : 001_initial.sql, 002_rls.sql, 003_storage.sql
- RLS obligatoire sur chaque table
- Toujours inclure les CHECK constraints et les index nécessaires

## Edge Functions
- Valider toujours le token/auth en premier
- Utiliser le service_role pour les opérations admin (INSERT recordings pour locuteurs anonymes)
- Retour JSON standardisé : `{ data, error }`
- Gérer les erreurs avec try/catch, messages explicites
- Logger les erreurs avec console.error
- CORS headers pour le frontend
