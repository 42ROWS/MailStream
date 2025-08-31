/**
 * VirtualList - GPU-accelerated virtual scrolling
 * Handles 100K+ items at 60fps using transform positioning
 * Memory usage: O(visible items) instead of O(all items)
 */

export class VirtualList {
    #container = null;
    #items = [];
    #itemHeight = 60;
    #buffer = 5;
    #scrollTop = 0;
    #visibleRange = { start: 0, end: 0 };
    #pool = new Map();
    #raf = null;
    #isScrolling = false;
    #scrollEndTimer = null;
    #content = null;
    #observer = null;
    #renderCallback = null;
    
    constructor(container, options = {}) {
        this.#container = container;
        this.#itemHeight = options.itemHeight || 60;
        this.#buffer = options.buffer || 5;
        this.#renderCallback = options.renderItem || this.#defaultRenderItem.bind(this);
        
        this.#setupContainer();
        this.#attachListeners();
    }
    
    #setupContainer() {
        // Enable GPU acceleration
        this.#container.style.position = 'relative';
        this.#container.style.overflow = 'auto';
        this.#container.style.willChange = 'transform';
        this.#container.style.transform = 'translateZ(0)'; // Force GPU layer
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'virtual-list-content';
        content.style.position = 'relative';
        content.style.willChange = 'transform';
        this.#container.appendChild(content);
        
        this.#content = content;
    }
    
    #attachListeners() {
        // Use passive listener for better scroll performance
        this.#container.addEventListener('scroll', this.#onScroll.bind(this), { passive: true });
        
        // Optimize with Intersection Observer for visibility
        this.#setupIntersectionObserver();
    }
    
    #setupIntersectionObserver() {
        this.#observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const index = parseInt(entry.target.dataset.index);
                    if (!entry.isIntersecting && !this.#isInVisibleRange(index)) {
                        this.#releaseElement(entry.target);
                    }
                });
            },
            {
                root: this.#container,
                rootMargin: `${this.#itemHeight * this.#buffer}px 0px`
            }
        );
    }
    
    setItems(items) {
        this.#items = items;
        
        // Set total height for scrollbar
        this.#content.style.height = `${items.length * this.#itemHeight}px`;
        
        // Initial render
        this.#render();
    }
    
    updateItem(index, item) {
        if (index >= 0 && index < this.#items.length) {
            this.#items[index] = item;
            
            // Update if visible
            const element = this.#pool.get(index);
            if (element) {
                this.#updateElement(element, item, index);
            }
        }
    }
    
    #onScroll() {
        if (!this.#isScrolling) {
            this.#isScrolling = true;
            this.#container.style.pointerEvents = 'none'; // Disable hover during scroll
        }
        
        // Clear scroll end timer
        clearTimeout(this.#scrollEndTimer);
        this.#scrollEndTimer = setTimeout(() => {
            this.#isScrolling = false;
            this.#container.style.pointerEvents = 'auto';
        }, 150);
        
        // Cancel previous frame
        if (this.#raf) {
            cancelAnimationFrame(this.#raf);
        }
        
        // Schedule render on next frame
        this.#raf = requestAnimationFrame(() => {
            this.#scrollTop = this.#container.scrollTop;
            this.#render();
        });
    }
    
    #render() {
        const containerHeight = this.#container.clientHeight;
        const start = Math.floor(this.#scrollTop / this.#itemHeight);
        const end = Math.ceil((this.#scrollTop + containerHeight) / this.#itemHeight);
        
        // Add buffer
        const bufferedStart = Math.max(0, start - this.#buffer);
        const bufferedEnd = Math.min(this.#items.length - 1, end + this.#buffer);
        
        this.#visibleRange = { start: bufferedStart, end: bufferedEnd };
        
        // Release elements outside range
        for (const [index, element] of this.#pool) {
            if (!this.#isInVisibleRange(index)) {
                this.#releaseElement(element);
            }
        }
        
        // Render visible items
        for (let i = bufferedStart; i <= bufferedEnd; i++) {
            this.#renderItem(i);
        }
    }
    
    #renderItem(index) {
        if (index >= this.#items.length) return;
        
        let element = this.#pool.get(index);
        
        if (!element) {
            element = this.#acquireElement();
            element.dataset.index = index;
            
            // Update content
            this.#updateElement(element, this.#items[index], index);
            
            // Position with transform (GPU-accelerated)
            const y = index * this.#itemHeight;
            element.style.transform = `translateY(${y}px)`;
            
            // Add to pool
            this.#pool.set(index, element);
            
            // Observe for cleanup
            this.#observer.observe(element);
            
            // Add to DOM
            this.#content.appendChild(element);
        }
        
        return element;
    }
    
    #acquireElement() {
        // Try to reuse from pool
        const pooled = this.#content.querySelector('.virtual-list-item[data-pooled="true"]');
        
        if (pooled) {
            pooled.removeAttribute('data-pooled');
            return pooled;
        }
        
        // Create new element
        const element = document.createElement('div');
        element.className = 'virtual-list-item';
        element.style.position = 'absolute';
        element.style.top = '0';
        element.style.left = '0';
        element.style.right = '0';
        element.style.height = `${this.#itemHeight}px`;
        element.style.willChange = 'transform';
        element.style.contain = 'layout style paint';
        
        return element;
    }
    
    #releaseElement(element) {
        const index = parseInt(element.dataset.index);
        
        // Mark as pooled
        element.dataset.pooled = 'true';
        element.style.transform = 'translateY(-9999px)'; // Move off-screen
        
        // Remove from active pool
        this.#pool.delete(index);
        
        // Stop observing
        this.#observer.unobserve(element);
    }
    
    #updateElement(element, item, index) {
        // Use custom render callback if provided
        if (this.#renderCallback) {
            this.#renderCallback(element, item, index);
        } else {
            this.#defaultRenderItem(element, item, index);
        }
    }
    
    #defaultRenderItem(element, item, index) {
        element.innerHTML = `
            <div class="email-row flex items-center p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="mr-3" data-index="${index}">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="font-semibold text-gray-900 truncate">${item.from || 'Unknown'}</span>
                        <span class="text-sm text-gray-500">${item.date || ''}</span>
                    </div>
                    <div class="text-sm text-gray-700 truncate">${item.subject || 'No subject'}</div>
                    <div class="text-xs text-gray-500 truncate">${item.snippet || ''}</div>
                </div>
            </div>
        `;
    }
    
    #isInVisibleRange(index) {
        return index >= this.#visibleRange.start && index <= this.#visibleRange.end;
    }
    
    scrollToIndex(index, behavior = 'smooth') {
        const targetScroll = index * this.#itemHeight;
        this.#container.scrollTo({
            top: targetScroll,
            behavior: behavior
        });
    }
    
    getVisibleRange() {
        return { ...this.#visibleRange };
    }
    
    getItemCount() {
        return this.#items.length;
    }
    
    getScrollPosition() {
        return {
            scrollTop: this.#scrollTop,
            scrollHeight: this.#content.style.height,
            clientHeight: this.#container.clientHeight
        };
    }
    
    refresh() {
        this.#render();
    }
    
    destroy() {
        if (this.#raf) {
            cancelAnimationFrame(this.#raf);
        }
        
        clearTimeout(this.#scrollEndTimer);
        
        if (this.#observer) {
            this.#observer.disconnect();
        }
        
        this.#pool.clear();
        this.#content.innerHTML = '';
        
        // Remove event listeners
        this.#container.removeEventListener('scroll', this.#onScroll);
    }
}

export default VirtualList;