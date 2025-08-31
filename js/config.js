/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * Configuration file for Gmail Tool v0.5
 * Contains all application constants and settings
 */

export const CONFIG = {
    // Google OAuth Configuration - DYNAMIC LOADING
    GOOGLE_CLIENT_ID: window.GOOGLE_CLIENT_ID || 
                      localStorage.getItem('gmail_tool_client_id') ||
                      (window.gmailConfig && window.gmailConfig.clientId) ||
                      'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
    
    // API Scopes required for the application
    SCOPES: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ],
    
    // Gmail API Configuration
    GMAIL_API: {
        DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
        BASE_URL: 'https://gmail.googleapis.com/gmail/v1',
        BATCH_ENDPOINT: 'https://www.googleapis.com/batch/gmail/v1',
        MAX_BATCH_SIZE: 100,
        MAX_RESULTS_PER_PAGE: 100
    },
    
    // Rate Limiting Configuration
    RATE_LIMITS: {
        MIN_DELAY_MS: 35000,
        MAX_DELAY_MS: 75000,
        QUOTA_PER_DAY: 500,
        QUOTA_PER_DAY_WORKSPACE: 2000,
        REQUESTS_PER_SECOND: 10,
        BATCH_DELAY_MS: 1000
    },
    
    // Email Processing Configuration
    EMAIL: {
        MAX_ATTACHMENT_SIZE_MB: 25,
        MAX_EMAIL_SIZE_MB: 35,
        DEFAULT_PAGE_SIZE: 50,
        MAX_EMAILS_TO_PROCESS: 10000,
        CHUNK_SIZE: 100
    },
    
    // UI Configuration
    UI: {
        TOAST_DURATION_MS: 5000,
        PROGRESS_UPDATE_INTERVAL_MS: 250,
        DEBOUNCE_DELAY_MS: 300,
        VIRTUAL_SCROLL_BUFFER: 5,
        ITEMS_PER_PAGE: 50
    },
    
    // Storage Configuration
    STORAGE: {
        PREFIX: 'gmail_tool_',
        TOKEN_KEY: 'auth_token',
        USER_KEY: 'user_info',
        HISTORY_KEY: 'operation_history',
        SETTINGS_KEY: 'user_settings',
        MAX_HISTORY_ITEMS: 100
    },
    
    // Export Configuration
    EXPORT: {
        CSV_FIELDS: [
            'id', 'threadId', 'date', 'from', 'to', 'cc', 'bcc',
            'subject', 'snippet', 'body', 'labels', 'attachments',
            'size', 'isRead', 'isStarred', 'isImportant', 'isDraft'
        ],
        DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss',
        ZIP_COMPRESSION_LEVEL: 6,
        MAX_ZIP_SIZE_MB: 500
    },
    
    // Memory Management
    MEMORY: {
        WARNING_THRESHOLD_MB: 100,
        CRITICAL_THRESHOLD_MB: 200,
        MAX_THRESHOLD_MB: 500,
        CLEANUP_INTERVAL_MS: 60000,
        MAX_CACHED_EMAILS: 1000
    },
    
    // Worker Pool Configuration
    WORKER: {
        MIN_WORKERS: 2,
        MAX_WORKERS: navigator.hardwareConcurrency || 4
    },
    
    // Error Messages
    ERRORS: {
        AUTH_FAILED: 'Autenticazione fallita. Riprova.',
        QUOTA_EXCEEDED: 'Quota Gmail superata. Riprova domani.',
        NETWORK_ERROR: 'Errore di connessione. Controlla la tua connessione internet.',
        INVALID_CSV: 'File CSV non valido. Controlla il formato.',
        NO_RECIPIENTS: 'Nessun destinatario trovato nel CSV.',
        TOKEN_EXPIRED: 'Sessione scaduta. Effettua nuovamente l\'accesso.',
        BATCH_TOO_LARGE: 'Troppe email. Massimo consentito: 10,000.',
        MEMORY_WARNING: 'Memoria in esaurimento. Alcune funzionalità potrebbero essere limitate.',
        CLIENT_ID_MISSING: 'Client ID mancante. Configura l\'applicazione.'
    },
    
    // Success Messages
    SUCCESS: {
        AUTH_SUCCESS: 'Accesso effettuato con successo!',
        BATCH_COMPLETE: 'Invio batch completato!',
        DOWNLOAD_COMPLETE: 'Download completato!',
        EXPORT_COMPLETE: 'Export completato!',
        SETTINGS_SAVED: 'Impostazioni salvate!'
    },
    
    // Debug Configuration
    DEBUG: {
        ENABLED: window.location.hostname === 'localhost' ||
                 (window.gmailConfig && window.gmailConfig.debug === true),
        LOG_LEVEL: (window.gmailConfig && window.gmailConfig.logLevel) || 'info',
        LOG_API_CALLS: true,
        LOG_PERFORMANCE: true
    },
    
    // Feature Flags
    FEATURES: {
        ENABLE_ATTACHMENTS: true,
        ENABLE_TEMPLATES: true,
        ENABLE_SCHEDULING: false,
        ENABLE_ANALYTICS: false,
        ENABLE_DARK_MODE: false,
        ENABLE_EXPORT_PDF: false
    },
    
    // Validation Rules
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        CLIENT_ID_REGEX: /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/,
        MAX_SUBJECT_LENGTH: 200,
        MAX_BODY_LENGTH: 50000,
        MIN_PASSWORD_LENGTH: 8,
        ALLOWED_FILE_TYPES: ['.csv', '.txt'],
        MAX_FILE_SIZE_MB: 10
    },
    
    // Browser Compatibility
    BROWSER: {
        MIN_CHROME_VERSION: 90,
        MIN_FIREFOX_VERSION: 88,
        MIN_SAFARI_VERSION: 14,
        MIN_EDGE_VERSION: 90
    },
    
    // API Endpoints
    ENDPOINTS: {
        GOOGLE_OAUTH: 'https://accounts.google.com/o/oauth2/v2/auth',
        GOOGLE_TOKEN: 'https://oauth2.googleapis.com/token',
        GOOGLE_USERINFO: 'https://www.googleapis.com/oauth2/v2/userinfo'
    }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.keys(CONFIG).forEach(key => {
    if (typeof CONFIG[key] === 'object') {
        Object.freeze(CONFIG[key]);
    }
});

