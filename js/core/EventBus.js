/**
 * EventBus - Advanced Event Management System
 * Provides publish-subscribe pattern with namespace support, wildcards, and priority handling
 */

import { generateId, EVENTS } from '../utils/index.js';

export class EventBus {
    #events = new Map();
    #eventHistory = [];
    #maxHistorySize = 100;
    #suspended = false;
    #oneTimeListeners = new WeakMap();
    
    constructor(options = {}) {
        this.#maxHistorySize = options.maxHistorySize || 100;
        this.debug = options.debug || false;
        
        // Bind methods to maintain context
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
        this.emit = this.emit.bind(this);
        this.once = this.once.bind(this);
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name (supports wildcards: 'user:*' or 'user:login:*')
     * @param {Function} handler - Event handler function
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(event, handler, options = {}) {
        if (typeof handler !== 'function') {
            throw new TypeError('Handler must be a function');
        }
        
        const {
            priority = 0,
            context = null,
            once = false
        } = options;
        
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        
        const listener = {
            handler,
            context,
            priority,
            once,
            id: generateId('listener')
        };
        
        // Insert listener sorted by priority (higher priority first)
        const listeners = this.#events.get(event);
        const insertIndex = listeners.findIndex(l => l.priority < priority);
        
        if (insertIndex === -1) {
            listeners.push(listener);
        } else {
            listeners.splice(insertIndex, 0, listener);
        }
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to "${event}" with priority ${priority}`);
        }
        
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    
    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @param {Object} options - Subscription options
     * @returns {Promise} Promise that resolves when event fires
     */
    once(event, handler, options = {}) {
        if (!handler) {
            // Return promise if no handler provided
            return new Promise(resolve => {
                this.on(event, resolve, { ...options, once: true });
            });
        }
        
        return this.on(event, handler, { ...options, once: true });
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} handler - Handler to remove (if not provided, removes all)
     */
    off(event, handler) {
        if (!event) {
            // Clear all events
            this.#events.clear();
            return;
        }
        
        if (!handler) {
            // Clear all handlers for this event
            this.#events.delete(event);
            return;
        }
        
        const listeners = this.#events.get(event);
        if (listeners) {
            const filtered = listeners.filter(l => l.handler !== handler);
            if (filtered.length > 0) {
                this.#events.set(event, filtered);
            } else {
                this.#events.delete(event);
            }
        }
        
        if (this.debug) {
            console.log(`[EventBus] Unsubscribed from "${event}"`);
        }
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to handlers
     * @returns {boolean} True if event had listeners
     */
    emit(event, ...args) {
        if (this.#suspended) {
            return false;
        }
        
        // Store in history
        this.#addToHistory(event, args);
        
        const listeners = this.#getListenersForEvent(event);
        
        if (listeners.length === 0) {
            // Don't log for common internal events to avoid spam
            const quietEvents = ['logger:log', 'state:change'];
            if (this.debug && !quietEvents.includes(event)) {
                console.log(`[EventBus] No listeners for "${event}"`);
            }
            return false;
        }
        
        if (this.debug) {
            console.log(`[EventBus] Emitting "${event}" to ${listeners.length} listeners`, args);
        }
        
        // Execute handlers
        const errors = [];
        listeners.forEach(listener => {
            try {
                const result = listener.context 
                    ? listener.handler.call(listener.context, ...args)
                    : listener.handler(...args);
                    
                // Handle async handlers
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.error(`[EventBus] Async handler error for "${event}":`, error);
                    });
                }
                
                // Remove once listeners
                if (listener.once) {
                    this.off(event, listener.handler);
                }
            } catch (error) {
                errors.push({ listener, error });
                console.error(`[EventBus] Handler error for "${event}":`, error);
            }
        });
        
        if (errors.length > 0) {
            this.emit(EVENTS.ERROR.CAPTURED, { event, errors });
        }
        
        return true;
    }
    
    /**
     * Emit an event asynchronously
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to handlers
     * @returns {Promise<boolean>} Promise that resolves when all handlers complete
     */
    async emitAsync(event, ...args) {
        if (this.#suspended) {
            return false;
        }
        
        const listeners = this.#getListenersForEvent(event);
        
        if (listeners.length === 0) {
            return false;
        }
        
        const promises = listeners.map(listener => {
            return new Promise(async (resolve, reject) => {
                try {
                    const result = listener.context
                        ? await listener.handler.call(listener.context, ...args)
                        : await listener.handler(...args);
                    
                    if (listener.once) {
                        this.off(event, listener.handler);
                    }
                    
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        await Promise.allSettled(promises);
        return true;
    }
    
    /**
     * Check if event has listeners
     * @param {string} event - Event name
     * @returns {boolean} True if event has listeners
     */
    hasListeners(event) {
        return this.#getListenersForEvent(event).length > 0;
    }
    
    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        if (!event) {
            // Return total listener count
            let count = 0;
            this.#events.forEach(listeners => count += listeners.length);
            return count;
        }
        
        return this.#getListenersForEvent(event).length;
    }
    
    /**
     * Suspend all event emissions
     */
    suspend() {
        this.#suspended = true;
        if (this.debug) {
            console.log('[EventBus] Suspended');
        }
    }
    
    /**
     * Resume event emissions
     */
    resume() {
        this.#suspended = false;
        if (this.debug) {
            console.log('[EventBus] Resumed');
        }
    }
    
    /**
     * Clear all events and listeners
     */
    clear() {
        this.#events.clear();
        this.#eventHistory = [];
        if (this.debug) {
            console.log('[EventBus] Cleared all events');
        }
    }
    
    /**
     * Get event history
     * @param {string} event - Optional event name to filter
     * @returns {Array} Event history
     */
    getHistory(event) {
        if (event) {
            return this.#eventHistory.filter(h => h.event === event);
        }
        return [...this.#eventHistory];
    }
    
    /**
     * Wait for an event
     * @param {string} event - Event name
     * @param {number} timeout - Timeout in milliseconds (0 = no timeout)
     * @returns {Promise} Promise that resolves with event data
     */
    waitFor(event, timeout = 0) {
        return new Promise((resolve, reject) => {
            let timeoutId;
            
            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                this.off(event, handler);
            };
            
            const handler = (...args) => {
                cleanup();
                resolve(args.length === 1 ? args[0] : args);
            };
            
            this.once(event, handler);
            
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error(`Timeout waiting for event "${event}"`));
                }, timeout);
            }
        });
    }
    
    /**
     * Create a namespaced event bus
     * @param {string} namespace - Namespace prefix
     * @returns {Object} Namespaced event bus proxy
     */
    namespace(namespace) {
        const prefix = namespace.endsWith(':') ? namespace : `${namespace}:`;
        
        return {
            on: (event, handler, options) => 
                this.on(`${prefix}${event}`, handler, options),
            
            off: (event, handler) => 
                this.off(event ? `${prefix}${event}` : null, handler),
            
            emit: (event, ...args) => 
                this.emit(`${prefix}${event}`, ...args),
            
            once: (event, handler, options) => 
                this.once(`${prefix}${event}`, handler, options),
            
            hasListeners: (event) => 
                this.hasListeners(`${prefix}${event}`),
            
            listenerCount: (event) => 
                this.listenerCount(event ? `${prefix}${event}` : null)
        };
    }
    
    // Private methods
    
    #getListenersForEvent(event) {
        const listeners = [];
        
        // Direct match
        if (this.#events.has(event)) {
            listeners.push(...this.#events.get(event));
        }
        
        // Wildcard matches
        this.#events.forEach((eventListeners, key) => {
            if (key.includes('*')) {
                const pattern = key.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(event)) {
                    listeners.push(...eventListeners);
                }
            }
        });
        
        // Sort by priority
        return listeners.sort((a, b) => b.priority - a.priority);
    }
    
    #addToHistory(event, args) {
        this.#eventHistory.push({
            event,
            args,
            timestamp: Date.now()
        });
        
        // Trim history if needed
        if (this.#eventHistory.length > this.#maxHistorySize) {
            this.#eventHistory.shift();
        }
    }
}

// Create singleton instance
const eventBus = new EventBus({ debug: window.APP_CONFIG?.DEBUG?.ENABLED || false });

// Export both class and singleton
export default eventBus;
