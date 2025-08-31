/**
 * EmailDownloaderUI - User Interface for Email Download and Export
 * Handles search filters, download progress, and export options
 */

import { CONFIG } from '../config.js';
import eventBus from '../core/EventBus.js';
import stateManager from '../core/StateManager.js';
import logger from '../core/Logger.js';
import emailDownloader from '../services/EmailDownloader.js';
import gmailClient from '../api/GmailClient.js';
import { EVENTS } from '../utils/index.js';
import {
    showSuccess,
    showError,
    showElement,
    hideElement,
    enableElement,
    disableElement,
    formatDuration,
    formatFileSize,
    confirmDialog
} from '../utils/UIHelpers.js';
import { VirtualList } from './VirtualList.js';

export default class EmailDownloaderUI {
    #container = null;
    #elements = {};
    #searchResults = null;
    #selectedMessages = new Set();
    #labels = [];
    #downloadInProgress = false;
    #downloadResult = null; // Aggiunto campo mancante
    #virtualList = null;
    #virtualListContainer = null;
    
    constructor(container) {
        if (!container) {
            throw new Error('EmailDownloaderUI requires a valid container element');
        }
        
        this.#container = container;
        
        // Initialize Gmail client when ready
        this.#initializeGmailClient();
        
        // Render UI
        this.render();
        
        // Setup event listeners
        this.#setupEventListeners();
        
        // Subscribe to download events
        this.#subscribeToDownloadEvents();
        
        // Load labels when Gmail is ready
        eventBus.once(EVENTS.GMAIL.INITIALIZED, () => {
            this.#loadLabels();
        });
        
        logger.info('EmailDownloaderUI initialized');
    }
    
