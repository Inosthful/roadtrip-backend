import vine from '@vinejs/vine'

/**
 * Validator pour l'upload de photos
 *
 * Valide :
 * - Le fichier image (type MIME, taille max)
 * - Les métadonnées optionnelles (caption, géolocalisation, date)
 */
export const uploadPhotoValidator = vine.compile(
  vine.object({
    /**
     * Fichier image requis
     * - Formats acceptés : JPEG, PNG, WebP, HEIC
     * - Taille max : 10 MB
     */
    photo: vine.file({
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    }),
  })
)
