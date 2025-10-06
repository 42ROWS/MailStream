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
    
    // Email Downloader
    downloader: {
        title: "📥 Télécharger des E-mails",
        subtitle: "Rechercher, sélectionner et télécharger vos e-mails avec pièces jointes",
        filtersTitle: "Filtres de Recherche",
        dateFrom: "Date De",
        dateTo: "Date À",
        fromSender: "De (Expéditeur)",
        toRecipient: "À (Destinataire)",
        emailPlaceholder: "exemple@gmail.com",
        subjectContains: "Objet Contient",
        subjectPlaceholder: "Mots-clés dans l'objet",
        labels: "Étiquettes",
        ctrlClickMultiple: "Ctrl+Clic pour sélection multiple",
        options: "Options",
        withAttachments: "Uniquement avec pièces jointes",
        unreadOnly: "Uniquement non lus",
        starred: "Uniquement avec étoile",
        important: "Uniquement importants",
        advancedSearch: "🔍 Recherche Avancée",
        customQuery: "Requête Gmail Personnalisée",
        guide: "ℹ️ Guide",
        queryPlaceholder: "ex: has:attachment larger:5M after:2024/1/1",
        searchEmails: "🔍 Rechercher des E-mails",
        clearFilters: "🗑️ Effacer les Filtres",
        maxResults: "Résultats max:",
        resultsSection: "Résultats de Recherche",
        selectAll: "☑️ Tout Sélectionner",
        deselectAll: "⬜ Tout Désélectionner",
        selected: "sélectionnés",
        loadMore: "Charger Plus de Résultats",
        downloadOptions: "Options de Téléchargement",
        content: "Contenu",
        includeAttachments: "Inclure les Pièces Jointes",
        includeBody: "Inclure le Corps de l'E-mail",
        includeHeaders: "Inclure les En-têtes",
        exportFormat: "Format d'Exportation",
        zipFormat: "📦 ZIP (E-mails + Pièces Jointes)",
        csvFormat: "📊 CSV (Métadonnées Uniquement)",
        bothFormat: "📦+📊 Les Deux",
        sizeEstimate: "Estimation de taille:",
        calculating: "Calcul...",
        startDownload: "⬇️ Démarrer le Téléchargement",
        cancelSelection: "❌ Annuler la Sélection",
        progressTitle: "📊 Progression du Téléchargement",
        totalProgress: "Progression Totale",
        downloaded: "Téléchargés",
        attachments: "Pièces Jointes",
        size: "Taille",
        timeRemaining: "Temps Restant",
        downloading: "Téléchargement...",
        pause: "⏸️ Pause",
        resume: "▶️ Reprendre",
        cancel: "⏹️ Annuler",
        completed: "Téléchargement Terminé!",
        saveExport: "💾 Enregistrer l'Export",
        newSearch: "🔍 Nouvelle Recherche"
    },
    
    // Batch Sender
    sender: {
        title: "📤 Envoi d'E-mails en Masse",
        subtitle: "Téléchargez un CSV avec destinataire, objet et contenu pour envoyer des e-mails en masse",
        uploadSection: "Télécharger un Fichier CSV",
        clickSelect: "Cliquez pour sélectionner",
        dragFile: "ou glissez le fichier CSV ici",
        csvColumns: "Le CSV doit contenir les colonnes: destinataire, objet, contenu",
        emailsToSend: "e-mails à envoyer",
        remove: "❌ Supprimer",
        csvFormat: "📋 Format CSV Requis:",
        previewSection: "Aperçu et Validation",
        recipient: "Destinataire",
        subject: "Objet",
        contentPreview: "Contenu (aperçu)",
        showing: "Affichage des 5 premiers e-mails sur",
        sendOptions: "Options d'Envoi",
        useDelay: "Utiliser un délai entre les e-mails (recommandé)",
        delayDescription: "Délai aléatoire entre 35-75 secondes pour respecter les limites Gmail",
        testMode: "Mode Test (envoyer seulement les 3 premiers e-mails)",
        testDescription: "Utile pour vérifier que tout fonctionne correctement",
        gmailLimits: "Limites Gmail",
        freeAccount: "Compte gratuit: 500 e-mails/jour",
        workspace: "Google Workspace: 2000 e-mails/jour",
        estimatedTime: "Temps estimé: ~1 minute par e-mail avec délai",
        startSending: "🚀 Commencer l'Envoi",
        progressTitle: "📊 Progression de l'Envoi",
        totalProgress: "Progression Totale",
        sent: "Envoyés",
        failed: "Échoués",
        remaining: "Restants",
        sendingTo: "Envoi à:",
        timeRemaining: "Temps restant estimé:",
        pause: "⏸️ Pause",
        resume: "▶️ Reprendre",
        stop: "⏹️ Arrêter",
        completed: "Envoi Terminé!",
        exportResults: "📊 Exporter les Résultats",
        newBatch: "📤 Nouveau Lot"
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
