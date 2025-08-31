/**
 * Gmail Tool v0.5 - Professional Email Automation Suite
 * Copyright (c) 2024 42ROWS Srl. All rights reserved.
 * Licensed under the MIT License.
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl - P.IVA: 18017981004
 * 
 * GoogleAuth - Google Identity Services OAuth 2.0 Authentication
 * Handles authentication flow, token management, and user information
 */

import { CONFIG } from '../config.js';
import eventBus from '../core/EventBus.js';
import stateManager from '../core/StateManager.js';
import logger from '../core/Logger.js';

// Import shared utilities
import { 
    waitFor, 
    generateId, 
    storage,
    EVENTS
} from '../utils/index.js';

class GoogleAuth {
    #tokenClient = null;
    #accessToken = null;
    #tokenExpiresAt = null;
    #refreshTimer = null;
    #userInfo = null;
    #initialized = false;
    #gapiInitialized = false;
    #pendingSignIn = null;
    
    constructor() {
        // Bind methods to maintain context
        this.initialize = this.initialize.bind(this);
        this.signIn = this.signIn.bind(this);
        this.signOut = this.signOut.bind(this);
        this.handleTokenResponse = this.handleTokenResponse.bind(this);
        this.handleError = this.handleError.bind(this);
    }
    
    /**
     * Initialize Google Identity Services and GAPI
     */
    async initialize() {
        if (this.#initialized) {
            logger.debug('GoogleAuth already initialized');
            return;
        }
        
        try {
            logger.info('Initializing Google Auth...');
            
            // Use shared waitFor utility instead of custom implementation
            await waitFor(
                () => window.google?.accounts?.oauth2,
                {
                    maxAttempts: 50,
                    interval: 100,
                    errorMessage: 'Google Identity Services failed to load'
                }
            );
            
            // Initialize token client
            this.#initializeTokenClient();
            
            // Initialize GAPI client
            await this.#initializeGAPI();
            
            // Check for existing session
            await this.#checkExistingSession();
            
            this.#initialized = true;
            logger.info('Google Auth initialized successfully');
            
            eventBus.emit(EVENTS.AUTH.INITIALIZED);
            
        } catch (error) {
            logger.error('Failed to initialize Google Auth:', error);
            throw error;
        }
    }
    
