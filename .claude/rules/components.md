---
description: Règles pour les composants React dans src/components/
globs: src/components/**
---

# Règles Composants

- Chaque composant accepte des props typées avec une interface (pas de `type` inline)
- Utiliser les variants Tailwind pour les états (hover, focus, disabled)
- Les composants UI dans `/ui/` sont génériques et réutilisables — pas de logique métier
- Les composants hors `/ui/` sont spécifiques à Daandé
- Named exports uniquement, pas de default export
- Un composant par fichier, fichier en kebab-case, composant en PascalCase
- Les animations utilisent uniquement transform et opacity
- Respecter le design system : couleurs primary/secondary/accent/sand, radius 16px pour les cards, font-heading pour les titres
