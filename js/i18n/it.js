/**
 * Italian translations
 * @lang it
 */
export default {
    // Header
    header: {
        title: "Gmail Tool v0.5",
        subtitle: "Sistema di Gestione Email Professionale"
    },
    
    // Authentication
    auth: {
        welcome: "Benvenuto in Gmail Tool",
        signInDescription: "Accedi con il tuo account Google per iniziare",
        signInButton: "Accedi con Google",
        signOut: "Disconnetti",
        dataPrivacy: "I tuoi dati rimangono nel tuo browser",
        requiresAccess: "Questa applicazione richiede l'accesso a Gmail"
    },
    
    // Navigation Tabs
    tabs: {
        batchSender: "Invio Batch Email",
        emailDownloader: "Download Email"
    },
    
    // Footer
    footer: {
        privacyPolicy: "Informativa Privacy",
        termsOfService: "Termini di Servizio",
        about: "Chi siamo",
        openSource: "Open Source",
        copyright: "© 2024 42ROWS Srl - P.IVA: IT18017981004"
    },
    
    // Common
    common: {
        loading: "Caricamento...",
        error: "Errore",
        success: "Successo",
        cancel: "Annulla",
        confirm: "Conferma",
        close: "Chiudi",
        save: "Salva",
        delete: "Elimina",
        upload: "Carica",
        download: "Scarica",
        export: "Esporta",
        import: "Importa"
    },
    
    // Errors
    errors: {
        authFailed: "Autenticazione fallita. Riprova.",
        quotaExceeded: "Quota Gmail superata. Riprova domani.",
        networkError: "Errore di connessione. Controlla la tua connessione internet.",
        invalidCSV: "File CSV non valido. Controlla il formato.",
        noRecipients: "Nessun destinatario trovato nel CSV.",
        tokenExpired: "Sessione scaduta. Effettua nuovamente l'accesso.",
        batchTooLarge: "Troppe email. Massimo consentito: 10.000.",
        memoryWarning: "Memoria in esaurimento. Alcune funzionalità potrebbero essere limitate.",
        clientIdMissing: "Client ID mancante. Configura l'applicazione."
    },
    
    // Success Messages
    success: {
        authSuccess: "Accesso effettuato con successo!",
        batchComplete: "Invio batch completato!",
        downloadComplete: "Download completato!",
        exportComplete: "Export completato!",
        settingsSaved: "Impostazioni salvate!"
    }
};
