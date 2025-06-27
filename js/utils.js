/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

export const Utils = {
    /**
     * Safely get element by ID with error handling
     */
    getElementById(id, required = false) {
        const element = document.getElementById(id);
        if (required && !element) {
            console.error(`Required element with ID '${id}' not found`);
            throw new Error(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Validate input value
     */
    validateInput(value, fieldName, required = true) {
        if (required && (!value || !value.toString().trim())) {
            throw new Error(`${fieldName} is required`);
        }
        return value;
    },

    /**
     * Safely parse integer
     */
    safeParseInt(value, defaultValue = 0) {
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    },

    /**
     * Format number with dots as thousands separator for PDF reports
     */
    formatNumberForPDF(value) {
        if (typeof value !== 'number') {
            value = parseInt(value) || 0;
        }
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    /**
     * Debounce function to limit function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Convert a string to proper title case with special rules
     * - Replace consecutive underscores with spaces
     * - Capitalize all words except articles, prepositions, and conjunctions (unless first/last word)
     * - Handle special abbreviations that should remain uppercase
     */
    toTitleCase(str) {
        // Articles, prepositions, and conjunctions that shouldn't be capitalized (unless first/last word)
        const lowercaseWords = new Set([
            'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
        ]);
        
        // Special abbreviations that should remain uppercase
        const uppercaseAbbreviations = new Set([
            'tts', 'ai', 'api', 'url', 'html', 'css', 'js', 'id', 'ui', 'ux', 'seo', 'cta', 'roi', 'kpi'
        ]);
        
        // Replace consecutive underscores with spaces and split into words
        const words = str.replace(/_+/g, ' ').split(/\s+/).filter(word => word.length > 0);
        
        return words.map((word, index) => {
            const lowerWord = word.toLowerCase();
            
            // Check if it's a special abbreviation
            if (uppercaseAbbreviations.has(lowerWord)) {
                return lowerWord.toUpperCase();
            }
            
            // Always capitalize first and last word
            if (index === 0 || index === words.length - 1) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            
            // Don't capitalize articles, prepositions, and conjunctions in the middle
            if (lowercaseWords.has(lowerWord)) {
                return lowerWord;
            }
            
            // Capitalize all other words
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    },

    /**
     * Parse CSV line handling quoted values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    },

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Trigger slide-in animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Auto-remove after duration
        setTimeout(() => {
            notification.classList.add('slide-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    },

    /**
     * Show error message to user
     */
    showError(message) {
        console.error('Error:', message);
        this.showNotification(message, 'error');
        
        // Also try to find and use existing error display if available
        const errorDiv = document.getElementById('errorDiv');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
}; 