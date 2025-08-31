/**
 * Logger - Advanced Logging System
 * Provides structured logging with levels, formatting, and persistence
 */

import eventBus from './EventBus.js';
import { EVENTS } from '../utils/index.js';

class Logger {
    static LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    };
    
    #level = Logger.LEVELS.INFO;
    #enabled = true;
    #logHistory = [];
    #maxHistorySize = 1000;
    #prefix = '';
    #styles = {
        debug: 'color: #6B7280; font-weight: normal',
        info: 'color: #3B82F6; font-weight: normal',
        warn: 'color: #F59E0B; font-weight: bold',
        error: 'color: #EF4444; font-weight: bold',
        fatal: 'color: #FFFFFF; background: #EF4444; font-weight: bold; padding: 2px 4px; border-radius: 2px'
    };
    
    constructor(options = {}) {
        this.#level = Logger.LEVELS[options.level?.toUpperCase()] ?? Logger.LEVELS.INFO;
        this.#enabled = options.enabled ?? true;
        this.#maxHistorySize = options.maxHistorySize ?? 1000;
        this.#prefix = options.prefix ?? '';
        
        if (options.styles) {
            this.#styles = { ...this.#styles, ...options.styles };
        }
        
        // Performance monitoring
        this.performance = new PerformanceMonitor(this);
    }
    
    /**
     * Log debug message
     */
    debug(...args) {
        this.#log(Logger.LEVELS.DEBUG, 'debug', args);
    }
    
    /**
     * Log info message
     */
    info(...args) {
        this.#log(Logger.LEVELS.INFO, 'info', args);
    }
    
    /**
     * Log warning message
     */
    warn(...args) {
        this.#log(Logger.LEVELS.WARN, 'warn', args);
    }
    
    /**
     * Log error message
     */
    error(...args) {
        this.#log(Logger.LEVELS.ERROR, 'error', args);
    }
    
    /**
     * Log fatal error message
     */
    fatal(...args) {
        this.#log(Logger.LEVELS.FATAL, 'fatal', args);
    }
    
    /**
     * Log a group of messages
     */
    group(label, callback) {
        if (!this.#enabled) return;
        
        console.group(this.#formatLabel(label));
        try {
            callback();
        } finally {
            console.groupEnd();
        }
    }
    
    /**
     * Log a table
     */
    table(data, columns) {
        if (!this.#enabled) return;
        
        console.table(data, columns);
        this.#addToHistory('table', { data, columns });
    }
    
    /**
     * Create a timer
     */
    time(label) {
        if (!this.#enabled) return;
        
        const key = this.#formatLabel(label);
        console.time(key);
        return key;
    }
    
    /**
     * End a timer
     */
    timeEnd(label) {
        if (!this.#enabled) return;
        
        const key = this.#formatLabel(label);
        console.timeEnd(key);
    }
    
    /**
     * Log with custom styling
     */
    styled(message, style) {
        if (!this.#enabled) return;
        
        console.log(`%c${this.#formatMessage(message)}`, style);
        this.#addToHistory('styled', { message, style });
    }
    
    /**
     * Create a child logger with prefix
     */
    child(prefix) {
        return new Logger({
            level: Object.keys(Logger.LEVELS).find(
                key => Logger.LEVELS[key] === this.#level
            ).toLowerCase(),
            enabled: this.#enabled,
            prefix: this.#prefix ? `${this.#prefix}:${prefix}` : prefix,
            maxHistorySize: this.#maxHistorySize,
            styles: this.#styles
        });
    }
    
    /**
     * Set log level
     */
    setLevel(level) {
        const levelValue = typeof level === 'string' 
            ? Logger.LEVELS[level.toUpperCase()] 
            : level;
            
        if (levelValue !== undefined) {
            this.#level = levelValue;
        }
    }
    
    /**
     * Enable logging
     */
    enable() {
        this.#enabled = true;
    }
    
    /**
     * Disable logging
     */
    disable() {
        this.#enabled = false;
    }
    
    /**
     * Clear log history
     */
    clearHistory() {
        this.#logHistory = [];
    }
    
    /**
     * Get log history
     */
    getHistory(filter) {
        if (!filter) return [...this.#logHistory];
        
        return this.#logHistory.filter(entry => {
            if (filter.level && entry.level !== filter.level) return false;
            if (filter.startTime && entry.timestamp < filter.startTime) return false;
            if (filter.endTime && entry.timestamp > filter.endTime) return false;
            if (filter.search && !JSON.stringify(entry.args).includes(filter.search)) return false;
            return true;
        });
    }
    
    /**
     * Export logs
     */
    export(format = 'json') {
        const logs = this.getHistory();
        
        switch (format) {
            case 'json':
                return JSON.stringify(logs, null, 2);
                
            case 'csv':
                const headers = ['timestamp', 'level', 'message'];
                const rows = logs.map(log => [
                    new Date(log.timestamp).toISOString(),
                    log.level,
                    JSON.stringify(log.args)
                ]);
                return [headers, ...rows].map(row => row.join(',')).join('\n');
                
            case 'text':
                return logs.map(log => 
                    `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${
                        JSON.stringify(log.args)
                    }`
                ).join('\n');
                
            default:
                return logs;
        }
    }
    
    /**
     * Assert condition
     */
    assert(condition, ...args) {
        if (!condition) {
            this.error('Assertion failed:', ...args);
            throw new Error(`Assertion failed: ${args.join(' ')}`);
        }
    }
    
    /**
     * Count occurrences
     */
    count(label) {
        if (!this.#enabled) return;
        
        const key = this.#formatLabel(label);
        console.count(key);
    }
    
    /**
     * Reset count
     */
    countReset(label) {
        if (!this.#enabled) return;
        
        const key = this.#formatLabel(label);
        console.countReset(key);
    }
    
    /**
     * Trace execution
     */
    trace(...args) {
        if (!this.#enabled) return;
        
        console.trace(...args);
        this.#addToHistory('trace', args);
    }
    
    // Private methods
    
    #log(level, type, args) {
        if (!this.#enabled || level < this.#level) return;
        
        const timestamp = Date.now();
        const formattedArgs = this.#formatArgs(args);
        const style = this.#styles[type];
        
        // Console output
        const prefix = this.#getPrefix(type);
        if (style) {
            console.log(`%c${prefix}`, style, ...formattedArgs);
        } else {
            console[type](prefix, ...formattedArgs);
        }
        
        // Add to history
        this.#addToHistory(type, args);
        
        // Emit event
        eventBus.emit(EVENTS.LOGGER.LOG, {
            level: type,
            args,
            timestamp,
            prefix: this.#prefix
        });
        
        // Special handling for errors
        if (type === 'error' || type === 'fatal') {
            this.#handleError(args);
        }
    }
    
    #formatArgs(args) {
        return args.map(arg => {
            if (arg instanceof Error) {
                return {
                    message: arg.message,
                    stack: arg.stack,
                    name: arg.name
                };
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.parse(JSON.stringify(arg));
                } catch {
                    return arg;
                }
            }
            return arg;
        });
    }
    
    #formatMessage(message) {
        return this.#prefix ? `[${this.#prefix}] ${message}` : message;
    }
    
    #formatLabel(label) {
        return this.#prefix ? `${this.#prefix}:${label}` : label;
    }
    
    #getPrefix(type) {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const levelIcon = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            fatal: '💀'
        }[type];
        
        const parts = [
            `[${timestamp}]`,
            levelIcon,
            type.toUpperCase().padEnd(5)
        ];
        
        if (this.#prefix) {
            parts.push(`[${this.#prefix}]`);
        }
        
        return parts.join(' ');
    }
    
    #addToHistory(level, args) {
        const entry = {
            timestamp: Date.now(),
            level,
            args: this.#formatArgs(args),
            prefix: this.#prefix
        };
        
        this.#logHistory.push(entry);
        
        // Trim history
        if (this.#logHistory.length > this.#maxHistorySize) {
            this.#logHistory.shift();
        }
    }
    
    #handleError(args) {
        const errors = args.filter(arg => arg instanceof Error);
        
        errors.forEach(error => {
            // Report to error tracking service if configured
            if (window.APP_CONFIG?.FEATURES?.ENABLE_ERROR_TRACKING) {
                this.#reportError(error);
            }
        });
    }
    
    #reportError(error) {
        // Placeholder for error reporting service integration
        // Could send to Sentry, LogRocket, etc.
        eventBus.emit(EVENTS.ERROR.REPORT, {
            error,
            context: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now()
            }
        });
    }
}

