/**
 * CSV Processor Worker
 * Handles CSV parsing and email validation in background thread
 */

// Handle messages from main thread
self.addEventListener('message', async (event) => {
    const { type, content, emails, emailColumn, taskId, data } = event.data;
    
    try {
        let result;
        
        switch (type) {
            case 'parse_csv':
                result = parseCSV(content);
                break;
                
            case 'validate_emails':
                result = validateEmails(emails, emailColumn);
                break;
                
            case 'batch':
                // Handle batch processing
                result = processBatch(data.items);
                break;
                
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
        
        // Send result back
        self.postMessage({
            taskId,
            result,
            error: null
        });
        
    } catch (error) {
        // Send error back
        self.postMessage({
            taskId,
            result: null,
            error: error.message
        });
    }
});

/**
 * Parse CSV content
 */
function parseCSV(content) {
    // Simple CSV parser (for production use PapaParse)
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        return { data: [], errors: ['Empty CSV'] };
    }
    
    // Get headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    // Parse rows
    const data = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
        
        if (values.length !== headers.length) {
            errors.push(`Row ${i + 1}: Column count mismatch`);
            continue;
        }
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        row._index = i;
        
        data.push(row);
    }
    
    return { data, errors };
}

/**
 * Validate email addresses
 */
function validateEmails(emails, emailColumn = 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = [];
    const invalid = [];
    const duplicates = new Set();
    const seen = new Set();
    
    emails.forEach((row, index) => {
        const email = row[emailColumn]?.toLowerCase().trim();
        
        if (!email) {
            invalid.push({ row, reason: 'Missing email', index });
            return;
        }
        
        if (!emailRegex.test(email)) {
            invalid.push({ row, reason: 'Invalid format', index });
            return;
        }
        
        if (seen.has(email)) {
            duplicates.add(email);
            invalid.push({ row, reason: 'Duplicate', index });
            return;
        }
        
        seen.add(email);
        valid.push(row);
    });
    
    return {
        valid,
        invalid,
        stats: {
            total: emails.length,
            valid: valid.length,
            invalid: invalid.length,
            duplicates: duplicates.size
        }
    };
}

/**
 * Process batch of items
 */
function processBatch(items) {
    // Generic batch processing
    return items.map(item => {
        // Process each item
        return { ...item, processed: true };
    });
}

// Signal that worker is ready
self.postMessage({ type: 'ready' });
