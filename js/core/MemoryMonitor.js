/**
 * MemoryMonitor - Real-time memory usage tracking
 * Provides alerts and automatic cleanup when thresholds are exceeded
 */

import eventBus from './EventBus.js';
import { gmailCache } from './SmartCache.js';
import logger from './Logger.js';

export class MemoryMonitor {
    #interval = null;
    #callbacks = new Set();
    #thresholds = {
        warning: 100 * 1024 * 1024,  // 100MB
        critical: 200 * 1024 * 1024, // 200MB
        maximum: 500 * 1024 * 1024   // 500MB
    };
    #lastCheck = {
        timestamp: 0,
        usage: null
    };
    
    constructor() {
        this.supported = 'memory' in performance;
        
        // Override thresholds from config if available
        if (window.APP_CONFIG?.MEMORY) {
            this.#thresholds = {
                warning: (window.APP_CONFIG.MEMORY.WARNING_THRESHOLD_MB || 100) * 1024 * 1024,
                critical: (window.APP_CONFIG.MEMORY.CRITICAL_THRESHOLD_MB || 200) * 1024 * 1024,
                maximum: (window.APP_CONFIG.MEMORY.MAX_THRESHOLD_MB || 500) * 1024 * 1024
            };
        }
    }
    
    start(intervalMs = 5000) {
        if (!this.supported) {
            console.warn('[MemoryMonitor] Performance.memory not supported');
            return;
        }
        
        this.stop(); // Clear any existing interval
        
        this.#interval = setInterval(() => {
            this.check();
        }, intervalMs);
        
        // Initial check
        this.check();
        
        logger.info('[MemoryMonitor] Started with interval:', intervalMs);
    }
    
    stop() {
        if (this.#interval) {
            clearInterval(this.#interval);
            this.#interval = null;
            logger.info('[MemoryMonitor] Stopped');
        }
    }
    
    check() {
        if (!this.supported) return null;
        
        const memory = performance.memory;
        const usage = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
            timestamp: Date.now()
        };
        
        // Store last check
        this.#lastCheck = {
            timestamp: usage.timestamp,
            usage
        };
        
        // Check thresholds
        if (usage.used > this.#thresholds.maximum) {
            this.#alert('maximum', usage);
            this.#triggerCleanup('aggressive');
        } else if (usage.used > this.#thresholds.critical) {
            this.#alert('critical', usage);
            this.#triggerCleanup('moderate');
        } else if (usage.used > this.#thresholds.warning) {
            this.#alert('warning', usage);
            this.#triggerCleanup('light');
        }
        
        return usage;
    }
    
    onThresholdExceeded(callback) {
        this.#callbacks.add(callback);
        return () => this.#callbacks.delete(callback);
    }
    
    #alert(level, usage) {
        const message = `Memory ${level}: ${Math.round(usage.used / 1024 / 1024)}MB used (${usage.percentage.toFixed(1)}%)`;
        
        logger.warn(`[MemoryMonitor] ${message}`);
        
        this.#callbacks.forEach(callback => {
            try {
                callback({ level, usage, message });
            } catch (error) {
                logger.error('[MemoryMonitor] Callback error:', error);
            }
        });
        
        // Emit event
        eventBus.emit('memory:threshold', { level, usage });
    }
    
    #triggerCleanup(intensity) {
        logger.info(`[MemoryMonitor] Triggering ${intensity} cleanup`);
        
        switch (intensity) {
            case 'aggressive':
                // Clear all caches
                gmailCache.clear();
                // Clear session storage items older than 1 hour
                this.#clearOldStorageItems(3600000);
                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                    logger.info('[MemoryMonitor] Forced garbage collection');
                }
                break;
                
            case 'moderate':
                // Clear old cache entries
                gmailCache.cleanup(0.5); // Remove 50% oldest
                // Clear session storage items older than 24 hours
                this.#clearOldStorageItems(86400000);
                break;
                
            case 'light':
                // Just expire TTL entries
                gmailCache.cleanup(0.2); // Remove 20% oldest
                break;
        }
        
        eventBus.emit('memory:cleanup', { intensity });
    }
    
    #clearOldStorageItems(maxAge) {
        const now = Date.now();
        const keysToRemove = [];
        
        // Check sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith('gmail_tool_')) {
                try {
                    const item = JSON.parse(sessionStorage.getItem(key));
                    if (item.timestamp && (now - item.timestamp) > maxAge) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    // Invalid item, remove it
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        if (keysToRemove.length > 0) {
            logger.info(`[MemoryMonitor] Cleared ${keysToRemove.length} old storage items`);
        }
    }
    
    getFormattedUsage() {
        const usage = this.check();
        if (!usage) return 'Memory monitoring not available';
        
        return {
            used: `${Math.round(usage.used / 1024 / 1024)}MB`,
            total: `${Math.round(usage.total / 1024 / 1024)}MB`,
            limit: `${Math.round(usage.limit / 1024 / 1024)}MB`,
            percentage: `${usage.percentage.toFixed(1)}%`,
            status: usage.used > this.#thresholds.critical ? 'critical' :
                    usage.used > this.#thresholds.warning ? 'warning' : 'ok'
        };
    }
    
    getLastCheck() {
        return this.#lastCheck;
    }
    
    getThresholds() {
        return {
            warning: Math.round(this.#thresholds.warning / 1024 / 1024) + 'MB',
            critical: Math.round(this.#thresholds.critical / 1024 / 1024) + 'MB',
            maximum: Math.round(this.#thresholds.maximum / 1024 / 1024) + 'MB'
        };
    }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();

export default MemoryMonitor;