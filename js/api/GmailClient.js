/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * GmailClient - Gmail API Wrapper
 * Provides a clean interface for all Gmail API operations
 */

import { CONFIG } from '../config.js';
import eventBus from '../core/EventBus.js';
import logger from '../core/Logger.js';
import googleAuth from '../auth/GoogleAuth.js';

// Import shared utilities to eliminate code duplication
import {
    waitFor,
    sleep,
    chunkArray,
    base64,
    replaceTemplateVariables,
    EVENTS,
    storage
} from '../utils/index.js';
import { gmailCache } from '../core/SmartCache.js';

class GmailClient {
    #initialized = false;
    #requestCount = 0;
    #quotaUsed = 0;
    
    constructor() {
        this.initialize = this.initialize.bind(this);
    }
    
    /**
     * Initialize Gmail API client
     */
    async initialize() {
        if (this.#initialized) {
            logger.debug('GmailClient already initialized');
            return;
        }
        
        try {
            logger.info('Initializing Gmail API client...');
            
            // Wait for GAPI to be ready
            await this.#waitForGAPI();
            
            // Load Gmail API
            await new Promise((resolve, reject) => {
                gapi.client.load('gmail', 'v1', (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            this.#initialized = true;
            logger.info('Gmail API client initialized');
            
            eventBus.emit(EVENTS.GMAIL.INITIALIZED);
            
        } catch (error) {
            logger.error('Failed to initialize Gmail client:', error);
            throw error;
        }
    }
    
    /**
     * Send email
     */
    async sendEmail(to, subject, body, options = {}) {
        await this.#ensureInitialized();
        
        const {
            cc = '',
            bcc = '',
            replyTo = '',
            attachments = [],
            isHtml = false,
            headers = {}
        } = options;
        
        try {
            logger.debug(`Sending email to ${to}`);
            
            // Create email
            const email = await this.#createMimeMessage({
                to,
                cc,
                bcc,
                replyTo,
                subject,
                body,
                isHtml,
                attachments,
                headers
            });
            
            // Encode email
            const encodedEmail = this.#encodeEmail(email);
            
            // Send email
            const response = await gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: {
                    raw: encodedEmail
                }
            });
            
            this.#incrementQuota(5); // Sending costs 5 quota units
            
            logger.info(`Email sent successfully: ${response.result.id}`);
            
            eventBus.emit(EVENTS.GMAIL.EMAIL_SENT, {
                id: response.result.id,
                to,
                subject
            });
            
            return response.result;
            
        } catch (error) {
            logger.error('Failed to send email:', error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Send email with template
     */
    async sendTemplateEmail(to, template, variables = {}) {
        const subject = this.#replaceTemplateVariables(template.subject, variables);
        const body = this.#replaceTemplateVariables(template.body, variables);
        
        return this.sendEmail(to, subject, body, {
            isHtml: template.isHtml || false,
            cc: template.cc || '',
            bcc: template.bcc || '',
            replyTo: template.replyTo || ''
        });
    }
    
    /**
     * List messages
     */
    async listMessages(query = '', options = {}) {
        await this.#ensureInitialized();
        
        const {
            maxResults = CONFIG.GMAIL_API.MAX_RESULTS_PER_PAGE,
            pageToken = null,
            includeSpamTrash = false,
            labelIds = []
        } = options;
        
        try {
            logger.debug(`Listing messages with query: ${query}`);
            
            const params = {
                userId: 'me',
                q: query,
                maxResults,
                includeSpamTrash
            };
            
            if (pageToken) params.pageToken = pageToken;
            if (labelIds.length > 0) params.labelIds = labelIds;
            
            const response = await gapi.client.gmail.users.messages.list(params);
            
            this.#incrementQuota(5); // List costs 5 quota units
            
            const result = response.result;
            
            logger.debug(`Found ${result.messages?.length || 0} messages`);
            
            return {
                messages: result.messages || [],
                nextPageToken: result.nextPageToken,
                resultSizeEstimate: result.resultSizeEstimate
            };
            
        } catch (error) {
            logger.error('Failed to list messages:', error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Get message details
     */
    async getMessage(messageId, format = 'full') {
        await this.#ensureInitialized();
        
        // Check cache first
        const cacheKey = `message:${messageId}:${format}`;
        let message = gmailCache.get(cacheKey);
        
        if (message) {
            logger.debug(`Cache hit for message ${messageId}`);
            return message;
        }
        
        try {
            logger.debug(`Fetching message: ${messageId}`);
            
            const response = await gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: format
            });
            
            this.#incrementQuota(5); // Get costs 5 quota units
            
            message = this.#parseMessage(response.result);
            
            // Store in cache (weak reference for large objects)
            gmailCache.set(cacheKey, message, {
                ttl: format === 'full' ? 1800000 : 3600000, // 30min for full, 1hr for metadata
                weak: format === 'full' // Use WeakRef for full messages
            });
            
            return message;
            
        } catch (error) {
            logger.error(`Failed to get message ${messageId}:`, error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Get multiple messages (batch)
     */
    async getMessages(messageIds, format = 'full') {
        await this.#ensureInitialized();
        
        if (!messageIds || messageIds.length === 0) {
            return [];
        }
        
        logger.debug(`Getting ${messageIds.length} messages in batch`);
        
        // Split into chunks for batch processing
        const chunks = this.#chunkArray(messageIds, CONFIG.GMAIL_API.MAX_BATCH_SIZE);
        const allMessages = [];
        
        for (const chunk of chunks) {
            const batchMessages = await this.#getBatchMessages(chunk, format);
            allMessages.push(...batchMessages);
            
            // Small delay between batches
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await sleep(CONFIG.RATE_LIMITS.BATCH_DELAY_MS);
            }
        }
        
        return allMessages;
    }
    
    /**
     * Get attachment
     */
    async getAttachment(messageId, attachmentId) {
        await this.#ensureInitialized();
        
        // Check cache first
        const cacheKey = `attachment:${messageId}:${attachmentId}`;
        let attachment = gmailCache.get(cacheKey);
        
        if (attachment) {
            logger.debug(`Cache hit for attachment ${attachmentId}`);
            return attachment;
        }
        
        try {
            logger.debug(`Getting attachment ${attachmentId} from message ${messageId}`);
            
            const response = await gapi.client.gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });
            
            this.#incrementQuota(5); // Attachment costs 5 quota units
            
            attachment = {
                data: response.result.data,
                size: response.result.size
            };
            
            // Cache attachment with shorter TTL
            gmailCache.set(cacheKey, attachment, {
                ttl: 900000, // 15 minutes
                weak: true // Use WeakRef for attachments
            });
            
            return attachment;
            
        } catch (error) {
            logger.error(`Failed to get attachment:`, error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Modify message (mark as read, add labels, etc.)
     */
    async modifyMessage(messageId, modifications) {
        await this.#ensureInitialized();
        
        const {
            addLabelIds = [],
            removeLabelIds = []
        } = modifications;
        
        try {
            logger.debug(`Modifying message ${messageId}`);
            
            const response = await gapi.client.gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                resource: {
                    addLabelIds,
                    removeLabelIds
                }
            });
            
            this.#incrementQuota(5); // Modify costs 5 quota units
            
            return response.result;
            
        } catch (error) {
            logger.error(`Failed to modify message:`, error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Trash message
     */
    async trashMessage(messageId) {
        await this.#ensureInitialized();
        
        try {
            logger.debug(`Trashing message ${messageId}`);
            
            const response = await gapi.client.gmail.users.messages.trash({
                userId: 'me',
                id: messageId
            });
            
            this.#incrementQuota(5);
            
            eventBus.emit(EVENTS.GMAIL.MESSAGE_TRASHED, messageId);
            
            return response.result;
            
        } catch (error) {
            logger.error(`Failed to trash message:`, error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Delete message permanently
     */
    async deleteMessage(messageId) {
        await this.#ensureInitialized();
        
        try {
            logger.debug(`Deleting message ${messageId}`);
            
            await gapi.client.gmail.users.messages.delete({
                userId: 'me',
                id: messageId
            });
            
            this.#incrementQuota(10); // Delete costs 10 quota units
            
            eventBus.emit(EVENTS.GMAIL.MESSAGE_DELETED, messageId);
            
            return true;
            
        } catch (error) {
            logger.error(`Failed to delete message:`, error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Get labels
     */
    async getLabels() {
        await this.#ensureInitialized();
        
        try {
            logger.debug('Getting labels');
            
            const response = await gapi.client.gmail.users.labels.list({
                userId: 'me'
            });
            
            this.#incrementQuota(1); // Labels cost 1 quota unit
            
            return response.result.labels || [];
            
        } catch (error) {
            logger.error('Failed to get labels:', error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Get user profile
     */
    async getProfile() {
        await this.#ensureInitialized();
        
        try {
            logger.debug('Getting user profile');
            
            const response = await gapi.client.gmail.users.getProfile({
                userId: 'me'
            });
            
            this.#incrementQuota(1);
            
            return {
                emailAddress: response.result.emailAddress,
                messagesTotal: response.result.messagesTotal,
                threadsTotal: response.result.threadsTotal,
                historyId: response.result.historyId
            };
            
        } catch (error) {
            logger.error('Failed to get profile:', error);
            this.#handleAPIError(error);
            throw error;
        }
    }
    
    /**
     * Build search query from filters
     */
    buildSearchQuery(filters) {
        const queryParts = [];
        
        if (filters.from) {
            queryParts.push(`from:${filters.from}`);
        }
        
        if (filters.to) {
            queryParts.push(`to:${filters.to}`);
        }
        
        if (filters.subject) {
            queryParts.push(`subject:"${filters.subject}"`);
        }
        
        if (filters.dateFrom) {
            queryParts.push(`after:${filters.dateFrom}`);
        }
        
        if (filters.dateTo) {
            queryParts.push(`before:${filters.dateTo}`);
        }
        
        if (filters.hasAttachments) {
            queryParts.push('has:attachment');
        }
        
        if (filters.isUnread) {
            queryParts.push('is:unread');
        }
        
        if (filters.isStarred) {
            queryParts.push('is:starred');
        }
        
        if (filters.isImportant) {
            queryParts.push('is:important');
        }
        
        if (filters.labels && filters.labels.length > 0) {
            filters.labels.forEach(label => {
                queryParts.push(`label:${label}`);
            });
        }
        
        if (filters.excludeLabels && filters.excludeLabels.length > 0) {
            filters.excludeLabels.forEach(label => {
                queryParts.push(`-label:${label}`);
            });
        }
        
        if (filters.query) {
            queryParts.push(filters.query);
        }
        
        return queryParts.join(' ');
    }
    
    /**
     * Get quota usage
     */
    getQuotaUsage() {
        return {
            used: this.#quotaUsed,
            requestCount: this.#requestCount,
            dailyLimit: CONFIG.RATE_LIMITS.QUOTA_PER_DAY
        };
    }
    
    // Private methods
    
    async #ensureInitialized() {
        if (!this.#initialized) {
            await this.initialize();
        }
        
        // Ensure we have a valid token
        await googleAuth.refreshTokenIfNeeded();
    }
    
    async #waitForGAPI() {
        // Use shared waitFor utility
        await waitFor(
            () => window.gapi?.client,
            {
                maxAttempts: 50,
                interval: 100,
                errorMessage: 'GAPI client not available'
            }
        );
    }
    
    async #createMimeMessage(options) {
        const {
            to, cc, bcc, replyTo, subject, body, isHtml, attachments, headers
        } = options;
        
        const boundary = `----=_Part_${Math.random().toString(36).substr(2)}`;
        const nl = '\r\n';
        
        let message = '';
        
        // Headers
        message += `MIME-Version: 1.0${nl}`;
        message += `To: ${to}${nl}`;
        if (cc) message += `Cc: ${cc}${nl}`;
        if (bcc) message += `Bcc: ${bcc}${nl}`;
        if (replyTo) message += `Reply-To: ${replyTo}${nl}`;
        message += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=${nl}`;
        
        // Custom headers
        for (const [key, value] of Object.entries(headers)) {
            message += `${key}: ${value}${nl}`;
        }
        
        // Handle attachments
        if (attachments && attachments.length > 0) {
            message += `Content-Type: multipart/mixed; boundary="${boundary}"${nl}${nl}`;
            
            // Body part
            message += `--${boundary}${nl}`;
            message += `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8${nl}`;
            message += `Content-Transfer-Encoding: base64${nl}${nl}`;
            message += btoa(unescape(encodeURIComponent(body))) + nl;
            
            // Attachment parts
            for (const attachment of attachments) {
                message += `--${boundary}${nl}`;
                message += `Content-Type: ${attachment.mimeType || 'application/octet-stream'}${nl}`;
                message += `Content-Transfer-Encoding: base64${nl}`;
                message += `Content-Disposition: attachment; filename="${attachment.filename}"${nl}${nl}`;
                message += attachment.data + nl;
            }
            
            message += `--${boundary}--${nl}`;
            
        } else {
            // Simple message without attachments
            message += `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8${nl}`;
            message += `Content-Transfer-Encoding: base64${nl}${nl}`;
            message += btoa(unescape(encodeURIComponent(body)));
        }
        
        return message;
    }
    
    #encodeEmail(email) {
        // Use shared base64 utility
        return base64.encode(email);
    }
    
    #parseMessage(message) {
        const parsed = {
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds || [],
            snippet: message.snippet,
            historyId: message.historyId,
            internalDate: new Date(parseInt(message.internalDate)),
            sizeEstimate: message.sizeEstimate,
            headers: {},
            body: {
                text: '',
                html: ''
            },
            attachments: []
        };
        
        // Parse headers
        if (message.payload?.headers) {
            message.payload.headers.forEach(header => {
                parsed.headers[header.name.toLowerCase()] = header.value;
            });
        }
        
        // Extract common headers
        parsed.from = parsed.headers.from || '';
        parsed.to = parsed.headers.to || '';
        parsed.cc = parsed.headers.cc || '';
        parsed.bcc = parsed.headers.bcc || '';
        parsed.subject = parsed.headers.subject || '(No Subject)';
        parsed.date = parsed.headers.date ? new Date(parsed.headers.date) : parsed.internalDate;
        
        // Parse body and attachments
        if (message.payload) {
            this.#parseMessagePart(message.payload, parsed);
        }
        
        // Determine flags
        parsed.isUnread = !parsed.labelIds.includes('UNREAD');
        parsed.isStarred = parsed.labelIds.includes('STARRED');
        parsed.isImportant = parsed.labelIds.includes('IMPORTANT');
        parsed.isDraft = parsed.labelIds.includes('DRAFT');
        parsed.isSpam = parsed.labelIds.includes('SPAM');
        parsed.isTrash = parsed.labelIds.includes('TRASH');
        
        return parsed;
    }
    
    #parseMessagePart(part, parsed) {
        // Handle body
        if (part.body?.data) {
            const content = this.#decodeBase64(part.body.data);
            
            if (part.mimeType === 'text/plain') {
                parsed.body.text = content;
            } else if (part.mimeType === 'text/html') {
                parsed.body.html = content;
            }
        }
        
        // Handle attachments
        if (part.filename && part.body?.attachmentId) {
            parsed.attachments.push({
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body.size || 0,
                attachmentId: part.body.attachmentId
            });
        }
        
        // Recurse through parts
        if (part.parts) {
            part.parts.forEach(subPart => {
                this.#parseMessagePart(subPart, parsed);
            });
        }
    }
    
    #decodeBase64(data) {
        // Use shared base64 utility
        return base64.decode(data);
    }
    
    async #getBatchMessages(messageIds, format) {
        const batch = gapi.client.newBatch();
        const messages = [];
        
        messageIds.forEach((id, index) => {
            const request = gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: id,
                format: format
            });
            
            batch.add(request, { id: `message_${index}` });
        });
        
        try {
            const response = await batch;
            
            this.#incrementQuota(5 * messageIds.length);
            
            // Extract messages from batch response
            for (let i = 0; i < messageIds.length; i++) {
                const result = response.result[`message_${i}`];
                if (result?.result) {
                    messages.push(this.#parseMessage(result.result));
                }
            }
            
            return messages;
            
        } catch (error) {
            logger.error('Batch request failed:', error);
            throw error;
        }
    }
    
    #replaceTemplateVariables(template, variables) {
        // Use shared template utility
        return replaceTemplateVariables(template, variables);
    }
    
    #incrementQuota(units) {
        this.#quotaUsed += units;
        this.#requestCount++;
        
        logger.debug(`Quota used: ${this.#quotaUsed} units, Requests: ${this.#requestCount}`);
        
        // Check quota limits
        if (this.#quotaUsed > CONFIG.RATE_LIMITS.QUOTA_PER_DAY * 0.9) {
            logger.warn('Approaching daily quota limit');
            eventBus.emit(EVENTS.GMAIL.QUOTA_WARNING, this.getQuotaUsage());
        }
    }
    
    #handleAPIError(error) {
        const errorCode = error.result?.error?.code;
        const errorMessage = error.result?.error?.message || error.message;
        
        if (errorCode === 401) {
            // Authentication error
            eventBus.emit(EVENTS.AUTH.ERROR, error);
        } else if (errorCode === 403) {
            // Quota exceeded or forbidden
            if (errorMessage.includes('quota')) {
                eventBus.emit(EVENTS.GMAIL.QUOTA_EXCEEDED, error);
            }
        } else if (errorCode === 429) {
            // Rate limit
            eventBus.emit(EVENTS.GMAIL.RATE_LIMITED, error);
        }
        
        logger.error(`Gmail API Error [${errorCode}]: ${errorMessage}`);
    }
    
    #chunkArray(array, size) {
        // Use shared chunk utility
        return chunkArray(array, size);
    }
    
    // Removed #sleep - now using shared sleep utility
}

// Create singleton instance
const gmailClient = new GmailClient();

// Export singleton
export default gmailClient;
