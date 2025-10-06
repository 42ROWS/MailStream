/**
 * French translations
 * @lang fr
 */
export default {
    // Header
    header: {
        title: "Gmail Tool v0.5",
        subtitle: "Système Professionnel de Gestion des E-mails"
    },
    
    // Authentication
    auth: {
        welcome: "Bienvenue sur Gmail Tool",
        signInDescription: "Connectez-vous avec votre compte Google pour commencer",
        signInButton: "Se connecter avec Google",
        signOut: "Se déconnecter",
        dataPrivacy: "Vos données restent dans votre navigateur",
        requiresAccess: "Cette application nécessite un accès Gmail"
    },
    
    // Navigation Tabs
    tabs: {
        batchSender: "Envoi d'E-mails en Masse",
        emailDownloader: "Téléchargeur d'E-mails"
    },
    
    // Footer
    footer: {
        privacyPolicy: "Politique de Confidentialité",
        termsOfService: "Conditions d'Utilisation",
        about: "À propos de 42ROWS",
        openSource: "Open Source",
        copyright: "© 2024 42ROWS Srl - TVA: IT18017981004"
    },
    
    // Common
    common: {
        loading: "Chargement...",
        error: "Erreur",
        success: "Succès",
        cancel: "Annuler",
        confirm: "Confirmer",
        close: "Fermer",
        save: "Enregistrer",
        delete: "Supprimer",
        upload: "Télécharger",
        download: "Télécharger",
        export: "Exporter",
        import: "Importer"
    },
    
    // Errors
    errors: {
        authFailed: "Échec de l'authentification. Veuillez réessayer.",
        quotaExceeded: "Quota Gmail dépassé. Veuillez réessayer demain.",
        networkError: "Erreur de connexion. Vérifiez votre connexion internet.",
        invalidCSV: "Fichier CSV invalide. Veuillez vérifier le format.",
        noRecipients: "Aucun destinataire trouvé dans le CSV.",
        tokenExpired: "Session expirée. Veuillez vous reconnecter.",
        batchTooLarge: "Trop d'e-mails. Maximum autorisé : 10 000.",
        memoryWarning: "Mémoire faible. Certaines fonctionnalités pourraient être limitées.",
        clientIdMissing: "Client ID manquant. Veuillez configurer l'application."
    },
    
    // Success Messages
    success: {
        authSuccess: "Connexion réussie !",
        batchComplete: "Envoi en masse terminé !",
        downloadComplete: "Téléchargement terminé !",
        exportComplete: "Export terminé !",
        settingsSaved: "Paramètres enregistrés !"
    }
};
