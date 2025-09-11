/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * EmailDownloader - Email Download and Export Service
 * Handles email search, download, attachment processing, and ZIP/CSV export
 */

import { CONFIG } from '../config.js';
import eventBus from '../core/EventBus.js';
import stateManager from '../core/StateManager.js';
import logger from '../core/Logger.js';
import gmailClient from '../api/GmailClient.js';
import rateLimiter from '../api/RateLimiter.js';
import {
    sleep,
    chunkArray,
    EVENTS,
    formatBytes,
    sanitizeFilename,
    truncateText
} from '../utils/index.js';

class EmailDownloader {
    #emails = [];
    #attachments = [];
    #processing = false;
    #paused = false;
    #cancelled = false;
    #progress = {
        total: 0,
        processed: 0,
        attachments: 0,
        failed: 0
    };
    #filters = {};
    #startTime = null;
    #downloadStats = {
        totalSize: 0,
        emailCount: 0,
        attachmentCount: 0,
        duration: 0
    };
    
    constructor() {
        // Bind methods
        this.search = this.search.bind(this);
        this.download = this.download.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.cancel = this.cancel.bind(this);
    }
    
    /**
     * Search emails based on filters
     */
    async search(filters, options = {}) {
        const {
            maxResults = 100,
            preview = true
        } = options;
        
        logger.info('Searching emails with filters:', filters);
        
        this.#filters = filters;
        
        try {
            // Build search query
            const query = gmailClient.buildSearchQuery(filters);
            
            // Search emails
            const messages = [];
            let pageToken = null;
            let totalFetched = 0;
            
            do {
                const result = await rateLimiter.executeGmailRequest(async () => {
                    return gmailClient.listMessages(query, {
                        maxResults: Math.min(100, maxResults - totalFetched),
                        pageToken
                    });
                });
                
                if (result.messages) {
                    messages.push(...result.messages);
                    totalFetched += result.messages.length;
                }
                
                pageToken = result.nextPageToken;
                
                // Emit search progress
                eventBus.emit(EVENTS.DOWNLOAD.SEARCH_PROGRESS, {
                    found: totalFetched,
                    hasMore: !!pageToken
                });
                
            } while (pageToken && totalFetched < maxResults);
            
            logger.info(`Found ${messages.length} emails`);
            
            // Get preview data if requested
            let previewData = [];
            if (preview && messages.length > 0) {
                previewData = await this.#getPreviewData(messages.slice(0, 10));
            }
            
            return {
                total: messages.length,
                messages,
                preview: previewData,
                query
            };
            
        } catch (error) {
            logger.error('Email search failed:', error);
            throw error;
        }
    }
    
    /**
     * Download emails with attachments
     */
    async download(messageIds, options = {}) {
        if (this.#processing) {
            throw new Error('Download already in progress');
        }
        
        const {
            includeAttachments = true,
            format = 'full',
            exportFormat = 'zip', // 'zip', 'csv', 'both'
            chunkSize = 50
        } = options;
        
        if (!messageIds || messageIds.length === 0) {
            throw new Error('No messages to download');
        }
        
        logger.info(`Starting download of ${messageIds.length} emails`);
        
        this.#processing = true;
        this.#paused = false;
        this.#cancelled = false;
        this.#startTime = Date.now();
        this.#emails = [];
        this.#attachments = [];
        
        // Initialize progress
        this.#progress = {
            total: messageIds.length,
            processed: 0,
            attachments: 0,
            failed: 0
        };
        
        // Update state
        stateManager.set('download', {
            processing: true,
            progress: this.#progress
        });
        
        // Emit start event
        eventBus.emit(EVENTS.DOWNLOAD.START, {
            total: messageIds.length,
            options
        });
        
        try {
            // Process in chunks
            const chunks = chunkArray(messageIds, chunkSize);
            
            for (const chunk of chunks) {
                // Check if paused or cancelled
                if (this.#cancelled) {
                    logger.info('Download cancelled');
                    break;
                }
                
                while (this.#paused) {
                    await sleep(1000);
                    if (this.#cancelled) break;
                }
                
                await this.#processChunk(chunk, includeAttachments, format);
                
                // Delay between chunks
                if (chunks.indexOf(chunk) < chunks.length - 1) {
                    await sleep(CONFIG.RATE_LIMITS.BATCH_DELAY_MS);
                }
            }
            
            if (!this.#cancelled) {
                // Create export
                const exportResult = await this.#createExport(exportFormat);
                
                // Complete
                this.#onDownloadComplete(exportResult);
                
                return exportResult;
            }
            
        } catch (error) {
            logger.error('Download failed:', error);
            this.#onDownloadError(error);
            throw error;
            
        } finally {
            this.#processing = false;
        }
    }
    
    /**
     * Pause download
     */
    pause() {
        if (!this.#processing || this.#paused) {
            return false;
        }
        
        logger.info('Pausing download');
        
        this.#paused = true;
        
        eventBus.emit(EVENTS.DOWNLOAD.PAUSED, this.getProgress());
        
        return true;
    }
    
    /**
     * Resume download
     */
    resume() {
        if (!this.#paused) {
            return false;
        }
        
        logger.info('Resuming download');
        
        this.#paused = false;
        
        eventBus.emit(EVENTS.DOWNLOAD.RESUMED);
        
        return true;
    }
    
    /**
     * Cancel download
     */
    cancel() {
        if (!this.#processing) {
            return false;
        }
        
        logger.info('Cancelling download');
        
        this.#cancelled = true;
        this.#paused = false;
        
        eventBus.emit(EVENTS.DOWNLOAD.CANCELLED, this.getProgress());
        
        return true;
    }
    
    /**
     * Get current progress
     */
    getProgress() {
        const elapsedTime = this.#startTime ? Date.now() - this.#startTime : 0;
        const averageTime = this.#progress.processed > 0 
            ? elapsedTime / this.#progress.processed 
            : 0;
        const remaining = this.#progress.total - this.#progress.processed;
        
        return {
            ...this.#progress,
            percentage: this.#progress.total > 0
                ? Math.round(this.#progress.processed / this.#progress.total * 100)
                : 0,
            elapsedTime,
            estimatedTimeRemaining: remaining * averageTime,
            isPaused: this.#paused,
            isProcessing: this.#processing,
            totalSize: this.#downloadStats.totalSize
        };
    }
    
    /**
     * Get downloaded emails
     */
    getEmails() {
        return [...this.#emails];
    }
    
    /**
     * Get download statistics
     */
    getStats() {
        return { ...this.#downloadStats };
    }
    
    /**
     * Clear downloaded data
     */
    clear() {
        if (this.#processing) {
            throw new Error('Cannot clear while downloading');
        }
        
        this.#emails = [];
        this.#attachments = [];
        this.#progress = {
            total: 0,
            processed: 0,
            attachments: 0,
            failed: 0
        };
        this.#downloadStats = {
            totalSize: 0,
            emailCount: 0,
            attachmentCount: 0,
            duration: 0
        };
        
        logger.info('Download data cleared');
    }
    
    // Private methods
    
    async #getPreviewData(messages) {
        const preview = [];
        
        for (const message of messages) {
            try {
                const email = await rateLimiter.executeGmailRequest(async () => {
                    return gmailClient.getMessage(message.id, 'metadata');
                });
                
                preview.push({
                    id: email.id,
                    from: email.from,
                    subject: email.subject,
                    date: email.date,
                    snippet: email.snippet
                });
                
            } catch (error) {
                logger.warn(`Failed to get preview for message ${message.id}:`, error);
            }
        }
        
        return preview;
    }
    
    async #processChunk(messageIds, includeAttachments, format) {
        logger.debug(`Processing chunk of ${messageIds.length} emails`);
        
        for (const messageId of messageIds) {
            try {
                // Get email details
                const email = await rateLimiter.executeGmailRequest(async () => {
                    return gmailClient.getMessage(messageId, format);
                });
                
                this.#emails.push(email);
                this.#downloadStats.emailCount++;
                this.#downloadStats.totalSize += email.sizeEstimate || 0;
                
                // Download attachments if requested
                if (includeAttachments && email.attachments?.length > 0) {
                    await this.#downloadAttachments(email);
                }
                
                this.#progress.processed++;
                this.#emitProgress();
                
            } catch (error) {
                logger.error(`Failed to download message ${messageId}:`, error);
                this.#progress.failed++;
                this.#emitProgress();
            }
        }
    }
    
    async #downloadAttachments(email) {
        for (const attachment of email.attachments) {
            try {
                logger.debug(`Downloading attachment: ${attachment.filename}`);
                
                const data = await rateLimiter.executeGmailRequest(async () => {
                    return gmailClient.getAttachment(email.id, attachment.attachmentId);
                });
                
                this.#attachments.push({
                    emailId: email.id,
                    filename: attachment.filename,
                    mimeType: attachment.mimeType,
                    data: data.data,
                    size: data.size || attachment.size
                });
                
                this.#progress.attachments++;
                this.#downloadStats.attachmentCount++;
                this.#downloadStats.totalSize += data.size || 0;
                
                this.#emitProgress();
                
            } catch (error) {
                logger.error(`Failed to download attachment ${attachment.filename}:`, error);
            }
        }
    }
    
    async #createExport(format) {
        logger.info(`Creating export in format: ${format}`);
        
        const exports = {};
        
        // Create CSV
        if (format === 'csv' || format === 'both') {
            exports.csv = await this.#createCSV();
        }
        
        // Create ZIP
        if (format === 'zip' || format === 'both') {
            exports.zip = await this.#createZIP();
        }
        
        return exports;
    }
    
    async #createCSV() {
        logger.debug('Creating CSV export');
        
        const rows = this.#emails.map(email => ({
            'ID': email.id,
            'Thread ID': email.threadId,
            'Date': email.date?.toISOString() || '',
            'From': email.from || '',
            'To': email.to || '',
            'CC': email.cc || '',
            'BCC': email.bcc || '',
            'Subject': email.subject || '',
            'Snippet': email.snippet || '',
            'Body': truncateText(email.body?.text || email.body?.html || '', 1000),
            'Labels': (email.labelIds || []).join(';'),
            'Attachments': (email.attachments || []).map(a => a.filename).join(';'),
            'Size': email.sizeEstimate || 0,
            'Is Read': !email.isUnread,
            'Is Starred': email.isStarred || false,
            'Is Important': email.isImportant || false,
            'Is Draft': email.isDraft || false
        }));
        
        const csv = Papa.unparse(rows, {
            header: true,
            skipEmptyLines: true
        });
        
        // Create blob
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        
        return {
            blob,
            filename: `gmail_export_${new Date().toISOString().split('T')[0]}.csv`,
            size: blob.size
        };
    }
    
    async #createZIP() {
        logger.debug('Creating ZIP export');
        
        // Use zip.js to create ZIP
        const zipWriter = new zip.ZipWriter(new zip.BlobWriter());
        
        try {
            // Add metadata
            const metadata = {
                exportDate: new Date().toISOString(),
                totalEmails: this.#emails.length,
                totalAttachments: this.#attachments.length,
                filters: this.#filters,
                stats: this.#downloadStats
            };
            
            await zipWriter.add(
                'metadata.json',
                new zip.TextReader(JSON.stringify(metadata, null, 2))
            );
            
            // Add emails as EML files
            // Track filenames to detect any potential duplicates
            const emailFilenames = new Set();
            
            for (const email of this.#emails) {
                const emlContent = this.#createEMLContent(email);
                // FIX: Added email.id to ensure unique filenames and prevent 'File already exists' error
                const filename = `emails/${sanitizeFilename(email.subject || 'no-subject')}_${email.id}.eml`;
                
                // Safety check for duplicates (should never happen with ID included)
                if (emailFilenames.has(filename)) {
                    logger.error(`Duplicate email filename detected: ${filename}`);
                    continue; // Skip this file to prevent ZIP error
                }
                emailFilenames.add(filename);
                
                await zipWriter.add(
                    filename,
                    new zip.TextReader(emlContent)
                );
            }
            
            // Add attachments
            // FIX: Track attachment filenames to prevent duplicates
            const attachmentFilenames = new Map();
            
            for (const attachment of this.#attachments) {
                const folder = `attachments/${attachment.emailId}/`;
                let baseFilename = sanitizeFilename(attachment.filename);
                let filename = folder + baseFilename;
                
                // Handle duplicate attachment names
                let counter = 1;
                const originalFilename = filename;
                while (attachmentFilenames.has(filename)) {
                    const ext = baseFilename.lastIndexOf('.') > -1 
                        ? baseFilename.substring(baseFilename.lastIndexOf('.'))
                        : '';
                    const nameWithoutExt = baseFilename.substring(0, baseFilename.lastIndexOf('.') > -1 ? baseFilename.lastIndexOf('.') : baseFilename.length);
                    baseFilename = `${nameWithoutExt}_${counter}${ext}`;
                    filename = folder + baseFilename;
                    counter++;
                }
                attachmentFilenames.set(filename, true);
                
                // Decode base64 data
                const binaryString = atob(attachment.data.replace(/-/g, '+').replace(/_/g, '/'));
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                await zipWriter.add(
                    filename,
                    new zip.BlobReader(new Blob([bytes], { type: attachment.mimeType }))
                );
            }
            
            // Add CSV export
            const csvExport = await this.#createCSV();
            await zipWriter.add(
                'emails.csv',
                new zip.BlobReader(csvExport.blob)
            );
            
            // Add summary report
            const summary = this.#createSummaryReport();
            await zipWriter.add(
                'summary.html',
                new zip.TextReader(summary)
            );
            
            // Close ZIP
            const zipBlob = await zipWriter.close();
            
            return {
                blob: zipBlob,
                filename: `gmail_export_${new Date().toISOString().split('T')[0]}.zip`,
                size: zipBlob.size
            };
            
        } catch (error) {
            logger.error('Failed to create ZIP:', error);
            throw error;
        }
    }
    
    #createEMLContent(email) {
        const nl = '\r\n';
        let eml = '';
        
        // Headers
        eml += `Message-ID: <${email.id}@mail.gmail.com>${nl}`;
        eml += `Date: ${email.date?.toUTCString() || new Date().toUTCString()}${nl}`;
        eml += `From: ${email.from || 'unknown@gmail.com'}${nl}`;
        eml += `To: ${email.to || 'unknown@gmail.com'}${nl}`;
        if (email.cc) eml += `Cc: ${email.cc}${nl}`;
        if (email.bcc) eml += `Bcc: ${email.bcc}${nl}`;
        eml += `Subject: ${email.subject || '(No Subject)'}${nl}`;
        eml += `MIME-Version: 1.0${nl}`;
        
        // Body
        if (email.body?.html) {
            eml += `Content-Type: text/html; charset=UTF-8${nl}`;
            eml += `Content-Transfer-Encoding: quoted-printable${nl}${nl}`;
            eml += this.#encodeQuotedPrintable(email.body.html);
        } else {
            eml += `Content-Type: text/plain; charset=UTF-8${nl}`;
            eml += `Content-Transfer-Encoding: quoted-printable${nl}${nl}`;
            eml += this.#encodeQuotedPrintable(email.body?.text || '');
        }
        
        return eml;
    }
    
    #createSummaryReport() {
        const stats = this.#downloadStats;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Gmail Export Summary</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 { color: #1a73e8; }
        .stat { 
            display: inline-block;
            margin: 10px 20px 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .stat-label { 
            color: #5f6368;
            font-size: 0.875rem;
        }
        .stat-value { 
            font-size: 1.5rem;
            font-weight: 600;
            color: #202124;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f8f9fa;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <h1>Gmail Export Summary</h1>
    
    <div class="stats">
        <div class="stat">
            <div class="stat-label">Total Emails</div>
            <div class="stat-value">${stats.emailCount}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total Attachments</div>
            <div class="stat-value">${stats.attachmentCount}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Total Size</div>
            <div class="stat-value">${formatBytes(stats.totalSize)}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Export Date</div>
            <div class="stat-value">${new Date().toLocaleDateString()}</div>
        </div>
    </div>
    
    <h2>Export Details</h2>
    <table>
        <tr>
            <th>Property</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Date Range</td>
            <td>${this.#filters.dateFrom || 'Any'} - ${this.#filters.dateTo || 'Any'}</td>
        </tr>
        <tr>
            <td>Search Query</td>
            <td>${gmailClient.buildSearchQuery(this.#filters) || 'All emails'}</td>
        </tr>
        <tr>
            <td>Processing Time</td>
            <td>${Math.round(stats.duration / 1000)} seconds</td>
        </tr>
        <tr>
            <td>Failed Downloads</td>
            <td>${this.#progress.failed}</td>
        </tr>
    </table>
    
    <h2>Email Distribution</h2>
    <table>
        <tr>
            <th>Sender</th>
            <th>Count</th>
        </tr>
        ${this.#getTopSenders().map(sender => `
        <tr>
            <td>${sender.email}</td>
            <td>${sender.count}</td>
        </tr>
        `).join('')}
    </table>
    
    <p style="margin-top: 40px; color: #5f6368; font-size: 0.875rem;">
        Generated by Gmail Tool v0.5 on ${new Date().toISOString()}
    </p>
</body>
</html>
        `;
    }
    
    #getTopSenders() {
        const senderCounts = {};
        
        this.#emails.forEach(email => {
            const sender = email.from || 'Unknown';
            senderCounts[sender] = (senderCounts[sender] || 0) + 1;
        });
        
        return Object.entries(senderCounts)
            .map(([email, count]) => ({ email, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    

    
    #encodeQuotedPrintable(text) {
        // Simple quoted-printable encoding
        return text
            .replace(/([^\x20-\x7E])/g, (match, p1) => {
                return '=' + p1.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
            })
            .replace(/(.{1,72})/g, '$1=\r\n')
            .replace(/=\r\n$/, '');
    }
    

    
    #emitProgress() {
        const progress = this.getProgress();
        
        // Update state
        stateManager.set('download.progress', {
            total: progress.total,
            processed: progress.processed,
            attachments: progress.attachments,
            failed: progress.failed
        });
        
        // Emit event
        eventBus.emit(EVENTS.DOWNLOAD.PROGRESS, progress);
    }
    
    #onDownloadComplete(exportResult) {
        const duration = Date.now() - this.#startTime;
        this.#downloadStats.duration = duration;
        
        logger.info(`Download complete: ${this.#progress.processed} emails in ${duration}ms`);
        
        // Update state
        stateManager.set('download.processing', false);
        
        // Emit event
        eventBus.emit(EVENTS.DOWNLOAD.COMPLETE, {
            ...this.#progress,
            duration,
            exports: exportResult,
            stats: this.#downloadStats
        });
        
        // Show success message
        eventBus.emit(EVENTS.UI.TOAST, {
            type: 'success',
            message: CONFIG.SUCCESS.DOWNLOAD_COMPLETE
        });
    }
    
    #onDownloadError(error) {
        logger.error('Download error:', error);
        
        // Update state
        stateManager.set('download.processing', false);
        
        // Emit event
        eventBus.emit(EVENTS.DOWNLOAD.ERROR, error);
        
        // Show error message
        eventBus.emit(EVENTS.UI.TOAST, {
            type: 'error',
            message: error.message || 'Download failed'
        });
    }
    

}

// Create singleton instance
const emailDownloader = new EmailDownloader();

// Export singleton
export default emailDownloader;

// Expose for debugging in development
if (window.APP_CONFIG?.DEBUG?.ENABLED) {
    window.emailDownloader = emailDownloader;
}
