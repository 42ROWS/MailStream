/**
 * English translations
 * @lang en
 */
export default {
    // Header
    header: {
        title: "Gmail Tool v0.5",
        subtitle: "Enterprise Email Management System"
    },
    
    // Authentication
    auth: {
        welcome: "Welcome to Gmail Tool",
        signInDescription: "Sign in with your Google account to get started",
        signInButton: "Sign in with Google",
        signOut: "Sign Out",
        dataPrivacy: "Your data stays in your browser",
        requiresAccess: "This application requires Gmail access"
    },
    
    // Navigation Tabs
    tabs: {
        batchSender: "Batch Email Sender",
        emailDownloader: "Email Downloader"
    },
    
    // Email Downloader
    downloader: {
        title: "Download Email",
        subtitle: "Search, select and download your emails with attachments",
        filtersTitle: "Search Filters",
        dateFrom: "Date From",
        dateTo: "Date To",
        fromSender: "From (Sender)",
        toRecipient: "To (Recipient)",
        emailPlaceholder: "example@gmail.com",
        subjectContains: "Subject Contains",
        subjectPlaceholder: "Keywords in subject",
        labels: "Labels",
        ctrlClickMultiple: "Ctrl+Click for multiple selection",
        options: "Options",
        withAttachments: "Only with attachments",
        unreadOnly: "Only unread",
        starred: "Only starred",
        important: "Only important",
        advancedSearch: "🔍 Advanced Search",
        customQuery: "Custom Gmail Query",
        guide: "ℹ️ Guide",
        queryPlaceholder: "e.g: has:attachment larger:5M after:2024/1/1",
        searchEmails: "🔍 Search Emails",
        clearFilters: "🗑️ Clear Filters",
        maxResults: "Max results:",
        resultsSection: "Search Results",
        selectAll: "☑️ Select All",
        deselectAll: "⬜ Deselect All",
        selected: "selected",
        loadMore: "Load More Results",
        downloadOptions: "Download Options",
        content: "Content",
        includeAttachments: "Include Attachments",
        includeBody: "Include Email Body",
        includeHeaders: "Include Headers",
        exportFormat: "Export Format",
        zipFormat: "📦 ZIP (Emails + Attachments)",
        csvFormat: "📊 CSV (Metadata Only)",
        bothFormat: "📦+📊 Both",
        sizeEstimate: "Size estimate:",
        calculating: "Calculating...",
        startDownload: "⬇️ Start Download",
        cancelSelection: "❌ Cancel Selection",
        progressTitle: "📊 Download Progress",
        totalProgress: "Total Progress",
        downloaded: "Downloaded",
        attachments: "Attachments",
        size: "Size",
        timeRemaining: "Time Remaining",
        downloading: "Downloading...",
        pause: "⏸️ Pause",
        resume: "▶️ Resume",
        cancel: "⏹️ Cancel",
        completed: "Download Complete!",
        saveExport: "💾 Save Export",
        newSearch: "🔍 New Search"
    },
    
    // Batch Sender
    sender: {
        title: "📤 Batch Email Sender",
        subtitle: "Upload a CSV with recipient, subject and content to send batch emails",
        uploadSection: "Upload CSV File",
        clickSelect: "Click to select",
        dragFile: "or drag the CSV file here",
        csvColumns: "CSV must contain columns: recipient, subject, content",
        emailsToSend: "emails to send",
        remove: "❌ Remove",
        csvFormat: "📋 CSV Format Required:",
        previewSection: "Preview and Validation",
        recipient: "Recipient",
        subject: "Subject",
        contentPreview: "Content (preview)",
        showing: "Showing first 5 emails of",
        sendOptions: "Send Options",
        useDelay: "Use delay between emails (recommended)",
        delayDescription: "Random delay between 35-75 seconds to respect Gmail limits",
        testMode: "Test Mode (send only first 3 emails)",
        testDescription: "Useful to verify everything works correctly",
        gmailLimits: "Gmail Limits",
        freeAccount: "Free account: 500 emails/day",
        workspace: "Google Workspace: 2000 emails/day",
        estimatedTime: "Estimated time: ~1 minute per email with delay",
        startSending: "🚀 Start Sending",
        progressTitle: "📊 Sending Progress",
        totalProgress: "Total Progress",
        sent: "Sent",
        failed: "Failed",
        remaining: "Remaining",
        sendingTo: "Sending to:",
        timeRemaining: "Estimated time remaining:",
        pause: "⏸️ Pause",
        resume: "▶️ Resume",
        stop: "⏹️ Stop",
        completed: "Sending Complete!",
        exportResults: "📊 Export Results",
        newBatch: "📤 New Batch"
    },
    
    // Footer
    footer: {
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service",
        about: "About 42ROWS",
        openSource: "Open Source",
        copyright: "© 2024 42ROWS Srl - VAT: IT18017981004"
    },
    
    // Common
    common: {
        loading: "Loading...",
        error: "Error",
        success: "Success",
        cancel: "Cancel",
        confirm: "Confirm",
        close: "Close",
        save: "Save",
        delete: "Delete",
        upload: "Upload",
        download: "Download",
        export: "Export",
        import: "Import"
    },
    
    // Errors
    errors: {
        authFailed: "Authentication failed. Please try again.",
        quotaExceeded: "Gmail quota exceeded. Please try again tomorrow.",
        networkError: "Connection error. Check your internet connection.",
        invalidCSV: "Invalid CSV file. Please check the format.",
        noRecipients: "No recipients found in CSV.",
        tokenExpired: "Session expired. Please sign in again.",
        batchTooLarge: "Too many emails. Maximum allowed: 10,000.",
        memoryWarning: "Memory running low. Some features may be limited.",
        clientIdMissing: "Client ID missing. Please configure the application."
    },
    
    // Success Messages
    success: {
        authSuccess: "Successfully signed in!",
        batchComplete: "Batch sending complete!",
        downloadComplete: "Download complete!",
        exportComplete: "Export complete!",
        settingsSaved: "Settings saved!"
    }
};
