import { randomBytes } from 'node:crypto'

/**
 * Génère un nom de fichier au format : 6caractères-nom-formate.ext
 */
export function formatFileName(clientName: string, extname: string): string {
  // 3 bytes hex = 6 caractères
  const randomStr = randomBytes(3).toString('hex')
  
  // Extraire le nom sans l'extension
  const nameWithoutExt = clientName.replace(/\.[^/.]+$/, "")
  
  // Formater le nom : minuscules, sans accents, caractères spéciaux remplacés par des tirets
  const formattedName = nameWithoutExt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]/g, '-')     // Remplace tout ce qui n'est pas alphanumérique par -
    .replace(/-+/g, '-')            // Remplace les tirets multiples par un seul
    .replace(/^-|-$/g, '')          // Supprime les tirets au début et à la fin
    
  return `${randomStr}-${formattedName}.${extname}`
}
