/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * Main Application Bootstrap
 * Initializes all modules and handles application lifecycle
 */

import { CONFIG } from './config.js';
import eventBus from './core/EventBus.js';
import stateManager from './core/StateManager.js';
import logger from './core/Logger.js';
import googleAuth from './auth/GoogleAuth.js';
import { EVENTS } from './utils/index.js';
import { showToast, showElement, hideElement, showWarning } from './utils/UIHelpers.js';
import { gmailCache } from './core/SmartCache.js';
import { memoryMonitor } from './core/MemoryMonitor.js';
import { performanceMonitor } from './core/PerformanceMonitor.js';

// Application class
class GmailToolApp {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.handleAuthSuccess = this.handleAuthSuccess.bind(this);
        this.handleAuthError = this.handleAuthError.bind(this);
        this.handleSignOut = this.handleSignOut.bind(this);
    }
    
    /**
     * Initialize application
     */
    async initialize() {
        try {
            logger.info('🚀 Initializing Gmail Tool v0.5...');
            
            // Mark performance start
            logger.performance.mark('app_init_start');
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Initialize state
            this.initializeState();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Check browser compatibility
            if (!this.checkBrowserCompatibility()) {
                this.showBrowserWarning();
                return;
            }
            
            // Load modules dynamically FIRST
            await this.loadModules();
            
            // Initialize Google Auth AFTER modules are loaded
            await this.initializeAuth();
            
            // Initialize excellence features
            this.#initializeExcellenceFeatures();
            
            // Mark performance end
            logger.performance.mark('app_init_end');
            logger.performance.measure('app_initialization', 'app_init_start', 'app_init_end');
            
            this.initialized = true;
            logger.info('✅ Application initialized successfully');
            
            // Emit ready event
            eventBus.emit(EVENTS.APP.READY);
            
        } catch (error) {
            logger.fatal('Failed to initialize application:', error);
            this.showFatalError(error);
        }
    }
    
    /**
     * Initialize application state
     */
    initializeState() {
        stateManager.set({
            app: {
                version: '0.5.0',
                initialized: false,
                loading: false,
                error: null
            },
            auth: {
                isAuthenticated: false,
                user: null,
                token: null
            },
            ui: {
                currentView: 'login',
                activeTab: 'batch-sender',
                sidebarOpen: false,
                theme: 'light'
            },
            batch: {
                queue: [],
                processing: false,
                progress: {
                    total: 0,
                    sent: 0,
                    failed: 0
                }
            },
            download: {
                emails: [],
                processing: false,
                progress: {
                    total: 0,
                    processed: 0,
                    attachments: 0
                }
            }
        });
        
        // Setup computed properties
        stateManager.computed('isProcessing', (state) => {
            return state.batch.processing || state.download.processing;
        }, ['batch.processing', 'download.processing']);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auth events
        eventBus.on(EVENTS.AUTH.SUCCESS, this.handleAuthSuccess);
        eventBus.on(EVENTS.AUTH.ERROR, this.handleAuthError);
        eventBus.on(EVENTS.AUTH.SIGNOUT, this.handleSignOut);
        
        // UI events - create actual toast instead of re-emitting
        eventBus.on(EVENTS.UI.TOAST, (data) => this.createToast(data));
        
        // Application events
        eventBus.on(EVENTS.APP.ERROR, this.handleAppError.bind(this));
        
        // State changes
        // Reserved for future state subscriptions
        
        // Window events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
    
    /**
     * Initialize UI
     */
    initializeUI() {
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.disabled = true;
        loginButton.innerHTML = '⏳ Inizializzazione...';
        
        eventBus.once(EVENTS.AUTH.INITIALIZED, () => {
            loginButton.disabled = false;
            loginButton.innerHTML = `
                <span class="flex items-center gap-3">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Accedi con Google
        </span>`;
        });
        
        loginButton.addEventListener('click', () => {
            if (!googleAuth.isInitialized()) {
                showToast('Autenticazione non ancora pronta. Riprova tra qualche secondo.', 'warning');
            return;
        }
        
        this.setLoading(true);
        
        googleAuth.signIn()
            .then(() => this.setLoading(false))
            .catch((error) => {
                this.setLoading(false);
                logger.error('Sign in failed:', error);
            });
        });
        }
        
        // Setup tab navigation
        this.setupTabNavigation();
        
        // Setup theme
        this.applyTheme();
    }
    
    /**
     * Initialize authentication
     */
    async initializeAuth() {
        logger.info('Initializing authentication...');
        
        try {
            await googleAuth.initialize();
            
            // Check if already authenticated
            if (googleAuth.isAuthenticated()) {
                logger.info('User already authenticated');
                await this.handleAuthSuccess({
                    token: googleAuth.getAccessToken(),
                    user: googleAuth.getUserInfo()
                });
            }
            
        } catch (error) {
            logger.error('Auth initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Load application modules dynamically
     */
    async loadModules() {
        logger.info('Loading application modules...');
        
        const modules = [
            { name: 'GmailClient', path: './api/GmailClient.js' },
            { name: 'BatchProcessor', path: './api/BatchProcessor.js' },
            { name: 'RateLimiter', path: './api/RateLimiter.js' },
            { name: 'EmailSender', path: './services/EmailSender.js' },
            { name: 'EmailDownloader', path: './services/EmailDownloader.js' },
            { name: 'BatchSenderUI', path: './ui/BatchSenderUI.js' },
            { name: 'EmailDownloaderUI', path: './ui/EmailDownloaderUI.js' }
        ];
        
        for (const module of modules) {
            try {
                logger.debug(`Loading module: ${module.name}`);
                const imported = await import(module.path);
                this.modules.set(module.name, imported.default || imported);
                logger.debug(`Module loaded: ${module.name}`);
            } catch (error) {
                logger.error(`Failed to load module ${module.name}:`, error);
                // Continue loading other modules
            }
        }
        
        logger.info('Modules loaded successfully');
    }
    
    /**
     * Handle authentication success
     */
    async handleAuthSuccess(data) {
        logger.info('Authentication successful');
        
        // Update state
        stateManager.set('auth', {
            isAuthenticated: true,
            user: data.user,
            token: {
                expiresAt: data.expiresAt
            }
        });
        
        // Update UI
        this.updateAuthUI(data.user);
        
        // Show dashboard
        this.showDashboard();
        
        // Initialize UI components
        await this.initializeUIComponents();
        
        // Show success message
        showToast(CONFIG.SUCCESS.AUTH_SUCCESS, 'success');
        
        this.setLoading(false);
    }
    
    /**
     * Handle authentication error
     */
    handleAuthError(error) {
        logger.error('Authentication error:', error);
        
        // Update state
        stateManager.set('auth.isAuthenticated', false);
        
        // Show error
        showToast(CONFIG.ERRORS.AUTH_FAILED, 'error');
        
        this.setLoading(false);
    }
    
    /**
     * Handle sign out
     */
    handleSignOut() {
        logger.info('User signed out');
        
        // Reset state
        stateManager.set('auth', {
            isAuthenticated: false,
            user: null,
            token: null
        });
        
        // Reset UI
        this.showLoginView();
        this.updateAuthUI(null);
        
        // Clear any ongoing operations
        this.clearOperations();
        
        // Show message
        showToast('Disconnesso con successo', 'info');
    }
    
    /**
     * Update authentication UI
     */
    updateAuthUI(user) {
        const authStatus = document.getElementById('auth-status');
        if (!authStatus) return;
        
        if (user) {
            authStatus.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-700">${user.name || 'User'}</div>
                        <div class="text-xs text-gray-500">${user.email}</div>
                    </div>
                    <img src="${user.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User')}" 
                         alt="Avatar" 
                         class="w-10 h-10 rounded-full border-2 border-indigo-200"
                         referrerpolicy="no-referrer">
                    <button id="signout-button" 
                            class="btn btn-secondary text-sm">
                        Esci
                    </button>
                </div>
            `;
            
            // Add signout handler
            const signoutButton = document.getElementById('signout-button');
            if (signoutButton) {
                signoutButton.addEventListener('click', () => {
                    googleAuth.signOut();
                });
            }
        } else {
            authStatus.innerHTML = '';
        }
    }
    
    /**
     * Show dashboard view
     */
    showDashboard() {
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');
        if (loginView) hideElement(loginView);
        if (dashboardView) showElement(dashboardView);
        stateManager.set('ui.currentView', 'dashboard');
    }
    
    /**
     * Show login view
     */
    showLoginView() {
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');
        if (loginView) showElement(loginView);
        if (dashboardView) hideElement(dashboardView);
        stateManager.set('ui.currentView', 'login');
    }
    
    /**
     * Initialize UI components
     */
    async initializeUIComponents() {
        // Initialize batch sender UI
        if (this.modules.has('BatchSenderUI')) {
            const BatchSenderUI = this.modules.get('BatchSenderUI');
            const container = document.getElementById('batch-sender-tab');
            if (container) {
                new BatchSenderUI(container);
            }
        }
        
        // Initialize email downloader UI
        if (this.modules.has('EmailDownloaderUI')) {
            const EmailDownloaderUI = this.modules.get('EmailDownloaderUI');
            const container = document.getElementById('email-downloader-tab');
            if (container) {
            const ui = new EmailDownloaderUI(container);
                // Expose for debugging
                    if (CONFIG.DEBUG.ENABLED) {
                        window.emailDownloaderUI = ui;
                    }
                }
        }
    }
    
    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update buttons
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update content
                tabContents.forEach(content => {
                    if (content.id === `${tabName}-tab`) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                });
                
                // Update state
                stateManager.set('ui.activeTab', tabName);
                
                // Emit event
                eventBus.emit(EVENTS.UI.TAB_CHANGED, tabName);
            });
        });
    }
    

    
    /**
     * Set loading state
     */
    setLoading(loading) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (loading) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
        stateManager.set('app.loading', loading);
    }
    
    /**
     * Check browser compatibility
     */
    checkBrowserCompatibility() {
        const ua = navigator.userAgent;
        
        // Check for required features
        const hasRequiredFeatures = 
            'Promise' in window &&
            'fetch' in window &&
            'crypto' in window &&
            'localStorage' in window &&
            'sessionStorage' in window;
        
        if (!hasRequiredFeatures) {
            return false;
        }
        
        // Check browser versions (basic check)
        // In production, use a more robust browser detection library
        return true;
    }
    
    /**
     * Show browser warning
     */
    showBrowserWarning() {
        const message = `
            <div class="text-center p-8">
                <h2 class="text-2xl font-bold text-red-600 mb-4">Browser Non Supportato</h2>
                <p class="text-gray-700">Questa applicazione richiede un browser moderno.</p>
                <p class="text-gray-700 mt-2">Supportiamo: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+</p>
            </div>
        `;
        document.getElementById('app').innerHTML = message;
    }
    
    /**
     * Show fatal error
     */
    showFatalError(error) {
        const message = `
            <div class="text-center p-8">
                <h2 class="text-2xl font-bold text-red-600 mb-4">Errore di Inizializzazione</h2>
                <p class="text-gray-700">${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary mt-4">Ricarica Pagina</button>
            </div>
        `;
        document.getElementById('app').innerHTML = message;
    }
    
    /**
     * Handle app error
     */
    handleAppError(error) {
        logger.error('Application error:', error);
        showToast(error.message || 'Si è verificato un errore', 'error');
    }
    
    /**
     * Handle online event
     */
    handleOnline() {
        logger.info('Connection restored');
        showToast('Connessione ripristinata', 'success');
    }
    
    /**
     * Handle offline event
     */
    handleOffline() {
        logger.warn('Connection lost');
        showToast('Connessione persa. Alcune funzionalità potrebbero non essere disponibili.', 'warning', 10000);
    }
    
    /**
     * Handle before unload
     */
    handleBeforeUnload(event) {
        const isProcessing = stateManager.getComputed('isProcessing');
        if (isProcessing) {
            event.preventDefault();
            event.returnValue = 'Ci sono operazioni in corso. Sei sicuro di voler uscire?';
            return event.returnValue;
        }
    }
    
    /**
     * Clear ongoing operations
     */
    clearOperations() {
        // Stop any ongoing batch operations
        if (this.modules.has('EmailSender')) {
            const emailSender = this.modules.get('EmailSender');
            if (emailSender.pause) emailSender.pause();
        }
        
        // Stop any ongoing downloads
        if (this.modules.has('EmailDownloader')) {
            const emailDownloader = this.modules.get('EmailDownloader');
            if (emailDownloader.stop) emailDownloader.stop();
        }
    }
    
    /**
     * Apply theme
     */
    applyTheme() {
        const theme = stateManager.get('ui.theme', 'light');
        document.body.setAttribute('data-theme', theme);
    }
    
    /**
     * Initialize excellence features (Memory optimization, performance monitoring)
     */
    #initializeExcellenceFeatures() {
        // Start memory monitoring
        memoryMonitor.start(5000);
        memoryMonitor.onThresholdExceeded(({ level, usage }) => {
            logger.warn(`Memory ${level}: ${Math.round(usage.used / 1024 / 1024)}MB`);
            
            if (level === 'critical') {
                // Force cleanup
                gmailCache.clear();
                showWarning('Memory usage high, clearing caches...');
            }
        });
        
        // Start performance monitoring
        performanceMonitor.startFPSMonitoring();
        
        // Listen for low FPS events
        eventBus.on('performance:low-fps', ({ fps }) => {
            logger.warn(`Low FPS detected: ${fps}`);
            if (fps < 20) {
                showWarning('Performance degraded, consider closing other tabs');
            }
        });
        
        // Setup periodic logging in debug mode
        if (CONFIG.DEBUG.ENABLED) {
            // Cache stats
            setInterval(() => {
                const stats = gmailCache.getStats();
                logger.debug('Cache stats:', stats);
            }, 30000); // Every 30 seconds
            
            // Memory usage
            setInterval(() => {
                const memUsage = memoryMonitor.getFormattedUsage();
                logger.debug('Memory usage:', memUsage);
            }, 60000); // Every minute
            
            // Performance metrics
            setInterval(() => {
                const perfMetrics = performanceMonitor.getMetrics();
                const perfScore = performanceMonitor.getPerformanceScore();
                logger.debug('Performance metrics:', perfMetrics);
                logger.debug('Performance score:', perfScore);
            }, 30000); // Every 30 seconds
        }
        
        // Make monitors available in console for debugging
        if (CONFIG.DEBUG.ENABLED) {
            window.gmailCache = gmailCache;
            window.memoryMonitor = memoryMonitor;
            window.performanceMonitor = performanceMonitor;
            
            // Add helper commands
            window.getPerformanceReport = () => performanceMonitor.generateReport();
            window.getMemoryStatus = () => memoryMonitor.getFormattedUsage();
            window.getCacheStats = () => gmailCache.getStats();
        }
        
        logger.info('Excellence features initialized (Memory, Performance, Cache)');
    }
    
    /**
     * Create toast notification
     */
    createToast(data) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const { message, type = 'info', duration = 3000 } = data;
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} glass-effect rounded-lg p-4 mb-2 max-w-sm animate-fade-in`;
        
        // Set appropriate styles based on type
        const colors = {
            success: 'bg-green-50 border-green-500 text-green-800',
            error: 'bg-red-50 border-red-500 text-red-800',
            warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
            info: 'bg-blue-50 border-blue-500 text-blue-800'
        };
        
        toast.className += ` ${colors[type] || colors.info} border-l-4`;
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="flex-1">${message}</div>
                <button class="ml-3 text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.remove()">
                    ×
                </button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'fade-out 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    }
    
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            logger.error('Global error:', event.error);
            eventBus.emit(EVENTS.APP.ERROR, event.error);
        });
        
        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            logger.error('Unhandled promise rejection:', event.reason);
            eventBus.emit(EVENTS.APP.ERROR, event.reason);
        });
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new GmailToolApp();
        window.gmailToolApp = app; // For debugging
        app.initialize();
    });
} else {
    const app = new GmailToolApp();
    window.gmailToolApp = app; // For debugging
    app.initialize();
}

// Export for testing
export default GmailToolApp;