    /**
     * Render the UI
     */
    render() {
        this.#container.innerHTML = `
            <div class="email-downloader-ui">
                <!-- Header -->
                <div class="glass-effect rounded-lg p-6 mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">📥 Download Email</h2>
                    <p class="text-gray-600">Cerca, seleziona e scarica le tue email con allegati</p>
                </div>

                <!-- Search Filters -->
                <div class="glass-effect rounded-lg p-6 mb-6">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">1</span>
                        Filtri di Ricerca
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Date Range -->
                        <div class="form-group">
                            <label for="filter-date-from" class="form-label">Data Da</label>
                            <input type="date" 
                                   id="filter-date-from" 
                                   class="form-input">
                        </div>
                        <div class="form-group">
                            <label for="filter-date-to" class="form-label">Data A</label>
                            <input type="date" 
                                   id="filter-date-to" 
                                   class="form-input">
                        </div>
                        
                        <!-- From/To -->
                        <div class="form-group">
                            <label for="filter-from" class="form-label">Da (Mittente)</label>
                            <input type="text" 
                                   id="filter-from" 
                                   class="form-input"
                                   placeholder="esempio@gmail.com">
                        </div>
                        <div class="form-group">
                            <label for="filter-to" class="form-label">A (Destinatario)</label>
                            <input type="text" 
                                   id="filter-to" 
                                   class="form-input"
                                   placeholder="esempio@gmail.com">
                        </div>
                        
                        <!-- Subject -->
                        <div class="form-group md:col-span-2">
                            <label for="filter-subject" class="form-label">Oggetto Contiene</label>
                            <input type="text" 
                                   id="filter-subject" 
                                   class="form-input"
                                   placeholder="Parole chiave nell'oggetto">
                        </div>
                        
                        <!-- Labels -->
                        <div class="form-group">
                            <label for="filter-labels" class="form-label">Etichette</label>
                            <select id="filter-labels" 
                                    class="form-select" 
                                    multiple 
                                    style="height: 100px;">
                                <option value="">Caricamento...</option>
                            </select>
                            <div class="text-xs text-gray-500 mt-1">Ctrl+Click per selezione multipla</div>
                        </div>
                        
                        <!-- Options -->
                        <div class="form-group">
                            <label class="form-label">Opzioni</label>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="filter-has-attachments" 
                                           class="mr-2">
                                    <span class="text-sm">Solo con allegati</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="filter-unread" 
                                           class="mr-2">
                                    <span class="text-sm">Solo non lette</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="filter-starred" 
                                           class="mr-2">
                                    <span class="text-sm">Solo con stella</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="filter-important" 
                                           class="mr-2">
                                    <span class="text-sm">Solo importanti</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Advanced Query -->
                    <details class="mt-4">
                        <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-indigo-600">
                            🔍 Ricerca Avanzata
                        </summary>
                        <div class="mt-4">
                            <div class="form-group">
                                <label for="filter-query" class="form-label">
                                    Query Gmail Personalizzata
                                    <a href="https://support.google.com/mail/answer/7190" 
                                       target="_blank" 
                                       class="text-indigo-600 text-xs ml-2">
                                       ℹ️ Guida
                                    </a>
                                </label>
                                <input type="text" 
                                       id="filter-query" 
                                       class="form-input"
                                       placeholder="es: has:attachment larger:5M after:2024/1/1">
                            </div>
                        </div>
                    </details>
                    
                    <!-- Search Controls -->
                    <div class="flex gap-3 mt-6">
                        <button id="search-btn" class="btn btn-primary">
                            🔍 Cerca Email
                        </button>
                        <button id="clear-filters-btn" class="btn btn-secondary">
                            🗑️ Pulisci Filtri
                        </button>
                        <div class="ml-auto">
                            <label for="max-results" class="text-sm text-gray-600 mr-2">Max risultati:</label>
                            <select id="max-results" class="form-select inline-block w-24">
                                <option value="50">50</option>
                                <option value="100" selected>100</option>
                                <option value="500">500</option>
                                <option value="1000">1000</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Search Results -->
                <div id="search-results-section" class="glass-effect rounded-lg p-6 mb-6 hidden">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">2</span>
                        Risultati Ricerca
                        <span id="results-count" class="text-sm font-normal text-gray-500 ml-2"></span>
                    </h3>
                    
                    <!-- Selection Controls -->
                    <div class="flex gap-3 mb-4">
                        <button id="select-all-btn" class="btn btn-secondary text-sm">
                            ☑️ Seleziona Tutto
                        </button>
                        <button id="deselect-all-btn" class="btn btn-secondary text-sm">
                            ⬜ Deseleziona Tutto
                        </button>
                        <span class="ml-auto text-sm text-gray-600">
                            <span id="selected-count">0</span> selezionate
                        </span>
                    </div>
                    
                    <!-- Results Virtual List -->
                    <div id="virtual-list-container" class="virtual-list-container border border-gray-200 rounded-lg" style="height: 600px;">
                        <!-- Virtual list will be rendered here -->
                    </div>
                    
                    <!-- Load More -->
                    <div id="load-more-section" class="text-center mt-4 hidden">
                        <button id="load-more-btn" class="btn btn-secondary">
                            Carica Altri Risultati
                        </button>
                    </div>
                </div>

                <!-- Download Options -->
                <div id="download-options-section" class="glass-effect rounded-lg p-6 mb-6 hidden">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 mr-3">3</span>
                        Opzioni Download
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-medium text-gray-700 mb-3">Contenuto</h4>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="include-attachments" 
                                           checked
                                           class="mr-2">
                                    <span class="text-sm">Includi Allegati</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="include-body" 
                                           checked
                                           class="mr-2">
                                    <span class="text-sm">Includi Corpo Email</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="include-headers" 
                                           checked
                                           class="mr-2">
                                    <span class="text-sm">Includi Headers</span>
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-medium text-gray-700 mb-3">Formato Export</h4>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="radio" 
                                           name="export-format" 
                                           value="zip" 
                                           checked
                                           class="mr-2">
                                    <span class="text-sm">📦 ZIP (Email + Allegati)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="radio" 
                                           name="export-format" 
                                           value="csv" 
                                           class="mr-2">
                                    <span class="text-sm">📊 CSV (Solo Metadati)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="radio" 
                                           name="export-format" 
                                           value="both" 
                                           class="mr-2">
                                    <span class="text-sm">📦+📊 Entrambi</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Size Estimate -->
                    <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="text-sm text-blue-800">
                            <strong>Stima dimensioni:</strong>
                            <span id="size-estimate">Calcolo...</span>
                        </div>
                    </div>
                    
                    <!-- Download Button -->
                    <div class="flex gap-3 mt-6">
                        <button id="start-download-btn" class="btn btn-primary">
                            ⬇️ Inizia Download
                        </button>
                        <button id="cancel-selection-btn" class="btn btn-secondary">
                            ❌ Annulla Selezione
                        </button>
                    </div>
                </div>

                <!-- Download Progress -->
                <div id="download-progress-section" class="glass-effect rounded-lg p-6 hidden">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">📊 Progresso Download</h3>
                    
                    <!-- Overall Progress -->
                    <div class="mb-6">
                        <div class="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Progresso Totale</span>
                            <span id="download-progress-text">0/0 (0%)</span>
                        </div>
                        <div class="progress-container">
                            <div id="download-progress-bar" class="progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Statistics -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600" id="stat-downloaded">0</div>
                            <div class="text-sm text-gray-600">Scaricate</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600" id="stat-attachments">0</div>
                            <div class="text-sm text-gray-600">Allegati</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600" id="stat-size">0 MB</div>
                            <div class="text-sm text-gray-600">Dimensione</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-600" id="stat-time-remaining">--:--</div>
                            <div class="text-sm text-gray-600">Tempo Rimanente</div>
                        </div>
                    </div>
                    
                    <!-- Current Download -->
                    <div id="current-download-info" class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="flex items-center">
                            <div class="loader mr-3" style="width: 20px; height: 20px;"></div>
                            <div>
                                <div class="text-sm font-medium text-blue-900">Download in corso...</div>
                                <div class="text-sm text-blue-700" id="current-download-email"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div class="flex gap-3 mt-6">
                        <button id="pause-download-btn" class="btn btn-warning">
                            ⏸️ Pausa
                        </button>
                        <button id="resume-download-btn" class="btn btn-success hidden">
                            ▶️ Riprendi
                        </button>
                        <button id="cancel-download-btn" class="btn btn-danger">
                            ⏹️ Annulla
                        </button>
                    </div>
                </div>

                <!-- Download Complete -->
                <div id="download-complete-section" class="glass-effect rounded-lg p-6 hidden">
                    <div class="text-center py-8">
                        <svg class="w-20 h-20 mx-auto text-green-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                        </svg>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">Download Completato!</h3>
                        <p class="text-gray-600 mb-6" id="download-summary"></p>
                        
                        <div class="flex justify-center gap-3">
                            <button id="save-export-btn" class="btn btn-primary">
                                💾 Salva Export
                            </button>
                            <button id="new-search-btn" class="btn btn-secondary">
                                🔍 Nuova Ricerca
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store element references
        this.#cacheElements();
    }
    
