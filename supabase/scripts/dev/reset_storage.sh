#!/usr/bin/env bash
# =============================================
# Daandé — Reset des buckets Storage avant beta
# =============================================
# Vide les 3 buckets : audio-raw, audio-processed, exports
# (les buckets eux-mêmes sont conservés, seuls les fichiers sont supprimés)
#
# Prérequis :
#   - SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local ou exportés
#   - jq installé (brew install jq)
#
# Usage :
#   chmod +x supabase/scripts/dev/reset_storage.sh
#   ./supabase/scripts/dev/reset_storage.sh
# =============================================

set -euo pipefail

# Charger .env.local si présent
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${SUPABASE_URL:?SUPABASE_URL non défini (export ou .env.local)}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY non défini}"

BUCKETS=("audio-raw" "audio-processed" "exports")

list_files() {
  local bucket=$1
  local prefix=${2:-}
  curl -sS \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "{\"prefix\":\"$prefix\",\"limit\":1000,\"offset\":0}" \
    "$SUPABASE_URL/storage/v1/object/list/$bucket"
}

delete_files() {
  local bucket=$1
  shift
  local files=("$@")
  if [ ${#files[@]} -eq 0 ]; then return; fi

  # Construire le payload JSON {"prefixes": ["path1", "path2", ...]}
  local prefixes_json
  prefixes_json=$(printf '%s\n' "${files[@]}" | jq -R . | jq -s '{prefixes: .}')

  curl -sS \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -X DELETE \
    -d "$prefixes_json" \
    "$SUPABASE_URL/storage/v1/object/$bucket" >/dev/null
}

empty_bucket_recursive() {
  local bucket=$1
  local prefix=${2:-}
  local total=0

  while true; do
    local response
    response=$(list_files "$bucket" "$prefix")

    # Erreur API ?
    if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
      echo "  ⚠️  Erreur sur $bucket/$prefix : $(echo "$response" | jq -r '.message // .error')"
      return
    fi

    local count
    count=$(echo "$response" | jq 'length')
    if [ "$count" -eq 0 ]; then break; fi

    # Séparer fichiers (ont id != null) des dossiers virtuels (id == null)
    local files=()
    local folders=()
    while IFS= read -r line; do files+=("$line"); done < <(echo "$response" | jq -r --arg p "$prefix" '.[] | select(.id != null) | (if $p == "" then .name else $p + "/" + .name end)')
    while IFS= read -r line; do folders+=("$line"); done < <(echo "$response" | jq -r --arg p "$prefix" '.[] | select(.id == null) | (if $p == "" then .name else $p + "/" + .name end)')

    # Supprimer les fichiers du niveau courant
    if [ ${#files[@]} -gt 0 ]; then
      delete_files "$bucket" "${files[@]}"
      total=$((total + ${#files[@]}))
      echo "  🗑️  $bucket/$prefix : ${#files[@]} fichier(s) supprimé(s)"
    fi

    # Récursion sur les sous-dossiers
    for folder in "${folders[@]}"; do
      empty_bucket_recursive "$bucket" "$folder"
    done

    # Si pas de fichiers ET pas de dossiers à descendre, on arrête
    if [ ${#files[@]} -eq 0 ] && [ ${#folders[@]} -eq 0 ]; then break; fi
  done
}

echo "=== Reset des buckets Storage Daandé ==="
echo "URL : $SUPABASE_URL"
echo ""

for bucket in "${BUCKETS[@]}"; do
  echo "📦 Vidage du bucket : $bucket"
  empty_bucket_recursive "$bucket"
  echo ""
done

echo "✅ Terminé."
