/**
 * RateLimiter - Intelligent Rate Limiting System
 * Handles API rate limits with exponential backoff and jitter
 */

import { CONFIG } from '../config.js';
import logger from '../core/Logger.js';
import eventBus from '../core/EventBus.js';
import { sleep, chunkArray, EVENTS } from '../utils/index.js';

class RateLimiter {
    #queues = new Map(); // Separate queues for different resources
    #limits = new Map(); // Rate limits per resource
    #tokens = new Map(); // Token buckets
    #lastRequest = new Map(); // Last request timestamps
    #retryAttempts = new Map(); // Retry counts
    #circuitBreaker = new Map(); // Circuit breaker states
    
    constructor() {
        // Initialize default limits
        this.#setupDefaultLimits();
        
        // Start token refill timer
        this.#startTokenRefill();
    }
    
    /**
     * Execute a function with rate limiting
     */
    async execute(fn, resource = 'default', options = {}) {
        const {
            priority = 0,
            retries = 3,
            backoffMultiplier = 2,
            maxBackoff = 60000,
            timeout = 30000
        } = options;
        
        // Check circuit breaker
        if (this.#isCircuitOpen(resource)) {
            throw new Error(`Circuit breaker open for resource: ${resource}`);
        }
        
        // Add to queue
        return new Promise((resolve, reject) => {
            const task = {
                fn,
                resolve,
                reject,
                priority,
                retries,
                backoffMultiplier,
                maxBackoff,
                timeout,
                attempts: 0,
                addedAt: Date.now()
            };
            
            this.#enqueue(resource, task);
            this.#processQueue(resource);
        });
    }
    
    /**
     * Wait for rate limit
     */
    async wait(resource = 'default', units = 1) {
        const limit = this.#limits.get(resource) || this.#limits.get('default');
        const tokens = this.#tokens.get(resource) || 0;
        
        if (tokens >= units) {
            // Consume tokens
            this.#tokens.set(resource, tokens - units);
            return;
        }
        
        // Calculate wait time
        const waitTime = this.#calculateWaitTime(resource, units);
        
        logger.debug(`Rate limit wait: ${waitTime}ms for ${resource}`);
        
        // Wait
        await sleep(waitTime);
        
        // Consume tokens after wait
        const newTokens = this.#tokens.get(resource) || 0;
        this.#tokens.set(resource, Math.max(0, newTokens - units));
    }
    
    /**
     * Check if rate limit allows request
     */
    canProceed(resource = 'default', units = 1) {
        const tokens = this.#tokens.get(resource) || 0;
        return tokens >= units;
    }
    
    /**
     * Set rate limit for a resource
     */
    setLimit(resource, limit) {
        this.#limits.set(resource, limit);
        
        // Initialize tokens if not exists
        if (!this.#tokens.has(resource)) {
            this.#tokens.set(resource, limit.burst || limit.rate);
        }
        
        logger.debug(`Rate limit set for ${resource}:`, limit);
    }
    
    /**
     * Reset rate limiter for a resource
     */
    reset(resource = 'default') {
        const limit = this.#limits.get(resource);
        if (limit) {
            this.#tokens.set(resource, limit.burst || limit.rate);
        }
        
        this.#retryAttempts.delete(resource);
        this.#circuitBreaker.delete(resource);
        
        // Clear queue
        const queue = this.#queues.get(resource);
        if (queue) {
            queue.forEach(task => {
                task.reject(new Error('Rate limiter reset'));
            });
            queue.clear();
        }
        
        logger.debug(`Rate limiter reset for ${resource}`);
    }
    
    /**
     * Get current status
     */
    getStatus(resource = 'default') {
        return {
            tokens: this.#tokens.get(resource) || 0,
            limit: this.#limits.get(resource),
            queueSize: this.#queues.get(resource)?.size || 0,
            circuitOpen: this.#isCircuitOpen(resource),
            retryAttempts: this.#retryAttempts.get(resource) || 0
        };
    }
    