    // Private methods
    
    #cacheElements() {
        this.#elements = {
            // Filters
            dateFrom: document.getElementById('filter-date-from'),
            dateTo: document.getElementById('filter-date-to'),
            from: document.getElementById('filter-from'),
            to: document.getElementById('filter-to'),
            subject: document.getElementById('filter-subject'),
            labels: document.getElementById('filter-labels'),
            hasAttachments: document.getElementById('filter-has-attachments'),
            unread: document.getElementById('filter-unread'),
            starred: document.getElementById('filter-starred'),
            important: document.getElementById('filter-important'),
            query: document.getElementById('filter-query'),
            maxResults: document.getElementById('max-results'),
            
            // Buttons
            searchBtn: document.getElementById('search-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            selectAllBtn: document.getElementById('select-all-btn'),
            deselectAllBtn: document.getElementById('deselect-all-btn'),
            selectAllCheckbox: document.getElementById('select-all-checkbox'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            startDownloadBtn: document.getElementById('start-download-btn'),
            cancelSelectionBtn: document.getElementById('cancel-selection-btn'),
            pauseDownloadBtn: document.getElementById('pause-download-btn'),
            resumeDownloadBtn: document.getElementById('resume-download-btn'),
            cancelDownloadBtn: document.getElementById('cancel-download-btn'),
            saveExportBtn: document.getElementById('save-export-btn'),
            newSearchBtn: document.getElementById('new-search-btn'),
            
            // Sections
            searchResultsSection: document.getElementById('search-results-section'),
            downloadOptionsSection: document.getElementById('download-options-section'),
            downloadProgressSection: document.getElementById('download-progress-section'),
            downloadCompleteSection: document.getElementById('download-complete-section'),
            loadMoreSection: document.getElementById('load-more-section'),
            
            // Results
            resultsCount: document.getElementById('results-count'),
            selectedCount: document.getElementById('selected-count'),
            virtualListContainer: document.getElementById('virtual-list-container'),
            
            // Options
            includeAttachments: document.getElementById('include-attachments'),
            includeBody: document.getElementById('include-body'),
            includeHeaders: document.getElementById('include-headers'),
            sizeEstimate: document.getElementById('size-estimate'),
            
            // Progress
            downloadProgressText: document.getElementById('download-progress-text'),
            downloadProgressBar: document.getElementById('download-progress-bar'),
            statDownloaded: document.getElementById('stat-downloaded'),
            statAttachments: document.getElementById('stat-attachments'),
            statSize: document.getElementById('stat-size'),
            statTimeRemaining: document.getElementById('stat-time-remaining'),
            currentDownloadInfo: document.getElementById('current-download-info'),
            currentDownloadEmail: document.getElementById('current-download-email'),
            
            // Complete
            downloadSummary: document.getElementById('download-summary')
        };
    }
    
