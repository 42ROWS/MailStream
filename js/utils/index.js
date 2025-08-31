/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * Utils Index - Central export point for all utilities
 * Provides easy access to all utility functions and classes
 */

// Import all utilities
import * as SharedUtilities from './SharedUtilities.js';
import { EVENTS, getEvent, isValidEvent, getEventCategory, createCustomEvent } from './Events.js';
import StorageHelper, { sessionStorage, localStorage } from './StorageHelper.js';
// Decorators removed - not needed for this project
import * as UIHelpers from './UIHelpers.js';

// Re-export individual utilities for convenient access
export const {
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
} = SharedUtilities;

// Re-export events
export {
    EVENTS,
    getEvent,
    isValidEvent,
    getEventCategory,
    createCustomEvent
};

// Re-export storage
export {
    StorageHelper,
    sessionStorage,
    localStorage
};

// Create unified storage instance
export const storage = sessionStorage; // Default to session storage

// Decorators removed - not needed for this project

/**
 * SingletonService base class
 * Provides a base for creating singleton services
 */
export class SingletonService {
    static #instances = new Map();
    
    static getInstance() {
        const className = this.name;
        
        if (!this.#instances.has(className)) {
            this.#instances.set(className, new this());
        }
        
        return this.#instances.get(className);
    }
    
    static resetInstance() {
        const className = this.name;
        this.#instances.delete(className);
    }
    
    constructor() {
        const className = this.constructor.name;
        
        if (SingletonService.#instances.has(className)) {
            return SingletonService.#instances.get(className);
        }
    }
}

/**
 * AsyncQueue class for managing async operations
 */
export class AsyncQueue {
    constructor(concurrency = 1) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }
    
    async add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }
    
    async process() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }
        
        this.running++;
        const { fn, resolve, reject } = this.queue.shift();
        
        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }
    
    clear() {
        this.queue = [];
    }
    
    get size() {
        return this.queue.length;
    }
    
    get isRunning() {
        return this.running > 0;
    }
}

/**
 * Create enum-like object
 * @param {Array} values - Enum values
 * @returns {Object} Frozen enum object
 */
export const createEnum = (...values) => {
    const enumObj = {};
    
    values.forEach(value => {
        enumObj[value] = value;
    });
    
    return Object.freeze(enumObj);
};

/**
 * Create a factory function
 * @param {Function} Constructor - Constructor function
 * @param {Function} initializer - Initialization function
 * @returns {Function} Factory function
 */
export const createFactory = (Constructor, initializer) => {
    const instances = new Map();
    
    return (key, ...args) => {
        if (!instances.has(key)) {
            const instance = new Constructor(...args);
            if (initializer) {
                initializer(instance, key);
            }
            instances.set(key, instance);
        }
        
        return instances.get(key);
    };
};

/**
 * Pipe functions together
 * @param {...Function} fns - Functions to pipe
 * @returns {Function} Piped function
 */
export const pipe = (...fns) => {
    return (value) => fns.reduce((acc, fn) => fn(acc), value);
};

/**
 * Compose functions together (right to left)
 * @param {...Function} fns - Functions to compose
 * @returns {Function} Composed function
 */
export const composeFunc = (...fns) => {
    return (value) => fns.reduceRight((acc, fn) => fn(acc), value);
};

/**
 * Curry a function
 * @param {Function} fn - Function to curry
 * @returns {Function} Curried function
 */
export const curry = (fn) => {
    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        }
        
        return function(...nextArgs) {
            return curried.apply(this, args.concat(nextArgs));
        };
    };
};

/**
 * Partial application
 * @param {Function} fn - Function to partially apply
 * @param {...any} presetArgs - Preset arguments
 * @returns {Function} Partially applied function
 */
export const partial = (fn, ...presetArgs) => {
    return (...laterArgs) => fn(...presetArgs, ...laterArgs);
};

/**
 * Create observable value
 * @param {any} initialValue - Initial value
 * @returns {Object} Observable object
 */
export const createObservable = (initialValue) => {
    let value = initialValue;
    const listeners = new Set();
    
    return {
        get() {
            return value;
        },
        
        set(newValue) {
            const oldValue = value;
            value = newValue;
            listeners.forEach(listener => listener(newValue, oldValue));
        },
        
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        
        unsubscribe(listener) {
            listeners.delete(listener);
        }
    };
};

/**
 * Check if running in development mode
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => {
    return window.APP_CONFIG?.DEBUG?.ENABLED || false;
};

/**
 * Check if running in production mode
 * @returns {boolean} True if in production
 */
export const isProduction = () => {
    return !isDevelopment();
};

/**
 * No-op function
 */
export const noop = () => {};

/**
 * Identity function
 * @param {any} value - Value to return
 * @returns {any} Same value
 */
export const identity = (value) => value;

/**
 * Always returns true
 * @returns {boolean} True
 */
export const always = () => true;

/**
 * Always returns false
 * @returns {boolean} False
 */
export const never = () => false;

// Default export with all utilities
export default {
    // SharedUtilities
    ...SharedUtilities,
    
    // Events
    EVENTS,
    getEvent,
    isValidEvent,
    getEventCategory,
    createCustomEvent,
    
    // Storage
    StorageHelper,
    storage,
    sessionStorage,
    localStorage,
    
    // Decorators removed
    
    // UI Helpers
    ...UIHelpers,
    
    // Classes
    SingletonService,
    AsyncQueue,
    
    // Functional utilities
    createEnum,
    createFactory,
    pipe,
    composeFunc,
    curry,
    partial,
    createObservable,
    
    // Environment
    isDevelopment,
    isProduction,
    
    // Helpers
    noop,
    identity,
    always,
    never
};