    /**
     * Sign in user
     */
    async signIn() {
        if (!this.#tokenClient) {
            throw new Error('Auth not initialized. Call initialize() first.');
        }
        
        logger.info('Starting sign in process...');
        
        return new Promise((resolve, reject) => {
            // Store callbacks for token response
            this.#pendingSignIn = { resolve, reject };
            
            try {
                // Request access token immediately in user event context
                this.#tokenClient.requestAccessToken({
                    prompt: ''
                });
            } catch (error) {
                logger.error('Sign in error:', error);
                reject(error);
                this.#pendingSignIn = null;
            }
        });
    }
    
    /**
     * Sign out user
     */
    async signOut() {
        if (!this.#accessToken) {
            logger.warn('No active session to sign out');
            return;
        }
        
        logger.info('Signing out...');
        
        try {
            // Revoke token
            if (window.google?.accounts?.oauth2) {
                await new Promise((resolve) => {
                    google.accounts.oauth2.revoke(this.#accessToken, () => {
                        logger.info('Token revoked successfully');
                        resolve();
                    });
                });
            }
            
            // Clear local state
            this.#clearSession();
            
            // Clear user info from storage
            storage.remove(CONFIG.STORAGE.USER_KEY);
            
            // Update state
            stateManager.set('auth', {
                isAuthenticated: false,
                user: null,
                token: null
            });
            
            // Use centralized event constants
            eventBus.emit(EVENTS.AUTH.SIGNOUT);
            
            logger.info('Sign out complete');
            
        } catch (error) {
            logger.error('Sign out error:', error);
            // Clear session anyway
            this.#clearSession();
            throw error;
        }
    }
    
    /**
     * Get current access token
     */
    getAccessToken() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        return this.#accessToken;
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        // First check in-memory token
        if (this.#accessToken && Date.now() < this.#tokenExpiresAt) {
            return true;
        }
        
        // Then check stored token
        const savedToken = storage.get(CONFIG.STORAGE.TOKEN_KEY);
        if (savedToken && savedToken.expiresAt > Date.now()) {
            // Restore token to memory
            this.#accessToken = savedToken.token;
            this.#tokenExpiresAt = savedToken.expiresAt;
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if GoogleAuth is initialized
     */
    isInitialized() {
        return this.#initialized && this.#tokenClient !== null;
    }
    
    /**
     * Get user information
     */
    getUserInfo() {
        return this.#userInfo;
    }
    
    /**
     * Refresh token if needed
     */
    async refreshTokenIfNeeded() {
        if (!this.#tokenClient) {
            throw new Error('Auth not initialized');
        }
        
        // Check if token needs refresh (5 minutes before expiry)
        const needsRefresh = !this.#accessToken || 
            Date.now() > (this.#tokenExpiresAt - 5 * 60 * 1000);
        
        if (needsRefresh) {
            logger.info('Token needs refresh');
            return this.signIn();
        }
        
        return this.#accessToken;
    }
    
    /**
     * Set GAPI token for API calls
     */
    setGAPIToken() {
        if (!this.#accessToken) {
            throw new Error('No access token available');
        }
        
        if (!window.gapi?.client) {
            throw new Error('GAPI client not initialized');
        }
        
        gapi.client.setToken({
            access_token: this.#accessToken
        });
        
        logger.debug('GAPI token set');
    }
    
    // Private methods
    
    #initializeTokenClient() {
        if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID')) {
            throw new Error('Please configure GOOGLE_CLIENT_ID in config.js');
        }
        
        this.#tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: CONFIG.SCOPES.join(' '),
            callback: this.handleTokenResponse,
            error_callback: this.handleError,
            // Use popup for better UX
            ux_mode: 'popup',
            // Auto select account if only one
            prompt: '',
            // State for CSRF protection - use shared generateId
            state: generateId()
        });
        
        logger.debug('Token client initialized');
    }
    
    async #initializeGAPI() {
        // First wait for GAPI itself to be available
        await waitFor(
            () => window.gapi,
            {
                maxAttempts: 50,
                interval: 100,
                errorMessage: 'GAPI not available'
            }
        );
        
        if (this.#gapiInitialized) {
            return;
        }
        
        return new Promise((resolve, reject) => {
            // Load the client library first
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        // Don't set API key for OAuth-only apps
                        discoveryDocs: [CONFIG.GMAIL_API.DISCOVERY_DOC]
                    });
                    
                    this.#gapiInitialized = true;
                    logger.debug('GAPI client initialized');
                    resolve();
                    
                } catch (error) {
                    logger.error('GAPI initialization error:', error);
                    reject(error);
                }
            });
        });
    }
    
    async #checkExistingSession() {
        // Use shared storage helper instead of custom implementation
        const savedToken = storage.get(CONFIG.STORAGE.TOKEN_KEY);
        if (savedToken && savedToken.expiresAt > Date.now()) {
            logger.debug('Found existing session in storage');
            this.#accessToken = savedToken.token;
            this.#tokenExpiresAt = savedToken.expiresAt;
            
            // Set GAPI token
            this.setGAPIToken();
            
            // Try to fetch user info or use stored one
            try {
                await this.#fetchUserInfo();
            } catch (error) {
                // Use stored user info if available
                const storedUser = storage.get(CONFIG.STORAGE.USER_KEY);
                if (storedUser) {
                    this.#userInfo = storedUser;
                    logger.debug('Using stored user info');
                }
            }
            
            // Update state
            this.#updateAuthState(true);
            
            // Setup refresh timer
            this.#setupTokenRefresh();
        }
    }
    
    handleTokenResponse(response) {
        logger.info('Token response received');
        
        if (!response.access_token) {
            logger.error('No access token in response');
            if (this.#pendingSignIn) {
                this.#pendingSignIn.reject(new Error('No access token received'));
                this.#pendingSignIn = null;
            }
            return;
        }
        
        // Store token
        this.#accessToken = response.access_token;
        this.#tokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;
        
        logger.debug(`Token expires at: ${new Date(this.#tokenExpiresAt).toISOString()}`);
        
        // Save token using shared storage helper
        storage.set(CONFIG.STORAGE.TOKEN_KEY, {
            token: this.#accessToken,
            expiresAt: this.#tokenExpiresAt,
            timestamp: Date.now()
        });
        
        // Set GAPI token
        this.setGAPIToken();
        
        // Fetch user info
        this.#fetchUserInfo().then(() => {
            // Update state
            this.#updateAuthState(true);
            
            // Setup refresh timer
            this.#setupTokenRefresh();
            
            // Use centralized event constants
            eventBus.emit(EVENTS.AUTH.SUCCESS, {
                token: this.#accessToken,
                expiresAt: this.#tokenExpiresAt,
                user: this.#userInfo
            });
            
            // Resolve sign in promise
            if (this.#pendingSignIn) {
                this.#pendingSignIn.resolve({
                    token: this.#accessToken,
                    user: this.#userInfo
                });
                this.#pendingSignIn = null;
            }
            
            logger.info('Authentication successful');
        }).catch(error => {
            logger.error('Failed to fetch user info:', error);
            if (this.#pendingSignIn) {
                this.#pendingSignIn.reject(error);
                this.#pendingSignIn = null;
            }
        });
    }
    
    handleError(error) {
        logger.error('Authentication error:', error);
        
        // Clear any partial state
        this.#clearSession();
        
        // Update state
        this.#updateAuthState(false);
        
        // Use centralized event constants
        eventBus.emit(EVENTS.AUTH.ERROR, error);
        
        // Reject sign in promise
        if (this.#pendingSignIn) {
            this.#pendingSignIn.reject(error);
            this.#pendingSignIn = null;
        }
        
        // Show user-friendly error
        this.#showAuthError(error);
    }
    
    async #fetchUserInfo() {
        if (!this.#accessToken) {
            throw new Error('No access token available');
        }
        
        try {
            const response = await fetch(CONFIG.ENDPOINTS.GOOGLE_USERINFO, {
                headers: {
                    'Authorization': `Bearer ${this.#accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch user info: ${response.statusText}`);
            }
            
            this.#userInfo = await response.json();
            logger.debug('User info fetched:', this.#userInfo.email);
            
            // Store user info for session persistence
            storage.set(CONFIG.STORAGE.USER_KEY, this.#userInfo);
            
            return this.#userInfo;
            
        } catch (error) {
            logger.error('Error fetching user info:', error);
            // Set basic user info
            this.#userInfo = {
                email: 'user@gmail.com',
                name: 'Gmail User'
            };
            throw error;
        }
    }
    
    #setupTokenRefresh() {
        // Clear existing timer
        if (this.#refreshTimer) {
            clearTimeout(this.#refreshTimer);
        }
        
        // Calculate refresh time (5 minutes before expiry)
        const refreshTime = this.#tokenExpiresAt - Date.now() - (5 * 60 * 1000);
        
        if (refreshTime > 0) {
            logger.debug(`Setting token refresh timer for ${refreshTime / 1000} seconds`);
            
            this.#refreshTimer = setTimeout(() => {
                logger.info('Auto-refreshing token...');
                this.refreshTokenIfNeeded().catch(error => {
                    logger.error('Auto-refresh failed:', error);
                    eventBus.emit(EVENTS.AUTH.REFRESH_FAILED, error);
                });
            }, refreshTime);
        }
    }
    
    #clearSession() {
        this.#accessToken = null;
        this.#tokenExpiresAt = null;
        this.#userInfo = null;
        
        if (this.#refreshTimer) {
            clearTimeout(this.#refreshTimer);
            this.#refreshTimer = null;
        }
        
        // Clear stored token using shared storage helper
        storage.remove(CONFIG.STORAGE.TOKEN_KEY);
        
        // Clear GAPI token
        if (window.gapi?.client) {
            gapi.client.setToken(null);
        }
    }
    
    #updateAuthState(isAuthenticated) {
        stateManager.set('auth', {
            isAuthenticated,
            user: this.#userInfo,
            token: isAuthenticated ? {
                expiresAt: this.#tokenExpiresAt
            } : null
        });
    }
    
    #showAuthError(error) {
        let message = CONFIG.ERRORS.AUTH_FAILED;
        
        if (error.type === 'popup_closed') {
            message = 'Accesso annullato';
        } else if (error.type === 'access_denied') {
            message = 'Accesso negato. Verifica i permessi richiesti.';
        }
        
        eventBus.emit(EVENTS.UI.TOAST, {
            type: 'error',
            message,
            duration: 5000
        });
    }
}

// Create singleton instance
const googleAuth = new GoogleAuth();

// Export singleton
export default googleAuth;
