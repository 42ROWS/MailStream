/**
 * StorageHelper - Unified storage management with error handling and TTL support
 * Handles both sessionStorage and localStorage with fallback options
 */

import { EVENTS } from './Events.js';
import eventBus from '../core/EventBus.js';
import logger from '../core/Logger.js';

class StorageHelper {
    constructor(storageType = 'session', options = {}) {
        this.storageType = storageType;
        this.prefix = options.prefix || 'gmail_tool_';
        this.ttlEnabled = options.ttlEnabled ?? true;
        this.defaultTTL = options.defaultTTL || 3600000; // 1 hour default
        this.encryptionEnabled = options.encryption || false;
        
        // Select storage backend
        this.storage = this.#selectStorage(storageType);
        
        // Check if storage is available
        this.isAvailable = this.#checkStorageAvailability();
        
        // Memory fallback for when storage is not available
        this.memoryStorage = new Map();
        
        // Bind methods
        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.remove = this.remove.bind(this);
        this.clear = this.clear.bind(this);
    }
    
    /**
     * Get item from storage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Stored value or default
     */
    get(key, defaultValue = null) {
        const fullKey = this.#getFullKey(key);
        
        try {
            let data;
            
            if (this.isAvailable) {
                const stored = this.storage.getItem(fullKey);
                if (!stored) return defaultValue;
                
                data = JSON.parse(stored);
            } else {
                // Use memory fallback
                data = this.memoryStorage.get(fullKey);
                if (!data) return defaultValue;
            }
            
            // Check TTL if enabled
            if (this.ttlEnabled && data.ttl) {
                if (Date.now() > data.ttl) {
                    this.remove(key);
                    return defaultValue;
                }
            }
            
            // Decrypt if needed
            if (this.encryptionEnabled && data.encrypted) {
                return this.#decrypt(data.value);
            }
            
            return data.value !== undefined ? data.value : defaultValue;
            
        } catch (error) {
            logger.warn(`Failed to get item from storage: ${key}`, error);
            return defaultValue;
        }
    }
    
    /**
     * Set item in storage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @param {Object} options - Storage options
     * @returns {boolean} Success status
     */
    set(key, value, options = {}) {
        const fullKey = this.#getFullKey(key);
        const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
        
        try {
            // Prepare data
            let data = {
                value,
                timestamp: Date.now()
            };
            
            // Add TTL if enabled
            if (this.ttlEnabled && ttl > 0) {
                data.ttl = Date.now() + ttl;
            }
            
            // Encrypt if needed
            if (this.encryptionEnabled) {
                data.value = this.#encrypt(value);
                data.encrypted = true;
            }
            
            const serialized = JSON.stringify(data);
            
            if (this.isAvailable) {
                try {
                    this.storage.setItem(fullKey, serialized);
                } catch (e) {
                    // Handle quota exceeded
                    if (e.name === 'QuotaExceededError') {
                        this.#handleQuotaExceeded();
                        // Try once more after cleanup
                        this.storage.setItem(fullKey, serialized);
                    } else {
                        throw e;
                    }
                }
            } else {
                // Use memory fallback
                this.memoryStorage.set(fullKey, data);
            }
            
            // Emit event
            eventBus.emit(EVENTS.STORAGE.ITEM_SET, { key, value });
            
            return true;
            
        } catch (error) {
            logger.error(`Failed to set item in storage: ${key}`, error);
            return false;
        }
    }
    
    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    remove(key) {
        const fullKey = this.#getFullKey(key);
        
        try {
            if (this.isAvailable) {
                this.storage.removeItem(fullKey);
            } else {
                this.memoryStorage.delete(fullKey);
            }
            
            // Emit event
            eventBus.emit(EVENTS.STORAGE.ITEM_REMOVED, { key });
            
            return true;
            
        } catch (error) {
            logger.error(`Failed to remove item from storage: ${key}`, error);
            return false;
        }
    }
    
