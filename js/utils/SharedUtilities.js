/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * SharedUtilities - Common utility functions used across the application
 * Eliminates code duplication and provides a single source of truth
 */

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Size of each chunk
 * @returns {Array} Array of chunks
 */
export const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier
 */
export const generateId = (prefix = '') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

/**
 * Deep clone object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Set) return new Set([...obj].map(item => deepClone(item)));
    if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, deepClone(v)]));
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
};

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export const deepMerge = (target, source) => {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    
    return output;
};

/**
 * Check if value is an object
 * @param {any} item - Item to check
 * @returns {boolean} True if object
 */
const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Base64 encoding/decoding utilities
 */
export const base64 = {
    /**
     * Encode string to URL-safe base64
     * @param {string} str - String to encode
     * @returns {string} Encoded string
     */
    encode: (str) => {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    },
    
    /**
     * Decode URL-safe base64 to string
     * @param {string} str - Encoded string
     * @returns {string} Decoded string
     */
    decode: (str) => {
        const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
        try {
            const decoded = atob(normalized);
            return decodeURIComponent(escape(decoded));
        } catch (e) {
            // Fallback for non-UTF8 content
            return atob(normalized);
        }
    },
    
    /**
     * Encode string with UTF-8 support
     * @param {string} str - String to encode
     * @returns {string} Encoded string
     */
    encodeUTF8: (str) => {
        return btoa(unescape(encodeURIComponent(str)));
    },
    
    /**
     * Decode string with UTF-8 support
     * @param {string} str - Encoded string
     * @returns {string} Decoded string
     */
    decodeUTF8: (str) => {
        return decodeURIComponent(escape(atob(str)));
    }
};

/**
 * Wait for condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {Object} options - Options
 * @returns {Promise} Promise that resolves when condition is true
 */
export const waitFor = (condition, options = {}) => {
    const {
        timeout = 5000,
        interval = 100,
        errorMessage = 'Timeout waiting for condition'
    } = options;
    
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const check = () => {
            if (condition()) {
                resolve();
            } else if (Date.now() - startTime >= timeout) {
                reject(new Error(errorMessage));
            } else {
                setTimeout(check, interval);
            }
        };
        
        check();
    });
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Promise with result or final error
 */
export const retry = async (fn, options = {}) => {
    const {
        maxAttempts = 3,
        delay = 1000,
        backoff = 2,
        maxDelay = 30000,
        shouldRetry = () => true
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts - 1 || !shouldRetry(error)) {
                throw error;
            }
            
            const waitTime = Math.min(delay * Math.pow(backoff, attempt), maxDelay);
            await sleep(waitTime);
        }
    }
    
    throw lastError;
};

/**
 * Simple memoization
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Optional key generator
 * @returns {Function} Memoized function
 */
export const memoize = (fn, keyGenerator) => {
    const cache = new Map();
    
    return function(...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = fn.apply(this, args);
        cache.set(key, result);
        
        // Handle promises
        if (result instanceof Promise) {
            result.catch(() => cache.delete(key));
        }
        
        return result;
    };
};

/**
 * Replace template variables
 * @param {string} template - Template string with {{variables}}
 * @param {Object} data - Data object with values
 * @returns {string} String with replaced variables
 */
export const replaceTemplateVariables = (template, data) => {
    let result = template;
    
    // Replace all variables in format {{variable}}
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
        result = result.replace(regex, data[key] || '');
    });
    
    // Remove any remaining placeholders
    result = result.replace(/{{.*?}}/g, '');
    
    return result;
};

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Sanitize filename
 * @param {string} filename - Filename to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename, maxLength = 100) => {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, maxLength);
};

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, suffix = '...') => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
};

/**
 * Get nested object value by path
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Value at path
 */
export const getByPath = (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current == null || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current === undefined ? defaultValue : current;
};

/**
 * Set nested object value by path
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 * @returns {Object} Modified object
 */
export const setByPath = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
};

/**
 * Deep equality check for objects
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} True if deeply equal
 */
export const deepEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
};

/**
 * Deep freeze object to make it immutable
 * @param {Object} obj - Object to freeze
 * @returns {Object} Frozen object
 */
export const deepFreeze = (obj) => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
            deepFreeze(obj[prop]);
        }
    });
    return obj;
};

/**
 * Create promise with timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} errorMessage - Error message on timeout
 * @returns {Promise} Promise that rejects on timeout
 */
export const withTimeout = (promise, timeout, errorMessage = 'Operation timed out') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(errorMessage)), timeout)
        )
    ]);
};

/**
 * Batch promises with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply
 * @param {number} concurrency - Max concurrent operations
 * @returns {Promise} Promise with all results
 */
export const batchPromises = async (items, fn, concurrency = 5) => {
    const results = [];
    const executing = [];
    
    for (const item of items) {
        const promise = Promise.resolve().then(() => fn(item));
        results.push(promise);
        
        if (items.length >= concurrency) {
            executing.push(promise);
            
            if (executing.length >= concurrency) {
                await Promise.race(executing);
                executing.splice(executing.findIndex(p => p === promise), 1);
            }
        }
    }
    
    return Promise.all(results);
};

// Export all utilities as default object as well
export default {
    sleep,
    chunkArray,
    generateId,
    deepClone,
    deepMerge,
    deepEqual,
    deepFreeze,
    base64,
    waitFor,
    debounce,
    throttle,
    retry,
    memoize,
    replaceTemplateVariables,
    formatBytes,
    sanitizeFilename,
    truncateText,
    getByPath,
    setByPath,
    withTimeout,
    batchPromises
};
