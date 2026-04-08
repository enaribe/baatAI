/**
 * Parse un fichier texte en phrases individuelles.
 * Sépare par ligne non vide, trim chaque phrase, ignore les lignes vides.
 */
export function parseTextToPhrases(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}