    /**
     * Clear all items with prefix
     * @param {boolean} force - Clear all items regardless of prefix
     * @returns {number} Number of items cleared
     */
    clear(force = false) {
        let cleared = 0;
        
        try {
            if (this.isAvailable) {
                const keys = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (force || key.startsWith(this.prefix)) {
                        keys.push(key);
                    }
                }
                
                keys.forEach(key => {
                    this.storage.removeItem(key);
                    cleared++;
                });
            } else {
                // Clear memory storage
                if (force) {
                    cleared = this.memoryStorage.size;
                    this.memoryStorage.clear();
                } else {
                    this.memoryStorage.forEach((_, key) => {
                        if (key.startsWith(this.prefix)) {
                            this.memoryStorage.delete(key);
                            cleared++;
                        }
                    });
                }
            }
            
            // Emit event
            eventBus.emit(EVENTS.STORAGE.CLEARED, { cleared });
            
            logger.info(`Cleared ${cleared} items from storage`);
            
            return cleared;
            
        } catch (error) {
            logger.error('Failed to clear storage', error);
            return 0;
        }
    }
    
    /**
     * Check if key exists
     * @param {string} key - Storage key
     * @returns {boolean} True if exists
     */
    has(key) {
        const fullKey = this.#getFullKey(key);
        
        if (this.isAvailable) {
            return this.storage.getItem(fullKey) !== null;
        } else {
            return this.memoryStorage.has(fullKey);
        }
    }
    
    /**
     * Get all keys with prefix
     * @returns {Array} Array of keys
     */
    keys() {
        const keys = [];
        
        if (this.isAvailable) {
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key.startsWith(this.prefix)) {
                    keys.push(key.replace(this.prefix, ''));
                }
            }
        } else {
            this.memoryStorage.forEach((_, key) => {
                if (key.startsWith(this.prefix)) {
                    keys.push(key.replace(this.prefix, ''));
                }
            });
        }
        
        return keys;
    }
    
    /**
     * Get storage size
     * @returns {Object} Size information
     */
    getSize() {
        let totalSize = 0;
        let itemCount = 0;
        
        if (this.isAvailable) {
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key.startsWith(this.prefix)) {
                    const value = this.storage.getItem(key);
                    totalSize += key.length + value.length;
                    itemCount++;
                }
            }
        } else {
            this.memoryStorage.forEach((value, key) => {
                if (key.startsWith(this.prefix)) {
                    totalSize += key.length + JSON.stringify(value).length;
                    itemCount++;
                }
            });
        }
        
        return {
            bytes: totalSize,
            kilobytes: totalSize / 1024,
            megabytes: totalSize / (1024 * 1024),
            items: itemCount
        };
    }
    
    /**
     * Clean expired items
     * @returns {number} Number of items cleaned
     */
    cleanExpired() {
        if (!this.ttlEnabled) return 0;
        
        let cleaned = 0;
        const now = Date.now();
        
        this.keys().forEach(key => {
            const fullKey = this.#getFullKey(key);
            
            try {
                let data;
                
                if (this.isAvailable) {
                    const stored = this.storage.getItem(fullKey);
                    if (stored) {
                        data = JSON.parse(stored);
                    }
                } else {
                    data = this.memoryStorage.get(fullKey);
                }
                
                if (data && data.ttl && now > data.ttl) {
                    this.remove(key);
                    cleaned++;
                }
            } catch (error) {
                // Invalid data, remove it
                this.remove(key);
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            logger.debug(`Cleaned ${cleaned} expired items from storage`);
        }
        
        return cleaned;
    }
    
    /**
     * Export all storage data
     * @returns {Object} All storage data
     */
    export() {
        const data = {};
        
        this.keys().forEach(key => {
            data[key] = this.get(key);
        });
        
        return data;
    }
    
    /**
     * Import storage data
     * @param {Object} data - Data to import
     * @returns {number} Number of items imported
     */
    import(data) {
        let imported = 0;
        
        Object.entries(data).forEach(([key, value]) => {
            if (this.set(key, value)) {
                imported++;
            }
        });
        
        logger.info(`Imported ${imported} items to storage`);
        
        return imported;
    }
    
    // Private methods
    
    #selectStorage(type) {
        switch (type) {
            case 'local':
                return window.localStorage;
            case 'session':
                return window.sessionStorage;
            default:
                return window.sessionStorage;
        }
    }
    
    #checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            this.storage.setItem(testKey, 'test');
            this.storage.removeItem(testKey);
            return true;
        } catch (e) {
            logger.warn('Storage not available, using memory fallback');
            return false;
        }
    }
    
    #getFullKey(key) {
        return `${this.prefix}${key}`;
    }
    
    #handleQuotaExceeded() {
        logger.warn('Storage quota exceeded, cleaning old items');
        
        // Clean expired items first
        this.cleanExpired();
        
        // If still not enough space, remove oldest items
        const items = [];
        this.keys().forEach(key => {
            const data = this.get(key);
            items.push({ key, timestamp: data?.timestamp || 0 });
        });
        
        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest 25% of items
        const toRemove = Math.floor(items.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            this.remove(items[i].key);
        }
        
        eventBus.emit(EVENTS.STORAGE.QUOTA_EXCEEDED, {
            cleaned: toRemove
        });
    }
    
    #encrypt(value) {
        // Simple XOR encryption for demo (use proper encryption in production)
        const key = 'gmail_tool_secret_key';
        const str = JSON.stringify(value);
        let result = '';
        
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(
                str.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        return btoa(result);
    }
    
    #decrypt(encrypted) {
        // Simple XOR decryption for demo (use proper encryption in production)
        const key = 'gmail_tool_secret_key';
        const str = atob(encrypted);
        let result = '';
        
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(
                str.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        return JSON.parse(result);
    }
}

// Create default instances
export const sessionStorage = new StorageHelper('session');
export const localStorage = new StorageHelper('local');

// Export class for custom instances
export default StorageHelper;
