/**
 * PerformanceMonitor - Real-time performance tracking
 * Monitors FPS, memory, and custom metrics
 */

import eventBus from './EventBus.js';
import logger from './Logger.js';

export class PerformanceMonitor {
    #metrics = new Map();
    #observers = new Map();
    #rafId = null;
    #lastTime = performance.now();
    #frames = 0;
    #fps = 0;
    #fpsHistory = [];
    #maxHistorySize = 100;
    #performanceEntries = [];
    
    constructor() {
        this.supported = {
            memory: 'memory' in performance,
            paint: 'PerformanceObserver' in window,
            layout: 'PerformanceObserver' in window,
            navigation: 'PerformanceNavigationTiming' in window,
            longtask: 'PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')
        };
        
        this.#setupObservers();
    }
    
    #setupObservers() {
        // Paint timing (First Paint, First Contentful Paint)
        if (this.supported.paint) {
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.#recordMetric('paint', {
                            name: entry.name,
                            time: entry.startTime
                        });
                        logger.debug(`[Performance] ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
                    }
                });
                
                paintObserver.observe({ entryTypes: ['paint'] });
                this.#observers.set('paint', paintObserver);
            } catch (e) {
                logger.warn('[PerformanceMonitor] Paint observer not supported');
            }
        }
        
        // Layout shift (Cumulative Layout Shift)
        if (this.supported.layout) {
            try {
                const layoutObserver = new PerformanceObserver((list) => {
                    let cls = 0;
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            cls += entry.value;
                        }
                    }
                    this.#recordMetric('cls', cls);
                });
                
                layoutObserver.observe({ entryTypes: ['layout-shift'] });
                this.#observers.set('layout', layoutObserver);
            } catch (e) {
                logger.warn('[PerformanceMonitor] Layout observer not supported');
            }
        }
        
        // Long tasks detection
        if (this.supported.longtask) {
            try {
                const longtaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.#recordMetric('longtask', {
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                        
                        if (entry.duration > 100) {
                            logger.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
                        }
                    }
                });
                
                longtaskObserver.observe({ entryTypes: ['longtask'] });
                this.#observers.set('longtask', longtaskObserver);
            } catch (e) {
                logger.warn('[PerformanceMonitor] Longtask observer not supported');
            }
        }
        
        // Navigation timing
        if (this.supported.navigation) {
            this.#captureNavigationTiming();
        }
    }
    
    #captureNavigationTiming() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    const metrics = {
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                        domInteractive: perfData.domInteractive - perfData.fetchStart,
                        timeToFirstByte: perfData.responseStart - perfData.requestStart,
                        totalPageLoad: perfData.loadEventEnd - perfData.fetchStart
                    };
                    
                    this.#recordMetric('navigation', metrics);
                    logger.info('[Performance] Navigation timing:', metrics);
                }
            }, 0);
        });
    }
    
    startFPSMonitoring() {
        if (this.#rafId) {
            logger.warn('[PerformanceMonitor] FPS monitoring already active');
            return;
        }
        
        const measureFPS = () => {
            const now = performance.now();
            const delta = now - this.#lastTime;
            
            this.#frames++;
            
            if (delta >= 1000) {
                this.#fps = Math.round((this.#frames * 1000) / delta);
                this.#recordMetric('fps', this.#fps);
                
                // Keep history for averaging
                this.#fpsHistory.push(this.#fps);
                if (this.#fpsHistory.length > this.#maxHistorySize) {
                    this.#fpsHistory.shift();
                }
                
                // Emit warning if FPS drops below 30
                if (this.#fps < 30) {
                    eventBus.emit('performance:low-fps', { fps: this.#fps });
                    logger.warn(`[Performance] Low FPS detected: ${this.#fps}`);
                }
                
                this.#frames = 0;
                this.#lastTime = now;
            }
            
            this.#rafId = requestAnimationFrame(measureFPS);
        };
        
        measureFPS();
        logger.info('[PerformanceMonitor] FPS monitoring started');
    }
    
    stopFPSMonitoring() {
        if (this.#rafId) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = null;
            logger.info('[PerformanceMonitor] FPS monitoring stopped');
        }
    }
    
    /**
     * Measure function execution time
     */
    measure(name, fn) {
        const startMark = `${name}-start-${Date.now()}`;
        const endMark = `${name}-end-${Date.now()}`;
        
        performance.mark(startMark);
        
        const handleResult = (value) => {
            performance.mark(endMark);
            performance.measure(name, startMark, endMark);
            
            const measure = performance.getEntriesByName(name).pop();
            this.#recordMetric(name, measure.duration);
            
            // Clean up marks
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
            performance.clearMeasures(name);
            
            logger.debug(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
            
            return value;
        };
        
        try {
            const result = fn();
            
            if (result instanceof Promise) {
                return result.then(handleResult).catch(error => {
                    handleResult(null);
                    throw error;
                });
            }
            
            return handleResult(result);
        } catch (error) {
            handleResult(null);
            throw error;
        }
    }
    
    /**
     * Create a custom timer
     */
    startTimer(name) {
        const startTime = performance.now();
        
        return {
            end: () => {
                const duration = performance.now() - startTime;
                this.#recordMetric(name, duration);
                logger.debug(`[Performance] Timer ${name}: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }
    
    #recordMetric(name, value) {
        if (!this.#metrics.has(name)) {
            this.#metrics.set(name, []);
        }
        
        const metrics = this.#metrics.get(name);
        metrics.push({
            value,
            timestamp: performance.now()
        });
        
        // Keep only last 100 entries per metric
        if (metrics.length > this.#maxHistorySize) {
            metrics.shift();
        }
    }
    
    /**
     * Get all metrics or specific metric
     */
    getMetrics(name = null) {
        if (name) {
            const values = this.#metrics.get(name);
            if (!values || values.length === 0) return null;
            
            return this.#calculateStats(values);
        }
        
        const result = {};
        
        for (const [metricName, values] of this.#metrics) {
            if (values.length === 0) continue;
            result[metricName] = this.#calculateStats(values);
        }
        
        // Add memory if available
        if (this.supported.memory) {
            const memory = performance.memory;
            result.memory = {
                used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
                percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(1)
            };
        }
        
        // Add current FPS
        if (this.#fps > 0) {
            result.fps = {
                current: this.#fps,
                average: this.#fpsHistory.length > 0 
                    ? Math.round(this.#fpsHistory.reduce((a, b) => a + b, 0) / this.#fpsHistory.length)
                    : this.#fps,
                min: this.#fpsHistory.length > 0 ? Math.min(...this.#fpsHistory) : this.#fps,
                max: this.#fpsHistory.length > 0 ? Math.max(...this.#fpsHistory) : this.#fps
            };
        }
        
        return result;
    }
    
    #calculateStats(values) {
        // Handle different value types
        const nums = values.map(v => {
            if (typeof v.value === 'number') return v.value;
            if (typeof v.value === 'object' && v.value.time !== undefined) return v.value.time;
            if (typeof v.value === 'object' && v.value.duration !== undefined) return v.value.duration;
            return 0;
        }).filter(n => !isNaN(n));
        
        if (nums.length === 0) {
            return { count: 0 };
        }
        
        return {
            current: nums[nums.length - 1],
            average: nums.reduce((a, b) => a + b, 0) / nums.length,
            min: Math.min(...nums),
            max: Math.max(...nums),
            samples: nums.length,
            total: nums.reduce((a, b) => a + b, 0)
        };
    }
    
    /**
     * Get performance score (0-100)
     */
    getPerformanceScore() {
        const metrics = this.getMetrics();
        let score = 100;
        let factors = 0;
        
        // FPS score (60fps = 100, 30fps = 50, <30fps = 0-50)
        if (metrics.fps) {
            const fpsScore = Math.min(100, Math.max(0, (metrics.fps.average / 60) * 100));
            score = (score + fpsScore) / 2;
            factors++;
        }
        
        // Memory score (under 50MB = 100, 50-100MB = 75, 100-200MB = 50, >200MB = 25)
        if (metrics.memory) {
            let memScore = 100;
            if (metrics.memory.used > 200) memScore = 25;
            else if (metrics.memory.used > 100) memScore = 50;
            else if (metrics.memory.used > 50) memScore = 75;
            
            score = (score + memScore) / 2;
            factors++;
        }
        
        // CLS score (0 = 100, >0.1 = 75, >0.25 = 50, >0.5 = 0)
        if (metrics.cls) {
            let clsScore = 100;
            if (metrics.cls.current > 0.5) clsScore = 0;
            else if (metrics.cls.current > 0.25) clsScore = 50;
            else if (metrics.cls.current > 0.1) clsScore = 75;
            
            score = (score + clsScore) / 2;
            factors++;
        }
        
        return Math.round(score);
    }
    
    /**
     * Generate performance report
     */
    generateReport() {
        const metrics = this.getMetrics();
        const score = this.getPerformanceScore();
        
        const report = {
            timestamp: new Date().toISOString(),
            score,
            metrics,
            recommendations: []
        };
        
        // Generate recommendations
        if (metrics.fps && metrics.fps.average < 30) {
            report.recommendations.push('Low FPS detected. Consider optimizing animations and DOM updates.');
        }
        
        if (metrics.memory && metrics.memory.used > 100) {
            report.recommendations.push('High memory usage. Consider clearing caches and optimizing data structures.');
        }
        
        if (metrics.cls && metrics.cls.current > 0.1) {
            report.recommendations.push('Layout shifts detected. Ensure elements have defined sizes.');
        }
        
        if (metrics.longtask && metrics.longtask.samples > 0) {
            report.recommendations.push('Long tasks detected. Consider breaking up heavy computations.');
        }
        
        return report;
    }
    
    /**
     * Clear all metrics
     */
    clear() {
        this.#metrics.clear();
        this.#fpsHistory = [];
        this.#performanceEntries = [];
        logger.info('[PerformanceMonitor] Metrics cleared');
    }
    
    /**
     * Destroy and cleanup
     */
    destroy() {
        this.stopFPSMonitoring();
        
        for (const observer of this.#observers.values()) {
            observer.disconnect();
        }
        
        this.#observers.clear();
        this.#metrics.clear();
        
        logger.info('[PerformanceMonitor] Destroyed');
    }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;