    /**
     * Handle Gmail-specific rate limiting
     */
    async executeGmailRequest(fn, options = {}) {
        const {
            quotaUnits = 5,
            isWrite = false
        } = options;
        
        // Different limits for read vs write
        const resource = isWrite ? 'gmail_write' : 'gmail_read';
        
        // Check daily quota
        const quotaUsed = parseInt(sessionStorage.getItem('gmail_quota_used') || '0');
        const quotaLimit = CONFIG.RATE_LIMITS.QUOTA_PER_DAY;
        
        if (quotaUsed + quotaUnits > quotaLimit) {
            throw new Error('Daily Gmail quota exceeded');
        }
        
        try {
            // Execute with rate limiting
            const result = await this.execute(fn, resource, {
                retries: 3,
                backoffMultiplier: 2,
                maxBackoff: 60000
            });
            
            // Update quota
            sessionStorage.setItem('gmail_quota_used', String(quotaUsed + quotaUnits));
            
            return result;
            
        } catch (error) {
            // Handle specific Gmail errors
            if (error.code === 429 || error.message?.includes('quota')) {
                logger.warn('Gmail rate limit hit');
                eventBus.emit(EVENTS.GMAIL.RATE_LIMITED, { resource, error });
                
                // Open circuit breaker
                this.#openCircuit(resource);
            }
            
            throw error;
        }
    }
    
    /**
     * Batch rate limiter
     */
    async executeBatch(tasks, resource = 'default', options = {}) {
        const {
            concurrency = 5,
            delayBetween = 100
        } = options;
        
        const results = [];
        const chunks = chunkArray(tasks, concurrency);
        
        for (const chunk of chunks) {
            const chunkResults = await Promise.allSettled(
                chunk.map(task => this.execute(task, resource, options))
            );
            
            results.push(...chunkResults);
            
            // Delay between chunks
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await sleep(delayBetween);
            }
        }
        
