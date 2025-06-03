/**
 * Analytics Analyzer
 * 
 * This script processes CSV files containing analytics data,
 * calculates key metrics, and visualizes the results.
 */

// Configuration: Test user IDs to exclude from main metrics
const TEST_USER_IDS = ['X001', 'PH123', 'OMMATEST'];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('resultsContainer');

    // Setup event listeners
    initializeEventListeners();

    /**
     * Set up all event listeners for the application
     */
    function initializeEventListeners() {
        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        // Add active class on drag
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('active');
            }, false);
        });

        // Remove active class on drag leave/drop
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('active');
            }, false);
        });

        // Handle file drop
        dropArea.addEventListener('drop', handleDrop, false);
        
        // Handle file selection through input
        fileInput.addEventListener('change', handleFiles, false);
        
        // Connect the select button to the file input
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    /**
     * Prevent default browser behavior for drag events
     */
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle dropped files
     */
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    /**
     * Process files when selected or dropped
     */
    function handleFiles(e) {
        const file = e.target.files[0];
        if (file && file.type === 'text/csv') {
            parseCSV(file);
        } else {
            showError('Please upload a valid CSV file');
        }
    }

    /**
     * Display an error message to the user
     */
    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="error">
                <p>Error: ${message}</p>
            </div>
        `;
        resultsSection.style.display = 'block';
    }

    /**
     * Parse the CSV file contents
     */
    function parseCSV(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const contents = e.target.result;
                processData(contents, file.name);
            } catch (error) {
                showError(`Failed to process the file: ${error.message}`);
                console.error('CSV processing error:', error);
            }
        };
        
        reader.onerror = function() {
            showError('Failed to read the file');
        };
        
        // Show loading message
        resultsContainer.innerHTML = '<div class="processing">Processing data...</div>';
        resultsSection.style.display = 'block';
        
        reader.readAsText(file);
    }

    /**
     * Process CSV data and display results
     */
    function processData(csvContent, fileName) {
        try {
            // Parse CSV data
            const lines = csvContent.split(/\r?\n/);
            if (lines.length <= 1) {
                throw new Error('CSV file appears to be empty or has no data rows');
            }
            
            const headers = parseCSVLine(lines[0]).map(header => header.replace(/"/g, '').trim());
            
            // Validate required columns
            const columnIndexes = findColumnIndexes(headers);
            if (!columnIndexes.valid) {
                throw new Error(columnIndexes.error);
            }
            
            // Extract metadata from filename
            const metadata = extractMetadataFromFilename(fileName);
            
            // Calculate metrics
            const metrics = calculateMetrics(lines, columnIndexes);
            
            // Display results
            displayResults(metadata, metrics);
            
            // Add interactivity
            addResultInteractivity(metrics.missingIds, metadata.campaignName);
            
        } catch (error) {
            showError(`Failed to analyze the data: ${error.message}`);
            console.error('Data processing error:', error);
        }
    }
    
    /**
     * Find column indexes for required data
     */
    function findColumnIndexes(headers) {
        const uniqueIdIndex = headers.findIndex(h => h.toLowerCase() === 'uniqueid' || h.toLowerCase() === 'id');
        const impressionCountIndex = headers.findIndex(h => h.toLowerCase() === 'impression_count');
        const eventCountFinishedIndex = headers.findIndex(h => h.toLowerCase() === 'event_count_finished');
        
        if (uniqueIdIndex === -1) {
            return { valid: false, error: 'Required column "uniqueid" or "id" not found' };
        }
        
        if (impressionCountIndex === -1) {
            return { valid: false, error: 'Required column "impression_count" not found' };
        }
        
        if (eventCountFinishedIndex === -1) {
            return { valid: false, error: 'Required column "event_count_finished" not found' };
        }
        
        // Find event columns (ones that start with "event_" but not event_count_finished)
        const eventColumnIndexes = headers
            .map((header, index) => ({ header, index }))
            .filter(item => item.header.toLowerCase().startsWith('event_') && 
                   item.header.toLowerCase() !== 'event_count_finished');
        
        return {
            valid: true,
            uniqueIdIndex,
            impressionCountIndex,
            eventCountFinishedIndex,
            eventColumnIndexes
        };
    }
    
    /**
     * Extract campaign name and date from filename
     */
    function extractMetadataFromFilename(fileName) {
        let campaignName = "Unknown Campaign";
        let dateStr = '';
        let displayDate = '';
        
        if (fileName) {
            // Remove file extension for processing
            const nameWithoutExt = fileName.replace(/\.csv$/i, '');
            
            // Pattern matching for different filename formats
            if (nameWithoutExt.includes(' - ')) {
                // Check for date range pattern with underscores: DD_MM_YYYY - DD_MM_YYYY
                const dateRangeMatch = nameWithoutExt.match(/(\d{2}_\d{2}_\d{4})\s*-\s*(\d{2}_\d{2}_\d{4})/);
                
                if (dateRangeMatch) {
                    // Extract dates from pattern: Campaign DD_MM_YYYY - DD_MM_YYYY
                    const startDate = dateRangeMatch[1].replace(/_/g, '-');
                    const endDate = dateRangeMatch[2].replace(/_/g, '-');
                    
                    // Format dates in display format
                    const [startDay, startMonth, startYear] = startDate.split('-');
                    const [endDay, endMonth, endYear] = endDate.split('-');
                    
                    displayDate = `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`;
                    dateStr = `${startYear}-${startMonth}-${startDay}`;
                    
                    // Extract campaign name (text before the date range)
                    const campaignPart = nameWithoutExt.split(dateRangeMatch[0])[0].trim();
                    campaignName = campaignPart.replace(/\s*-\s*$/, '').trim(); // Remove trailing dash if present
                } else {
                    // Check for ISO date pattern: YYYY-MM-DD
                    const isoDateMatch = nameWithoutExt.match(/(\d{4}-\d{2}-\d{2})/);
                    
                    if (isoDateMatch) {
                        dateStr = isoDateMatch[1];
                        displayDate = dateStr;
                        
                        // Extract campaign name (text before the ISO date)
                        const campaignPart = nameWithoutExt.split(isoDateMatch[0])[0].trim();
                        campaignName = campaignPart.replace(/\s*-\s*$/, '').trim(); // Remove trailing dash if present
                    } else {
                        // If no date pattern was found but there's a hyphen, use text before hyphen as campaign
                        const parts = nameWithoutExt.split(' - ');
                        campaignName = parts[0].trim();
                        
                        // Try to find a quarter indicator (e.g., Q1, Q2)
                        const quarterMatch = nameWithoutExt.match(/(\d{4})\s*Q(\d)/i);
                        if (quarterMatch) {
                            const year = quarterMatch[1];
                            const quarter = quarterMatch[2];
                            displayDate = `${year} Q${quarter}`;
                        }
                    }
                }
            } else {
                // If there's no clear divider, use the whole filename as campaign name
                campaignName = nameWithoutExt.trim();
            }
        }
        
        // If we couldn't extract a date, use "Unknown Date"
        if (!displayDate) {
            displayDate = "Unknown Date";
        }
        
        return {
            campaignName,
            dateStr,
            displayDate
        };
    }
    
    /**
     * Calculate metrics from the CSV data
     */
    function calculateMetrics(lines, columnIndexes) {
        const { uniqueIdIndex, impressionCountIndex, eventCountFinishedIndex, eventColumnIndexes } = columnIndexes;
        
        let totalUsers = 0;
        let totalImpressions = 0;
        let uniqueImpressions = 0;
        let totalCompleted = 0;
        
        // Initialize event sums
        let eventSums = {};
        eventColumnIndexes.forEach(item => {
            eventSums[item.header] = 0;
        });
        
        // Count unique users (excluding test users)
        const uniqueUsers = new Set();
        
        // Track MissingIDs
        const missingIds = [];
        let missingIdCount = 0;
        
        // Track which test users are actually found in the data
        const foundTestUsers = new Set();
        
        // Process data rows
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            const columns = parseCSVLine(lines[i]);
            if (columns.length <= 1) continue; // Skip invalid lines
            
            const uniqueId = columns[uniqueIdIndex]?.replace(/"/g, '').trim() || '';
            if (!uniqueId) continue; // Skip rows without an ID
            
            const isTestUser = TEST_USER_IDS.includes(uniqueId);
            
            // Track found test users
            if (isTestUser) {
                foundTestUsers.add(uniqueId);
            }
            
            // Check for MissingID pattern
            if (uniqueId.startsWith('MissingID-')) {
                missingIdCount++;
                // Extract the hash part (without the MissingID- prefix)
                const idHash = uniqueId.replace('MissingID-', '');
                missingIds.push(idHash);
            }
            
            // Add to unique users only if not a test user
            if (!isTestUser) {
                uniqueUsers.add(uniqueId);
            }
            
            // Count impressions (exclude test users)
            const impressionCount = parseInt(columns[impressionCountIndex]?.replace(/"/g, '')) || 0;
            if (impressionCount > 0) {
                if (!isTestUser) {
                    totalImpressions += impressionCount;
                    uniqueImpressions++;
                }
            }
            
            // Count completed views (exclude test users)
            const finishedCount = parseInt(columns[eventCountFinishedIndex]?.replace(/"/g, '')) || 0;
            if (finishedCount > 0 && !isTestUser) {
                totalCompleted++;
            }
            
            // Sum other event columns (include ALL users, even test users)
            eventColumnIndexes.forEach(item => {
                const value = parseInt(columns[item.index]?.replace(/"/g, '')) || 0;
                eventSums[item.header] += value;
            });
        }
        
        totalUsers = uniqueUsers.size;
        
        return {
            totalUsers,
            totalImpressions,
            uniqueImpressions,
            totalCompleted,
            eventSums,
            missingIds,
            missingIdCount,
            foundTestUsers: Array.from(foundTestUsers)
        };
    }
    
    /**
     * Display calculated results in the UI
     */
    function displayResults(metadata, metrics) {
        const { campaignName, displayDate } = metadata;
        const { totalUsers, totalImpressions, uniqueImpressions, totalCompleted, eventSums, missingIdCount, foundTestUsers } = metrics;
        
        // Create the test user exclusion message
        const testUserMessage = foundTestUsers.length > 0 
            ? `Excluding test users: ${foundTestUsers.join(', ')}`
            : 'There are no test users';
        
        // Create HTML for main metrics
        let resultsHTML = `
            <div class="file-info">
                <strong>Campaign:</strong> ${campaignName}
                ${displayDate ? `<br><strong>Date:</strong> ${displayDate}` : ''}
            </div>
            <div class="result-card" data-raw-value="${totalUsers}">
                <h3>Total Users</h3>
                <p>${totalUsers.toLocaleString()}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${totalImpressions}">
                <h3>Total Impressions</h3>
                <p>${totalImpressions}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${uniqueImpressions}">
                <h3>Unique Impressions</h3>
                <p>${uniqueImpressions}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${totalCompleted}">
                <h3>Completions</h3>
                <p>${totalCompleted}</p>
                <small>${testUserMessage}</small>
            </div>
        `;
        
        // Add missing ID card if any found
        if (missingIdCount > 0) {
            resultsHTML += `
                <div class="result-card missing-id-card" data-raw-value="${missingIdCount}">
                    <h3>Missing IDs</h3>
                    <p>${missingIdCount}</p>
                    <button id="downloadMissingIds" class="download-btn">Download List</button>
                </div>
            `;
        }
        
        // Add other event counts
        for (const [header, sum] of Object.entries(eventSums)) {
            // Format the display name: remove event_count_ prefix and capitalize first letter
            const displayName = header.replace(/^event_count_/, '');
            const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            
            resultsHTML += `
                <div class="result-card" data-raw-value="${sum}">
                    <h3>${formattedName}</h3>
                    <small>(${header})</small>
                    <p>${sum}</p>
                    <small>Including ALL users</small>
                </div>
            `;
        }
        
        resultsContainer.innerHTML = resultsHTML;
    }
    
    /**
     * Add interactivity to the result cards
     */
    function addResultInteractivity(missingIds, campaignName) {
        // Add click-to-copy functionality to all result cards
        document.querySelectorAll('.result-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.title = "Click to copy value";
            
            card.addEventListener('click', function(e) {
                // Don't trigger for button clicks
                if (e.target.tagName === 'BUTTON') return;
                
                const rawValue = this.dataset.rawValue;
                navigator.clipboard.writeText(rawValue)
                    .then(() => {
                        // Visual feedback - use yellow tone
                        const originalBackground = this.style.backgroundColor;
                        this.style.backgroundColor = '#fff9c4'; // Light yellow tone
                        
                        // Restore background after 1.5 seconds
                        setTimeout(() => {
                            this.style.backgroundColor = originalBackground;
                        }, 1500);
                    })
                    .catch(err => {
                        console.error('Could not copy text: ', err);
                        showError('Failed to copy to clipboard');
                    });
            });
        });
        
        // Add download functionality for missing IDs if any found
        if (missingIds && missingIds.length > 0) {
            const downloadBtn = document.getElementById('downloadMissingIds');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent triggering the copy functionality
                    
                    try {
                        // Create CSV content
                        const csvContent = 'MissingID\n' + missingIds.join('\n');
                        
                        // Create download link
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', `missing_ids_${campaignName.replace(/\s+/g, '_')}.csv`);
                        link.style.visibility = 'hidden';
                        
                        // Add to document, click and remove
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Release the blob URL
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                        }, 100);
                    } catch (error) {
                        console.error('Failed to download missing IDs:', error);
                        showError('Failed to download missing IDs');
                    }
                });
            }
        }
    }

    /**
     * Helper function to properly parse CSV lines with quoted fields
     */
    function parseCSVLine(line) {
        const result = [];
        let start = 0;
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                result.push(line.substring(start, i));
                start = i + 1;
            }
        }
        
        // Add the last field
        result.push(line.substring(start));
        
        return result.map(field => field.trim());
    }
}); 