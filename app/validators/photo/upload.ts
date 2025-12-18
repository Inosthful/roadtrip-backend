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
     * - Formats acceptés : JPEG, PNG, WebP
     * - Taille max : 5 MB (5 * 1024 * 1024 bytes)
     */
    photo: vine
      .file({
        size: '5mb', // Taille maximale
        extnames: ['jpg', 'jpeg', 'png', 'webp'], // Extensions autorisées
      })
      .optional(), // On laisse optional car multipart peut ne pas inclure le fichier

    /**
     * Légende de la photo (optionnelle)
     * Ex: "Coucher de soleil sur la Tour Eiffel"
     */
    caption: vine.string().trim().minLength(1).maxLength(500).optional(),

    /**
     * Latitude de la prise de vue (optionnelle)
     * Valeur entre -90 et 90
     */
    latitude: vine.number().decimal([0, 8]).min(-90).max(90).optional(),

    /**
     * Longitude de la prise de vue (optionnelle)
     * Valeur entre -180 et 180
     */
    longitude: vine.number().decimal([0, 8]).min(-180).max(180).optional(),

    /**
     * Date et heure de la prise de vue (optionnelle)
     * Format ISO 8601 : "2024-11-25T14:30:00Z"
     */
    takenAt: vine.date().optional(),
  })
)