        return results;
    }
    
    // Private methods
    
    #setupDefaultLimits() {
        // Gmail API limits
        this.setLimit('gmail_read', {
            rate: 250, // units per second
            interval: 1000,
            burst: 500
        });
        
        this.setLimit('gmail_write', {
            rate: 25, // units per second
            interval: 1000,
            burst: 50
        });
        
        // Email sending limits (more conservative)
        this.setLimit('email_send', {
            rate: 1, // 1 email per interval
            interval: CONFIG.RATE_LIMITS.MIN_DELAY_MS,
            burst: 1
        });
        
        // Default limit
        this.setLimit('default', {
            rate: 10,
            interval: 1000,
            burst: 20
        });
    }
    
    #enqueue(resource, task) {
        if (!this.#queues.has(resource)) {
            this.#queues.set(resource, []);
        }
        
        const queue = this.#queues.get(resource);
        
        // Insert based on priority (higher priority first)
        const insertIndex = queue.findIndex(t => t.priority < task.priority);
        
        if (insertIndex === -1) {
            queue.push(task);
        } else {
            queue.splice(insertIndex, 0, task);
        }
        
        logger.debug(`Task queued for ${resource}, queue size: ${queue.length}`);
    }
    
    async #processQueue(resource) {
        const queue = this.#queues.get(resource);
        if (!queue || queue.length === 0) return;
        
        // Check if already processing
        if (this.#isProcessing(resource)) return;
        
        this.#setProcessing(resource, true);
        
        try {
            while (queue.length > 0) {
                const task = queue[0];
                
                // Check timeout
                if (Date.now() - task.addedAt > task.timeout) {
                    queue.shift();
                    task.reject(new Error('Task timeout'));
                    continue;
                }
                
                // Wait for rate limit
                await this.wait(resource);
                
                // Execute task
                try {
                    const result = await this.#executeTask(task);
                    queue.shift();
                    task.resolve(result);
                    
                    // Reset retry attempts on success
                    this.#retryAttempts.set(resource, 0);
                    
                    // Close circuit if it was half-open
                    this.#closeCircuit(resource);
                    
                } catch (error) {
                    task.attempts++;
                    
                    if (task.attempts >= task.retries) {
                        queue.shift();
                        task.reject(error);
                        
                        // Increment failure count
                        this.#incrementFailures(resource);
                    } else {
                        // Requeue with backoff
                        queue.shift();
                        const backoffTime = this.#calculateBackoff(
                            task.attempts,
                            task.backoffMultiplier,
                            task.maxBackoff
                        );
                        
                        logger.debug(`Retrying task after ${backoffTime}ms`);
                        
                        await sleep(backoffTime);
                        this.#enqueue(resource, task);
                    }
                }
                
                // Update last request time
                this.#lastRequest.set(resource, Date.now());
            }
        } finally {
            this.#setProcessing(resource, false);
        }
    }
    
    async #executeTask(task) {
        return task.fn();
    }
    
    #calculateWaitTime(resource, units) {
        const limit = this.#limits.get(resource) || this.#limits.get('default');
        const lastRequest = this.#lastRequest.get(resource) || 0;
        const now = Date.now();
        
        // Calculate minimum wait based on rate
        const minInterval = (limit.interval / limit.rate) * units;
        const timeSinceLastRequest = now - lastRequest;
        
        if (timeSinceLastRequest >= minInterval) {
            return 0;
        }
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 100;
        
        return Math.max(0, minInterval - timeSinceLastRequest + jitter);
    }
    
    #calculateBackoff(attempts, multiplier, maxBackoff) {
        // Exponential backoff with jitter
        const baseDelay = Math.min(
            1000 * Math.pow(multiplier, attempts - 1),
            maxBackoff
        );
        
        // Add jitter (±25%)
        const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
        
        return Math.round(baseDelay + jitter);
    }
    
    #startTokenRefill() {
        setInterval(() => {
            this.#limits.forEach((limit, resource) => {
                const currentTokens = this.#tokens.get(resource) || 0;
                const maxTokens = limit.burst || limit.rate;
                
                if (currentTokens < maxTokens) {
                    // Refill tokens
                    const refillRate = limit.rate / (1000 / limit.interval);
                    const newTokens = Math.min(
                        maxTokens,
                        currentTokens + refillRate
                    );
                    
                    this.#tokens.set(resource, newTokens);
                }
            });
        }, 100); // Refill every 100ms for smooth rate limiting
    }
    
    // Circuit breaker implementation
    
    #isCircuitOpen(resource) {
        const state = this.#circuitBreaker.get(resource);
        if (!state) return false;
        
        if (state.state === 'open') {
            // Check if enough time has passed to try half-open
            if (Date.now() - state.openedAt > state.timeout) {
                this.#circuitBreaker.set(resource, {
                    ...state,
                    state: 'half-open'
                });
                return false;
            }
            return true;
        }
        
        return false;
    }
    
    #openCircuit(resource) {
        logger.warn(`Opening circuit breaker for ${resource}`);
        
        this.#circuitBreaker.set(resource, {
            state: 'open',
            openedAt: Date.now(),
            timeout: 30000, // 30 seconds
            failures: 0
        });
        
        eventBus.emit(EVENTS.RATELIMIT.CIRCUIT_OPEN, { resource });
    }
    
    #closeCircuit(resource) {
        const state = this.#circuitBreaker.get(resource);
        if (state && state.state !== 'closed') {
            logger.info(`Closing circuit breaker for ${resource}`);
            
            this.#circuitBreaker.set(resource, {
                ...state,
                state: 'closed',
                failures: 0
            });
            
            eventBus.emit(EVENTS.RATELIMIT.CIRCUIT_CLOSED, { resource });
        }
    }
    
    #incrementFailures(resource) {
        const state = this.#circuitBreaker.get(resource) || {
            state: 'closed',
            failures: 0
        };
        
        state.failures++;
        
        // Open circuit after 5 consecutive failures
        if (state.failures >= 5 && state.state === 'closed') {
            this.#openCircuit(resource);
        } else {
            this.#circuitBreaker.set(resource, state);
        }
    }
    
    // Processing state management
    
    #isProcessing(resource) {
        return this.#queues.get(`${resource}_processing`) === true;
    }
    
    #setProcessing(resource, value) {
        this.#queues.set(`${resource}_processing`, value);
    }
    

}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Export singleton
export default rateLimiter;
