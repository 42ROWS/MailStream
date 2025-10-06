/**
 * BatchSenderUI - Simplified User Interface for Batch Email Sending
 * CSV contains: destinatario, oggetto, contenuto
 */

import { CONFIG } from '../config.js';
import eventBus from '../core/EventBus.js';
import stateManager from '../core/StateManager.js';
import logger from '../core/Logger.js';
import emailSender from '../services/EmailSender.js';
import { EVENTS } from '../utils/index.js';
import {
    showSuccess,
    showError,
    showWarning,
    showElement,
    hideElement,
    enableElement,
    disableElement,
    formatDuration,
    confirmDialog
} from '../utils/UIHelpers.js';
import i18n from '../i18n/index.js';

export default class BatchSenderUI {
    #container = null;
    #elements = {};
    #csvData = null;
    #sendingInProgress = false;
    #pausedState = false;
    
    constructor(container) {
        if (!container) {
            throw new Error('BatchSenderUI requires a container element');
        }
        
        this.#container = container;
        
        // Render UI
        this.render();
        
        // Setup event listeners
        this.#setupEventListeners();
        
        // Subscribe to batch events
        this.#subscribeToBatchEvents();
        
        logger.info('BatchSenderUI initialized');
    }
    
    /**
     * Render the simplified UI
     */
    render() {
        this.#container.innerHTML = `
            <div class="batch-sender-ui">
                <!-- Header -->
                <div class="glass-effect rounded-lg p-6 mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-2" data-i18n="sender.title">📤 Batch Email Sender</h2>
                    <p class="text-gray-600" data-i18n="sender.subtitle">Upload a CSV with recipient, subject and content to send batch emails</p>
                </div>

                <!-- Step 1: Upload CSV -->
                <div class="glass-effect rounded-lg p-6 mb-6">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">1</span>
                        <span data-i18n="sender.uploadSection">Upload CSV File</span>
                    </h3>
                    
                    <div class="mb-4">
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                            <input type="file" 
                                   id="csv-file" 
                                   accept=".csv"
                                   class="hidden">
                            <label for="csv-file" class="cursor-pointer">
                                <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <p class="text-sm text-gray-600">
                                    <span class="font-medium text-indigo-600 hover:text-indigo-500" data-i18n="sender.clickSelect">
                                        Click to select
                                    </span>
                                    <span data-i18n="sender.dragFile">or drag the CSV file here</span>
                                </p>
                                <p class="text-xs text-gray-500 mt-2" data-i18n="sender.csvColumns">
                                    CSV must contain columns: recipient, subject, content
                                </p>
                            </label>
                        </div>
                        
                        <!-- File info -->
                        <div id="file-info" class="hidden mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-green-800">
                                        📄 <span id="file-name"></span>
                                    </p>
                                    <p class="text-xs text-green-600 mt-1">
                                        <span id="file-rows"></span> <span data-i18n="sender.emailsToSend">emails to send</span>
                                    </p>
                                </div>
                                <button id="remove-file-btn" class="text-red-600 hover:text-red-700" data-i18n="sender.remove">
                                    ❌ Remove
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CSV Requirements -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-blue-900 mb-2" data-i18n="sender.csvFormat">📋 CSV Format Required:</h4>
                        <pre class="text-xs text-blue-800 font-mono">destinatario,oggetto,contenuto
mario.rossi@email.com,Offerta Speciale,Ciao Mario, abbiamo un'offerta per te...
lucia.bianchi@email.com,Newsletter Gennaio,Gentile Lucia, ecco le novità...</pre>
                    </div>
                </div>

                <!-- Step 2: Preview & Validation -->
                <div id="preview-section" class="glass-effect rounded-lg p-6 mb-6 hidden">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">2</span>
                        <span data-i18n="sender.previewSection">Preview and Validation</span>
                    </h3>
                    
                    <!-- Validation Results -->
                    <div id="validation-results" class="mb-4">
                        <!-- Will be populated dynamically -->
                    </div>
                    
                    <!-- Preview Table -->
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-i18n="sender.recipient">
                                        Recipient
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-i18n="sender.subject">
                                        Subject
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-i18n="sender.contentPreview">
                                        Content (preview)
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="preview-tbody" class="bg-white divide-y divide-gray-200">
                                <!-- Will be populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="text-sm text-gray-500 mt-2">
                        <span data-i18n="sender.showing">Showing first 5 emails of</span> <span id="total-emails">0</span>
                    </div>
                </div>

                <!-- Step 3: Send Options -->
                <div id="send-options-section" class="glass-effect rounded-lg p-6 mb-6 hidden">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">3</span>
                        <span data-i18n="sender.sendOptions">Send Options</span>
                    </h3>
                    
                    <div class="space-y-4">
                        <!-- Delay Settings -->
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" 
                                       id="use-delay" 
                                       checked
                                       class="mr-3">
                                <div>
                                    <span class="text-sm font-medium text-gray-700" data-i18n="sender.useDelay">
                                        Use delay between emails (recommended)
                                    </span>
                                    <p class="text-xs text-gray-500" data-i18n="sender.delayDescription">
                                        Random delay between 35-75 seconds to respect Gmail limits
                                    </p>
                                </div>
                            </label>
                        </div>
                        
                        <!-- Test Mode -->
                        <div>
                            <label class="flex items-center">
                                <input type="checkbox" 
                                       id="test-mode" 
                                       class="mr-3">
                                <div>
                                    <span class="text-sm font-medium text-gray-700" data-i18n="sender.testMode">
                                        Test Mode (send only first 3 emails)
                                    </span>
                                    <p class="text-xs text-gray-500" data-i18n="sender.testDescription">
                                        Useful to verify everything works correctly
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Quota Warning -->
                    <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                ⚠️
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-yellow-800" data-i18n="sender.gmailLimits">
                                    Gmail Limits
                                </h3>
                                <div class="mt-2 text-xs text-yellow-700">
                                    <ul class="list-disc list-inside space-y-1">
                                        <li data-i18n="sender.freeAccount">Free account: 500 emails/day</li>
                                        <li data-i18n="sender.workspace">Google Workspace: 2000 emails/day</li>
                                        <li data-i18n="sender.estimatedTime">Estimated time: ~1 minute per email with delay</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex gap-3 mt-6">
                        <button id="start-sending-btn" class="btn btn-primary" data-i18n="sender.startSending">
                            🚀 Start Sending
                        </button>
                        <button id="cancel-btn" class="btn btn-secondary" data-i18n="common.cancel">
                            ❌ Cancel
                        </button>
                    </div>
                </div>

                <!-- Sending Progress -->
                <div id="progress-section" class="glass-effect rounded-lg p-6 hidden">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4" data-i18n="sender.progressTitle">📊 Sending Progress</h3>
                    
                    <!-- Overall Progress -->
                    <div class="mb-6">
                        <div class="flex justify-between text-sm text-gray-600 mb-2">
                            <span data-i18n="sender.totalProgress">Total Progress</span>
                            <span id="progress-text">0/0 (0%)</span>
                        </div>
                        <div class="progress-container">
                            <div id="progress-bar" class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Statistics -->
                    <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600" id="stat-sent">0</div>
                            <div class="text-sm text-gray-600" data-i18n="sender.sent">Sent</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-red-600" id="stat-failed">0</div>
                            <div class="text-sm text-gray-600" data-i18n="sender.failed">Failed</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-600" id="stat-remaining">0</div>
                            <div class="text-sm text-gray-600" data-i18n="sender.remaining">Remaining</div>
                        </div>
                    </div>
                    
                    <!-- Current Email -->
                    <div id="current-email-info" class="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                        <div class="text-sm">
                            <strong data-i18n="sender.sendingTo">Sending to:</strong> 
                            <span id="current-recipient" class="text-blue-700">-</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                            <span data-i18n="sender.timeRemaining">Estimated time remaining:</span> <span id="time-remaining">--:--</span>
                        </div>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div class="flex gap-3">
                        <button id="pause-btn" class="btn btn-warning" data-i18n="sender.pause">
                            ⏸️ Pause
                        </button>
                        <button id="resume-btn" class="btn btn-success hidden" data-i18n="sender.resume">
                            ▶️ Resume
                        </button>
                        <button id="stop-btn" class="btn btn-danger" data-i18n="sender.stop">
                            ⏹️ Stop
                        </button>
                    </div>
                </div>

                <!-- Complete Section -->
                <div id="complete-section" class="glass-effect rounded-lg p-6 hidden">
                    <div class="text-center py-8">
                        <svg class="w-20 h-20 mx-auto text-green-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                        </svg>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2" data-i18n="sender.completed">Sending Complete!</h3>
                        <p class="text-gray-600 mb-6" id="complete-summary"></p>
                        
                        <div class="flex justify-center gap-3">
                            <button id="export-results-btn" class="btn btn-secondary" data-i18n="sender.exportResults">
                                📊 Export Results
                            </button>
                            <button id="new-batch-btn" class="btn btn-primary" data-i18n="sender.newBatch">
                                📤 New Batch
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Cache element references
        this.#cacheElements();
        
        // Apply i18n translations
        if (window.i18nInstance) {
            window.i18nInstance.applyTranslations();
        }
    }
    
