/**
 * UIHelpers - Common UI utility functions
 * Provides DOM manipulation, animations, and UI component helpers
 */

import { EVENTS } from './Events.js';
import eventBus from '../core/EventBus.js';

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
export const showToast = (message, type = 'info', duration = 3000) => {
    eventBus.emit(EVENTS.UI.TOAST, {
        type,
        message,
        duration
    });
};

/**
 * Show success toast
 */
export const showSuccess = (message, duration) => showToast(message, 'success', duration);

/**
 * Show error toast
 */
export const showError = (message, duration) => showToast(message, 'error', duration);

/**
 * Show warning toast
 */
export const showWarning = (message, duration) => showToast(message, 'warning', duration);

/**
 * Show info toast
 */
export const showInfo = (message, duration) => showToast(message, 'info', duration);

/**
 * Toggle element visibility
 * @param {HTMLElement|string} element - Element or selector
 * @param {boolean} show - Show or hide
 */
export const toggleElement = (element, show) => {
    // Handle string as ID if no CSS selector symbols
    let el = element;
    if (typeof element === 'string') {
        // If string doesn't start with . # [ or contain spaces, assume it's an ID
        if (!/^[.#\[]/.test(element) && !element.includes(' ')) {
            el = document.getElementById(element);
        } else {
            el = document.querySelector(element);
        }
    }
    if (!el) return;
    
    if (show === undefined) {
        el.classList.toggle('hidden');
    } else if (show) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
};

/**
 * Show element
 */
export const showElement = (element) => toggleElement(element, true);

/**
 * Hide element
 */
export const hideElement = (element) => toggleElement(element, false);

/**
 * Enable/disable element
 * @param {HTMLElement|string} element - Element or selector
 * @param {boolean} enable - Enable or disable
 */
export const toggleEnabled = (element, enable) => {
    // Handle string as ID if no CSS selector symbols
    let el = element;
    if (typeof element === 'string') {
        // If string doesn't start with . # [ or contain spaces, assume it's an ID
        if (!/^[.#\[]/.test(element) && !element.includes(' ')) {
            el = document.getElementById(element);
        } else {
            el = document.querySelector(element);
        }
    }
    if (!el) return;
    
    el.disabled = !enable;
    
    if (enable) {
        el.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        el.classList.add('opacity-50', 'cursor-not-allowed');
    }
};

/**
 * Enable element
 */
export const enableElement = (element) => toggleEnabled(element, true);

/**
 * Disable element
 */
export const disableElement = (element) => toggleEnabled(element, false);

/**
 * Create element with attributes and children
 * @param {string} tag - HTML tag
 * @param {Object} attrs - Attributes
 * @param {Array|string} children - Children elements or text
 * @returns {HTMLElement} Created element
 */
export const createElement = (tag, attrs = {}, children = []) => {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Add children
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });
    
    return element;
};

/**
 * Format time duration
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted time (MM:SS or HH:MM:SS)
 */
export const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
};

/**
 * Create and manage timer
 * @param {Function} callback - Callback function
 * @param {number} interval - Interval in milliseconds
 * @returns {Object} Timer object with start, stop, reset methods
 */
export const createTimer = (callback, interval = 1000) => {
    let timerId = null;
    let startTime = null;
    let elapsed = 0;
    let running = false;
    
    const update = () => {
        if (!running) return;
        
        elapsed = Date.now() - startTime;
        callback(elapsed);
    };
    
    return {
        start() {
            if (running) return;
            
            startTime = Date.now() - elapsed;
            running = true;
            timerId = setInterval(update, interval);
            update();
        },
        
        stop() {
            if (!running) return;
            
            running = false;
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
        },
        
        reset() {
            this.stop();
            elapsed = 0;
            startTime = null;
        },
        
        getElapsed() {
            return elapsed;
        },
        
        isRunning() {
            return running;
        }
    };
};

/**
 * Update progress bar
 * @param {HTMLElement|string} element - Progress bar element or selector
 * @param {number} percentage - Percentage (0-100)
 * @param {boolean} animate - Animate the change
 */
export const updateProgress = (element, percentage, animate = true) => {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    if (animate) {
        el.style.transition = 'width 0.3s ease-in-out';
    } else {
        el.style.transition = 'none';
    }
    
    el.style.width = `${clampedPercentage}%`;
    
    // Update aria attributes if present
    if (el.hasAttribute('aria-valuenow')) {
        el.setAttribute('aria-valuenow', clampedPercentage);
    }
};

/**
 * Confirm dialog wrapper
 * @param {string} message - Confirmation message
 * @param {Object} options - Options
 * @returns {Promise<boolean>} User's choice
 */
export const confirmDialog = (message, options = {}) => {
    const {
        title = 'Conferma',
        confirmText = 'Conferma',
        cancelText = 'Annulla',
        type = 'warning'
    } = options;
    
    // For now use native confirm, can be replaced with custom modal
    return Promise.resolve(window.confirm(message));
};

/**
 * File size formatter
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copiato negli appunti');
    } catch (error) {
        // Fallback method
        const textarea = createElement('textarea', {
            value: text,
            style: {
                position: 'fixed',
                top: '-999px'
            }
        });
        
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showSuccess('Copiato negli appunti');
        } catch (e) {
            showError('Impossibile copiare negli appunti');
        } finally {
            document.body.removeChild(textarea);
        }
    }
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename
 */
export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = createElement('a', {
        href: url,
        download: filename,
        style: { display: 'none' }
    });
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Export data as CSV
 * @param {Array} data - Data to export
 * @param {string} filename - Filename
 */
export const exportCSV = (data, filename = 'export.csv') => {
    // Use Papa Parse if available, otherwise simple implementation
    let csv;
    
    if (window.Papa) {
        csv = Papa.unparse(data);
    } else {
        // Simple CSV generation
        const headers = Object.keys(data[0] || {});
        const rows = data.map(row => 
            headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            }).join(',')
        );
        
        csv = [headers.join(','), ...rows].join('\n');
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, filename);
};

/**
 * Setup drag and drop for file upload
 * @param {HTMLElement} dropZone - Drop zone element
 * @param {Function} onDrop - Callback for dropped files
 * @param {Object} options - Options
 */
export const setupDragDrop = (dropZone, onDrop, options = {}) => {
    const {
        dragClass = 'dragging',
        acceptedTypes = [],
        multiple = false
    } = options;
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add(dragClass);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove(dragClass);
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove(dragClass);
        
        const files = Array.from(e.dataTransfer.files);
        
        // Filter by accepted types
        const validFiles = acceptedTypes.length > 0
            ? files.filter(file => acceptedTypes.some(type => file.name.endsWith(type)))
            : files;
        
        if (validFiles.length > 0) {
            onDrop(multiple ? validFiles : validFiles[0]);
        } else if (acceptedTypes.length > 0) {
            showError(`Accettati solo file: ${acceptedTypes.join(', ')}`);
        }
    };
    
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Return cleanup function
    return () => {
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
    };
};

/**
 * Animate counter
 * @param {HTMLElement} element - Element to update
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Animation duration in ms
 */
export const animateCounter = (element, start, end, duration = 1000) => {
    const range = end - start;
    const increment = range / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        element.textContent = Math.round(current);
    }, 16);
    
    return () => clearInterval(timer);
};

// Export all helpers
export default {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    toggleElement,
    showElement,
    hideElement,
    toggleEnabled,
    enableElement,
    disableElement,
    createElement,
    formatDuration,
    createTimer,
    updateProgress,
    confirmDialog,
    formatFileSize,
    copyToClipboard,
    downloadBlob,
    exportCSV,
    setupDragDrop,
    animateCounter
};
