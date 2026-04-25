import { createClient } from '@supabase/supabase-js'
// On utilise un client Supabase non-typé (any). Les types stricts métier
// sont définis dans `types/database.ts` et appliqués manuellement dans les
// hooks via des casts contrôlés.
//
// Pourquoi pas les types générés (`types/supabase-generated.ts`) ? Parce que
// PostgreSQL renvoie des `string | null` pour les colonnes contraintes par
// CHECK (ex: gender, withdrawal_method), alors que nos union types métier
// sont stricts. Les générés écraseraient cette précision sur ~5 fichiers.
//
// Le fichier supabase-generated.ts est conservé pour référence et peut être
// importé ad-hoc quand on veut le schéma complet (Insert/Update types).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