/**
 * Performance monitoring helper
 */
class PerformanceMonitor {
    #logger;
    #marks = new Map();
    #measures = new Map();
    
    constructor(logger) {
        this.#logger = logger;
    }
    
    /**
     * Mark a performance point
     */
    mark(name) {
        const timestamp = performance.now();
        this.#marks.set(name, timestamp);
        
        if (window.APP_CONFIG?.DEBUG?.LOG_PERFORMANCE) {
            this.#logger.debug(`Performance mark: ${name} at ${timestamp.toFixed(2)}ms`);
        }
    }
    
    /**
     * Measure between two marks
     */
    measure(name, startMark, endMark) {
        const start = startMark ? this.#marks.get(startMark) : 0;
        const end = endMark ? this.#marks.get(endMark) : performance.now();
        
        if (start === undefined || end === undefined) {
            this.#logger.warn(`Invalid marks for measure: ${name}`);
            return;
        }
        
        const duration = end - start;
        this.#measures.set(name, duration);
        
        if (window.APP_CONFIG?.DEBUG?.LOG_PERFORMANCE) {
            this.#logger.info(`Performance measure: ${name} = ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }
    
    /**
     * Get all measures
     */
    getMeasures() {
        return new Map(this.#measures);
    }
    
    /**
     * Clear marks and measures
     */
    clear() {
        this.#marks.clear();
        this.#measures.clear();
    }
    
    /**
     * Profile a function
     */
    async profile(name, fn) {
        const startMark = `${name}_start`;
        const endMark = `${name}_end`;
        
        this.mark(startMark);
        
        try {
            const result = await fn();
            this.mark(endMark);
            const duration = this.measure(name, startMark, endMark);
            
            this.#logger.info(`Profiled ${name}: ${duration.toFixed(2)}ms`);
            
            return result;
        } catch (error) {
            this.mark(endMark);
            this.measure(name, startMark, endMark);
            throw error;
        }
    }
}

// Create singleton instance
const logger = new Logger({
    level: window.APP_CONFIG?.DEBUG?.LOG_LEVEL || 'info',
    enabled: window.APP_CONFIG?.DEBUG?.ENABLED ?? true,
    prefix: 'GmailTool'
});

// Export singleton as default
export default logger;