    #setupEventListeners() {
        // Search
        this.#elements.searchBtn.addEventListener('click', () => this.#performSearch());
        this.#elements.clearFiltersBtn.addEventListener('click', () => this.#clearFilters());
        
        // Selection
        this.#elements.selectAllBtn.addEventListener('click', () => this.#selectAll());
        this.#elements.deselectAllBtn.addEventListener('click', () => this.#deselectAll());
        // Removed selectAllCheckbox listener as it doesn't exist in DOM
        
        // Download
        this.#elements.startDownloadBtn.addEventListener('click', () => this.#startDownload());
        this.#elements.cancelSelectionBtn.addEventListener('click', () => this.#cancelSelection());
        this.#elements.pauseDownloadBtn.addEventListener('click', () => this.#pauseDownload());
        this.#elements.resumeDownloadBtn.addEventListener('click', () => this.#resumeDownload());
        this.#elements.cancelDownloadBtn.addEventListener('click', () => this.#cancelDownload());
        
        // Complete
        this.#elements.saveExportBtn?.addEventListener('click', () => this.#saveExport());
        this.#elements.newSearchBtn?.addEventListener('click', () => this.#newSearch());
        
        // Load more
        this.#elements.loadMoreBtn?.addEventListener('click', () => this.#loadMore());
        
