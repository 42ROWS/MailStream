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
