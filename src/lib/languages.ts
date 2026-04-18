export interface LanguageDefinition {
  label: string
  dialects: string[]
}

export const LANGUAGES: Record<string, LanguageDefinition> = {
  wol: { label: 'Wolof', dialects: ['Dakar', 'Saint-Louis', 'Thiès', 'Kaolack', 'Ziguinchor', 'Touba'] },
  pul: { label: 'Pulaar', dialects: ['Fouta Toro', 'Toucouleur', 'Peul du Sud', 'Kolda', 'Matam'] },
  srr: { label: 'Sereer', dialects: ['Sine', 'Ndut', 'Saafi', 'Non', 'Fatick', 'Thiès'] },
  bam: { label: 'Bambara', dialects: ['Standard', 'Bamako', 'Ségou', 'Sikasso', 'Mopti'] },
  dyu: { label: 'Dioula', dialects: ['Standard', 'Bouaké', 'Abidjan'] },
  mnk: { label: 'Mandinka', dialects: ['Standard', 'Banjul', 'Casamance'] },
  jola: { label: 'Diola', dialects: ['Fogny', 'Kasa', 'Ziguinchor'] },
}

export function getLanguageLabel(code: string): string {
  return LANGUAGES[code]?.label ?? code
}

export function getDialectsForLanguage(code: string): string[] {
  return LANGUAGES[code]?.dialects ?? []
}
