import { defineConfig, services } from '@adonisjs/drive'
import type { InferDriveDisks } from '@adonisjs/drive/types'

const driveConfig = defineConfig({
  /**
   * Default disk pour le stockage de fichiers
   */
  default: 'local',

  /**
   * Services de stockage configurés
   */
  services: {
    /**
     * Stockage local (fichiers sauvegardés sur le serveur)
     * Parfait pour le développement et les petits projets
     */
    local: services.fs({
      location: './uploads', // Dossier où les fichiers seront stockés
      serveFiles: true, // Permet de servir les fichiers via HTTP
      routeBasePath: '/uploads', // URL de base pour accéder aux fichiers
      visibility: 'public', // Fichiers accessibles publiquement
    }),
  },
})

export default driveConfig

/**
 * Inférer les types pour TypeScript
 */
declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
