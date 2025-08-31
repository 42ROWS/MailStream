/**
 * BatchProcessor - Gmail API Batch Operations Handler
 * Manages batch requests with proper formatting and error handling
 */

import { CONFIG } from '../config.js';
import logger from '../core/Logger.js';
import eventBus from '../core/EventBus.js';
import rateLimiter from './RateLimiter.js';
import { sleep, chunkArray, generateId, EVENTS } from '../utils/index.js';

class BatchProcessor {
    #batchQueue = [];
    #processing = false;
    #currentBatch = null;
    #stats = {
        totalProcessed: 0,
        totalFailed: 0,
        totalBatches: 0
    };
    
    constructor() {
        this.processBatch = this.processBatch.bind(this);
    }
    
    /**
     * Add request to batch
     */
    add(request, callback) {
        if (this.#processing && this.#currentBatch) {
            throw new Error('Cannot add to batch while processing');
        }
        
        this.#batchQueue.push({
            id: generateId('batch'),
            request,
            callback,
            addedAt: Date.now()
        });
        
        logger.debug(`Added request to batch, queue size: ${this.#batchQueue.length}`);
        
        // Auto-process if batch is full
        if (this.#batchQueue.length >= CONFIG.GMAIL_API.MAX_BATCH_SIZE) {
            this.processBatch();
        }
    }
    
    /**
     * Process current batch
     */
    async processBatch() {
        if (this.#processing) {
            logger.warn('Batch already processing');
            return;
        }
        
        if (this.#batchQueue.length === 0) {
            logger.debug('No requests in batch queue');
            return;
        }
        
        this.#processing = true;
        this.#currentBatch = [...this.#batchQueue];
        this.#batchQueue = [];
        
        logger.info(`Processing batch of ${this.#currentBatch.length} requests`);
        
        try {
            // Split into chunks if needed
            const chunks = this.#chunkBatch(this.#currentBatch);
            const allResults = [];
            
            for (const chunk of chunks) {
                const results = await this.#processChunk(chunk);
                allResults.push(...results);
                
                // Delay between chunks
                if (chunks.indexOf(chunk) < chunks.length - 1) {
                    await sleep(CONFIG.RATE_LIMITS.BATCH_DELAY_MS);
                }
            }
            
            // Process callbacks
            this.#processCallbacks(allResults);
            
            // Update stats
            this.#updateStats(allResults);
            
            // Emit completion event
            eventBus.emit(EVENTS.BATCH.COMPLETE, {
                total: allResults.length,
                succeeded: allResults.filter(r => r.success).length,
                failed: allResults.filter(r => !r.success).length
            });
            
            return allResults;
            
        } catch (error) {
            logger.error('Batch processing failed:', error);
            
            // Call error callbacks
            this.#currentBatch.forEach(item => {
                if (item.callback) {
                    item.callback(error, null);
                }
            });
            
            throw error;
            
        } finally {
            this.#processing = false;
            this.#currentBatch = null;
        }
    }
    
    /**
     * Create Gmail batch request
     */
    async createGmailBatch(requests) {
        if (!window.gapi?.client) {
            throw new Error('GAPI client not initialized');
        }
        
        const batch = gapi.client.newBatch();
        
        requests.forEach((request, index) => {
            batch.add(request, { id: `request_${index}` });
        });
        
        return batch;
    }
    
    /**
     * Execute Gmail batch with rate limiting
     */
    async executeGmailBatch(requests) {
        return rateLimiter.executeGmailRequest(async () => {
            const batch = await this.createGmailBatch(requests);
            const response = await batch;
            
            // Parse batch response
            const results = [];
            for (let i = 0; i < requests.length; i++) {
                const id = `request_${i}`;
                const result = response.result[id];
                
                if (result?.error) {
                    results.push({
                        success: false,
                        error: result.error,
                        index: i
                    });
                } else {
                    results.push({
                        success: true,
                        data: result?.result,
                        index: i
                    });
                }
            }
            
            return results;
        }, {
            quotaUnits: requests.length * 5 // Assume 5 units per request
        });
    }
    
    /**
     * Create multipart/mixed batch request (alternative method)
     */
    createMultipartBatch(requests, accessToken) {
        const boundary = `batch_${generateId()}`;
        const nl = '\r\n';
        
        let body = '';
        
        requests.forEach((request, index) => {
            body += `--${boundary}${nl}`;
            body += `Content-Type: application/http${nl}`;
            body += `Content-ID: <request_${index}>${nl}${nl}`;
            
            // Request line
            body += `${request.method || 'GET'} ${request.path}${nl}`;
            
            // Headers
            if (request.headers) {
                Object.entries(request.headers).forEach(([key, value]) => {
                    body += `${key}: ${value}${nl}`;
                });
            }
            
            // Body
            if (request.body) {
                body += `Content-Type: application/json${nl}${nl}`;
                body += JSON.stringify(request.body);
            }
            
            body += nl;
        });
        
        body += `--${boundary}--`;
        
        return {
            url: CONFIG.GMAIL_API.BATCH_ENDPOINT,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/mixed; boundary=${boundary}`
            },
            body
        };
    }
    
    /**
     * Parse multipart batch response
     */
    parseMultipartResponse(responseText, boundary) {
        const parts = responseText.split(`--${boundary}`);
        const results = [];
        
        parts.forEach((part, index) => {
            if (part.trim() === '' || part.trim() === '--') return;
            
            const lines = part.split('\r\n');
            let jsonStart = -1;
            
            // Find where JSON starts
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '') {
                    jsonStart = i + 1;
                    break;
                }
            }
            
            if (jsonStart > 0 && jsonStart < lines.length) {
                try {
                    const jsonStr = lines.slice(jsonStart).join('\n').trim();
                    if (jsonStr) {
                        const data = JSON.parse(jsonStr);
                        results.push({
                            success: !data.error,
                            data: data.error ? null : data,
                            error: data.error || null,
                            index: index - 1 // Adjust for boundary parts
                        });
                    }
                } catch (error) {
                    logger.error(`Failed to parse batch response part ${index}:`, error);
                    results.push({
                        success: false,
                        error: { message: 'Parse error' },
                        index: index - 1
                    });
                }
            }
        });
        
        return results;
    }
    
    /**
     * Batch send emails
     */
    async batchSendEmails(emails) {
        const requests = emails.map(email => {
            return gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: {
                    raw: email.encodedMessage
                }
            });
        });
        
        // Process in chunks
        const chunks = chunkArray(requests, CONFIG.GMAIL_API.MAX_BATCH_SIZE);
        const allResults = [];
        
        for (const chunk of chunks) {
            logger.info(`Sending batch of ${chunk.length} emails`);
            
            try {
                const results = await this.executeGmailBatch(chunk);
                allResults.push(...results);
                
                // Emit progress
                eventBus.emit(EVENTS.BATCH.PROGRESS, {
                    processed: allResults.length,
                    total: emails.length
                });
                
                // Delay between batches
                if (chunks.indexOf(chunk) < chunks.length - 1) {
                    await sleep(CONFIG.RATE_LIMITS.MIN_DELAY_MS);
                }
                
            } catch (error) {
                logger.error('Batch send failed:', error);
                
                // Add failed results
                chunk.forEach((_, index) => {
                    allResults.push({
                        success: false,
                        error,
                        index: allResults.length
                    });
                });
            }
        }
        
        return allResults;
    }
    
    /**
     * Batch get messages
     */
    async batchGetMessages(messageIds) {
        const requests = messageIds.map(id => {
            return gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: id,
                format: 'full'
            });
        });
        
        return this.executeGmailBatch(requests);
    }
    
    /**
     * Batch modify messages (mark as read, etc.)
     */
    async batchModifyMessages(modifications) {
        const requests = modifications.map(mod => {
            return gapi.client.gmail.users.messages.modify({
                userId: 'me',
                id: mod.messageId,
                resource: {
                    addLabelIds: mod.addLabelIds || [],
                    removeLabelIds: mod.removeLabelIds || []
                }
            });
        });
        
        return this.executeGmailBatch(requests);
    }
    
    /**
     * Get batch statistics
     */
    getStats() {
        return {
            ...this.#stats,
            queueSize: this.#batchQueue.length,
            isProcessing: this.#processing
        };
    }
    
    /**
     * Clear batch queue
     */
    clear() {
        if (this.#processing) {
            throw new Error('Cannot clear while processing');
        }
        
        const cleared = this.#batchQueue.length;
        this.#batchQueue = [];
        
        logger.info(`Cleared ${cleared} requests from batch queue`);
        
        return cleared;
    }
    
    /**
     * Check if batch is ready
     */
    isReady() {
        return !this.#processing && this.#batchQueue.length > 0;
    }
    
    /**
     * Get queue size
     */
    getQueueSize() {
        return this.#batchQueue.length;
    }
    
    // Private methods
    
    async #processChunk(chunk) {
        const results = [];
        
        try {
            // Create batch requests
            const requests = chunk.map(item => item.request);
            
            // Execute with rate limiting
            const batchResults = await this.executeGmailBatch(requests);
            
            // Map results back to original items
            chunk.forEach((item, index) => {
                const result = batchResults[index];
                results.push({
                    id: item.id,
                    success: result.success,
                    data: result.data,
                    error: result.error,
                    request: item.request
                });
            });
            
        } catch (error) {
            // All requests in chunk failed
            chunk.forEach(item => {
                results.push({
                    id: item.id,
                    success: false,
                    error,
                    request: item.request
                });
            });
        }
        
        return results;
    }
    
    #processCallbacks(results) {
        results.forEach(result => {
            const item = this.#currentBatch.find(i => i.id === result.id);
            if (item?.callback) {
                if (result.success) {
                    item.callback(null, result.data);
                } else {
                    item.callback(result.error, null);
                }
            }
        });
    }
    
    #updateStats(results) {
        this.#stats.totalBatches++;
        this.#stats.totalProcessed += results.length;
        this.#stats.totalFailed += results.filter(r => !r.success).length;
        
        logger.debug('Batch stats updated:', this.#stats);
    }
    
    #chunkBatch(batch) {
        const chunks = [];
        const chunkSize = CONFIG.GMAIL_API.MAX_BATCH_SIZE;
        
        for (let i = 0; i < batch.length; i += chunkSize) {
            chunks.push(batch.slice(i, i + chunkSize));
        }
        
        return chunks;
    }
    

}

// Create singleton instance
const batchProcessor = new BatchProcessor();

// Export singleton
export default batchProcessor;
