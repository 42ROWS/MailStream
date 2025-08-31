/**
 * StateManager - Reactive State Management System
 * Provides immutable state management with automatic change detection and subscriptions
 */

import eventBus from './EventBus.js';
import { deepClone, deepMerge, deepEqual, deepFreeze, EVENTS } from '../utils/index.js';

class StateManager {
    #state = {};
    #subscribers = new Map();
    #history = [];
    #maxHistorySize = 50;
    #middleware = [];
    #computedProperties = new Map();
    #locked = false;
    #transactions = [];
    
    constructor(initialState = {}, options = {}) {
        this.#state = deepFreeze(deepClone(initialState));
        this.#maxHistorySize = options.maxHistorySize || 50;
        this.debug = options.debug || false;
        
        // Store initial state in history
        this.#addToHistory('INIT', null, initialState);
        
        // Setup proxy for reactive access
        this.state = this.#createProxy(this.#state);
    }
    
    /**
     * Get state value by path
     * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
     * @param {any} defaultValue - Default value if path doesn't exist
     * @returns {any} State value
     */
    get(path, defaultValue = undefined) {
        if (!path) return deepClone(this.#state);
        
        const keys = path.split('.');
        let current = this.#state;
        
        for (const key of keys) {
            if (current == null || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current === undefined ? defaultValue : deepClone(current);
    }
    
    /**
     * Set state value by path
     * @param {string|Object} path - Dot-notation path or object to merge
     * @param {any} value - Value to set (if path is string)
     * @returns {StateManager} Self for chaining
     */
    set(path, value) {
        if (this.#locked) {
            throw new Error('State is locked. Use transaction() to make changes.');
        }
        
        let updates;
        
        if (typeof path === 'object' && !Array.isArray(path)) {
            // Merge object
            updates = path;
        } else {
            // Set by path
            updates = this.#createObjectFromPath(path, value);
        }
        
        // Apply middleware
        const processedUpdates = this.#applyMiddleware('SET', updates);
        
        // Create new state
        const prevState = this.#state;
        const newState = deepMerge(deepClone(this.#state), processedUpdates);
        
        // Check if state actually changed
        if (deepEqual(prevState, newState)) {
            return this;
        }
        
        // Update state
        this.#state = deepFreeze(newState);
        this.state = this.#createProxy(this.#state);
        
        // Add to history
        this.#addToHistory('SET', path, value);
        
        // Notify subscribers
        this.#notifySubscribers(path, prevState, newState);
        
        // Emit global change event
        eventBus.emit(EVENTS.STATE.CHANGE, {
            path,
            value,
            prevState: deepClone(prevState),
            newState: deepClone(newState)
        });
        
        if (this.debug) {
            console.log('[StateManager] State updated:', path, value);
        }
        
        return this;
    }
    
    /**
     * Update state with a function
     * @param {string} path - Dot-notation path
     * @param {Function} updater - Function that receives current value and returns new value
     * @returns {StateManager} Self for chaining
     */
    update(path, updater) {
        const currentValue = this.get(path);
        const newValue = updater(currentValue);
        return this.set(path, newValue);
    }
    
    /**
     * Delete state value by path
     * @param {string} path - Dot-notation path
     * @returns {StateManager} Self for chaining
     */
    delete(path) {
        if (this.#locked) {
            throw new Error('State is locked. Use transaction() to make changes.');
        }
        
        const keys = path.split('.');
        const lastKey = keys.pop();
        const parentPath = keys.join('.');
        
        const parent = parentPath ? this.get(parentPath) : deepClone(this.#state);
        
        if (parent && typeof parent === 'object' && lastKey in parent) {
            delete parent[lastKey];
            
            if (parentPath) {
                this.set(parentPath, parent);
            } else {
                this.set(parent);
            }
        }
        
        return this;
    }
    
    /**
     * Subscribe to state changes
     * @param {string|Function} pathOrCallback - Path to watch or callback for all changes
     * @param {Function} callback - Callback function (if path provided)
     * @returns {Function} Unsubscribe function
     */
    subscribe(pathOrCallback, callback) {
        let path = '*';
        let handler = pathOrCallback;
        
        if (typeof pathOrCallback === 'string') {
            path = pathOrCallback;
            handler = callback;
        }
        
        if (typeof handler !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        
        if (!this.#subscribers.has(path)) {
            this.#subscribers.set(path, new Set());
        }
        
        this.#subscribers.get(path).add(handler);
        
        // Return unsubscribe function
        return () => {
            const subscribers = this.#subscribers.get(path);
            if (subscribers) {
                subscribers.delete(handler);
                if (subscribers.size === 0) {
                    this.#subscribers.delete(path);
                }
            }
        };
    }
    
    /**
     * Create computed property
     * @param {string} name - Property name
     * @param {Function} getter - Getter function
     * @param {Array<string>} dependencies - State paths this computed property depends on
     */
    computed(name, getter, dependencies = []) {
        this.#computedProperties.set(name, {
            getter,
            dependencies,
            cache: null,
            isDirty: true
        });
        
        // Subscribe to dependency changes
        dependencies.forEach(dep => {
            this.subscribe(dep, () => {
                const computed = this.#computedProperties.get(name);
                if (computed) {
                    computed.isDirty = true;
                }
            });
        });
    }
    
    /**
     * Get computed property value
     * @param {string} name - Property name
     * @returns {any} Computed value
     */
    getComputed(name) {
        const computed = this.#computedProperties.get(name);
        if (!computed) {
            throw new Error(`Computed property "${name}" not found`);
        }
        
        if (computed.isDirty) {
            computed.cache = computed.getter(this.#state);
            computed.isDirty = false;
        }
        
        return computed.cache;
    }
    
    /**
     * Execute multiple state changes as a transaction
     * @param {Function} callback - Transaction callback
     * @returns {Promise} Promise that resolves when transaction completes
     */
    async transaction(callback) {
        const transaction = {
            id: Date.now(),
            changes: [],
            committed: false
        };
        
        this.#transactions.push(transaction);
        
        try {
            // Create transaction context
            const context = {
                get: (path) => this.get(path),
                set: (path, value) => {
                    transaction.changes.push({ type: 'set', path, value });
                    return context;
                },
                delete: (path) => {
                    transaction.changes.push({ type: 'delete', path });
                    return context;
                }
            };
            
            // Execute transaction
            await callback(context);
            
            // Apply all changes
            for (const change of transaction.changes) {
                if (change.type === 'set') {
                    this.set(change.path, change.value);
                } else if (change.type === 'delete') {
                    this.delete(change.path);
                }
            }
            
            transaction.committed = true;
            
            // Emit transaction event
            eventBus.emit(EVENTS.STATE.TRANSACTION, {
                id: transaction.id,
                changes: transaction.changes
            });
            
        } catch (error) {
            // Rollback on error
            console.error('[StateManager] Transaction failed:', error);
            throw error;
        } finally {
            // Remove transaction
            const index = this.#transactions.indexOf(transaction);
            if (index > -1) {
                this.#transactions.splice(index, 1);
            }
        }
    }
    
    /**
     * Add middleware
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new TypeError('Middleware must be a function');
        }
        this.#middleware.push(middleware);
    }
    
    /**
     * Reset state to initial or provided state
     * @param {Object} newState - New state (optional)
     */
    reset(newState) {
        const resetState = newState || this.#history[0]?.newState || {};
        this.#state = deepFreeze(deepClone(resetState));
        this.state = this.#createProxy(this.#state);
        
        this.#addToHistory('RESET', null, resetState);
        this.#notifySubscribers('*', null, this.#state);
        
        eventBus.emit(EVENTS.STATE.RESET, deepClone(this.#state));
    }
    
    /**
     * Get state history
     * @returns {Array} State history
     */
    getHistory() {
        return [...this.#history];
    }
    
    /**
     * Undo last state change
     */
    undo() {
        if (this.#history.length <= 1) return;
        
        const current = this.#history.pop();
        const previous = this.#history[this.#history.length - 1];
        
        if (previous) {
            this.#state = deepFreeze(deepClone(previous.newState));
            this.state = this.#createProxy(this.#state);
            this.#notifySubscribers('*', current.newState, previous.newState);
            
            eventBus.emit(EVENTS.STATE.UNDO, {
                from: current.newState,
                to: previous.newState
            });
        }
    }
    
    /**
     * Lock state to prevent changes
     */
    lock() {
        this.#locked = true;
    }
    
    /**
     * Unlock state to allow changes
     */
    unlock() {
        this.#locked = false;
    }
    
    /**
     * Check if state is locked
     * @returns {boolean} Lock status
     */
    isLocked() {
        return this.#locked;
    }
    
    /**
     * Export state as JSON
     * @returns {string} JSON string
     */
    toJSON() {
        return JSON.stringify(this.#state);
    }
    
    /**
     * Import state from JSON
     * @param {string} json - JSON string
     */
    fromJSON(json) {
        try {
            const state = JSON.parse(json);
            this.reset(state);
        } catch (error) {
            console.error('[StateManager] Failed to parse JSON:', error);
            throw error;
        }
    }
    
    // Private methods
    
    #createProxy(target) {
        return new Proxy(target, {
            get: (obj, prop) => {
                if (typeof obj[prop] === 'object' && obj[prop] !== null) {
                    return this.#createProxy(obj[prop]);
                }
                return obj[prop];
            },
            set: () => {
                throw new Error('Direct state mutation is not allowed. Use set() method.');
            },
            deleteProperty: () => {
                throw new Error('Direct state deletion is not allowed. Use delete() method.');
            }
        });
    }
    
    #createObjectFromPath(path, value) {
        const keys = path.split('.');
        const result = {};
        let current = result;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        return result;
    }
    
    #applyMiddleware(action, data) {
        let result = data;
        for (const middleware of this.#middleware) {
            result = middleware(action, result, this.#state) || result;
        }
        return result;
    }
    
    #notifySubscribers(path, prevState, newState) {
        // Notify exact path subscribers
        const exactSubscribers = this.#subscribers.get(path);
        if (exactSubscribers) {
            exactSubscribers.forEach(callback => {
                callback(newState, prevState, path);
            });
        }
        
        // Notify wildcard subscribers
        const wildcardSubscribers = this.#subscribers.get('*');
        if (wildcardSubscribers) {
            wildcardSubscribers.forEach(callback => {
                callback(newState, prevState, path);
            });
        }
        
        // Notify parent path subscribers
        if (typeof path === 'string' && path.includes('.')) {
            const parts = path.split('.');
            for (let i = parts.length - 1; i > 0; i--) {
                const parentPath = parts.slice(0, i).join('.');
                const parentSubscribers = this.#subscribers.get(parentPath);
                if (parentSubscribers) {
                    parentSubscribers.forEach(callback => {
                        callback(newState, prevState, path);
                    });
                }
            }
        }
    }
    
    #addToHistory(action, path, value) {
        this.#history.push({
            action,
            path,
            value: deepClone(value),
            newState: deepClone(this.#state),
            timestamp: Date.now()
        });
        
        // Trim history
        if (this.#history.length > this.#maxHistorySize) {
            this.#history.shift();
        }
    }
}

// Create singleton instance
const stateManager = new StateManager({}, { debug: window.APP_CONFIG?.DEBUG?.ENABLED || false });

// Export singleton as default
export default stateManager;
