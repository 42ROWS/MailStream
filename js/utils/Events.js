/**
 * Events - Centralized event constants
 * Prevents hardcoded event strings throughout the application
 */

export const EVENTS = Object.freeze({
    // Application events
    APP: {
        READY: 'app:ready',
        ERROR: 'app:error',
        INITIALIZED: 'app:initialized',
        SHUTDOWN: 'app:shutdown'
    },
    
    // Authentication events
    AUTH: {
        INITIALIZED: 'auth:initialized',
        SUCCESS: 'auth:success',
        ERROR: 'auth:error',
        SIGNOUT: 'auth:signout',
        REFRESH_STARTED: 'auth:refresh_started',
        REFRESH_SUCCESS: 'auth:refresh_success',
        REFRESH_FAILED: 'auth:refresh_failed',
        TOKEN_EXPIRED: 'auth:token_expired'
    },
    
    // Gmail API events
    GMAIL: {
        INITIALIZED: 'gmail:initialized',
        EMAIL_SENT: 'gmail:email_sent',
        EMAIL_FAILED: 'gmail:email_failed',
        MESSAGE_TRASHED: 'gmail:message_trashed',
        MESSAGE_DELETED: 'gmail:message_deleted',
        MESSAGE_MODIFIED: 'gmail:message_modified',
        QUOTA_WARNING: 'gmail:quota_warning',
        QUOTA_EXCEEDED: 'gmail:quota_exceeded',
        RATE_LIMITED: 'gmail:rate_limited',
        API_ERROR: 'gmail:api_error'
    },
    
    // Batch processing events
    BATCH: {
        START: 'batch:start',
        PROGRESS: 'batch:progress',
        COMPLETE: 'batch:complete',
        PAUSED: 'batch:paused',
        RESUMED: 'batch:resumed',
        STOPPED: 'batch:stopped',
        ERROR: 'batch:error',
        QUOTA_EXCEEDED: 'batch:quota_exceeded',
        EMAIL_SENT: 'batch:email_sent',
        EMAIL_FAILED: 'batch:email_failed'
    },
    
    // Download events
    DOWNLOAD: {
        START: 'download:start',
        SEARCH_STARTED: 'download:search_started',
        SEARCH_PROGRESS: 'download:search_progress',
        SEARCH_COMPLETE: 'download:search_complete',
        PROGRESS: 'download:progress',
        COMPLETE: 'download:complete',
        PAUSED: 'download:paused',
        RESUMED: 'download:resumed',
        CANCELLED: 'download:cancelled',
        ERROR: 'download:error',
        ATTACHMENT_DOWNLOADED: 'download:attachment_downloaded',
        ATTACHMENT_FAILED: 'download:attachment_failed'
    },
    
    // UI events
    UI: {
        TOAST: 'ui:toast',
        MODAL_OPEN: 'ui:modal_open',
        MODAL_CLOSE: 'ui:modal_close',
        NAVIGATE: 'ui:navigate',
        TAB_CHANGED: 'ui:tab_changed',
        LOADING_START: 'ui:loading_start',
        LOADING_END: 'ui:loading_end',
        NOTIFICATION: 'ui:notification',
        CONFIRM: 'ui:confirm',
        ALERT: 'ui:alert'
    },
    
    // State management events
    STATE: {
        CHANGE: 'state:change',
        RESET: 'state:reset',
        UNDO: 'state:undo',
        REDO: 'state:redo',
        TRANSACTION: 'state:transaction',
        COMPUTED_INVALIDATE: 'state:computed_invalidate'
    },
    
    // Rate limiter events
    RATELIMIT: {
        LIMIT_REACHED: 'ratelimit:limit_reached',
        CIRCUIT_OPEN: 'ratelimit:circuit_open',
        CIRCUIT_CLOSED: 'ratelimit:circuit_closed',
        CIRCUIT_HALF_OPEN: 'ratelimit:circuit_half_open',
        RETRY_STARTED: 'ratelimit:retry_started',
        RETRY_SUCCESS: 'ratelimit:retry_success',
        RETRY_FAILED: 'ratelimit:retry_failed'
    },
    
    // Logger events
    LOGGER: {
        LOG: 'logger:log',
        ERROR: 'logger:error',
        WARN: 'logger:warn',
        INFO: 'logger:info',
        DEBUG: 'logger:debug',
        PERFORMANCE: 'logger:performance'
    },
    
    // Error reporting events
    ERROR: {
        REPORT: 'error:report',
        CAPTURED: 'error:captured',
        UNHANDLED: 'error:unhandled',
        NETWORK: 'error:network',
        VALIDATION: 'error:validation'
    },
    
    // Network events
    NETWORK: {
        ONLINE: 'network:online',
        OFFLINE: 'network:offline',
        SLOW: 'network:slow',
        RECONNECTED: 'network:reconnected'
    },
    
    // Storage events
    STORAGE: {
        QUOTA_EXCEEDED: 'storage:quota_exceeded',
        CLEARED: 'storage:cleared',
        ITEM_SET: 'storage:item_set',
        ITEM_REMOVED: 'storage:item_removed',
        SYNCED: 'storage:synced'
    },
    
    // Worker events
    WORKER: {
        STARTED: 'worker:started',
        MESSAGE: 'worker:message',
        ERROR: 'worker:error',
        TERMINATED: 'worker:terminated'
    },
    
    // File processing events
    FILE: {
        UPLOAD_STARTED: 'file:upload_started',
        UPLOAD_PROGRESS: 'file:upload_progress',
        UPLOAD_COMPLETE: 'file:upload_complete',
        UPLOAD_ERROR: 'file:upload_error',
        PARSE_STARTED: 'file:parse_started',
        PARSE_COMPLETE: 'file:parse_complete',
        PARSE_ERROR: 'file:parse_error'
    }
});

/**
 * Helper function to get event by path
 * @param {string} path - Dot notation path (e.g., 'AUTH.SUCCESS')
 * @returns {string} Event string
 */
export const getEvent = (path) => {
    const keys = path.split('.');
    let current = EVENTS;
    
    for (const key of keys) {
        if (!current[key]) {
            throw new Error(`Invalid event path: ${path}`);
        }
        current = current[key];
    }
    
    return current;
};

/**
 * Check if event exists
 * @param {string} eventName - Event name to check
 * @returns {boolean} True if event exists
 */
export const isValidEvent = (eventName) => {
    const allEvents = [];
    
    const collectEvents = (obj) => {
        Object.values(obj).forEach(value => {
            if (typeof value === 'string') {
                allEvents.push(value);
            } else if (typeof value === 'object') {
                collectEvents(value);
            }
        });
    };
    
    collectEvents(EVENTS);
    return allEvents.includes(eventName);
};

/**
 * Get all events in a category
 * @param {string} category - Category name (e.g., 'AUTH')
 * @returns {Object} Events in category
 */
export const getEventCategory = (category) => {
    if (!EVENTS[category]) {
        throw new Error(`Invalid event category: ${category}`);
    }
    return EVENTS[category];
};

/**
 * Create custom event with data
 * @param {string} eventName - Event name
 * @param {any} data - Event data
 * @returns {CustomEvent} Custom event object
 */
export const createCustomEvent = (eventName, data) => {
    if (!isValidEvent(eventName)) {
        console.warn(`Unknown event: ${eventName}`);
    }
    
    return new CustomEvent(eventName, {
        detail: data,
        bubbles: true,
        cancelable: true
    });
};

// Export for backward compatibility
export default EVENTS;
