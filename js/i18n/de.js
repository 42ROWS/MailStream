/**
 * German translations
 * @lang de
 */
export default {
    // Header
    header: {
        title: "Gmail Tool v0.5",
        subtitle: "Professionelles E-Mail-Management-System"
    },
    
    // Authentication
    auth: {
        welcome: "Willkommen bei Gmail Tool",
        signInDescription: "Melden Sie sich mit Ihrem Google-Konto an, um zu beginnen",
        signInButton: "Mit Google anmelden",
        signOut: "Abmelden",
        dataPrivacy: "Ihre Daten bleiben in Ihrem Browser",
        requiresAccess: "Diese Anwendung benötigt Gmail-Zugriff"
    },
    
    // Navigation Tabs
    tabs: {
        batchSender: "Massen-E-Mail-Sender",
        emailDownloader: "E-Mail-Downloader"
    },
    
    // Email Downloader
    downloader: {
        title: "📥 E-Mail herunterladen",
        subtitle: "Suchen, auswählen und laden Sie Ihre E-Mails mit Anhängen herunter",
        filtersTitle: "Suchfilter",
        dateFrom: "Datum Von",
        dateTo: "Datum Bis",
        fromSender: "Von (Absender)",
        toRecipient: "An (Empfänger)",
        emailPlaceholder: "beispiel@gmail.com",
        subjectContains: "Betreff Enthält",
        subjectPlaceholder: "Schlüsselwörter im Betreff",
        labels: "Labels",
        ctrlClickMultiple: "Strg+Klick für Mehrfachauswahl",
        options: "Optionen",
        withAttachments: "Nur mit Anhängen",
        unreadOnly: "Nur ungelesen",
        starred: "Nur mit Stern",
        important: "Nur wichtig",
        advancedSearch: "🔍 Erweiterte Suche",
        customQuery: "Benutzerdefinierte Gmail-Abfrage",
        guide: "ℹ️ Anleitung",
        queryPlaceholder: "z.B: has:attachment larger:5M after:2024/1/1",
        searchEmails: "🔍 E-Mails suchen",
        clearFilters: "🗑️ Filter löschen",
        maxResults: "Max. Ergebnisse:",
        resultsSection: "Suchergebnisse",
        selectAll: "☑️ Alle auswählen",
        deselectAll: "⬜ Alle abwählen",
        selected: "ausgewählt",
        loadMore: "Weitere Ergebnisse laden",
        downloadOptions: "Download-Optionen",
        content: "Inhalt",
        includeAttachments: "Anhänge einbeziehen",
        includeBody: "E-Mail-Text einbeziehen",
        includeHeaders: "Headers einbeziehen",
        exportFormat: "Exportformat",
        zipFormat: "📦 ZIP (E-Mails + Anhänge)",
        csvFormat: "📊 CSV (Nur Metadaten)",
        bothFormat: "📦+📊 Beides",
        sizeEstimate: "Größenschätzung:",
        calculating: "Berechnung...",
        startDownload: "⬇️ Download starten",
        cancelSelection: "❌ Auswahl abbrechen",
        progressTitle: "📊 Download-Fortschritt",
        totalProgress: "Gesamtfortschritt",
        downloaded: "Heruntergeladen",
        attachments: "Anhänge",
        size: "Größe",
        timeRemaining: "Verbleibende Zeit",
        downloading: "Wird heruntergeladen...",
        pause: "⏸️ Pause",
        resume: "▶️ Fortsetzen",
        cancel: "⏹️ Abbrechen",
        completed: "Download abgeschlossen!",
        saveExport: "💾 Export speichern",
        newSearch: "🔍 Neue Suche"
    },
    
    // Batch Sender
    sender: {
        title: "📤 Massen-E-Mail-Sender",
        subtitle: "Laden Sie eine CSV mit Empfänger, Betreff und Inhalt hoch, um Massen-E-Mails zu senden",
        uploadSection: "CSV-Datei hochladen",
        clickSelect: "Klicken Sie zum Auswählen",
        dragFile: "oder ziehen Sie die CSV-Datei hierher",
        csvColumns: "CSV muss folgende Spalten enthalten: Empfänger, Betreff, Inhalt",
        emailsToSend: "zu sendende E-Mails",
        remove: "❌ Entfernen",
        csvFormat: "📋 Erforderliches CSV-Format:",
        previewSection: "Vorschau und Validierung",
        recipient: "Empfänger",
        subject: "Betreff",
        contentPreview: "Inhalt (Vorschau)",
        showing: "Anzeige der ersten 5 E-Mails von",
        sendOptions: "Sendeoptionen",
        useDelay: "Verzögerung zwischen E-Mails verwenden (empfohlen)",
        delayDescription: "Zufällige Verzögerung zwischen 35-75 Sekunden zur Einhaltung der Gmail-Limits",
        testMode: "Testmodus (nur erste 3 E-Mails senden)",
        testDescription: "Nützlich zur Überprüfung, ob alles korrekt funktioniert",
        gmailLimits: "Gmail-Limits",
        freeAccount: "Kostenloses Konto: 500 E-Mails/Tag",
        workspace: "Google Workspace: 2000 E-Mails/Tag",
        estimatedTime: "Geschätzte Zeit: ~1 Minute pro E-Mail mit Verzögerung",
        startSending: "🚀 Senden starten",
        progressTitle: "📊 Sendefortschritt",
        totalProgress: "Gesamtfortschritt",
        sent: "Gesendet",
        failed: "Fehlgeschlagen",
        remaining: "Verbleibend",
        sendingTo: "Wird gesendet an:",
        timeRemaining: "Geschätzte verbleibende Zeit:",
        pause: "⏸️ Pause",
        resume: "▶️ Fortsetzen",
        stop: "⏹️ Stoppen",
        completed: "Senden abgeschlossen!",
        exportResults: "📊 Ergebnisse exportieren",
        newBatch: "📤 Neuer Batch"
    },
    
    // Footer
    footer: {
        privacyPolicy: "Datenschutzerklärung",
        termsOfService: "Nutzungsbedingungen",
        about: "Über 42ROWS",
        openSource: "Open Source",
        copyright: "© 2024 42ROWS Srl - USt-IdNr.: IT18017981004"
    },
    
    // Common
    common: {
        loading: "Laden...",
        error: "Fehler",
        success: "Erfolg",
        cancel: "Abbrechen",
        confirm: "Bestätigen",
        close: "Schließen",
        save: "Speichern",
        delete: "Löschen",
        upload: "Hochladen",
        download: "Herunterladen",
        export: "Exportieren",
        import: "Importieren"
    },
    
    // Errors
    errors: {
        authFailed: "Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
        quotaExceeded: "Gmail-Kontingent überschritten. Bitte versuchen Sie es morgen erneut.",
        networkError: "Verbindungsfehler. Überprüfen Sie Ihre Internetverbindung.",
        invalidCSV: "Ungültige CSV-Datei. Bitte überprüfen Sie das Format.",
        noRecipients: "Keine Empfänger in der CSV gefunden.",
        tokenExpired: "Sitzung abgelaufen. Bitte melden Sie sich erneut an.",
        batchTooLarge: "Zu viele E-Mails. Maximal erlaubt: 10.000.",
        memoryWarning: "Speicher wird knapp. Einige Funktionen könnten eingeschränkt sein.",
        clientIdMissing: "Client-ID fehlt. Bitte konfigurieren Sie die Anwendung."
    },
    
    // Success Messages
    success: {
        authSuccess: "Erfolgreich angemeldet!",
        batchComplete: "Massen-Versand abgeschlossen!",
        downloadComplete: "Download abgeschlossen!",
        exportComplete: "Export abgeschlossen!",
        settingsSaved: "Einstellungen gespeichert!"
    }
};
