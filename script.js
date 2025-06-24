/**
 * Analytics Analyzer
 * 
 * This script processes CSV files containing analytics data,
 * calculates key metrics, and visualizes the results.
 */

// Application Configuration
const CONFIG = {
    // Test user IDs to exclude from main metrics
    TEST_USER_IDS: ['X001', 'PH123', 'OMMATEST'],
    
    // Interaction columns to check for unique interactions
    // If sum of these columns > 0 for a user, count as 1 unique interaction
    INTERACTION_COLUMNS: [
        'event_count_answer_correct', 'event_count_answer_wrong', 'event_count_back_to_home', 
        'event_count_replay', 'event_count_scene2_earning_details', 'event_count_scene2_skip_details', 
        'event_count_scene5_availability', 'event_count_scene5_unique_packcodes', 'event_count_scene5_visibility', 
        'event_count_scene8_home_page', 'event_count_scene8_nps_campaign', 'event_count_scene8_service_catalog_stg', 
        'event_count_scene8_service_chargili'
    ],
    
    // Funnel configuration
    FUNNEL: {
        MIN_ITEMS: 3,
        MAX_ITEMS: 6,
        DEFAULT_ITEMS: 4
    },
    
    // Notification settings
    NOTIFICATION_DURATION: 4000,
    
    // Print settings
    PRINT_TIMEOUT: 1000
};

// Application State
const AppState = {
    currentAnalyticsData: null,
    currentMetadata: null,
    currentMetrics: null,
    cropper: null,
    clientLogoDataUrl: null
};