        // Enter key on filters
        ['dateFrom', 'dateTo', 'from', 'to', 'subject', 'query'].forEach(field => {
            this.#elements[field]?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.#performSearch();
                }
            });
        });
        
        // Update size estimate when selection changes
        ['includeAttachments', 'includeBody', 'includeHeaders'].forEach(field => {
            this.#elements[field]?.addEventListener('change', () => this.#updateSizeEstimate());
        });
    }
    
    #subscribeToDownloadEvents() {
        eventBus.on(EVENTS.DOWNLOAD.START, () => this.#onDownloadStart());
        eventBus.on(EVENTS.DOWNLOAD.PROGRESS, (data) => this.#onDownloadProgress(data));
        eventBus.on(EVENTS.DOWNLOAD.COMPLETE, (data) => this.#onDownloadComplete(data));
        eventBus.on(EVENTS.DOWNLOAD.PAUSED, () => this.#onDownloadPaused());
        eventBus.on(EVENTS.DOWNLOAD.RESUMED, () => this.#onDownloadResumed());
        eventBus.on(EVENTS.DOWNLOAD.CANCELLED, () => this.#onDownloadCancelled());
        eventBus.on(EVENTS.DOWNLOAD.ERROR, (error) => this.#onDownloadError(error));
    }
    
    async #initializeGmailClient() {
        try {
            await gmailClient.initialize();
            logger.info('Gmail client initialized for EmailDownloaderUI');
        } catch (error) {
            logger.error('Failed to initialize Gmail client:', error);
        }
    }
    
    async #loadLabels() {
        try {
            const labels = await gmailClient.getLabels();
            this.#labels = labels;
            
            // Update labels select
            this.#elements.labels.innerHTML = labels
                .filter(label => !label.id.startsWith('CATEGORY_'))
                .map(label => `<option value="${label.id}">${label.name}</option>`)
                .join('');
                
            logger.info(`Loaded ${labels.length} labels`);
            
        } catch (error) {
            logger.error('Failed to load labels:', error);
        }
    }
    
    async #performSearch() {
        // Collect filters
        const filters = {
            dateFrom: this.#elements.dateFrom.value,
            dateTo: this.#elements.dateTo.value,
            from: this.#elements.from.value,
            to: this.#elements.to.value,
            subject: this.#elements.subject.value,
            hasAttachments: this.#elements.hasAttachments.checked,
            isUnread: this.#elements.unread.checked,
            isStarred: this.#elements.starred.checked,
            isImportant: this.#elements.important.checked,
            labels: Array.from(this.#elements.labels.selectedOptions).map(opt => opt.value),
            query: this.#elements.query.value
        };
        
        const maxResults = parseInt(this.#elements.maxResults.value);
        
        // Show loading
        this.#showLoading();
        
        try {
            // Perform search
            const results = await emailDownloader.search(filters, { maxResults });
            
            this.#searchResults = results;
            
            // Show results
            this.#showSearchResults(results);
            
            logger.info(`Search completed: ${results.total} emails found`);
            
        } catch (error) {
            logger.error('Search failed:', error);
            showError(error.message);
        } finally {
            this.#hideLoading();
        }
    }
    
    #showSearchResults(results) {
        // Update count
        this.#elements.resultsCount.textContent = `(${results.total} trovate)`;
        
        // Clear previous results
        this.#selectedMessages.clear();
        this.#updateSelectedCount();
        
        // Show section
        showElement(this.#elements.searchResultsSection);
        
        // Initialize Virtual List if not exists
        if (!this.#virtualList) {
            this.#virtualList = new VirtualList(this.#elements.virtualListContainer, {
                itemHeight: 80,
                buffer: 10,
                renderItem: this.#renderEmailItem.bind(this)
            });
        }
        
        // Prepare data for virtual list
        const emailItems = results.preview.map((email, index) => ({
            ...email,
            messageId: results.messages[index].id,
            index
        }));
        
        // Set items in virtual list
        this.#virtualList.setItems(emailItems);
        
        // Show load more if needed
        if (results.messages.length < results.total) {
            this.#elements.loadMoreSection?.classList.remove('hidden');
        }
    }
    
    #renderEmailItem(element, item, index) {
        const checked = this.#selectedMessages.has(item.messageId) ? 'checked' : '';
        const date = item.date ? new Date(item.date).toLocaleDateString() : '';
        const attachmentIcon = item.hasAttachments ? '📎' : '';
        const size = formatFileSize(item.size || 0);
        
        element.innerHTML = `
            <div class="email-row flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div class="w-10">
                    <input type="checkbox" 
                           class="message-checkbox" 
                           data-message-id="${item.messageId}"
                           data-index="${index}"
                           ${checked}>
                </div>
                <div class="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div class="text-sm text-gray-600">${date}</div>
                    <div class="col-span-2">
                        <div class="text-sm font-medium text-gray-900 truncate" title="${this.#escapeHtml(item.from || '')}">
                            ${this.#escapeHtml(item.from || 'Unknown')}
                        </div>
                    </div>
                    <div class="col-span-2">
                        <div class="text-sm text-gray-700 truncate" title="${this.#escapeHtml(item.subject || '')}">
                            ${this.#escapeHtml(item.subject || 'No subject')}
                        </div>
                        <div class="text-xs text-gray-500 truncate mt-1">
                            ${this.#escapeHtml(item.snippet || '')}
                        </div>
                    </div>
                    <div class="flex items-center justify-end space-x-2">
                        <span class="text-sm">${attachmentIcon}</span>
                        <span class="text-xs text-gray-500">${size}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add checkbox listener
        const checkbox = element.querySelector('.message-checkbox');
        checkbox?.addEventListener('change', (e) => {
            const messageId = e.target.dataset.messageId;
            if (e.target.checked) {
                this.#selectedMessages.add(messageId);
            } else {
                this.#selectedMessages.delete(messageId);
            }
            this.#updateSelectedCount();
        });
    }
    
    #selectAll() {
        // Get all items from virtual list
        if (this.#virtualList) {
            const items = this.#searchResults?.messages || [];
            items.forEach(message => {
                this.#selectedMessages.add(message.id);
            });
            
            // Update visible checkboxes
            document.querySelectorAll('.message-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // Refresh virtual list to update checkboxes
            this.#virtualList.refresh();
        }

        this.#updateSelectedCount();
    }
    
    #deselectAll() {
        // Clear selection
        this.#selectedMessages.clear();
        
        // Update visible checkboxes
        document.querySelectorAll('.message-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Refresh virtual list to update checkboxes
        if (this.#virtualList) {
            this.#virtualList.refresh();
        }

        this.#updateSelectedCount();
    }
    
    #updateSelectedCount() {
        const count = this.#selectedMessages.size;
        this.#elements.selectedCount.textContent = count;
        
        // Show/hide download options
        if (count > 0) {
            showElement(this.#elements.downloadOptionsSection);
            this.#updateSizeEstimate();
        } else {
            hideElement(this.#elements.downloadOptionsSection);
        }
    }
    
    #updateSizeEstimate() {
        const count = this.#selectedMessages.size;
        const avgSizePerEmail = 500 * 1024; // 500KB average
        const avgSizePerAttachment = 2 * 1024 * 1024; // 2MB average
        
        let estimatedSize = count * avgSizePerEmail;
        
        if (this.#elements.includeAttachments.checked) {
            // Assume 30% of emails have attachments
            estimatedSize += count * 0.3 * avgSizePerAttachment;
        }
        
        this.#elements.sizeEstimate.textContent = 
            `~${formatFileSize(estimatedSize)} per ${count} email`;
    }
    
    async #startDownload() {
        if (this.#selectedMessages.size === 0) {
            showError('Seleziona almeno un\'email');
            return;
        }
        
        const messageIds = Array.from(this.#selectedMessages);
        
        const exportFormat = document.querySelector('input[name="export-format"]:checked')?.value || 'zip';
        
        const options = {
            includeAttachments: this.#elements.includeAttachments.checked,
            includeBody: this.#elements.includeBody.checked,
            includeHeaders: this.#elements.includeHeaders.checked,
            exportFormat
        };
        
        this.#downloadInProgress = true;
        
        // Hide other sections
        hideElement(this.#elements.searchResultsSection);
        hideElement(this.#elements.downloadOptionsSection);
        
        // Show progress
        showElement(this.#elements.downloadProgressSection);
        
        try {
            // Start download
            const result = await emailDownloader.download(messageIds, options);
            
            // Store result for saving
            this.#downloadResult = result;
            
        } catch (error) {
            logger.error('Download failed:', error);
            showError(error.message);
            this.#onDownloadCancelled();
        }
    }
    
    #pauseDownload() {
        emailDownloader.pause();
    }
    
    #resumeDownload() {
        emailDownloader.resume();
    }
    
    async #cancelDownload() {
        if (await confirmDialog('Sei sicuro di voler annullare il download?')) {
            emailDownloader.cancel();
        }
    }
    
    #cancelSelection() {
        this.#deselectAll();
        hideElement(this.#elements.downloadOptionsSection);
    }
    
    async #saveExport() {
        if (!this.#downloadResult) {
            logger.warn('No download result to save');
            return;
        }
        
        try {
            // Check if saveAs is available
            const saveFunction = window.saveAs || window.FileSaver?.saveAs;
            
            if (!saveFunction) {
                // Fallback: use native download
                logger.warn('FileSaver not available, using fallback');
                
                if (this.#downloadResult.zip) {
                    this.#downloadWithAnchor(this.#downloadResult.zip.blob, this.#downloadResult.zip.filename);
                }
                
                if (this.#downloadResult.csv) {
                    setTimeout(() => {
                        this.#downloadWithAnchor(this.#downloadResult.csv.blob, this.#downloadResult.csv.filename);
                    }, 500);
                }
            } else {
                // Use FileSaver.js
                if (this.#downloadResult.zip) {
                    logger.info('Saving ZIP file:', this.#downloadResult.zip.filename);
                    saveFunction(this.#downloadResult.zip.blob, this.#downloadResult.zip.filename);
                }
                
                // Save CSV
                if (this.#downloadResult.csv) {
                    logger.info('Saving CSV file:', this.#downloadResult.csv.filename);
                    // Small delay between saves to avoid browser blocking
                    setTimeout(() => {
                        saveFunction(this.#downloadResult.csv.blob, this.#downloadResult.csv.filename);
                    }, 500);
                }
            }
            
            showSuccess('File salvati con successo!');
        } catch (error) {
            logger.error('Failed to save export:', error);
            showError('Errore nel salvataggio del file');
        }
    }
    
    #downloadWithAnchor(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    #newSearch() {
        // Reset UI
        hideElement(this.#elements.downloadCompleteSection);
        showElement(this.#elements.searchResultsSection);
        this.#downloadResult = null;
        this.#selectedMessages.clear();
        this.#updateSelectedCount();
    }
    
    #clearFilters() {
        // Clear all filter inputs
        this.#elements.dateFrom.value = '';
        this.#elements.dateTo.value = '';
        this.#elements.from.value = '';
        this.#elements.to.value = '';
        this.#elements.subject.value = '';
        this.#elements.query.value = '';
        this.#elements.hasAttachments.checked = false;
        this.#elements.unread.checked = false;
        this.#elements.starred.checked = false;
        this.#elements.important.checked = false;
        
        // Clear label selection
        Array.from(this.#elements.labels.options).forEach(opt => opt.selected = false);
    }
    
    async #loadMore() {
        // Implementation for loading more results
        // This would need pagination support in the search
        showError('Funzionalità in sviluppo');
    }
    
    #onDownloadStart() {
        showElement(this.#elements.currentDownloadInfo);
    }
    
    #onDownloadProgress(data) {
        // Update progress bar
        this.#elements.downloadProgressBar.style.width = `${data.percentage}%`;
        this.#elements.downloadProgressText.textContent = 
            `${data.processed}/${data.total} (${data.percentage}%)`;
        
        // Update stats
        this.#elements.statDownloaded.textContent = data.processed;
        this.#elements.statAttachments.textContent = data.attachments;
        this.#elements.statSize.textContent = formatFileSize(data.totalSize);
        
        // Time remaining
        if (data.estimatedTimeRemaining > 0) {
            const minutes = Math.floor(data.estimatedTimeRemaining / 60000);
            const seconds = Math.floor((data.estimatedTimeRemaining % 60000) / 1000);
            this.#elements.statTimeRemaining.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    #onDownloadComplete(data) {
        this.#downloadInProgress = false;
        
        // Hide progress
        hideElement(this.#elements.downloadProgressSection);
        
        // Show complete
        showElement(this.#elements.downloadCompleteSection);
        
        // Show summary
        this.#elements.downloadSummary.textContent = 
            `Scaricate ${data.processed} email con ${data.attachments} allegati (${formatFileSize(data.stats.totalSize)})`;
            
        showSuccess('Download completato con successo!');
    }
    
    #onDownloadPaused() {
        hideElement(this.#elements.pauseDownloadBtn);
        showElement(this.#elements.resumeDownloadBtn);
    }
    
    #onDownloadResumed() {
        showElement(this.#elements.pauseDownloadBtn);
        hideElement(this.#elements.resumeDownloadBtn);
    }
    
    #onDownloadCancelled() {
        this.#downloadInProgress = false;
        hideElement(this.#elements.downloadProgressSection);
        showElement(this.#elements.searchResultsSection);
    }
    
    #onDownloadError(error) {
        showError(error.message);
        this.#onDownloadCancelled();
    }
    
    #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    #showLoading() {
        disableElement(this.#elements.searchBtn);
        this.#elements.searchBtn.innerHTML = '<span class="loader inline-block mr-2"></span> Ricerca...';
    }
    
    #hideLoading() {
        enableElement(this.#elements.searchBtn);
        this.#elements.searchBtn.innerHTML = '🔍 Cerca Email';
    }
}
