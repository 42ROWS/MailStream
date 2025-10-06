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
    
    // Email Downloader
    downloader: {
        title: "📥 Download Email",
        subtitle: "Cerca, seleziona e scarica le tue email con allegati",
        filtersTitle: "Filtri di Ricerca",
        dateFrom: "Data Da",
        dateTo: "Data A",
        fromSender: "Da (Mittente)",
        toRecipient: "A (Destinatario)",
        emailPlaceholder: "esempio@gmail.com",
        subjectContains: "Oggetto Contiene",
        subjectPlaceholder: "Parole chiave nell'oggetto",
        labels: "Etichette",
        ctrlClickMultiple: "Ctrl+Click per selezione multipla",
        options: "Opzioni",
        withAttachments: "Solo con allegati",
        unreadOnly: "Solo non lette",
        starred: "Solo con stella",
        important: "Solo importanti",
        advancedSearch: "🔍 Ricerca Avanzata",
        customQuery: "Query Gmail Personalizzata",
        guide: "ℹ️ Guida",
        queryPlaceholder: "es: has:attachment larger:5M after:2024/1/1",
        searchEmails: "🔍 Cerca Email",
        clearFilters: "🗑️ Pulisci Filtri",
        maxResults: "Max risultati:",
        resultsSection: "Risultati Ricerca",
        selectAll: "☑️ Seleziona Tutto",
        deselectAll: "⬜ Deseleziona Tutto",
        selected: "selezionate",
        loadMore: "Carica Altri Risultati",
        downloadOptions: "Opzioni Download",
        content: "Contenuto",
        includeAttachments: "Includi Allegati",
        includeBody: "Includi Corpo Email",
        includeHeaders: "Includi Headers",
        exportFormat: "Formato Export",
        zipFormat: "📦 ZIP (Email + Allegati)",
        csvFormat: "📊 CSV (Solo Metadati)",
        bothFormat: "📦+📊 Entrambi",
        sizeEstimate: "Stima dimensioni:",
        calculating: "Calcolo...",
        startDownload: "⬇️ Inizia Download",
        cancelSelection: "❌ Annulla Selezione",
        progressTitle: "📊 Progresso Download",
        totalProgress: "Progresso Totale",
        downloaded: "Scaricate",
        attachments: "Allegati",
        size: "Dimensione",
        timeRemaining: "Tempo Rimanente",
        downloading: "Download in corso...",
        pause: "⏸️ Pausa",
        resume: "▶️ Riprendi",
        cancel: "⏹️ Annulla",
        completed: "Download Completato!",
        saveExport: "💾 Salva Export",
        newSearch: "🔍 Nuova Ricerca"
    },
    
    // Batch Sender
    sender: {
        title: "📤 Invio Batch Email",
        subtitle: "Carica un CSV con destinatario, oggetto e contenuto per inviare email in batch",
        uploadSection: "Carica File CSV",
        clickSelect: "Clicca per selezionare",
        dragFile: "o trascina il file CSV qui",
        csvColumns: "Il CSV deve contenere le colonne: destinatario, oggetto, contenuto",
        emailsToSend: "email da inviare",
        remove: "❌ Rimuovi",
        csvFormat: "📋 Formato CSV Richiesto:",
        previewSection: "Anteprima e Validazione",
        recipient: "Destinatario",
        subject: "Oggetto",
        contentPreview: "Contenuto (anteprima)",
        showing: "Mostrando prime 5 email di",
        sendOptions: "Opzioni di Invio",
        useDelay: "Usa ritardo tra le email (consigliato)",
        delayDescription: "Ritardo casuale tra 35-75 secondi per rispettare i limiti Gmail",
        testMode: "Modalità Test (invia solo prime 3 email)",
        testDescription: "Utile per verificare che tutto funzioni correttamente",
        gmailLimits: "Limiti Gmail",
        freeAccount: "Account gratuito: 500 email/giorno",
        workspace: "Google Workspace: 2000 email/giorno",
        estimatedTime: "Tempo stimato: ~1 minuto per email con ritardo",
        startSending: "🚀 Inizia Invio",
        progressTitle: "📊 Progresso Invio",
        totalProgress: "Progresso Totale",
        sent: "Inviate",
        failed: "Fallite",
        remaining: "Rimanenti",
        sendingTo: "Invio in corso a:",
        timeRemaining: "Tempo rimanente stimato:",
        pause: "⏸️ Pausa",
        resume: "▶️ Riprendi",
        stop: "⏹️ Ferma",
        completed: "Invio Completato!",
        exportResults: "📊 Esporta Risultati",
        newBatch: "📤 Nuovo Invio"
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