// Utility Functions
const Utils = {
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
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('resultsContainer');

    // Setup event listeners
    initializeEventListeners();
    initializeReportModal();

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
     * Initialize report modal functionality
     */
    function initializeReportModal() {
        // Get all modal elements
        const createReportBtn = document.getElementById('createReportBtn');
        const reportModal = document.getElementById('reportModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cropModal = document.getElementById('cropModal');
        const closeCropModalBtn = document.getElementById('closeCropModalBtn');
        const previewModal = document.getElementById('previewModal');
        const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');

        // Modal open/close handlers - only add if elements exist
        if (createReportBtn) createReportBtn.addEventListener('click', openReportModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeReportModal);
        if (closeCropModalBtn) closeCropModalBtn.addEventListener('click', closeCropModal);
        if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', closePreviewModal);

        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            if (reportModal && event.target === reportModal) closeReportModal();
            if (cropModal && event.target === cropModal) closeCropModal();
            if (previewModal && event.target === previewModal) closePreviewModal();
        });

        // Client logo upload handling
        const clientLogoUpload = document.getElementById('clientLogoUpload');
        const clientLogoInput = document.getElementById('clientLogoInput');
        
        if (clientLogoUpload && clientLogoInput) {
            clientLogoUpload.addEventListener('click', () => {
                clientLogoInput.click();
            });
            clientLogoInput.addEventListener('change', handleClientLogoUpload);
        }

        // Manual crop functionality removed - using auto-crop instead

        // Report generation buttons
        const previewReportBtn = document.getElementById('previewReportBtn');
        const generateReportBtn = document.getElementById('generateReportBtn');
        
        if (previewReportBtn) previewReportBtn.addEventListener('click', previewReport);
        if (generateReportBtn) generateReportBtn.addEventListener('click', generatePDF);

        // Setup funnel count controls
        setupFunnelCountControls();
    }

    /**
     * Open report creation modal
     */
    function openReportModal() {
        if (!AppState.currentMetrics || !AppState.currentMetadata) {
            showError('No data available for report creation');
            return;
        }

        populateReportData();
        updateFunnelBuilder();
        populateInteractivityData();
        
        // Automatically crop OmmaVQ logo when modal opens
        setTimeout(() => {
            autoCropOmmaLogo();
        }, 100);
        
        const reportModal = document.getElementById('reportModal');
        reportModal.style.display = 'block';
    }

    /**
     * Close report creation modal
     */
    function closeReportModal() {
        const reportModal = document.getElementById('reportModal');
        reportModal.style.display = 'none';
    }

    /**
     * Populate report modal with current data
     */
    function populateReportData() {
        // Content Information
        document.getElementById('contentName').value = AppState.currentMetadata.campaignName || '';
        document.getElementById('reportDate').value = AppState.currentMetadata.displayDate || '';
        
        // Summary data
        document.getElementById('totalImpression').value = AppState.currentMetrics.totalImpressions || 0;
        document.getElementById('uniqueImpressions').value = AppState.currentMetrics.uniqueImpressions || 0;
        
        // Calculate unique completion rate
        const completionRate = AppState.currentMetrics.uniqueImpressions > 0 
            ? ((AppState.currentMetrics.uniqueContentFinishes / AppState.currentMetrics.uniqueImpressions) * 100).toFixed(1)
            : '0';
        document.getElementById('uniqueCompletionRate').value = completionRate + '%';
    }

    /**
     * Update funnel builder based on selected number of items
     */
    function updateFunnelBuilder() {
        const funnelBuilder = document.getElementById('funnelBuilder');
        const funnelCountDisplay = document.getElementById('funnelCountDisplay');
        
        if (!funnelBuilder || !funnelCountDisplay) {
            console.warn('Funnel builder elements not found');
            return;
        }

        if (!AppState.currentMetrics) {
            console.warn('No current metrics available for funnel builder');
            return;
        }

        const numItems = parseInt(funnelCountDisplay.textContent || CONFIG.FUNNEL.DEFAULT_ITEMS);

        // Get available metrics for funnel
        const availableMetrics = getFunnelMetricsOptions();
        
        if (availableMetrics.length === 0) {
            funnelBuilder.innerHTML = '<p>No metrics available for funnel</p>';
            return;
        }
        
        funnelBuilder.innerHTML = '';
        
        for (let i = 0; i < numItems; i++) {
            const funnelItem = createFunnelItem(i, availableMetrics);
            funnelBuilder.appendChild(funnelItem);
        }

        // Setup drag and drop functionality
        setupFunnelDragAndDrop();
        calculateFunnelPercentages();
    }

    /**
     * Setup funnel count controls
     */
    function setupFunnelCountControls() {
        const minusBtn = document.getElementById('funnelMinusBtn');
        const plusBtn = document.getElementById('funnelPlusBtn');
        const countDisplay = document.getElementById('funnelCountDisplay');

        if (!minusBtn || !plusBtn || !countDisplay) {
            console.warn('Funnel count control elements not found');
            return;
        }

        minusBtn.addEventListener('click', () => {
            const current = parseInt(countDisplay.textContent);
            if (current > CONFIG.FUNNEL.MIN_ITEMS) {
                countDisplay.textContent = current - 1;
                updateFunnelBuilder();
                updateButtonStates();
            }
        });

        plusBtn.addEventListener('click', () => {
            const current = parseInt(countDisplay.textContent);
            if (current < CONFIG.FUNNEL.MAX_ITEMS) {
                countDisplay.textContent = current + 1;
                updateFunnelBuilder();
                updateButtonStates();
            }
        });

        // Update button states
        const updateButtonStates = () => {
            const current = parseInt(countDisplay.textContent);
            minusBtn.disabled = current <= CONFIG.FUNNEL.MIN_ITEMS;
            plusBtn.disabled = current >= CONFIG.FUNNEL.MAX_ITEMS;
            
            // Update visual state
            minusBtn.classList.toggle('disabled', current <= CONFIG.FUNNEL.MIN_ITEMS);
            plusBtn.classList.toggle('disabled', current >= CONFIG.FUNNEL.MAX_ITEMS);
        };

        // Initial state
        updateButtonStates();
        
        // Update states when count changes
        const observer = new MutationObserver(updateButtonStates);
        observer.observe(countDisplay, { childList: true, subtree: true });
    }

    /**
     * Create a funnel item element
     */
    function createFunnelItem(index, availableMetrics) {
        const div = document.createElement('div');
        div.className = 'funnel-item';
        div.dataset.index = index;
        div.draggable = true;

        const defaultMetric = availableMetrics[Math.min(index, availableMetrics.length - 1)];

        if (index === 0) {
            // First item gets metric dropdown + optional percentage base dropdown
            div.innerHTML = `
                <div class="funnel-order">${index + 1}</div>
                <select class="funnel-metric" data-index="${index}">
                    ${availableMetrics.map(metric => 
                        `<option value="${metric.value}" ${metric.value === defaultMetric?.value ? 'selected' : ''}>
                            ${metric.label}
                        </option>`
                    ).join('')}
                </select>
                <select class="funnel-percentage-base" data-index="${index}">
                    <option value="">100% (No Base)</option>
                    ${availableMetrics.map(metric => 
                        `<option value="${metric.value}">% of ${metric.label}</option>`
                    ).join('')}
                </select>
                <input type="text" class="funnel-value" value="${defaultMetric?.data || 0}" readonly>
                <input type="text" class="funnel-percentage" value="100%" readonly>
            `;

            // Add change listeners for first item
            const metricSelect = div.querySelector('.funnel-metric');
            const baseSelect = div.querySelector('.funnel-percentage-base');
            
            metricSelect.addEventListener('change', (e) => {
                updateFunnelItemData(index, e.target.value, availableMetrics);
                calculateFunnelPercentages();
            });
            
            baseSelect.addEventListener('change', () => {
                calculateFunnelPercentages();
            });
        } else {
            // Other items get normal metric dropdown
            div.innerHTML = `
                <div class="funnel-order">${index + 1}</div>
                <select class="funnel-metric" data-index="${index}">
                    ${availableMetrics.map(metric => 
                        `<option value="${metric.value}" ${metric.value === defaultMetric?.value ? 'selected' : ''}>
                            ${metric.label}
                        </option>`
                    ).join('')}
                </select>
                <input type="text" class="funnel-value" value="${defaultMetric?.data || 0}" readonly>
                <input type="text" class="funnel-percentage" value="" readonly>
            `;

            // Add change listener to metric selector
            const select = div.querySelector('.funnel-metric');
            select.addEventListener('change', (e) => {
                updateFunnelItemData(index, e.target.value, availableMetrics);
                calculateFunnelPercentages();
            });
        }

        return div;
    }

    /**
     * Setup drag and drop functionality for funnel items
     */
    function setupFunnelDragAndDrop() {
        const funnelItems = document.querySelectorAll('.funnel-item');
        
        funnelItems.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
            item.addEventListener('drop', handleFunnelDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    let draggedElement = null;

    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleFunnelDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (draggedElement !== this) {
            // Get the dragged element's data
            const draggedIndex = parseInt(draggedElement.dataset.index);
            const targetIndex = parseInt(this.dataset.index);
            
            // Swap the elements
            swapFunnelItems(draggedIndex, targetIndex);
        }

        this.classList.remove('drag-over');
        return false;
    }

    function handleDragEnd(e) {
        document.querySelectorAll('.funnel-item').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        draggedElement = null;
    }

    /**
     * Swap two funnel items
     */
    function swapFunnelItems(fromIndex, toIndex) {
        const funnelBuilder = document.getElementById('funnelBuilder');
        const items = Array.from(funnelBuilder.children);
        
        // Get the elements to swap
        const fromElement = items[fromIndex];
        const toElement = items[toIndex];
        
        // Get their data
        const fromMetric = fromElement.querySelector('.funnel-metric').value;
        const toMetric = toElement.querySelector('.funnel-metric').value;
        
        // Swap the metric selections
        fromElement.querySelector('.funnel-metric').value = toMetric;
        toElement.querySelector('.funnel-metric').value = fromMetric;
        
        // Update the values accordingly
        const availableMetrics = getFunnelMetricsOptions();
        updateFunnelItemData(fromIndex, toMetric, availableMetrics);
        updateFunnelItemData(toIndex, fromMetric, availableMetrics);
        
        // Recalculate percentages
        calculateFunnelPercentages();
    }

    /**
     * Calculate and update funnel percentages
     * First item can have custom percentage base, others calculated from first item
     */
    function calculateFunnelPercentages() {
        const funnelItems = document.querySelectorAll('.funnel-item');
        let previousValue = 0;

        funnelItems.forEach((item, index) => {
            const valueEl = item.querySelector('.funnel-value');
            const percentageInput = item.querySelector('.funnel-percentage');
            
            if (!valueEl || !percentageInput) return;
            
            const value = parseInt(valueEl.value) || 0;
            
            if (index === 0) {
                // First item: check if percentage base is selected
                const percentageBaseSelect = item.querySelector('.funnel-percentage-base');
                const percentageBase = percentageBaseSelect?.value;
                
                if (percentageBase) {
                    if (percentageBase === 'total_audience') {
                        // For Total Audience, get the inputted value from the input field
                        const totalAudienceInput = document.getElementById('totalAudience');
                        const totalAudienceValue = totalAudienceInput ? parseInt(totalAudienceInput.value) : null;
                        
                        if (totalAudienceValue && totalAudienceValue > 0) {
                            const percentage = ((value / totalAudienceValue) * 100).toFixed(1);
                            percentageInput.value = percentage + '%';
                        } else {
                            percentageInput.value = '100%';
                        }
                    } else {
                        // Calculate percentage based on selected metric from CSV data
                        const availableMetrics = getFunnelMetricsOptions();
                        const baseMetric = availableMetrics.find(m => m.value === percentageBase);
                        if (baseMetric && baseMetric.data > 0) {
                            const percentage = ((value / baseMetric.data) * 100).toFixed(1);
                            percentageInput.value = percentage + '%';
                        } else {
                            percentageInput.value = '100%';
                        }
                    }
                } else {
                    // No base selected, default to 100%
                    percentageInput.value = '100%';
                }
                
                // Set previous value for next item
                previousValue = value;
            } else {
                // Other items: calculate percentage from previous item (funnel logic)
                const percentage = previousValue > 0 ? ((value / previousValue) * 100).toFixed(1) : '0';
                percentageInput.value = percentage + '%';
                
                // Update previous value for next item
                previousValue = value;
            }
        });
    }

    /**
     * Get available metrics for funnel selection
     */
    function getFunnelMetricsOptions() {
        if (!AppState.currentMetrics) {
            return [];
        }

        const options = [];

        // Add basic user metrics
        if (AppState.currentMetrics.totalUsers > 0) {
            options.push({ value: 'total_audience', label: 'Total Audience', data: AppState.currentMetrics.totalUsers });
        }
        
        // Add impression metrics
        if (AppState.currentMetrics.totalImpressions > 0) {
            options.push({ value: 'total_impressions', label: 'Total Impressions', data: AppState.currentMetrics.totalImpressions });
        }
        if (AppState.currentMetrics.uniqueImpressions > 0) {
            options.push({ value: 'unique_impressions', label: 'Unique Impressions', data: AppState.currentMetrics.uniqueImpressions });
        }
        
        // Add content completion metrics
        if (AppState.currentMetrics.totalContentFinished > 0) {
            options.push({ value: 'total_content_finished', label: 'Total Content Finished', data: AppState.currentMetrics.totalContentFinished });
        }
        if (AppState.currentMetrics.uniqueContentFinishes > 0) {
            options.push({ value: 'unique_completion', label: 'Unique Completion', data: AppState.currentMetrics.uniqueContentFinishes });
        }
        
        // Add interaction metrics
        if (AppState.currentMetrics.uniqueInteractions > 0) {
            options.push({ value: 'unique_interactivity', label: 'Unique Interactivity', data: AppState.currentMetrics.uniqueInteractions });
        }
        
        // Add thumbnail metrics (if available)
        if (AppState.currentMetrics.totalThumbnailCount !== null && AppState.currentMetrics.totalThumbnailCount > 0) {
            options.push({ value: 'total_thumbnail', label: 'Total Thumbnail', data: AppState.currentMetrics.totalThumbnailCount });
        }
        if (AppState.currentMetrics.uniqueThumbnailCount !== null && AppState.currentMetrics.uniqueThumbnailCount > 0) {
            options.push({ value: 'unique_thumbnail', label: 'Unique Thumbnail', data: AppState.currentMetrics.uniqueThumbnailCount });
        }
        
        // Add visit metrics (if available)
        if (AppState.currentMetrics.totalVisitCount !== null && AppState.currentMetrics.totalVisitCount > 0) {
            options.push({ value: 'total_visit', label: 'Total Visit', data: AppState.currentMetrics.totalVisitCount });
        }
        if (AppState.currentMetrics.uniqueVisitCount !== null && AppState.currentMetrics.uniqueVisitCount > 0) {
            options.push({ value: 'unique_visit', label: 'Unique Visit', data: AppState.currentMetrics.uniqueVisitCount });
        }
        
        // Add play metrics (if available)
        if (AppState.currentMetrics.totalPlayCount !== null && AppState.currentMetrics.totalPlayCount > 0) {
            options.push({ value: 'total_play', label: 'Total Play', data: AppState.currentMetrics.totalPlayCount });
        }
        if (AppState.currentMetrics.uniquePlayCount !== null && AppState.currentMetrics.uniquePlayCount > 0) {
            options.push({ value: 'unique_play', label: 'Unique Play', data: AppState.currentMetrics.uniquePlayCount });
        }

        // Add event metrics if they exist
        if (AppState.currentMetrics.eventSums) {
            Object.entries(AppState.currentMetrics.eventSums).forEach(([key, value]) => {
                if (value > 0) {
                    const label = toTitleCase(key.replace(/^event_count_/, ''));
                    // Skip Elevenlabs TTS Synthesis from appearing in funnel options
                    if (!label.toLowerCase().includes('elevenlabs') && !label.toLowerCase().includes('tts synthesis')) {
                        options.push({
                            value: key,
                            label: label,
                            data: value
                        });
                    }
                }
            });
        }
        
        // Add unique user counts for events (if available)
        if (AppState.currentMetrics.eventUniqueUserCounts) {
            Object.entries(AppState.currentMetrics.eventUniqueUserCounts).forEach(([key, value]) => {
                if (value > 0) {
                    const label = 'Unique ' + toTitleCase(key.replace(/^event_count_/, ''));
                    // Skip Elevenlabs TTS Synthesis and events that already exist in regular event sums
                    if (!label.toLowerCase().includes('elevenlabs') && !label.toLowerCase().includes('tts synthesis')) {
                        options.push({
                            value: `unique_${key}`,
                            label: label,
                            data: value
                        });
                    }
                }
            });
        }

        // Sort by value descending to put highest metrics first
        return options.sort((a, b) => b.data - a.data);
    }

    /**
     * Update funnel item data when metric selection changes
     */
    function updateFunnelItemData(index, metricValue, availableMetrics) {
        const metric = availableMetrics.find(m => m.value === metricValue);
        const funnelItem = document.querySelector(`[data-index="${index}"]`);
        if (funnelItem && metric) {
            funnelItem.querySelector('.funnel-value').value = metric.data;
            
            // Recalculate percentages after updating the value
            setTimeout(() => {
                calculateFunnelPercentages();
            }, 10);
        }
    }

    /**
     * Populate interactivity data
     */
    function populateInteractivityData() {
        const interactivityGrid = document.getElementById('interactivityGrid');
        
        if (!interactivityGrid) {
            console.warn('Interactivity grid element not found');
            return;
        }

        if (!AppState.currentMetrics || !AppState.currentMetrics.eventSums) {
            interactivityGrid.innerHTML = '<p>No interactivity data available</p>';
            return;
        }

        // Sort events by value (highest to lowest)
        const sortedEvents = Object.entries(AppState.currentMetrics.eventSums)
            .filter(([key, value]) => value > 0)
            .sort(([,a], [,b]) => b - a);

        if (sortedEvents.length === 0) {
            interactivityGrid.innerHTML = '<p>No event data available</p>';
            return;
        }

        interactivityGrid.innerHTML = '';

        sortedEvents.forEach(([eventKey, eventValue]) => {
            const uniqueUsers = AppState.currentMetrics.eventUniqueUserCounts?.[eventKey] || 0;
            const displayName = toTitleCase(eventKey.replace(/^event_count_/, ''));
            
            // Skip Elevenlabs TTS Synthesis from interactivity section
            if (!displayName.toLowerCase().includes('elevenlabs') && !displayName.toLowerCase().includes('tts synthesis')) {
                const div = document.createElement('div');
                div.className = 'interactivity-item';
                div.innerHTML = `
                    <h4>${displayName}</h4>
                    <div class="value">${eventValue.toLocaleString()}</div>
                    <div class="users">${uniqueUsers.toLocaleString()} unique users</div>
                `;
                
                interactivityGrid.appendChild(div);
            }
        });
    }

    /**
     * Handle client logo upload with auto-cropping
     */
    function handleClientLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const clientLogoPreview = document.getElementById('clientLogoPreview');
            const clientLogoUpload = document.getElementById('clientLogoUpload');
            const clientLogoImg = document.getElementById('clientLogoImg');
            
            if (clientLogoImg && clientLogoPreview && clientLogoUpload) {
                // First set the image
                clientLogoImg.src = e.target.result;
                clientLogoPreview.style.display = 'block';
                clientLogoUpload.style.display = 'none';
                
                // Auto-crop the client logo after it loads
                setTimeout(() => {
                    autoCropClientLogo();
                }, 100);
                
                // Add change button for switching logos
                let changeBtn = document.getElementById('changeClientLogoBtn');
                if (!changeBtn) {
                    changeBtn = document.createElement('button');
                    changeBtn.id = 'changeClientLogoBtn';
                    changeBtn.className = 'change-logo-btn';
                    changeBtn.innerHTML = '<i class="mdi mdi-swap-horizontal"></i> Change';
                    changeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Reset the file input and show upload area again
                        document.getElementById('clientLogoInput').value = '';
                        clientLogoPreview.style.display = 'none';
                        clientLogoUpload.style.display = 'block';
                        changeBtn.remove();
                    });
                    clientLogoPreview.appendChild(changeBtn);
                }
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Generic auto-crop function to reduce code duplication
     */
    function autoCropImage(imageElement, onSuccess, onError) {
        if (!imageElement) {
            onError('Image element not found');
            return;
        }

        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create a new image to ensure it's loaded
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                
                // Find the bounding box of non-transparent pixels
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const alpha = data[(y * canvas.width + x) * 4 + 3];
                        if (alpha > 0) { // Non-transparent pixel
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }
                
                // Add some padding
                const padding = 5;
                minX = Math.max(0, minX - padding);
                minY = Math.max(0, minY - padding);
                maxX = Math.min(canvas.width, maxX + padding);
                maxY = Math.min(canvas.height, maxY + padding);
                
                const width = maxX - minX;
                const height = maxY - minY;
                
                if (width > 0 && height > 0) {
                    // Create cropped canvas
                    const croppedCanvas = document.createElement('canvas');
                    const croppedCtx = croppedCanvas.getContext('2d');
                    
                    croppedCanvas.width = width;
                    croppedCanvas.height = height;
                    
                    croppedCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
                    
                    // Return the cropped data URL
                    const croppedDataURL = croppedCanvas.toDataURL('image/png');
                    onSuccess(croppedDataURL);
                } else {
                    onError('Could not detect content bounds for auto-cropping');
                }
            } catch (error) {
                console.error('Auto-crop error:', error);
                onError('Auto-crop failed. The image may be from a different domain.');
            }
        };
        
        img.onerror = function() {
            onError('Failed to load image for auto-cropping');
        };
        
        img.src = imageElement.src;
    }

    /**
     * Auto-crop client logo by removing transparent areas
     */
    function autoCropClientLogo() {
        const clientLogoImg = document.getElementById('clientLogoImg');
        
        autoCropImage(
            clientLogoImg,
            (croppedDataURL) => {
                clientLogoImg.src = croppedDataURL;
                AppState.clientLogoDataUrl = croppedDataURL; // Store for PDF generation
                showNotification('Client logo auto-cropped successfully!', 'success');
            },
            (errorMessage) => {
                showNotification(errorMessage, 'warning');
            }
        );
    }

    /**
     * Auto-crop Omma logo by removing transparent areas
     */
    function autoCropOmmaLogo() {
        const ommaLogo = document.getElementById('ommaLogo');
        
        autoCropImage(
            ommaLogo,
            (croppedDataURL) => {
                ommaLogo.src = croppedDataURL;
                // Store cropped Omma logo for PDF generation
                window.croppedOmmaLogoDataUrl = croppedDataURL;
                showNotification('Omma logo auto-cropped successfully!', 'success');
            },
            (errorMessage) => {
                showError(errorMessage);
            }
        );
    }

    /**
     * Open Omma logo crop modal
     */
    function openOmmaCropModal() {
        const ommaLogo = document.getElementById('ommaLogo');
        const cropModal = document.getElementById('cropModal');
        const cropImage = document.getElementById('cropImage');
        
        if (!ommaLogo || !cropModal || !cropImage) return;

        cropImage.src = ommaLogo.src;
        cropModal.style.display = 'flex';
        
        // Initialize cropper for Omma logo
        setTimeout(() => {
            if (window.cropper) {
                window.cropper.destroy();
            }
            
            window.cropper = new Cropper(cropImage, {
                aspectRatio: 16 / 9, // Adjust aspect ratio as needed
                viewMode: 1,
                autoCropArea: 0.8,
                responsive: true,
                background: false,
                modal: true,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false
            });
            
            // Set flag to know we're cropping Omma logo
            window.croppingOmmaLogo = true;
        }, 100);
    }

    /**
     * Open crop modal
     */
    function openCropModal() {
        const clientLogoImg = document.getElementById('clientLogoImg');
        const cropImage = document.getElementById('cropImage');
        const cropModal = document.getElementById('cropModal');
        
        if (!clientLogoImg.src || clientLogoImg.src === 'data:') {
            showError('No image to crop');
            return;
        }
        
        // Ensure we're cropping client logo, not Omma logo
        window.croppingOmmaLogo = false;
        
        cropImage.src = clientLogoImg.src;
        cropModal.style.display = 'block';
        
        // Initialize cropper
        setTimeout(() => {
            if (AppState.cropper) {
                AppState.cropper.destroy();
            }
            AppState.cropper = new Cropper(cropImage, {
                aspectRatio: 16 / 9,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                responsive: true,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false
            });
        }, 100);
    }

    /**
     * Close crop modal
     */
    function closeCropModal() {
        const cropModal = document.getElementById('cropModal');
        cropModal.style.display = 'none';
        
        if (AppState.cropper) {
            AppState.cropper.destroy();
            AppState.cropper = null;
        }
    }

    /**
     * Apply crop to client logo
     */
    function applyCrop() {
        if (!AppState.cropper) {
            showError('Cropper not initialized');
            return;
        }

        try {
            const canvas = AppState.cropper.getCroppedCanvas({
                width: 300,
                height: 200,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            const croppedDataURL = canvas.toDataURL('image/png');
            
            // Check if we're cropping Omma logo or client logo
            if (window.croppingOmmaLogo) {
                const ommaLogo = document.getElementById('ommaLogo');
                if (ommaLogo) {
                    ommaLogo.src = croppedDataURL;
                }
                window.croppingOmmaLogo = false;
            } else {
                AppState.clientLogoDataUrl = croppedDataURL;
                // Update preview
                const clientLogoImg = document.getElementById('clientLogoImg');
                clientLogoImg.src = croppedDataURL;
            }
            
            closeCropModal();
        } catch (error) {
            showError('Failed to crop image: ' + error.message);
        }
    }

    /**
     * Preview report in modal
     */
    function previewReport() {
        try {
            const reportData = collectReportData();
            if (!reportData) {
                showError('Please fill in required report information');
                return;
            }

            generateReportPreview(reportData);
            
            const previewModal = document.getElementById('previewModal');
            if (previewModal) {
                previewModal.style.display = 'block';
            } else {
                showError('Preview modal not found');
            }
        } catch (error) {
            showError('Failed to generate preview: ' + error.message);
            console.error('Preview error:', error);
        }
    }

    /**
     * Close preview modal
     */
    function closePreviewModal() {
        const previewModal = document.getElementById('previewModal');
        if (previewModal) {
            previewModal.style.display = 'none';
        }
    }

    /**
     * Collect all report data from form
     */
    function collectReportData() {
        try {
            // Get form elements
            const contentNameEl = document.getElementById('contentName');
            const contentIdEl = document.getElementById('contentId');
            const contentTokenEl = document.getElementById('contentToken');
            const contentCreateDateEl = document.getElementById('contentCreateDate');
            const reportDateEl = document.getElementById('reportDate');

            if (!contentNameEl) {
                showError('Content name field not found');
                return null;
            }

            const contentName = contentNameEl.value;
            const contentId = contentIdEl?.value || '';
            const contentToken = contentTokenEl?.value || '';
            const contentCreateDate = contentCreateDateEl?.value || '';
            const reportDate = reportDateEl?.value || '';

            if (!contentName.trim()) {
                showError('Content name is required');
                return null;
            }

            // Collect funnel data
            const funnelItems = [];
            const funnelElements = document.querySelectorAll('.funnel-item');
            
            if (funnelElements.length === 0) {
                console.warn('No funnel items found, creating default funnel items');
                // Create default funnel items if none exist
                const availableMetrics = getFunnelMetricsOptions();
                const defaultCount = Math.min(4, availableMetrics.length);
                
                for (let i = 0; i < defaultCount; i++) {
                    const metric = availableMetrics[i];
                    if (metric) {
                        funnelItems.push({
                            metric: metric.value,
                            metricText: metric.label,
                            value: metric.data
                        });
                    }
                }
            } else {
                funnelElements.forEach((item, index) => {
                    const valueEl = item.querySelector('.funnel-value');
                    const metricEl = item.querySelector('.funnel-metric');
                    
                    if (metricEl && valueEl) {
                        const metric = metricEl.value;
                        const metricText = metricEl.selectedOptions[0]?.text || metric;
                        let value = parseInt(valueEl.value) || 0;
                        
                        // For the first item (index 0), check if there's a percentage base calculation
                        if (index === 0) {
                            const percentageBaseEl = item.querySelector('.funnel-percentage-base');
                            const percentageEl = item.querySelector('.funnel-percentage');
                            
                            if (percentageBaseEl && percentageBaseEl.value && percentageEl) {
                                const percentageBase = percentageBaseEl.value;
                                const percentageText = percentageEl.value;
                                
                                // If a percentage base is selected, calculate the actual value
                                if (percentageBase === 'total_audience') {
                                    // Check if user has manually entered a total audience value
                                    const totalAudienceInput = document.getElementById('totalAudience');
                                    const totalAudienceValue = totalAudienceInput ? parseInt(totalAudienceInput.value) : null;
                                    
                                    if (totalAudienceValue && totalAudienceValue > 0 && percentageText) {
                                        // Extract percentage number from text like "85.5%"
                                        const percentageNum = parseFloat(percentageText.replace('%', ''));
                                        if (!isNaN(percentageNum)) {
                                            value = Math.round((percentageNum / 100) * totalAudienceValue);
                                        }
                                    }
                                } else {
                                    // Calculate based on selected metric from CSV data
                                    const availableMetrics = getFunnelMetricsOptions();
                                    const baseMetric = availableMetrics.find(m => m.value === percentageBase);
                                    
                                    if (baseMetric && baseMetric.data > 0 && percentageText) {
                                        // Extract percentage number from text like "85.5%"
                                        const percentageNum = parseFloat(percentageText.replace('%', ''));
                                        if (!isNaN(percentageNum)) {
                                            value = Math.round((percentageNum / 100) * baseMetric.data);
                                        }
                                    }
                                }
                            }
                        }
                        
                        funnelItems.push({
                            metric,
                            metricText,
                            value: value
                        });
                        
                        // Debug logging for first item
                        if (index === 0) {
                            console.log(`First funnel item collected:`, {
                                metric,
                                metricText,
                                originalValue: parseInt(valueEl.value) || 0,
                                calculatedValue: value,
                                hasPercentageBase: !!item.querySelector('.funnel-percentage-base')?.value
                            });
                        }
                    }
                });
            }

            const reportData = {
                contentName,
                contentId,
                contentToken,
                createDate: contentCreateDate,
                reportDate,
                funnelItems
            };

            console.log('Collected report data:', reportData);
            return reportData;

        } catch (error) {
            showError('Failed to collect report data: ' + error.message);
            console.error('Error collecting report data:', error);
            return null;
        }
    }

    /**
     * Generate report preview HTML
     */
    function generateReportPreview(reportData) {
        try {
            if (!reportData) {
                showError('No report data provided');
                return;
            }

            if (!reportData.funnelItems || reportData.funnelItems.length === 0) {
                showError('No funnel data available. Please ensure CSV data is loaded and funnel is configured.');
                return;
            }

            // Use cropped logos if available, otherwise use originals
            const ommaLogoSrc = window.croppedOmmaLogoDataUrl || 'img/OmmaVQ Black.png';
            const clientLogoPreviewEl = document.getElementById('clientLogoPreview');
            const clientLogoSrc = AppState.clientLogoDataUrl || clientLogoPreviewEl?.querySelector('img')?.src || 'data:';

            // Get current analytics data for summary
            const currentData = getCurrentAnalyticsData();

            // Generate summary cards
            let summaryCardsHTML = '';
            if (currentData.summary) {
                Object.entries(currentData.summary).forEach(([key, value]) => {
                    let icon = 'mdi:chart-line';
                    if (key.toLowerCase().includes('audience')) icon = 'mdi:account-group';
                    else if (key.toLowerCase().includes('total impression')) icon = 'mdi:eye';
                    else if (key.toLowerCase().includes('unique impression')) icon = 'mdi:account-eye';
                    else if (key.toLowerCase().includes('completion') || key.toLowerCase().includes('rate')) icon = 'mdi:check-decagram';

                    summaryCardsHTML += `
                        <div class="summary-card">
                            <i class="mdi ${icon.replace('mdi:', 'mdi-')}"></i>
                            <div class="value">${value}</div>
                            <div class="label">${key}</div>
                        </div>
                    `;
                });
            }

            // Generate funnel stats
            let funnelStatsHTML = '';
            reportData.funnelItems.forEach((item, index) => {
                let percentage, calculation;
                if (index === 0) {
                    // For the first item, read the actual calculated percentage from the form
                    const firstFunnelItem = document.querySelector('[data-index="0"]');
                    const percentageInput = firstFunnelItem?.querySelector('.funnel-percentage');
                    
                    if (percentageInput && percentageInput.value) {
                        // Extract percentage number from text like "1836.6%"
                        const percentageText = percentageInput.value;
                        const percentageNum = parseFloat(percentageText.replace('%', ''));
                        percentage = !isNaN(percentageNum) ? Math.round(percentageNum * 10) / 10 : 100; // Round to 1 decimal
                        
                        // Get the percentage base for calculation display
                        const percentageBaseSelect = firstFunnelItem?.querySelector('.funnel-percentage-base');
                        const percentageBase = percentageBaseSelect?.value;
                        
                        if (percentageBase) {
                            if (percentageBase === 'total_audience') {
                                const totalAudienceInput = document.getElementById('totalAudience');
                                const totalAudienceValue = totalAudienceInput ? parseInt(totalAudienceInput.value) : null;
                                calculation = totalAudienceValue ? `${item.value.toLocaleString()}/${totalAudienceValue.toLocaleString()}` : `${item.value.toLocaleString()}/${item.value.toLocaleString()}`;
                            } else {
                                // Find the base metric value
                                const availableMetrics = getFunnelMetricsOptions();
                                const baseMetric = availableMetrics.find(m => m.value === percentageBase);
                                calculation = baseMetric ? `${item.value.toLocaleString()}/${baseMetric.data.toLocaleString()}` : `${item.value.toLocaleString()}/${item.value.toLocaleString()}`;
                            }
                        } else {
                            calculation = `${item.value.toLocaleString()}/${item.value.toLocaleString()}`;
                        }
                    } else {
                        percentage = 100;
                        calculation = `${item.value.toLocaleString()}/${item.value.toLocaleString()}`;
                    }
                } else {
                    // Calculate percentage relative to previous item (funnel logic)
                    const previousValue = reportData.funnelItems[index - 1].value;
                    percentage = previousValue > 0 ? Math.round((item.value / previousValue) * 100) : 0;
                    calculation = `${item.value.toLocaleString()}/${previousValue.toLocaleString()}`;
                }
                
                // Choose icon based on exact metric name
                let icon = 'mdi:gesture-tap'; // Default for custom values
                
                if (item.metricText) {
                    const metricName = item.metricText.toLowerCase();
                    if (metricName.includes('total audience')) {
                        icon = 'mdi:account-group';
                    } else if (metricName.includes('impression') && !metricName.includes('unique')) {
                        icon = 'mdi:eye';
                    } else if (metricName.includes('unique impression')) {
                        icon = 'mdi:account-eye';
                    } else if (metricName.includes('unique completion') || metricName.includes('completion')) {
                        icon = 'mdi:check-decagram';
                    } else if (metricName.includes('unique interactivity') || metricName.includes('unique interaction')) {
                        icon = 'mdi:gesture-double-tap';
                    }
                    // Any other custom value uses gesture-tap (default)
                }
                
                funnelStatsHTML += `
                    <div class="funnel-stat">
                        <i class="mdi ${icon.replace('mdi:', 'mdi-')}"></i>
                        <div class="funnel-stat-content">
                            <div class="funnel-stat-left">
                                <div class="stat-name">${item.metricText}</div>
                                <div class="stat-label">Campaign Metric</div>
                            </div>
                            <div class="funnel-stat-right">
                                <div class="stat-value">%${percentage}</div>
                                <div class="stat-label">${calculation}</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            // Generate interactivity stats
            let interactivityHTML = '';
            if (currentData.events && Object.keys(currentData.events).length > 0) {
                const sortedEvents = Object.entries(currentData.events)
                    .sort(([,a], [,b]) => b - a)
                    .filter(([event, value]) => {
                        // Filter out Elevenlabs TTS Synthesis before slicing
                        return !event.toLowerCase().includes('elevenlabs') && !event.toLowerCase().includes('tts synthesis');
                    })
                    .slice(0, 12); // Now take 12 elements after filtering
                
                // Get total impressions for percentage calculation
                const totalImpressions = AppState.currentMetrics.totalImpressions || 1;
                
                sortedEvents.forEach(([event, value]) => {
                    const percentage = Math.round((value / totalImpressions) * 100);
                    interactivityHTML += `
                        <div class="interactivity-stat">
                            <div class="interactivity-stat-header">
                                <h4>${event}</h4>
                                <div class="interactivity-stat-right">
                                    <div class="value">${value.toLocaleString()}</div>
                                    <div class="viewer-text">${percentage}% of viewers</div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            const reportHTML = `
                <div class="report-preview">
                    <div class="report-header">
                        <div class="report-header-content">
                            <div class="report-content-info">
                                <div class="content-details">
                                    <div><i class="mdi mdi-play-box-multiple"></i><strong>Content Name:</strong> ${reportData.contentName}</div>
                                    <div><i class="mdi mdi-folder-alert-outline"></i><strong>ID:</strong> ${reportData.contentId} <strong>Token:</strong> ${reportData.contentToken}</div>
                                    <div><i class="mdi mdi-calendar-check-outline"></i><strong>Content Create Date:</strong> ${reportData.createDate}</div>
                                    <div><i class="mdi mdi-calendar"></i><strong>Report Date:</strong> ${reportData.reportDate}</div>
                                </div>
                            </div>
                            <div class="report-logos">
                                <img src="${ommaLogoSrc}" alt="OmmaVQ Logo" class="omma-logo-preview">
                                ${clientLogoSrc !== 'data:' ? `<img src="${clientLogoSrc}" alt="Client Logo" class="client-logo-preview">` : ''}
                            </div>
                        </div>
                        <div class="report-title">
                            <h1>VQ CONTENT ANALYTICS</h1>
                        </div>
                    </div>

                    <div class="report-summary">
                        <h2>Summary</h2>
                        <div class="summary-cards">
                            ${summaryCardsHTML}
                        </div>
                    </div>

                    <div class="report-funnel">
                        <h2>Funnel</h2>
                        <div class="funnel-container">
                            <div class="funnel-visualization-d3" id="funnelChart"></div>
                            <div class="funnel-stats">
                                ${funnelStatsHTML}
                            </div>
                        </div>
                    </div>

                    ${interactivityHTML ? `
                    <div class="report-interactivity">
                        <h2>Interactivity</h2>
                        <div class="interactivity-stats">
                            ${interactivityHTML}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;

            const reportPreviewEl = document.getElementById('reportPreview');
            if (!reportPreviewEl) {
                showError('Report preview container not found');
                return;
            }

            reportPreviewEl.innerHTML = reportHTML;
            
            // Generate D3 funnel chart
            setTimeout(() => {
                generateD3Funnel(reportData.funnelItems);
            }, 100);

        } catch (error) {
            showError('Failed to generate report preview: ' + error.message);
            console.error('Report preview error:', error);
        }
    }

    /**
     * Generate D3 Funnel Chart
     */
    function generateD3Funnel(funnelData) {
        const funnelContainer = document.getElementById('funnelChart');
        if (!funnelContainer || !window.D3Funnel) return;

        // Clear previous funnel
        funnelContainer.innerHTML = '';

        // Calculate dimensions to exactly match the stats rows height
        // Each funnel-stat has height: 50px, so total height should be exactly that
        const statsListHeight = funnelData.length * 50; // Exact match with stats rows
        const funnelWidth = 250; // Match reference funnel width

        // Prepare data for D3 Funnel
        const data = funnelData.map(item => ({
            label: item.value.toLocaleString(), // Show value instead of metric name
            value: item.value,
            formattedValue: item.value.toLocaleString()
        }));
        
        // Add invisible element at the end with extremely small value to create pointed tip
        data.push({
            label: '',
            value: 0.00001, // Smallest possible value to minimize the tip section
            formattedValue: ''
        });

        // Define color scale array including transparent white for the last item
        const colorScale = ['#667eea', '#5a67d8', '#4c51bf', '#553c9a', '#44337a', '#322659', 'rgba(255,255,255,0)'];

        // Create funnel options to match reference exactly with pointed triangle
        const options = {
            chart: {
                width: funnelWidth,
                height: statsListHeight,
                bottomWidth: 0, // Creates a perfect triangle point at the end
                bottomPinch: 1, // This creates the pointed triangle at the end
                inverted: false,
                animate: 0 // Disable animation for PDF compatibility
            },
            block: {
                dynamicHeight: true, // Enable proportional heights
                dynamicSlope: true,
                fill: {
                    scale: colorScale, // Simple array of colors
                    type: 'solid'
                },
                minHeight: 50, // Exact match with funnel-stat row height (50px)
                highlight: false,
                border: {
                    enabled: false // Disable borders to prevent black lines
                }
            },
            label: {
                enabled: true,
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                fontSize: '14px',
                fill: '#fff',
                fontWeight: 'bold',
                format: (label, value, fValue, index) => {
                    // Don't show label for the transparent element (last item)
                    if (index === data.length - 1) {
                        return '';
                    }
                    return label;
                }
            },
            tooltip: {
                enabled: false
            }
        };

        // Create the funnel
        const chart = new D3Funnel(funnelContainer);
        chart.draw(data, options);
        
        // Store chart reference for PDF generation
        window.currentFunnelChart = chart;
    }

    /**
     * Generate PDF with proper funnel rendering
     */
    function generatePDF() {
        try {
            // First collect the report data
            const reportData = collectReportData();
            if (!reportData) {
                showError('Please fill in the required report information first.');
                return;
            }

            // Generate the report preview first to ensure all data is ready
            generateReportPreview(reportData);
            
            // Wait for the report to be fully rendered
            setTimeout(() => {
                try {
                    // Get the report HTML
                    const reportElement = document.getElementById('reportPreview');
                    if (!reportElement) {
                        showError('Report preview not found. Please try generating a preview first.');
                        return;
                    }

                    const reportHTML = reportElement.innerHTML;
                    
                    if (!reportHTML || reportHTML.trim() === '') {
                        showError('Report content is empty. Please try again.');
                        return;
                    }
                    
                    // Create a new window for printing
                    const printWindow = window.open('', '_blank');
                    
                    if (!printWindow) {
                        showError('Could not open print window. Please check your popup blocker settings.');
                        return;
                    }
                    
                    // Write the complete HTML document
                    printWindow.document.write(createPrintHTML(reportData, reportHTML));
                    printWindow.document.close();
                } catch (error) {
                    showError('Failed to generate PDF: ' + error.message);
                    console.error('PDF generation error:', error);
                }
            }, CONFIG.PRINT_TIMEOUT);
        } catch (error) {
            showError('Failed to initialize PDF generation: ' + error.message);
            console.error('PDF initialization error:', error);
        }
    }

    /**
     * Create the HTML content for printing
     */
    function createPrintHTML(reportData, reportHTML) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${reportData.contentName} - Analytics Report</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css">
                <script src="https://d3js.org/d3.v7.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/d3-funnel@2.0.0/dist/d3-funnel.min.js"></script>
                <style>
                    ${getPrintStyles()}
                </style>
            </head>
            <body>
                <div style="width: 210mm; margin: 0 auto; background: white;">
                    ${reportHTML}
                </div>
                <script>
                    ${getPrintScript(reportData)}
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Get print-specific styles
     */
    function getPrintStyles() {
        return `
            /* A4 Page Setup - Remove browser headers and footers */
            @page {
                margin: 0;
                size: A4 portrait;
                padding: 0;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            html, body {
                width: 210mm;
                height: 297mm;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: white;
                color: #333;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                overflow-x: hidden;
            }
            
            .report-preview {
                background: white;
                padding: 30px;
                margin: 0 auto;
                width: 210mm;
                min-height: 297mm;
                max-width: none;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                page-break-inside: avoid;
                text-align: center;
            }
            
            .report-title {
                width: 100%;
                text-align: center;
                margin-bottom: 15px;
            }
            
            .report-title h1 {
                color: #2c3e50;
                font-size: 24px;
                margin: 0;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            
            .report-header {
                margin-bottom: 15px;
            }
            
            .report-header-content {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                width: 100%;
                margin-bottom: 10px;
            }
            
            .report-content-info {
                flex: 1;
                text-align: left;
            }
            
            .report-content-info .content-details {
                font-size: 12px;
                color: #666;
                line-height: 1.4;
            }
            
            .report-content-info .content-details div {
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 2px 0;
            }
            
            .report-content-info .content-details i {
                font-size: 10px;
                color: #666;
            }
            
            .report-logos {
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: center;
                justify-content: flex-start;
            }
            
            .report-logos .omma-logo-preview,
            .report-logos .client-logo-preview {
                max-height: 60px;
                max-width: 120px;
                object-fit: contain;
            }
            
            /* Section Headers */
            h2 {
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 15px;
                text-align: left;
                font-weight: 600;
            }
            
            .report-summary {
                margin-bottom: 20px;
            }
            
            .report-summary h2 {
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 15px;
                text-align: left;
                font-weight: 600;
            }
            
            .report-funnel {
                margin-bottom: 20px;
            }
            
            .report-funnel h2 {
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 15px;
                text-align: left;
                font-weight: 600;
            }
            
            .report-interactivity {
                margin-bottom: 20px;
            }
            
            .report-interactivity h2 {
                color: #2c3e50;
                font-size: 18px;
                margin-bottom: 15px;
                text-align: left;
                font-weight: 600;
            }
            
            /* Summary Cards */
            .summary-cards {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                flex-wrap: wrap;
                margin: 0 auto;
                width: 100%;
                max-width: none;
            }
            
            .summary-card {
                background: white;
                border-radius: 8px;
                padding: 10px 20px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
                flex: 1;
                min-width: 0;
                max-width: none;
            }
            
            .summary-card i {
                font-size: 24px;
                color: #667eea;
                margin-bottom: 8px;
                display: block;
            }
            
            .summary-card .value {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 4px;
            }
            
            .summary-card .label {
                font-size: 12px;
                color: #666;
                font-weight: 500;
            }
            
            /* Funnel Section */
            .funnel-container {
                display: flex;
                gap: 20px;
                align-items: stretch;
                justify-content: space-between;
                width: 100%;
                margin: 0 auto;
            }
            
            .funnel-visualization-d3 {
                flex: 1;
                width: 50%;
                min-height: 250px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .funnel-stats {
                flex: 1;
                width: 50%;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .funnel-stat {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 8px 12px;
                text-align: left;
                height: 50px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .funnel-stat i {
                font-size: 16px;
                color: #667eea;
                flex-shrink: 0;
            }
            
            .funnel-stat-content {
                flex: 1;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .funnel-stat-left {
                display: flex;
                flex-direction: column;
            }
            
            .funnel-stat-right {
                text-align: right;
            }
            
            .funnel-stat .stat-name {
                font-size: 12px;
                color: #2c3e50;
                font-weight: 600;
                margin-bottom: 2px;
                line-height: 1.1;
            }
            
            .funnel-stat .stat-value {
                font-size: 14px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 2px;
                line-height: 1;
            }
            
            .funnel-stat .stat-label {
                font-size: 8px;
                color: #666;
                line-height: 1.1;
            }
            
            /* Interactivity Section */
            .interactivity-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                justify-content: center;
            }
            
            .interactivity-stat {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 12px;
                display: flex;
                flex-direction: column;
            }
            
            .interactivity-stat-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                width: 100%;
            }
            
            .interactivity-stat h4 {
                color: #2c3e50;
                font-size: 11px;
                margin: 0;
                font-weight: 600;
                flex: 1;
                text-align: left;
            }
            
            .interactivity-stat-right {
                text-align: right;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            
            .interactivity-stat .value {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
                margin: 0 0 2px 0;
            }
            
            .interactivity-stat .viewer-text {
                font-size: 12px;
                color: #888;
                line-height: 1.2;
                margin: 0;
            }
            
            /* SVG and D3 Funnel specific styles */
            .funnel-visualization-d3 svg {
                max-width: 100%;
                height: auto;
            }
            
            /* Print specific adjustments */
            @media print {
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                .report-preview {
                    box-shadow: none !important;
                    margin: 0 !important;
                    padding: 20px !important;
                }
            }
        `;
    }

    /**
     * Get print-specific JavaScript
     */
    function getPrintScript(reportData) {
        return `
            window.addEventListener('load', function() {
                setTimeout(() => {
                    try {
                        const funnelData = ${JSON.stringify(reportData.funnelItems)};
                        const funnelContainer = document.getElementById('funnelChart');
                        
                        if (funnelContainer && window.D3Funnel && funnelData.length > 0) {
                            generatePrintFunnel(funnelData, funnelContainer);
                        }
                        
                        setTimeout(() => {
                            window.print();
                        }, 1000);
                    } catch (error) {
                        console.error('Error rendering funnel in print window:', error);
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    }
                }, 500);
            });
            
            function generatePrintFunnel(funnelData, funnelContainer) {
                if (!funnelContainer || !window.D3Funnel) return;

                // Clear previous funnel
                funnelContainer.innerHTML = '';

                // Calculate dimensions to be proportional to data values
                const statsListHeight = Math.max(funnelData.length * 50, 250); // Ensure minimum height
                const funnelWidth = 250; // Match reference funnel width

                // Prepare data for D3 Funnel
                const data = funnelData.map(item => ({
                    label: item.value.toLocaleString(), // Show value instead of metric name
                    value: item.value,
                    formattedValue: item.value.toLocaleString()
                }));
                
                // Add invisible element at the end with extremely small value to create pointed tip
                data.push({
                    label: '',
                    value: 0.00001, // Smallest possible value to minimize the tip section
                    formattedValue: ''
                });

                // Define color scale array including transparent white for the last item
                const colorScale = ['#667eea', '#5a67d8', '#4c51bf', '#553c9a', '#44337a', '#322659', 'rgba(255,255,255,0)'];

                // Create funnel options to match reference exactly with pointed triangle
                const options = {
                    chart: {
                        width: funnelWidth,
                        height: statsListHeight,
                        bottomWidth: 0, // Creates a perfect triangle point at the end
                        bottomPinch: 1, // This creates the pointed triangle at the end
                        inverted: false,
                        animate: 0 // Disable animation for PDF compatibility
                    },
                    block: {
                        dynamicHeight: true, // Enable proportional heights
                        dynamicSlope: true,
                        fill: {
                            scale: colorScale, // Simple array of colors
                            type: 'solid'
                        },
                        minHeight: Math.max(40, Math.floor(statsListHeight / funnelData.length)), // Proportional minimum height
                        highlight: false,
                        border: {
                            enabled: false // Disable borders to prevent black lines
                        }
                    },
                    label: {
                        enabled: true,
                        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                        fontSize: '14px',
                        fill: '#fff',
                        fontWeight: 'bold',
                        format: (label, value, fValue, index) => {
                            // Don't show label for the transparent element (last item)
                            if (index === data.length - 1) {
                                return '';
                            }
                            return label;
                        }
                    },
                    tooltip: {
                        enabled: false
                    }
                };

                // Create the funnel
                const chart = new D3Funnel(funnelContainer);
                chart.draw(data, options);
            }
        `;
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
            
            // Store data globally for report creation
            AppState.currentAnalyticsData = { lines, headers, columnIndexes };
            AppState.currentMetadata = metadata;
            AppState.currentMetrics = metrics;
            
            // Display results
            displayResults(metadata, metrics);
            
            // Add interactivity
            addResultInteractivity(metrics.missingIds, metadata.campaignName);
            
            // Show create report button
            const createReportSection = document.getElementById('createReportSection');
            if (createReportSection) {
                createReportSection.style.display = 'block';
            }
            
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
        
        // Find optional sum metrics columns
        const thumbnailCountIndex = headers.findIndex(h => h.toLowerCase() === 'thumbnail_count');
        const visitCountIndex = headers.findIndex(h => h.toLowerCase() === 'visit_count');
        const playCountIndex = headers.findIndex(h => h.toLowerCase() === 'play_count');
        
        // Find interaction columns for unique interactions calculation
        const interactionColumnIndexes = CONFIG.INTERACTION_COLUMNS
            .map(columnName => {
                const index = headers.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
                return index !== -1 ? { name: columnName, index } : null;
            })
            .filter(item => item !== null);
        
        return {
            valid: true,
            uniqueIdIndex,
            impressionCountIndex,
            eventCountFinishedIndex,
            eventColumnIndexes,
            thumbnailCountIndex: thumbnailCountIndex !== -1 ? thumbnailCountIndex : null,
            visitCountIndex: visitCountIndex !== -1 ? visitCountIndex : null,
            playCountIndex: playCountIndex !== -1 ? playCountIndex : null,
            interactionColumnIndexes
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
                    
                    // Format dates in YYYY-MM-DD format
                    const [startDay, startMonth, startYear] = startDate.split('-');
                    const [endDay, endMonth, endYear] = endDate.split('-');
                    
                    displayDate = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')} / ${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
                    dateStr = `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
                    
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
        const { uniqueIdIndex, impressionCountIndex, eventCountFinishedIndex, eventColumnIndexes, 
                thumbnailCountIndex, visitCountIndex, playCountIndex, interactionColumnIndexes } = columnIndexes;
        
        let totalUsers = 0;
        let totalImpressions = 0;
        let uniqueImpressions = 0;
        let totalContentFinished = 0; // Sum of all finished events
        let uniqueContentFinishes = 0; // Count of unique users who finished
        let uniqueInteractions = 0; // Count of users with at least one interaction
        
        // Optional sum metrics
        let totalThumbnailCount = 0;
        let totalVisitCount = 0;
        let totalPlayCount = 0;
        let uniqueThumbnailUsers = new Set();
        let uniqueVisitUsers = new Set();
        let uniquePlayUsers = new Set();
        
        // Initialize event sums and unique user tracking
        let eventSums = {};
        let eventUniqueUserSets = {};
        eventColumnIndexes.forEach(item => {
            eventSums[item.header] = 0;
            eventUniqueUserSets[item.header] = new Set();
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
            
            const isTestUser = CONFIG.TEST_USER_IDS.includes(uniqueId);
            
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
            
            // Count content finished metrics (exclude test users)
            const finishedCount = parseInt(columns[eventCountFinishedIndex]?.replace(/"/g, '')) || 0;
            if (!isTestUser) {
                // Add to total content finished (sum of all finished events)
                totalContentFinished += finishedCount;
                
                // Count unique users who finished at least once
                if (finishedCount > 0) {
                    uniqueContentFinishes++;
                }
            }
            
            // Calculate unique interactions (exclude test users)
            if (!isTestUser && interactionColumnIndexes.length > 0) {
                // Sum values from all interaction columns for this user
                let interactionSum = 0;
                interactionColumnIndexes.forEach(item => {
                    const value = parseInt(columns[item.index]?.replace(/"/g, '')) || 0;
                    interactionSum += value;
                });
                
                // If sum > 0, count as 1 unique interaction (like Excel IF formula)
                if (interactionSum > 0) {
                    uniqueInteractions++;
                }
            }
            
            // Calculate optional sum metrics (exclude test users)
            if (!isTestUser) {
                if (thumbnailCountIndex !== null) {
                    const thumbnailCount = parseInt(columns[thumbnailCountIndex]?.replace(/"/g, '')) || 0;
                    totalThumbnailCount += thumbnailCount;
                    if (thumbnailCount > 0) {
                        uniqueThumbnailUsers.add(uniqueId);
                    }
                }
                
                if (visitCountIndex !== null) {
                    const visitCount = parseInt(columns[visitCountIndex]?.replace(/"/g, '')) || 0;
                    totalVisitCount += visitCount;
                    if (visitCount > 0) {
                        uniqueVisitUsers.add(uniqueId);
                    }
                }
                
                if (playCountIndex !== null) {
                    const playCount = parseInt(columns[playCountIndex]?.replace(/"/g, '')) || 0;
                    totalPlayCount += playCount;
                    if (playCount > 0) {
                        uniquePlayUsers.add(uniqueId);
                    }
                }
            }
            
            // Sum other event columns (include ALL users, even test users)
            eventColumnIndexes.forEach(item => {
                const value = parseInt(columns[item.index]?.replace(/"/g, '')) || 0;
                eventSums[item.header] += value;
                
                // Track unique users for each event
                if (value > 0) {
                    eventUniqueUserSets[item.header].add(uniqueId);
                }
            });
        }
        
        totalUsers = uniqueUsers.size;

        // Convert sets of unique users to counts
        const eventUniqueUserCounts = {};
        for (const header of Object.keys(eventSums)) {
            eventUniqueUserCounts[header] = eventUniqueUserSets[header].size;
        }
        
        return {
            totalUsers,
            totalImpressions,
            uniqueImpressions,
            totalContentFinished,
            uniqueContentFinishes,
            uniqueInteractions: interactionColumnIndexes.length > 0 ? uniqueInteractions : null,
            totalThumbnailCount: thumbnailCountIndex !== null ? totalThumbnailCount : null,
            uniqueThumbnailCount: thumbnailCountIndex !== null ? uniqueThumbnailUsers.size : null,
            totalVisitCount: visitCountIndex !== null ? totalVisitCount : null,
            uniqueVisitCount: visitCountIndex !== null ? uniqueVisitUsers.size : null,
            totalPlayCount: playCountIndex !== null ? totalPlayCount : null,
            uniquePlayCount: playCountIndex !== null ? uniquePlayUsers.size : null,
            eventSums,
            eventUniqueUserCounts, // Add unique counts
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
        const { totalUsers, totalImpressions, uniqueImpressions, totalContentFinished, uniqueContentFinishes, 
                uniqueInteractions, totalThumbnailCount, uniqueThumbnailCount, totalVisitCount, uniqueVisitCount, 
                totalPlayCount, uniquePlayCount, eventSums, eventUniqueUserCounts, missingIdCount, foundTestUsers } = metrics;
        
        const testUserMessage = foundTestUsers.length > 0 
            ? `Excluding test users: ${foundTestUsers.join(', ')}`
            : 'There are no test users';

        // --- Native Analytics Cards ---
        let nativeCardsHTML = `
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
            <div class="result-card" data-raw-value="${totalContentFinished}">
                <h3>Content Finishes</h3>
                <p>${totalContentFinished}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${uniqueContentFinishes}">
                <h3>Unique Content Finishes</h3>
                <p>${uniqueContentFinishes}</p>
                <small>${testUserMessage}</small>
            </div>
        `;
        
        if (uniqueInteractions !== null) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${uniqueInteractions}">
                    <h3>Unique Interactions</h3>
                    <p>${uniqueInteractions}</p>
                    <small>${testUserMessage}</small>
                </div>
            `;
        }

        if (totalVisitCount !== null && totalVisitCount > 0) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${totalVisitCount}">
                    <h3>Visit Count</h3>
                    <p>${totalVisitCount}</p>
                    <small>${testUserMessage}</small>
                    <small class="bottom-text">(${uniqueVisitCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }
        
        if (totalPlayCount !== null && totalPlayCount > 0) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${totalPlayCount}">
                    <h3>Play Count</h3>
                    <p>${totalPlayCount}</p>
                    <small>${testUserMessage}</small>
                    <small class="bottom-text">(${uniquePlayCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }
        
        if (missingIdCount > 0) {
            nativeCardsHTML += `
                <div class="result-card missing-id-card" data-raw-value="${missingIdCount}">
                    <h3>Missing IDs</h3>
                    <p>${missingIdCount}</p>
                    <button id="downloadMissingIds" class="download-btn">Download List</button>
                </div>
            `;
        }

        // --- Custom Analytics Cards ---
        let customCardsHTML = '';

        if (totalThumbnailCount !== null && totalThumbnailCount > 0) {
            customCardsHTML += `
                <div class="result-card" data-raw-value="${totalThumbnailCount}">
                    <h3>Thumbnail Count</h3>
                    <p>${totalThumbnailCount}</p>
                    <small>${testUserMessage}</small>
                    <small class="bottom-text">(${uniqueThumbnailCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }
        
        for (const [header, sum] of Object.entries(eventSums)) {
            const displayName = header.replace(/^event_count_/, '');
            const formattedName = toTitleCase(displayName);
            const uniqueCount = eventUniqueUserCounts[header] || 0;
            
            customCardsHTML += `
                <div class="result-card" data-raw-value="${sum}">
                    <h3>${formattedName}</h3>
                    <small class="raw-header">(${header})</small>
                    <p>${sum}</p>
                    <small class="bottom-text">Including ALL users</small>
                    <small class="bottom-text">(${uniqueCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }

        // --- Final Assembly ---
        let finalHTML = `
            <div class="file-info">
                <strong>Campaign:</strong> ${campaignName}
                ${displayDate ? `<br><strong>Date:</strong> ${displayDate}` : ''}
            </div>
        `;

        if (nativeCardsHTML.trim() !== '') {
            finalHTML += `
                <h2 class="results-header">Native Analytics</h2>
                <div class="results-container">${nativeCardsHTML}</div>
            `;
        }

        if (customCardsHTML.trim() !== '') {
            finalHTML += `
                <h2 class="results-header">Custom Analytics Events</h2>
                <div class="results-container">${customCardsHTML}</div>
            `;
        }
        
        resultsContainer.innerHTML = finalHTML;
    }
    
    /**
     * Add interactivity to the result cards
     */
    function addResultInteractivity(missingIds, campaignName) {
        // Add click-to-copy functionality to all result cards
        document.querySelectorAll('.result-card').forEach(card => {
            card.title = "Click to copy value";
            
            card.addEventListener('click', function(e) {
                // Don't trigger for button clicks
                if (e.target.tagName === 'BUTTON') return;
                
                const rawValue = this.dataset.rawValue;
                navigator.clipboard.writeText(rawValue)
                    .then(() => {
                        // Visual feedback using CSS class
                        this.classList.add('copied');
                        
                        // Remove the class after 1.5 seconds
                        setTimeout(() => {
                            this.classList.remove('copied');
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
                        link.classList.add('hidden');
                        
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

    /**
     * Convert a string to proper title case with special rules
     * - Replace consecutive underscores with spaces
     * - Capitalize all words except articles, prepositions, and conjunctions (unless first/last word)
     * - Handle special abbreviations that should remain uppercase
     */
    function toTitleCase(str) {
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
    }

    /**
     * Get current analytics data in a format suitable for report generation
     */
    function getCurrentAnalyticsData() {
        if (!AppState.currentMetrics || !AppState.currentAnalyticsData) {
            return { summary: {}, events: {} };
        }

        // Build summary data in the correct order
        const summary = {};

        // Add Total Audience first if available (optional)
        const totalAudienceInput = document.getElementById('totalAudience');
        if (totalAudienceInput && totalAudienceInput.value) {
            summary['Total Audience'] = parseInt(totalAudienceInput.value).toLocaleString();
        }

        // Add required metrics
        summary['Total Impressions'] = AppState.currentMetrics.totalImpressions.toLocaleString();
        summary['Unique Impressions'] = AppState.currentMetrics.uniqueImpressions.toLocaleString();
        
        // Calculate Unique Completion Rate as percentage
        const completionRate = AppState.currentMetrics.uniqueImpressions > 0 
            ? Math.round((AppState.currentMetrics.uniqueContentFinishes / AppState.currentMetrics.uniqueImpressions) * 100)
            : 0;
        summary['Unique Completion Rate'] = `%${completionRate}`;

        // Build events data from current metrics
        const events = {};
        if (AppState.currentMetrics.eventSums) {
            Object.entries(AppState.currentMetrics.eventSums).forEach(([key, value]) => {
                const displayName = key.replace(/^event_count_/, '');
                const formattedName = toTitleCase(displayName);
                events[formattedName] = value;
            });
        }

        return { summary, events };
    }

    /**
     * Show notification message (success, error, info)
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after configured duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('slide-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, CONFIG.NOTIFICATION_DURATION);
    }
}); 