    #cacheElements() {
        this.#elements = {
            // File upload
            csvFile: document.getElementById('csv-file'),
            fileInfo: document.getElementById('file-info'),
            fileName: document.getElementById('file-name'),
            fileRows: document.getElementById('file-rows'),
            removeFileBtn: document.getElementById('remove-file-btn'),
            
            // Preview
            previewSection: document.getElementById('preview-section'),
            validationResults: document.getElementById('validation-results'),
            previewTbody: document.getElementById('preview-tbody'),
            totalEmails: document.getElementById('total-emails'),
            
            // Send options
            sendOptionsSection: document.getElementById('send-options-section'),
            useDelay: document.getElementById('use-delay'),
            testMode: document.getElementById('test-mode'),
            startSendingBtn: document.getElementById('start-sending-btn'),
            cancelBtn: document.getElementById('cancel-btn'),
            
            // Progress
            progressSection: document.getElementById('progress-section'),
            progressText: document.getElementById('progress-text'),
            progressBar: document.getElementById('progress-bar'),
            statSent: document.getElementById('stat-sent'),
            statFailed: document.getElementById('stat-failed'),
            statRemaining: document.getElementById('stat-remaining'),
            currentRecipient: document.getElementById('current-recipient'),
            timeRemaining: document.getElementById('time-remaining'),
            pauseBtn: document.getElementById('pause-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            stopBtn: document.getElementById('stop-btn'),
            
            // Complete
            completeSection: document.getElementById('complete-section'),
            completeSummary: document.getElementById('complete-summary'),
            exportResultsBtn: document.getElementById('export-results-btn'),
            newBatchBtn: document.getElementById('new-batch-btn')
        };
    }
    
    #setupEventListeners() {
        // File upload
        this.#elements.csvFile.addEventListener('change', (e) => this.#handleFileUpload(e));
        this.#elements.removeFileBtn.addEventListener('click', () => this.#removeFile());
        
        // Drag and drop
        const dropZone = this.#container.querySelector('.border-dashed');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-indigo-400', 'bg-indigo-50');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-indigo-400', 'bg-indigo-50');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-indigo-400', 'bg-indigo-50');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type === 'text/csv') {
                    this.#elements.csvFile.files = files;
                    this.#handleFileUpload({ target: { files } });
                }
            });
        }
        
        // Send controls
        this.#elements.startSendingBtn.addEventListener('click', () => this.#startSending());
        this.#elements.cancelBtn.addEventListener('click', () => this.#cancel());
        
        // Progress controls
        this.#elements.pauseBtn.addEventListener('click', () => this.#pause());
        this.#elements.resumeBtn.addEventListener('click', () => this.#resume());
        this.#elements.stopBtn.addEventListener('click', () => this.#stop());
        
        // Complete controls
        this.#elements.exportResultsBtn.addEventListener('click', () => this.#exportResults());
        this.#elements.newBatchBtn.addEventListener('click', () => this.#newBatch());
    }
    
    #subscribeToBatchEvents() {
        eventBus.on(EVENTS.BATCH.START, () => this.#onBatchStart());
        eventBus.on(EVENTS.BATCH.PROGRESS, (data) => this.#onBatchProgress(data));
        eventBus.on(EVENTS.BATCH.COMPLETE, (data) => this.#onBatchComplete(data));
        eventBus.on(EVENTS.BATCH.PAUSED, () => this.#onBatchPaused());
        eventBus.on(EVENTS.BATCH.RESUMED, () => this.#onBatchResumed());
        eventBus.on(EVENTS.BATCH.STOPPED, () => this.#onBatchStopped());
        eventBus.on(EVENTS.BATCH.ERROR, (error) => this.#onBatchError(error));
        eventBus.on(EVENTS.BATCH.QUOTA_EXCEEDED, () => this.#onQuotaExceeded());
    }
    
    async #handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showError('Seleziona un file CSV valido');
            return;
        }
        
        try {
            // Read and parse CSV
            const text = await this.#readFile(file);
            const parsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true
            });
            
            if (parsed.errors.length > 0) {
                logger.warn('CSV parsing warnings:', parsed.errors);
            }
            
            this.#csvData = parsed.data;
            
            // Validate CSV structure
            const validation = this.#validateCSV(this.#csvData);
            
            if (!validation.isValid) {
                showError(validation.error);
                this.#csvData = null;
                return;
            }
            
            // Show file info
            this.#elements.fileName.textContent = file.name;
            this.#elements.fileRows.textContent = `${validation.validEmails.length}`;
            showElement(this.#elements.fileInfo);
            
            // Show preview
            this.#showPreview(validation.validEmails);
            
            // Show validation results
            this.#showValidationResults(validation);
            
            // Show send options if valid emails exist
            if (validation.validEmails.length > 0) {
                showElement(this.#elements.sendOptionsSection);
            }
            
        } catch (error) {
            logger.error('Failed to process CSV:', error);
            showError('Errore nel processamento del file CSV');
        }
    }
    
    #readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    #validateCSV(data) {
        const result = {
            isValid: false,
            validEmails: [],
            invalidRows: [],
            missingFields: [],
            error: null
        };
        
        // Check required columns
        if (data.length === 0) {
            result.error = 'Il file CSV è vuoto';
            return result;
        }
        
        const firstRow = data[0];
        const requiredColumns = ['destinatario', 'oggetto', 'contenuto'];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        
        if (missingColumns.length > 0) {
            result.error = `Colonne mancanti nel CSV: ${missingColumns.join(', ')}`;
            return result;
        }
        
        // Validate each row
        const emailRegex = CONFIG.VALIDATION.EMAIL_REGEX;
        
        data.forEach((row, index) => {
            const email = row.destinatario?.trim();
            const subject = row.oggetto?.trim();
            const content = row.contenuto?.trim();
            
            if (!email || !subject || !content) {
                result.missingFields.push({
                    row: index + 1,
                    missing: [
                        !email && 'destinatario',
                        !subject && 'oggetto',
                        !content && 'contenuto'
                    ].filter(Boolean)
                });
            } else if (!emailRegex.test(email)) {
                result.invalidRows.push({
                    row: index + 1,
                    email,
                    reason: 'Email non valida'
                });
            } else {
                result.validEmails.push(row);
            }
        });
        
        result.isValid = result.validEmails.length > 0;
        
        if (!result.isValid && !result.error) {
            result.error = 'Nessuna email valida trovata nel CSV';
        }
        
        return result;
    }
    
    #showPreview(emails) {
        showElement(this.#elements.previewSection);
        
        // Show first 5 emails
        const preview = emails.slice(0, 5);
        
        this.#elements.previewTbody.innerHTML = preview.map(email => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.#escapeHtml(email.destinatario)}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${this.#escapeHtml(email.oggetto)}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${this.#escapeHtml(email.contenuto.substring(0, 50))}${email.contenuto.length > 50 ? '...' : ''}
                </td>
            </tr>
        `).join('');
        
        this.#elements.totalEmails.textContent = emails.length;
    }
    
    #showValidationResults(validation) {
        let html = '';
        
        // Valid emails
        if (validation.validEmails.length > 0) {
            html += `
                <div class="p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                    <span class="text-green-800 font-medium">
                        ✅ ${validation.validEmails.length} email valide pronte per l'invio
                    </span>
                </div>
            `;
        }
        
        // Invalid emails
        if (validation.invalidRows.length > 0) {
            html += `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                    <span class="text-red-800 font-medium">
                        ❌ ${validation.invalidRows.length} email non valide (verranno saltate)
                    </span>
                </div>
            `;
        }
        
        // Missing fields
        if (validation.missingFields.length > 0) {
            html += `
                <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2">
                    <span class="text-yellow-800 font-medium">
                        ⚠️ ${validation.missingFields.length} righe con campi mancanti (verranno saltate)
                    </span>
                </div>
            `;
        }
        
        this.#elements.validationResults.innerHTML = html;
    }
    
    #removeFile() {
        this.#csvData = null;
        this.#elements.csvFile.value = '';
        hideElement(this.#elements.fileInfo);
        hideElement(this.#elements.previewSection);
        hideElement(this.#elements.sendOptionsSection);
    }
    
    async #startSending() {
        if (!this.#csvData) {
            showError('Carica prima un file CSV');
            return;
        }
        
        const validation = this.#validateCSV(this.#csvData);
        if (validation.validEmails.length === 0) {
            showError('Nessuna email valida da inviare');
            return;
        }
        
        // Check test mode
        let emailsToSend = validation.validEmails;
        if (this.#elements.testMode.checked) {
            emailsToSend = emailsToSend.slice(0, 3);
            showWarning('Modalità test: verranno inviate solo 3 email');
        }
        
        // Confirm sending
        const confirmed = await confirmDialog(
            `Confermi l'invio di ${emailsToSend.length} email?`
        );
        
        if (!confirmed) return;
        
        this.#sendingInProgress = true;
        
        // Hide other sections
        hideElement(this.#elements.sendOptionsSection);
        hideElement(this.#elements.previewSection);
        
        // Show progress
        showElement(this.#elements.progressSection);
        
        try {
            // Process CSV - now we pass the actual email data structure
            await emailSender.processCSVDirect(emailsToSend);
            
            // Start sending with options
            await emailSender.startBatch({
                delayBetweenEmails: this.#elements.useDelay.checked,
                minDelay: CONFIG.RATE_LIMITS.MIN_DELAY_MS,
                maxDelay: CONFIG.RATE_LIMITS.MAX_DELAY_MS
            });
            
        } catch (error) {
            logger.error('Failed to start batch:', error);
            showError(error.message);
            this.#reset();
        }
    }
    
    #pause() {
        if (emailSender.pause()) {
            this.#pausedState = true;
        }
    }
    
    #resume() {
        if (emailSender.resume()) {
            this.#pausedState = false;
        }
    }
    
    async #stop() {
        const confirmed = await confirmDialog('Sei sicuro di voler fermare l\'invio?');
        if (confirmed && emailSender.stop()) {
            this.#reset();
        }
    }
    
    #cancel() {
        this.#removeFile();
    }
    
    #exportResults() {
        const csv = emailSender.exportQueue(true);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `risultati_invio_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    #newBatch() {
        this.#reset();
        emailSender.clearQueue();
    }
    
    #reset() {
        this.#sendingInProgress = false;
        this.#pausedState = false;
        this.#removeFile();
        hideElement(this.#elements.progressSection);
        hideElement(this.#elements.completeSection);
    }
    
    // Event handlers
    
    #onBatchStart() {
        logger.info('Batch sending started');
    }
    
    #onBatchProgress(data) {
        // Update progress bar
        const percentage = data.percentage || 0;
        this.#elements.progressBar.style.width = `${percentage}%`;
        this.#elements.progressText.textContent = 
            `${data.sent + data.failed}/${data.total} (${percentage}%)`;
        
        // Update stats
        this.#elements.statSent.textContent = data.sent;
        this.#elements.statFailed.textContent = data.failed;
        this.#elements.statRemaining.textContent = data.pending;
        
        // Update time remaining
        if (data.estimatedTimeRemaining > 0) {
            const minutes = Math.floor(data.estimatedTimeRemaining / 60000);
            const seconds = Math.floor((data.estimatedTimeRemaining % 60000) / 1000);
            this.#elements.timeRemaining.textContent = 
                `${minutes}m ${seconds}s`;
        }
    }
    
    #onBatchComplete(data) {
        this.#sendingInProgress = false;
        
        // Hide progress
        hideElement(this.#elements.progressSection);
        
        // Show complete
        showElement(this.#elements.completeSection);
        
        // Show summary
        const duration = Math.round(data.duration / 1000);
        this.#elements.completeSummary.textContent = 
            `Inviate ${data.sent} email con successo, ${data.failed} fallite in ${duration} secondi`;
        
        showSuccess('Invio batch completato!');
    }
    
    #onBatchPaused() {
        hideElement(this.#elements.pauseBtn);
        showElement(this.#elements.resumeBtn);
    }
    
    #onBatchResumed() {
        showElement(this.#elements.pauseBtn);
        hideElement(this.#elements.resumeBtn);
    }
    
    #onBatchStopped() {
        showWarning('Invio batch fermato');
        this.#reset();
    }
    
    #onBatchError(error) {
        showError(`Errore batch: ${error.message}`);
    }
    
    #onQuotaExceeded() {
        showError('Quota Gmail giornaliera superata. Riprova domani.');
        this.#sendingInProgress = false;
    }
    
    #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}
