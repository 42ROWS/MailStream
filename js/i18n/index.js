/**
 * Gmail Tool v0.6 - i18n System
 * Client-Side Internationalization
 * Supports: EN, IT, DE, ES, FR
 * 
 * @author Mario Brosco <mario.brosco@42rows.com>
 * @company 42ROWS Srl
 */

class I18n {
    constructor() {
        this.currentLang = 'en';
        this.translations = null;
        this.fallbackLang = 'en';
        this.supportedLangs = ['en', 'it', 'de', 'es', 'fr'];
    }
    
    /**
     * Initialize i18n system
     */
    async init() {
        try {
            // Detect language
            this.currentLang = this.detectLanguage();
            
            // Load translations
            await this.loadLanguage(this.currentLang);
            
            // Apply translations
            this.applyTranslations();
            
            // Setup language switcher
            this.setupLanguageSwitcher();
            
            console.log(`[i18n] Initialized with language: ${this.currentLang}`);
            
        } catch (error) {
            console.error('[i18n] Initialization error:', error);
            // Fallback to English
            await this.loadLanguage('en');
            this.applyTranslations();
        }
    }
    
    /**
     * Detect user language
     * Priority: 1. localStorage, 2. URL param, 3. browser, 4. default (en)
     */
    detectLanguage() {
        // 1. Check localStorage
        const savedLang = localStorage.getItem('gmail_tool_language');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            return savedLang;
        }
        
        // 2. Check URL parameter (?lang=it)
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLangs.includes(urlLang)) {
            return urlLang;
        }
        
        // 3. Check browser language
        const browserLang = navigator.language.split('-')[0].toLowerCase();
        if (this.supportedLangs.includes(browserLang)) {
            return browserLang;
        }
        
        // 4. Default fallback
        return this.fallbackLang;
    }
    
    /**
     * Load language file dynamically
     */
    async loadLanguage(lang) {
        try {
            const module = await import(`./${lang}.js`);
            this.translations = module.default;
            this.currentLang = lang;
            
            // Save to localStorage
            localStorage.setItem('gmail_tool_language', lang);
            
            // Update HTML lang attribute
            document.documentElement.lang = lang;
            
        } catch (error) {
            console.error(`[i18n] Failed to load language: ${lang}`, error);
            // If not default, try loading fallback
            if (lang !== this.fallbackLang) {
                await this.loadLanguage(this.fallbackLang);
            }
        }
    }
    
    /**
     * Get translation by key (dot notation: "auth.welcome")
     */
    t(key, params = {}) {
        let value = key.split('.').reduce((obj, k) => obj?.[k], this.translations);
        
        // If not found, try fallback or return key
        if (!value) {
            console.warn(`[i18n] Missing translation: ${key}`);
            return key;
        }
        
        // Replace parameters {param}
        Object.keys(params).forEach(param => {
            value = value.replace(`{${param}}`, params[param]);
        });
        
        return value;
    }
    
    /**
     * Apply translations to DOM elements with data-i18n attribute
     */
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Check if element has data-i18n-attr for attribute translation
            const attr = el.getAttribute('data-i18n-attr');
            if (attr) {
                el.setAttribute(attr, translation);
            } else {
                el.textContent = translation;
            }
        });
    }
    
    /**
     * Change language
     */
    async changeLanguage(lang) {
        if (!this.supportedLangs.includes(lang)) {
            console.error(`[i18n] Unsupported language: ${lang}`);
            return;
        }
        
        await this.loadLanguage(lang);
        this.applyTranslations();
        
        // Emit event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
    }
    
    /**
     * Setup language switcher UI
     */
    setupLanguageSwitcher() {
        const switcher = this.createLanguageSwitcher();
        const header = document.querySelector('#auth-status');
        if (header) {
            header.insertAdjacentHTML('beforeend', switcher);
            this.attachSwitcherEvents();
        }
    }
    
    /**
     * Create language switcher HTML
     */
    createLanguageSwitcher() {
        return `
            <div class="relative language-switcher">
                <button id="lang-button" 
                        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Select language">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                    </svg>
                    <span class="font-medium text-gray-700 uppercase">${this.currentLang}</span>
                </button>
                <div id="lang-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200" style="z-index: 9999;">
                    <div class="py-2">
                        ${this.supportedLangs.map(lang => `
                            <button data-lang="${lang}" 
                                    class="lang-option w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors flex items-center justify-between ${lang === this.currentLang ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700'}">
                                <span>${this.getLangName(lang)}</span>
                                <span class="text-sm uppercase">${lang}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get language name
     */
    getLangName(code) {
        const names = {
            'en': 'English',
            'it': 'Italiano',
            'de': 'Deutsch',
            'es': 'Español',
            'fr': 'Français'
        };
        return names[code] || code;
    }
    
    /**
     * Attach event listeners to language switcher
     */
    attachSwitcherEvents() {
        const button = document.getElementById('lang-button');
        const dropdown = document.getElementById('lang-dropdown');
        
        if (!button || !dropdown) return;
        
        // Toggle dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });
        
        // Handle language selection
        document.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                const lang = e.currentTarget.getAttribute('data-lang');
                await this.changeLanguage(lang);
                dropdown.classList.add('hidden');
                
                // Update button text
                button.querySelector('span').textContent = lang.toUpperCase();
            });
        });
    }
}

// Create singleton instance
const i18n = new I18n();

// Export for use in other modules
export default i18n;

// Expose globally for re-attaching events after DOM updates
if (typeof window !== 'undefined') {
    window.i18nInstance = i18n;
}