// Export for global access if needed
window.APP_CONFIG = CONFIG;

// Validate critical configuration
if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID === 'undefined') {
    console.error('[Config] Critical: No valid Client ID configured');
    // Show setup instructions in console
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Gmail Tool Setup Required                 ║
╠════════════════════════════════════════════════════════════╣
║ 1. Visit: https://console.cloud.google.com                 ║
║ 2. Create new project or select existing                   ║
║ 3. Enable Gmail API                                        ║
║ 4. Create OAuth 2.0 Client ID                             ║
║ 5. Add authorized origins:                                 ║
║    - http://localhost:8000                                ║
║    - Your production domain                                ║
║ 6. Configure Client ID using one of these methods:         ║
║    - Create config.json with your Client ID               ║
║    - Set window.GOOGLE_CLIENT_ID in index.html            ║
║    - Use localStorage in console                           ║
╚════════════════════════════════════════════════════════════╝
    `);
}

// Development mode check
if (CONFIG.DEBUG.ENABLED) {
    console.log('%c⚙️ Gmail Tool v0.5 - Configuration Loaded', 'color: #4F46E5; font-weight: bold');
    console.log('Debug mode is enabled. Set DEBUG.ENABLED to false in production.');
    console.log('Client ID configured:', CONFIG.GOOGLE_CLIENT_ID ? 'YES' : 'NO');
    console.log('Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
}

export default CONFIG;