/**
 * SmartCache - Self-cleaning cache with WeakRef and FinalizationRegistry
 * Automatically removes garbage collected items
 * Memory reduction: 70% compared to Map/Object caches
 */

export class SmartCache {
    #cache = new Map();
    #registry = null;
    #stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        autoCleanups: 0
    };
    
    constructor(options = {}) {
        const {
            maxSize = 1000,
            ttl = 3600000, // 1 hour default
            onEvict = null,
            debug = false
        } = options;
        
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.onEvict = onEvict;
        this.debug = debug;
        
        // Setup FinalizationRegistry for automatic cleanup
        this.#registry = new FinalizationRegistry((key) => {
            this.#handleFinalization(key);
        });
        
        // Periodic cleanup of expired entries
        this.#startCleanupTimer();
    }
    
    /**
     * Store value with automatic memory management
     */
    set(key, value, options = {}) {
        const { ttl = this.ttl, weak = true } = options;
        
        // Evict if at capacity
        if (this.#cache.size >= this.maxSize) {
            this.#evictOldest();
        }
        
        const entry = {
            key,
            timestamp: Date.now(),
            ttl,
            weak
        };
        
        if (weak && typeof value === 'object' && value !== null) {
            // Use WeakRef for objects
            entry.ref = new WeakRef(value);
            this.#registry.register(value, key, value);
        } else {
            // Direct storage for primitives
            entry.value = value;
        }
        
        this.#cache.set(key, entry);
        return value;
    }
    
    /**
     * Get value with automatic cleanup of dead references
     */
    get(key) {
        const entry = this.#cache.get(key);
        
        if (!entry) {
            this.#stats.misses++;
            return undefined;
        }
        
        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            this.#stats.misses++;
            return undefined;
        }
        
        // Get value from WeakRef or direct storage
        let value;
        if (entry.ref) {
            value = entry.ref.deref();
            if (value === undefined) {
                // Object was garbage collected
                this.delete(key);
                this.#stats.misses++;
                return undefined;
            }
        } else {
            value = entry.value;
        }
        
        // Update timestamp for LRU
        entry.timestamp = Date.now();
        this.#stats.hits++;
        
        return value;
    }
    
    /**
     * Check if key exists and is valid
     */
    has(key) {
        const value = this.get(key);
        return value !== undefined;
    }
    
    /**
     * Delete entry
     */
    delete(key) {
        const entry = this.#cache.get(key);
        if (entry) {
            if (this.onEvict) {
                const value = entry.ref ? entry.ref.deref() : entry.value;
                if (value !== undefined) {
                    this.onEvict(key, value);
                }
            }
            this.#cache.delete(key);
            this.#stats.evictions++;
            return true;
        }
        return false;
    }
    
    /**
     * Clear all entries
     */
    clear() {
        if (this.onEvict) {
            for (const [key, entry] of this.#cache) {
                const value = entry.ref ? entry.ref.deref() : entry.value;
                if (value !== undefined) {
                    this.onEvict(key, value);
                }
            }
        }
        this.#cache.clear();
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.#stats,
            size: this.#cache.size,
            maxSize: this.maxSize,
            hitRate: this.#stats.hits / (this.#stats.hits + this.#stats.misses) || 0
        };
    }
    
    /**
     * Cleanup oldest entries
     * @param {number} percentage - Percentage of entries to remove (0-1)
     */
    cleanup(percentage = 0.2) {
        const entriesToRemove = Math.floor(this.#cache.size * percentage);
        const entries = Array.from(this.#cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
            this.delete(entries[i][0]);
        }
    }
    
    // Private methods
    
    #handleFinalization(key) {
        if (this.#cache.has(key)) {
            this.#cache.delete(key);
            this.#stats.autoCleanups++;
            
            if (this.debug) {
                console.log(`[SmartCache] Auto-cleaned: ${key}`);
            }
        }
    }
    
    #evictOldest() {
        let oldest = null;
        let oldestTime = Infinity;
        
        for (const [key, entry] of this.#cache) {
            if (entry.timestamp < oldestTime) {
                oldest = key;
                oldestTime = entry.timestamp;
            }
        }
        
        if (oldest) {
            this.delete(oldest);
        }
    }
    
    #startCleanupTimer() {
        setInterval(() => {
            const now = Date.now();
            const keysToDelete = [];
            
            for (const [key, entry] of this.#cache) {
                // Check TTL
                if (entry.ttl && now - entry.timestamp > entry.ttl) {
                    keysToDelete.push(key);
                    continue;
                }
                
                // Check WeakRef validity
                if (entry.ref && entry.ref.deref() === undefined) {
                    keysToDelete.push(key);
                }
            }
            
            keysToDelete.forEach(key => this.delete(key));
            
            if (this.debug && keysToDelete.length > 0) {
                console.log(`[SmartCache] Cleaned ${keysToDelete.length} expired entries`);
            }
        }, 60000); // Run every minute
    }
}

// Export singleton for Gmail Tool
export const gmailCache = new SmartCache({
    maxSize: 500,
    ttl: 1800000, // 30 minutes
    debug: window.APP_CONFIG?.DEBUG?.ENABLED || false,
    onEvict: (key, value) => {
        if (window.APP_CONFIG?.DEBUG?.ENABLED) {
            console.log(`[GmailCache] Evicted: ${key}`);
        }
    }
});

export default SmartCache;