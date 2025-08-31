/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * EmailSender - Batch Email Sending Service
 * Handles CSV processing, template replacement, and batch sending with pause/resume
 */

import { CONFIG } from '../config.js';
import eventBus from '../core/EventBus.js';
import stateManager from '../core/StateManager.js';
import logger from '../core/Logger.js';
import gmailClient from '../api/GmailClient.js';
import rateLimiter from '../api/RateLimiter.js';
import batchProcessor from '../api/BatchProcessor.js';
import {
    sleep,
    chunkArray,
    generateId,
    replaceTemplateVariables,
    base64,
    EVENTS
} from '../utils/index.js';
// import { WorkerPool } from '../workers/WorkerPool.js';

// Initialize worker pool for CSV processing
// TEMPORANEAMENTE DISABILITATO PER DEBUG
// const csvWorkerPool = new WorkerPool('/js/workers/csv-processor.js', {
//     minWorkers: 2,
//     maxWorkers: 4
// });

class EmailSender {
    #queue = [];
    #processing = false;
    #paused = false;
    #currentBatch = null;
    #progress = {
        total: 0,
        sent: 0,
        failed: 0,
        skipped: 0
    };
    #failedEmails = [];
    #sentEmails = [];
    #startTime = null;
    #pauseTime = null;
    #estimatedTimeRemaining = 0;
    
    constructor() {
        // Initialize Gmail client when ready
        eventBus.once(EVENTS.GMAIL.INITIALIZED, () => {
            logger.info('EmailSender: Gmail client ready');
        });
        
        // Bind methods
        this.processCSV = this.processCSV.bind(this);
        this.startBatch = this.startBatch.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.stop = this.stop.bind(this);
    }
    
    /**
     * Process CSV data directly (no template needed)
     * CSV contains: destinatario, oggetto, contenuto
     */
    async processCSVDirect(emailsData) {
        logger.info('Processing direct CSV data...');
        
        // Prepare queue with actual email data
        this.#queue = emailsData.map((row, index) => ({
            id: generateId(),
            to: row.destinatario?.trim(),
            subject: row.oggetto?.trim(),
            body: row.contenuto?.trim(),
            data: row,
            status: 'pending',
            attempts: 0,
            error: null,
            sentAt: null,
            index
        }));
        
        this.#progress = {
            total: this.#queue.length,
            sent: 0,
            failed: 0,
            skipped: 0
        };
        
        logger.info(`Email queue prepared: ${this.#queue.length} emails`);
        
        return {
            total: this.#queue.length,
            emails: this.#queue.map(e => ({
                to: e.to,
                subject: e.subject,
                preview: e.body?.substring(0, 100)
            }))
        };
    }
    
    /**
     * Legacy method - Process CSV file with template
     */
    async processCSV(file, template, options = {}) {
        logger.info('Processing CSV file with template...');
        
        const {
            emailColumn = 'email',
            skipInvalid = true,
            validateEmails = true,
            removeDuplicates = true
        } = options;
        
        try {
            // Read file content
            const content = await this.#readFile(file);
            
            // Parse CSV
            const parseResult = await this.#parseCSVDirect(content);
            
            if (parseResult.errors?.length > 0) {
                logger.warn('CSV parse warnings:', parseResult.errors);
            }
            
            logger.info(`CSV parsed: ${parseResult.data.length} rows found`);
            
            // Validate emails
            const validationResult = this.#validateEmailsDirect(parseResult.data, emailColumn);
            
            if (validationResult.invalid.length > 0) {
                logger.warn(`Found ${validationResult.invalid.length} invalid emails`);
                
                if (!skipInvalid) {
                    throw new Error(`Invalid emails found: ${validationResult.invalid.length}`);
                }
            }
            
            if (validationResult.valid.length === 0) {
                throw new Error(CONFIG.ERRORS.NO_RECIPIENTS);
            }
            
            // Check batch size limit
            if (validationResult.valid.length > CONFIG.EMAIL.MAX_EMAILS_TO_PROCESS) {
                throw new Error(CONFIG.ERRORS.BATCH_TOO_LARGE);
            }
            
            // Convert validated data to recipients format
            const recipients = validationResult.valid.map((row, index) => ({
                email: row[emailColumn],
                data: row,
                index: row._index || index
            }));
            
            // Prepare queue
            this.#prepareQueue(recipients, template);
            
            logger.info(`Email queue prepared: ${this.#queue.length} emails`);
            logger.info(`Stats: ${JSON.stringify(validationResult.stats)}`);
            
            return {
                total: this.#queue.length,
                recipients: recipients.map(r => ({
                    email: r.email,
                    variables: r.data
                })),
                stats: validationResult.stats
            };
            
        } catch (error) {
            logger.error('Failed to process CSV:', error);
            throw error;
        }
    }
    
    /**
     * Read file as text
     */
    #readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    /**
     * Start batch email sending
     */
    async startBatch(options = {}) {
        if (this.#processing && !this.#paused) {
            logger.warn('Batch already in progress');
            return;
        }
        
        if (this.#queue.length === 0) {
            logger.warn('No emails in queue');
            return;
        }
        
        const {
            useBatchAPI = false,
            delayBetweenEmails = true,
            minDelay = CONFIG.RATE_LIMITS.MIN_DELAY_MS,
            maxDelay = CONFIG.RATE_LIMITS.MAX_DELAY_MS
        } = options;
        
        logger.info(`Starting batch send: ${this.#queue.length} emails`);
        
        this.#processing = true;
        this.#paused = false;
        this.#startTime = Date.now();
        
        // Update state
        stateManager.set('batch', {
            processing: true,
            queue: this.#queue.map(e => ({
                to: e.to,
                status: e.status
            })),
            progress: this.#progress
        });
        
        // Emit start event
        eventBus.emit(EVENTS.BATCH.START, {
            total: this.#queue.length,
            options
        });
        
        try {
            if (useBatchAPI) {
                await this.#processBatchAPI();
            } else {
                await this.#processSequential(minDelay, maxDelay, delayBetweenEmails);
            }
            
            // Batch complete
            this.#onBatchComplete();
            
        } catch (error) {
            logger.error('Batch processing error:', error);
            this.#onBatchError(error);
        } finally {
            this.#processing = false;
        }
    }
    
    /**
     * Pause batch sending
     */
    pause() {
        if (!this.#processing || this.#paused) {
            logger.warn('Cannot pause: not processing or already paused');
            return false;
        }
        
        logger.info('Pausing batch send...');
        
        this.#paused = true;
        this.#pauseTime = Date.now();
        
        // Update state
        stateManager.update('batch.processing', false);
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.PAUSED, {
            sent: this.#progress.sent,
            remaining: this.#queue.filter(e => e.status === 'pending').length
        });
        
        return true;
    }
    
    /**
     * Resume batch sending
     */
    async resume() {
        if (!this.#paused) {
            logger.warn('Cannot resume: not paused');
            return false;
        }
        
        logger.info('Resuming batch send...');
        
        this.#paused = false;
        
        if (this.#pauseTime) {
            const pauseDuration = Date.now() - this.#pauseTime;
            logger.debug(`Paused for ${pauseDuration}ms`);
        }
        
        // Update state
        stateManager.update('batch.processing', true);
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.RESUMED);
        
        // Continue processing
        if (this.#queue.some(e => e.status === 'pending')) {
            await this.startBatch();
        }
        
        return true;
    }
    
    /**
     * Stop batch sending
     */
    stop() {
        if (!this.#processing) {
            logger.warn('No batch in progress');
            return false;
        }
        
        logger.info('Stopping batch send...');
        
        this.#processing = false;
        this.#paused = false;
        
        // Mark remaining as cancelled
        this.#queue.forEach(email => {
            if (email.status === 'pending') {
                email.status = 'cancelled';
            }
        });
        
        // Update state
        stateManager.set('batch.processing', false);
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.STOPPED, {
            sent: this.#progress.sent,
            cancelled: this.#queue.filter(e => e.status === 'cancelled').length
        });
        
        return true;
    }
    
    /**
     * Get current progress
     */
    getProgress() {
        const pending = this.#queue.filter(e => e.status === 'pending').length;
        const elapsedTime = this.#startTime ? Date.now() - this.#startTime : 0;
        const averageTime = this.#progress.sent > 0 ? elapsedTime / this.#progress.sent : 0;
        
        return {
            ...this.#progress,
            pending,
            percentage: this.#progress.total > 0 
                ? Math.round((this.#progress.sent + this.#progress.failed) / this.#progress.total * 100)
                : 0,
            elapsedTime,
            estimatedTimeRemaining: pending * averageTime,
            isPaused: this.#paused,
            isProcessing: this.#processing
        };
    }
    
    /**
     * Get failed emails
     */
    getFailedEmails() {
        return [...this.#failedEmails];
    }
    
    /**
     * Get sent emails
     */
    getSentEmails() {
        return [...this.#sentEmails];
    }
    
    /**
     * Retry failed emails
     */
    async retryFailed() {
        if (this.#failedEmails.length === 0) {
            logger.info('No failed emails to retry');
            return;
        }
        
        logger.info(`Retrying ${this.#failedEmails.length} failed emails`);
        
        // Reset failed emails to pending
        this.#failedEmails.forEach(email => {
            const queueItem = this.#queue.find(e => e.id === email.id);
            if (queueItem) {
                queueItem.status = 'pending';
                queueItem.error = null;
                queueItem.attempts = 0;
            }
        });
        
        // Clear failed list
        this.#failedEmails = [];
        
        // Reset progress
        this.#progress.failed = 0;
        
        // Start batch
        await this.startBatch();
    }
    
    /**
     * Clear queue
     */
    clearQueue() {
        if (this.#processing) {
            throw new Error('Cannot clear queue while processing');
        }
        
        const cleared = this.#queue.length;
        
        this.#queue = [];
        this.#failedEmails = [];
        this.#sentEmails = [];
        this.#progress = {
            total: 0,
            sent: 0,
            failed: 0,
            skipped: 0
        };
        
        logger.info(`Cleared ${cleared} emails from queue`);
        
        // Update state
        stateManager.set('batch.queue', []);
        
        return cleared;
    }
    
    /**
     * Export queue to CSV
     */
    exportQueue(includeStatus = true) {
        const data = this.#queue.map(email => {
            const row = { ...email.data };
            
            if (includeStatus) {
                row._status = email.status;
                row._error = email.error || '';
                row._sentAt = email.sentAt || '';
            }
            
            return row;
        });
        
        return Papa.unparse(data);
    }
    
    // Private methods
    
    #processRecipients(data, options) {
        const { emailColumn, skipInvalid, validateEmails, removeDuplicates } = options;
        
        let recipients = [];
        const seen = new Set();
        
        data.forEach((row, index) => {
            const email = row[emailColumn]?.trim().toLowerCase();
            
            if (!email) {
                logger.warn(`Row ${index + 1}: No email found in column "${emailColumn}"`);
                return;
            }
            
            // Validate email
            if (validateEmails && !this.#isValidEmail(email)) {
                if (skipInvalid) {
                    logger.warn(`Row ${index + 1}: Invalid email "${email}", skipping`);
                    return;
                } else {
                    throw new Error(`Invalid email at row ${index + 1}: ${email}`);
                }
            }
            
            // Check duplicates
            if (removeDuplicates && seen.has(email)) {
                logger.debug(`Duplicate email "${email}", skipping`);
                return;
            }
            
            seen.add(email);
            
            recipients.push({
                email,
                data: row,
                index
            });
        });
        
        return recipients;
    }
    
    #prepareQueue(recipients, template) {
        this.#queue = recipients.map((recipient, index) => ({
            id: generateId(),
            to: recipient.email,
            data: recipient.data,
            template,
            status: 'pending',
            attempts: 0,
            error: null,
            sentAt: null,
            index
        }));
        
        this.#progress = {
            total: this.#queue.length,
            sent: 0,
            failed: 0,
            skipped: 0
        };
    }
    
    async #processSequential(minDelay, maxDelay, delayBetweenEmails) {
        for (const email of this.#queue) {
            // Check if paused or stopped
            if (this.#paused || !this.#processing) {
                logger.info('Batch paused or stopped');
                break;
            }
            
            // Skip if not pending
            if (email.status !== 'pending') {
                continue;
            }
            
            try {
                // For direct CSV, we already have subject and body
                const subject = email.subject || replaceTemplateVariables(email.template?.subject || '', email.data);
                const body = email.body || replaceTemplateVariables(email.template?.body || '', email.data);
                const isHtml = email.template?.isHtml || false;
                
                // Send email with rate limiting
                await rateLimiter.executeGmailRequest(async () => {
                    const result = await gmailClient.sendEmail(
                        email.to,
                        subject,
                        body,
                        {
                            isHtml,
                            cc: email.template?.cc || '',
                            bcc: email.template?.bcc || '',
                            replyTo: email.template?.replyTo || ''
                        }
                    );
                    
                    // Update email status
                    email.status = 'sent';
                    email.sentAt = new Date().toISOString();
                    email.messageId = result.id;
                    
                    this.#progress.sent++;
                    this.#sentEmails.push(email);
                    
                    logger.info(`Email sent to ${email.to} (${this.#progress.sent}/${this.#progress.total})`);
                    
                    // Emit progress
                    this.#emitProgress();
                    
                }, { isWrite: true });
                
                // Delay between emails
                if (delayBetweenEmails && this.#queue.indexOf(email) < this.#queue.length - 1) {
                    const delay = this.#calculateDelay(minDelay, maxDelay);
                    logger.debug(`Waiting ${delay}ms before next email`);
                    await sleep(delay);
                }
                
            } catch (error) {
                logger.error(`Failed to send email to ${email.to}:`, error);
                
                email.attempts++;
                
                if (email.attempts >= 3) {
                    email.status = 'failed';
                    email.error = error.message;
                    this.#progress.failed++;
                    this.#failedEmails.push(email);
                } else {
                    // Will retry in next iteration
                    logger.debug(`Will retry email to ${email.to} (attempt ${email.attempts})`);
                }
                
                // Check for quota exceeded
                if (error.message?.includes('quota')) {
                    logger.error('Quota exceeded, stopping batch');
                    this.#onQuotaExceeded();
                    break;
                }
                
                // Emit progress
                this.#emitProgress();
            }
        }
    }
    
    async #processBatchAPI() {
        // Process emails in batches using Gmail batch API
        const pending = this.#queue.filter(e => e.status === 'pending');
        const chunks = chunkArray(pending, CONFIG.GMAIL_API.MAX_BATCH_SIZE);
        
        for (const chunk of chunks) {
            // Check if paused or stopped
            if (this.#paused || !this.#processing) {
                break;
            }
            
            // Prepare batch
            const emails = chunk.map(email => {
                const subject = replaceTemplateVariables(email.template.subject, email.data);
                const body = replaceTemplateVariables(email.template.body, email.data);
                
                return {
                    to: email.to,
                    subject,
                    body,
                    isHtml: email.template.isHtml || false,
                    encodedMessage: this.#encodeEmail({
                        to: email.to,
                        subject,
                        body,
                        isHtml: email.template.isHtml || false
                    })
                };
            });
            
            try {
                // Send batch
                const results = await batchProcessor.batchSendEmails(emails);
                
                // Process results
                results.forEach((result, index) => {
                    const email = chunk[index];
                    
                    if (result.success) {
                        email.status = 'sent';
                        email.sentAt = new Date().toISOString();
                        email.messageId = result.data?.id;
                        this.#progress.sent++;
                        this.#sentEmails.push(email);
                    } else {
                        email.status = 'failed';
                        email.error = result.error?.message || 'Unknown error';
                        this.#progress.failed++;
                        this.#failedEmails.push(email);
                    }
                });
                
                // Emit progress
                this.#emitProgress();
                
                // Delay between batches
                if (chunks.indexOf(chunk) < chunks.length - 1) {
                    await sleep(CONFIG.RATE_LIMITS.BATCH_DELAY_MS);
                }
                
            } catch (error) {
                logger.error('Batch send failed:', error);
                
                // Mark all as failed
                chunk.forEach(email => {
                    email.status = 'failed';
                    email.error = error.message;
                    this.#progress.failed++;
                    this.#failedEmails.push(email);
                });
                
                // Check for quota exceeded
                if (error.message?.includes('quota')) {
                    this.#onQuotaExceeded();
                    break;
                }
            }
        }
    }
    

    
    #encodeEmail(email) {
        const message = this.#createMimeMessage(email);
        return base64.encode(message);
    }
    
    #createMimeMessage(email) {
        const nl = '\r\n';
        let message = '';
        
        message += `To: ${email.to}${nl}`;
        message += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(email.subject)))}?=${nl}`;
        message += `MIME-Version: 1.0${nl}`;
        message += `Content-Type: ${email.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8${nl}`;
        message += `Content-Transfer-Encoding: base64${nl}${nl}`;
        message += btoa(unescape(encodeURIComponent(email.body)));
        
        return message;
    }
    
    #isValidEmail(email) {
        return CONFIG.VALIDATION.EMAIL_REGEX.test(email);
    }
    
    // Metodi temporanei per parsing senza worker
    #parseCSVDirect(content) {
        return new Promise((resolve) => {
            Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve({
                        data: results.data,
                        errors: results.errors
                    });
                }
            });
        });
    }
    
    #validateEmailsDirect(emails, emailColumn) {
        const valid = [];
        const invalid = [];
        const seen = new Set();
        
        emails.forEach((row, index) => {
            const email = row[emailColumn]?.toLowerCase().trim();
            
            if (!email) {
                invalid.push({ row, reason: 'Missing email', index });
                return;
            }
            
            if (!this.#isValidEmail(email)) {
                invalid.push({ row, reason: 'Invalid format', index });
                return;
            }
            
            if (seen.has(email)) {
                invalid.push({ row, reason: 'Duplicate', index });
                return;
            }
            
            seen.add(email);
            row._index = index;
            valid.push(row);
        });
        
        return {
            valid,
            invalid,
            stats: {
                total: emails.length,
                valid: valid.length,
                invalid: invalid.length,
                duplicates: invalid.filter(i => i.reason === 'Duplicate').length
            }
        };
    }
    
    #calculateDelay(min, max) {
        // Random delay between min and max
        return Math.floor(Math.random() * (max - min) + min);
    }
    
    #emitProgress() {
        const progress = this.getProgress();
        
        // Update state
        stateManager.set('batch.progress', {
            total: progress.total,
            sent: progress.sent,
            failed: progress.failed,
            skipped: progress.skipped
        });
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.PROGRESS, progress);
    }
    
    #onBatchComplete() {
        const duration = Date.now() - this.#startTime;
        
        logger.info(`Batch complete: ${this.#progress.sent} sent, ${this.#progress.failed} failed in ${duration}ms`);
        
        // Update state
        stateManager.set('batch.processing', false);
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.COMPLETE, {
            ...this.#progress,
            duration,
            sentEmails: this.#sentEmails.length,
            failedEmails: this.#failedEmails.length
        });
    }
    
    #onBatchError(error) {
        logger.error('Batch error:', error);
        
        // Update state
        stateManager.set('batch.processing', false);
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.ERROR, error);
    }
    
    #onQuotaExceeded() {
        logger.error('Gmail quota exceeded');
        
        this.pause();
        
        // Emit event
        eventBus.emit(EVENTS.BATCH.QUOTA_EXCEEDED, {
            sent: this.#progress.sent,
            remaining: this.#queue.filter(e => e.status === 'pending').length
        });
        
        // Show error to user
        eventBus.emit(EVENTS.UI.TOAST, {
            type: 'error',
            message: CONFIG.ERRORS.QUOTA_EXCEEDED,
            duration: 10000
        });
    }
    

}

// Create singleton instance
const emailSender = new EmailSender();

// Export singleton
export default emailSender;
