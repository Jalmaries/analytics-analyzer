document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('resultsContainer');

    // Setup the drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('active');
        }, false);
    });

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

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    function handleFiles(e) {
        const file = e.target.files[0];
        if (file && file.type === 'text/csv') {
            parseCSV(file);
        } else {
            alert('Please upload a valid CSV file');
        }
    }

    function parseCSV(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const contents = e.target.result;
            processData(contents, file.name);
        };
        
        reader.readAsText(file);
    }

    function processData(csvContent, fileName) {
        // Display processing message
        resultsContainer.innerHTML = '<div class="processing">Processing data...</div>';
        resultsSection.style.display = 'block';

        // Parse CSV data
        const lines = csvContent.split(/\r?\n/);
        const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());
        
        // Find column indexes
        const uniqueIdIndex = headers.findIndex(h => h.toLowerCase() === 'uniqueid' || h.toLowerCase() === 'id');
        const impressionCountIndex = headers.findIndex(h => h.toLowerCase() === 'impression_count');
        const eventCountFinishedIndex = headers.findIndex(h => h.toLowerCase() === 'event_count_finished');
        
        // Check if required columns exist
        if (uniqueIdIndex === -1 || impressionCountIndex === -1 || eventCountFinishedIndex === -1) {
            resultsContainer.innerHTML = `
                <div class="error">
                    <p>Error: Required columns not found in CSV.</p>
                    <p>Please ensure your CSV contains: uniqueid/id, impression_count, and event_count_finished columns.</p>
                </div>
            `;
            return;
        }

        // Find event columns (ones that start with "event_" but not event_count_finished)
        const eventColumnIndexes = headers
            .map((header, index) => ({ header, index }))
            .filter(item => item.header.toLowerCase().startsWith('event_') && 
                   item.header.toLowerCase() !== 'event_count_finished');

        // Extract campaign name and date from filename - with robust pattern matching
        let campaignName = "Unknown Campaign";
        let dateStr = '';
        let displayDate = '';
        
        if (fileName) {
            // Remove file extension for processing
            const nameWithoutExt = fileName.replace(/\.csv$/i, '');
            
            // Pattern matching for different filename formats
            if (nameWithoutExt.includes(' - ')) {
                // Format: "Campaign Name DD_MM_YYYY - DD_MM_YYYY"
                // or "Campaign Name YYYY-MM-DD"
                
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

        // Process the data
        let totalUsers = 0;
        let totalImpressions = 0;
        let uniqueImpressions = 0;
        let totalCompleted = 0;
        let eventSums = {};
        
        // Initialize event sums
        eventColumnIndexes.forEach(item => {
            eventSums[item.header] = 0;
        });
        
        // Count unique users (excluding X001)
        const uniqueUsers = new Set();
        
        // Track MissingIDs
        const missingIds = [];
        let missingIdCount = 0;
        
        // Process data rows
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            const columns = parseCSVLine(lines[i]);
            if (columns.length <= 1) continue; // Skip invalid lines
            
            const uniqueId = columns[uniqueIdIndex].replace(/"/g, '').trim();
            const isX001User = uniqueId === 'X001';
            
            // Check for MissingID pattern
            if (uniqueId.startsWith('MissingID-')) {
                missingIdCount++;
                // Extract the hash part (without the MissingID- prefix)
                const idHash = uniqueId.replace('MissingID-', '');
                missingIds.push(idHash);
            }
            
            // Add to unique users only if not X001
            if (!isX001User) {
                uniqueUsers.add(uniqueId);
            }
            
            // Count impressions (exclude X001)
            const impressionCount = parseInt(columns[impressionCountIndex].replace(/"/g, '')) || 0;
            if (impressionCount > 0) {
                if (!isX001User) {
                    totalImpressions += impressionCount;
                    uniqueImpressions++;
                }
            }
            
            // Count completed views (exclude X001)
            const finishedCount = parseInt(columns[eventCountFinishedIndex].replace(/"/g, '')) || 0;
            if (finishedCount > 0 && !isX001User) {
                totalCompleted++;
            }
            
            // Sum other event columns (include ALL users, even X001)
            eventColumnIndexes.forEach(item => {
                const value = parseInt(columns[item.index].replace(/"/g, '')) || 0;
                eventSums[item.header] += value;
            });
        }
        
        totalUsers = uniqueUsers.size;
        
        // Store raw values for copying
        const rawValues = {
            'Total Users': totalUsers,
            'Total Impressions': totalImpressions,
            'Unique Impressions': uniqueImpressions,
            'Completions': totalCompleted,
            'Missing IDs': missingIdCount
        };
        
        // Add event raw values
        for (const [header, sum] of Object.entries(eventSums)) {
            const displayName = header.replace(/^event_count_/, '');
            const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            rawValues[formattedName] = sum;
        }
        
        // Display calculated results
        let resultsHTML = `
            <div class="file-info">
                <strong>Campaign:</strong> ${campaignName}
                ${displayDate ? `<br><strong>Date:</strong> ${displayDate}` : ''}
            </div>
            <div class="result-card" data-raw-value="${totalUsers}">
                <h3>Total Users</h3>
                <p>${totalUsers.toLocaleString()}</p>
                <small>Excluding users with ID X001</small>
            </div>
            <div class="result-card" data-raw-value="${totalImpressions}">
                <h3>Total Impressions</h3>
                <p>${totalImpressions}</p>
                <small>Excluding users with ID X001</small>
            </div>
            <div class="result-card" data-raw-value="${uniqueImpressions}">
                <h3>Unique Impressions</h3>
                <p>${uniqueImpressions}</p>
                <small>Excluding users with ID X001</small>
            </div>
            <div class="result-card" data-raw-value="${totalCompleted}">
                <h3>Completions</h3>
                <p>${totalCompleted}</p>
                <small>Excluding users with ID X001</small>
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
                    });
            });
        });
        
        // Add download functionality for missing IDs if any found
        if (missingIdCount > 0) {
            const downloadBtn = document.getElementById('downloadMissingIds');
            downloadBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering the copy functionality
                
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
            });
        }
    }

    // Helper function to properly parse CSV lines with quoted fields
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
        
        return result;
    }
}); 