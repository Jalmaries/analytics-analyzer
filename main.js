/**
 * Analytics Analyzer - Main Application
 * 
 * This is the main entry point that orchestrates all the modular components.
 * It replaces the old monolithic script.js approach with a clean, modular architecture.
 */

import { CONFIG, AppState } from './js/config.js';
import { Utils } from './js/utils.js';
import { DataProcessor } from './js/data-processor.js';
import { MetricsCalculator } from './js/metrics-calculator.js';
import { UIManager } from './js/ui-manager.js';
import { ReportGenerator } from './js/report-generator.js';
import { PDFGenerator } from './js/pdf-generator.js';
import { ChartRenderer } from './js/chart-renderer.js';
import { ImageManager } from './js/image-manager.js';

/**
 * Application Controller
 * Manages the overall application flow and component coordination
 */
class AnalyticsAnalyzer {
    constructor() {
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    initializeApp() {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                console.log('Initializing modules...');
                console.log('CONFIG available:', typeof CONFIG !== 'undefined');
                console.log('Utils available:', typeof Utils !== 'undefined');
                console.log('DataProcessor available:', typeof DataProcessor !== 'undefined');
                console.log('MetricsCalculator available:', typeof MetricsCalculator !== 'undefined');
                console.log('UIManager available:', typeof UIManager !== 'undefined');
                console.log('ReportGenerator available:', typeof ReportGenerator !== 'undefined');
                console.log('PDFGenerator available:', typeof PDFGenerator !== 'undefined');
                console.log('ChartRenderer available:', typeof ChartRenderer !== 'undefined');
                console.log('ImageManager available:', typeof ImageManager !== 'undefined');
                
                this.uiManager = new UIManager();
                this.setupEventListeners();
                this.initializeReportModal();
                console.log('Analytics Analyzer initialized successfully');
            } catch (error) {
                console.error('Initialization error:', error);
                Utils.showError('Application failed to initialize: ' + error.message);
            }
        });
    }

    /**
     * Set up all event listeners for the application
     */
    setupEventListeners() {
        // Get DOM elements - EXACT MATCH to original script.js
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');

        if (!dropArea || !fileInput || !selectFileBtn) {
            console.error('Required DOM elements not found:', {
                dropArea: !!dropArea,
                fileInput: !!fileInput,
                selectFileBtn: !!selectFileBtn
            });
            return;
        }

        console.log('Setting up event listeners for:', {
            dropArea: dropArea.id,
            fileInput: fileInput.id,
            selectFileBtn: selectFileBtn.id
        });

        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
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
        dropArea.addEventListener('drop', this.handleDrop.bind(this), false);
        
        // Handle file selection through input
        fileInput.addEventListener('change', this.handleFiles.bind(this), false);
        
        // Connect the select button to the file input
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    /**
     * Initialize report modal functionality
     */
    initializeReportModal() {
        // Get all modal elements
        const createReportBtn = document.getElementById('createReportBtn');
        const reportModal = document.getElementById('reportModal');
        const closeModalBtn = document.getElementById('closeModalBtn');

        // Modal open/close handlers
        if (createReportBtn) createReportBtn.addEventListener('click', this.openReportModal.bind(this));
        if (closeModalBtn) closeModalBtn.addEventListener('click', this.closeReportModal.bind(this));

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (reportModal && event.target === reportModal) {
                this.closeReportModal();
            }
        });

        // Close preview modal handler
        const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
        if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', this.closePreviewModal.bind(this));

        // Report generation buttons
        const previewReportBtn = document.getElementById('previewReportBtn');
        const generateReportBtn = document.getElementById('generateReportBtn');
        
        if (previewReportBtn) previewReportBtn.addEventListener('click', this.previewReport.bind(this));
        if (generateReportBtn) generateReportBtn.addEventListener('click', this.generatePDF.bind(this));

        // Setup funnel count controls - EXACT MATCH to original script.js
        this.setupFunnelCountControls();
    }

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file drop
     */
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles({ target: { files } });
    }

    /**
     * Handle file selection/drop
     */
    async handleFiles(e) {
        const files = e.target.files;
        
        if (files.length === 0) return;

        const file = files[0];
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            Utils.showError('Please select a CSV file');
            return;
        }

        try {
            // Show processing state
            this.showProcessing(true);
            console.log('Starting CSV processing for file:', file.name);
            
            // Parse CSV file
            console.log('Parsing CSV file...');
            const csvContent = await DataProcessor.parseCSV(file);
            console.log('CSV parsed successfully, content length:', csvContent.length);
            
            // Process data and calculate metrics
            console.log('Processing data and calculating metrics...');
            const { metadata, metrics } = DataProcessor.processData(csvContent, file.name);
            console.log('Data processed successfully:', { metadata, metrics });
            
            // Clear processing state first
            this.showProcessing(false);
            
            // Display results
            console.log('Displaying results...');
            this.displayResults(metadata, metrics);
            
            // Show create report button
            const createReportSection = document.getElementById('createReportSection');
            if (createReportSection) {
                createReportSection.style.display = 'block';
            }

            Utils.showNotification('CSV file processed successfully!', 'success');
            console.log('CSV processing completed successfully');
            
        } catch (error) {
            console.error('CSV processing error:', error);
            Utils.showError('Error processing file: ' + error.message);
            // Clear processing state on error too
            this.showProcessing(false);
        }
    }

    /**
     * Show/hide processing state
     */
    showProcessing(show) {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            
            if (show) {
                resultsSection.innerHTML = '<h2>Processing...</h2><div class="processing">Analyzing your CSV data...</div>';
            } else {
                // Clear processing content - displayResults will set the proper content
                // Preserve the createReportSection that exists in the original HTML
                resultsSection.innerHTML = `
                    <h2>Campaign Metrics</h2>
                    <div class="results-container" id="resultsContainer">
                        <!-- Results will be displayed here -->
                    </div>
                    <div class="create-report-section" id="createReportSection" style="display: none;">
                        <button id="createReportBtn" class="create-report-button">
                            <i class="mdi mdi-file-document-outline"></i>
                            Create Report
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Display processing results - EXACT MATCH to original script.js
     */
    displayResults(metadata, metrics) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (!resultsContainer) {
            console.error('Results container not found');
            return;
        }

        const { campaignName, displayDate } = metadata;
        
        // Test user message exactly like original
        const testUserMessage = metrics.foundTestUsers && metrics.foundTestUsers.length > 0 
            ? `Excluding test users: ${metrics.foundTestUsers.join(', ')}`
            : 'There are no test users';

        // --- Native Analytics Cards ---
        let nativeCardsHTML = `
            <div class="result-card" data-raw-value="${metrics.totalUsers}">
                <h3>Total Users</h3>
                <p>${metrics.totalUsers.toLocaleString()}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${metrics.totalImpressions}">
                <h3>Total Impressions</h3>
                <p>${metrics.totalImpressions}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${metrics.uniqueImpressions}">
                <h3>Unique Impressions</h3>
                <p>${metrics.uniqueImpressions}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${metrics.totalContentFinished}">
                <h3>Content Finishes</h3>
                <p>${metrics.totalContentFinished}</p>
                <small>${testUserMessage}</small>
            </div>
            <div class="result-card" data-raw-value="${metrics.uniqueContentFinishes}"> 
                <h3>Unique Content Finishes</h3>
                <p>${metrics.uniqueContentFinishes}</p>
                <small>${testUserMessage}</small>
            </div>
        `;
        
        if (metrics.uniqueInteractions !== null) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${metrics.uniqueInteractions}">
                    <h3>Unique Interactions</h3>
                    <p>${metrics.uniqueInteractions}</p>
                    <small>${testUserMessage}</small>
                </div>
            `;
        }

        if (metrics.totalVisitCount !== null && metrics.totalVisitCount > 0) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${metrics.totalVisitCount}">
                    <h3>Visit Count</h3>
                    <p>${metrics.totalVisitCount}</p>
                    <small>${testUserMessage}</small>
                    <small class="bottom-text">(${metrics.uniqueVisitCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }
        
        if (metrics.totalPlayCount !== null && metrics.totalPlayCount > 0) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${metrics.totalPlayCount}">
                    <h3>Play Count</h3>
                    <p>${metrics.totalPlayCount}</p>
                    <small>${testUserMessage}</small>
                    <small class="bottom-text">(${metrics.uniquePlayCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }
        
        if (metrics.totalThumbnailCount !== null && metrics.totalThumbnailCount > 0) {
            nativeCardsHTML += `
                <div class="result-card" data-raw-value="${metrics.totalThumbnailCount}">
                    <h3>Thumbnail Count</h3>
                    <p>${metrics.totalThumbnailCount}</p>
                    <small>${testUserMessage}</small>
                    <small class="bottom-text">(${metrics.uniqueThumbnailCount.toLocaleString()} unique users)</small>
                </div>
            `;
        }
        
        if (metrics.missingIdCount > 0) {
            nativeCardsHTML += `
                <div class="result-card missing-id-card" data-raw-value="${metrics.missingIdCount}">
                    <h3>Missing IDs</h3>
                    <p>${metrics.missingIdCount}</p>
                    <button id="downloadMissingIds" class="download-btn">Download List</button>
                </div>
            `;
        }

        // --- Custom Analytics Cards ---
        let customCardsHTML = '';
        
        if (metrics.eventSums) {
            // Sort events by value from high to low - EXACT MATCH to original script.js
            const sortedEvents = Object.entries(metrics.eventSums)
                .sort(([,a], [,b]) => b - a);
            
            for (const [header, sum] of sortedEvents) {
                const displayName = header.replace(/^event_count_/, '');
                const formattedName = Utils.toTitleCase(displayName);
                const uniqueCount = metrics.eventUniqueUserCounts[header] || 0;
                
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
        }

        // --- Final Assembly exactly like original ---
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
        
        // Add exact original interactivity
        this.addResultInteractivity();
        
        // Show create report button
        const createReportSection = document.getElementById('createReportSection');
        if (createReportSection) {
            createReportSection.style.display = 'block';
            console.log('Create Report button shown successfully');
            
            // Attach event listener to the dynamically created button
            const createReportBtn = document.getElementById('createReportBtn');
            if (createReportBtn) {
                createReportBtn.addEventListener('click', this.openReportModal.bind(this));
                console.log('Create Report button event listener attached');
            }
        } else {
            console.error('Create Report section not found in DOM');
        }
    }

    /**
     * Add interactivity to result cards - EXACT MATCH to original script.js
     */
    addResultInteractivity() {
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
                        Utils.showError('Failed to copy to clipboard');
                    });
            });
        });
        
        // Add download functionality for missing IDs if any found
        const downloadBtn = document.getElementById('downloadMissingIds');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering the copy functionality
                
                try {
                    const metrics = AppState.currentMetrics;
                    const metadata = AppState.currentMetadata;
                    
                    if (!metrics || !metrics.missingIds || metrics.missingIds.length === 0) {
                        Utils.showError('No missing IDs to download');
                        return;
                    }
                    
                    // Create CSV content
                    const csvContent = 'MissingID\n' + metrics.missingIds.join('\n');
                    
                    // Create download link
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `missing_ids_${metadata.campaignName.replace(/\s+/g, '_')}.csv`);
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
                    Utils.showError('Failed to download missing IDs');
                }
            });
        }
    }

    /**
     * Open report modal - EXACT MATCH to original script.js
     */
    openReportModal() {
        if (!AppState.currentMetrics || !AppState.currentMetadata) {
            Utils.showError('No data available for report creation');
            return;
        }

        this.populateReportData();
        this.updateFunnelBuilder();
        this.populateInteractivityData();
        
        // Automatically crop OmmaVQ logo when modal opens
        setTimeout(() => {
            this.autoCropOmmaLogo();
        }, 100);
        
        const reportModal = document.getElementById('reportModal');
        reportModal.style.display = 'block';
    }

    /**
     * Close report modal
     */
    closeReportModal() {
        const reportModal = document.getElementById('reportModal');
        if (reportModal) {
            reportModal.style.display = 'none';
        }
    }

    /**
     * Close preview modal - EXACT MATCH to original script.js
     */
    closePreviewModal() {
        const previewModal = document.getElementById('previewModal');
        if (previewModal) {
            previewModal.style.display = 'none';
        }
    }

    /**
     * Populate report modal with current data - EXACT MATCH to original script.js
     */
    populateReportData() {
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
     * Preview report - EXACT MATCH to original script.js
     */
    previewReport() {
        try {
            const reportData = this.uiManager.collectReportData();
            if (!reportData) {
                Utils.showError('Please fill in required report information');
                return;
            }

            ReportGenerator.generateReportPreview(reportData);
            
            const previewModal = document.getElementById('previewModal');
            if (previewModal) {
                previewModal.style.display = 'block';
            } else {
                Utils.showError('Preview modal not found');
            }
        } catch (error) {
            Utils.showError('Failed to generate preview: ' + error.message);
            console.error('Preview error:', error);
        }
    }

    /**
     * Generate PDF - EXACT MATCH to original script.js
     */
    async generatePDF() {
        try {
            const reportData = this.uiManager.collectReportData();
            if (!reportData) {
                Utils.showError('Please fill in required report information');
                return;
            }

            await PDFGenerator.generatePDF(reportData);
        } catch (error) {
            Utils.showError('Failed to generate PDF: ' + error.message);
            console.error('PDF generation error:', error);
        }
    }

    /**
     * Update funnel builder based on selected number of items - EXACT MATCH to original script.js
     */
    updateFunnelBuilder() {
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
        const availableMetrics = this.getFunnelMetricsOptions();
        
        if (availableMetrics.length === 0) {
            funnelBuilder.innerHTML = '<p>No metrics available for funnel</p>';
            return;
        }
        
        funnelBuilder.innerHTML = '';
        
        for (let i = 0; i < numItems; i++) {
            const funnelItem = this.createFunnelItem(i, availableMetrics);
            funnelBuilder.appendChild(funnelItem);
        }

        // Setup drag and drop functionality
        this.setupFunnelDragAndDrop();
        this.calculateFunnelPercentages();
        
        // Initialize funnel data for all items
        this.initializeFunnelData(numItems, availableMetrics);
    }

    /**
     * Get available metrics for funnel selection - EXACT MATCH to original script.js
     */
    getFunnelMetricsOptions() {
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
                    const label = Utils.toTitleCase(key.replace(/^event_count_/, ''));
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
                    const label = 'Unique ' + Utils.toTitleCase(key.replace(/^event_count_/, ''));
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
     * Create a funnel item element - EXACT MATCH to original script.js
     */
    createFunnelItem(index, availableMetrics) {
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
                this.updateFunnelItemData(index, e.target.value, availableMetrics);
                this.calculateFunnelPercentages();
            });
            
            baseSelect.addEventListener('change', () => {
                this.calculateFunnelPercentages();
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
                this.updateFunnelItemData(index, e.target.value, availableMetrics);
                this.calculateFunnelPercentages();
            });
        }

        return div;
    }

    /**
     * Initialize funnel data for all items
     */
    initializeFunnelData(numItems, availableMetrics) {
        AppState.funnelData = [];
        
        for (let i = 0; i < numItems; i++) {
            const defaultMetric = availableMetrics[Math.min(i, availableMetrics.length - 1)];
            const funnelItem = document.querySelector(`[data-index="${i}"]`);
            const valueInput = funnelItem?.querySelector('.funnel-value');
            const metricSelect = funnelItem?.querySelector('.funnel-metric');
            
            AppState.funnelData[i] = {
                metric: metricSelect?.value || defaultMetric?.label,
                value: parseInt(valueInput?.value) || defaultMetric?.data || 0,
                step: i + 1
            };
        }
        
        console.log('Funnel data initialized:', AppState.funnelData);
    }

    /**
     * Setup drag and drop functionality for funnel items - EXACT MATCH to original script.js
     */
    setupFunnelDragAndDrop() {
        const funnelItems = document.querySelectorAll('.funnel-item');
        
        funnelItems.forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragover', this.handleDragOver.bind(this));
            item.addEventListener('dragenter', this.handleDragEnter.bind(this));
            item.addEventListener('dragleave', this.handleDragLeave.bind(this));
            item.addEventListener('drop', this.handleFunnelDrop.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
    }

    handleDragStart(e) {
        this.draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        if (this !== this.draggedElement) {
            this.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    handleFunnelDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (this.draggedElement !== this) {
            // Get the dragged element's data
            const draggedIndex = parseInt(this.draggedElement.dataset.index);
            const targetIndex = parseInt(this.dataset.index);
            
            // Swap the elements
            this.swapFunnelItems(draggedIndex, targetIndex);
        }

        this.classList.remove('drag-over');
        return false;
    }

    handleDragEnd(e) {
        document.querySelectorAll('.funnel-item').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        this.draggedElement = null;
    }

    /**
     * Calculate and update funnel percentages - EXACT MATCH to original script.js
     */
    calculateFunnelPercentages() {
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
                        const availableMetrics = this.getFunnelMetricsOptions();
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
     * Update funnel item data when metric selection changes - EXACT MATCH to original script.js
     */
    updateFunnelItemData(index, metricValue, availableMetrics) {
        const metric = availableMetrics.find(m => m.value === metricValue);
        const funnelItem = document.querySelector(`[data-index="${index}"]`);
        if (funnelItem && metric) {
            funnelItem.querySelector('.funnel-value').value = metric.data;
            
            // Update AppState.funnelData
            if (!AppState.funnelData) AppState.funnelData = [];
            AppState.funnelData[index] = {
                metric: metric.label,
                value: metric.data,
                step: index + 1
            };
            
            // Recalculate percentages after updating the value
            setTimeout(() => {
                this.calculateFunnelPercentages();
            }, 10);
        }
    }

    /**
     * Populate interactivity data - EXACT MATCH to original script.js
     */
    populateInteractivityData() {
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
            const displayName = Utils.toTitleCase(eventKey.replace(/^event_count_/, ''));
            
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
     * Auto-crop Omma logo by removing transparent areas
     */
    autoCropOmmaLogo() {
        console.log('Auto-cropping OmmaVQ logo...');
        const ommaLogo = document.getElementById('ommaLogo');
        
        if (!ommaLogo) {
            console.error('Omma logo element not found');
            Utils.showError('Omma logo not found');
            return;
        }

        console.log('OmmaVQ logo found, starting crop process...');

        // Convert image to canvas to detect and crop transparent areas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        // Don't set crossOrigin for local images to avoid CORS issues
        // img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            console.log('OmmaVQ logo loaded, dimensions:', img.width, 'x', img.height);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            try {
                // Get image data to analyze transparency
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Find bounds of non-transparent pixels
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                let hasContent = false;
                
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const alpha = data[(y * canvas.width + x) * 4 + 3];
                        if (alpha > 10) { // Consider pixels with alpha > 10 as content
                            hasContent = true;
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }
                
                if (hasContent && maxX > minX && maxY > minY) {
                    // Add small padding
                    const padding = 5;
                    minX = Math.max(0, minX - padding);
                    minY = Math.max(0, minY - padding);
                    maxX = Math.min(canvas.width - 1, maxX + padding);
                    maxY = Math.min(canvas.height - 1, maxY + padding);
                    
                    // Create cropped canvas
                    const croppedWidth = maxX - minX + 1;
                    const croppedHeight = maxY - minY + 1;
                    
                    const croppedCanvas = document.createElement('canvas');
                    const croppedCtx = croppedCanvas.getContext('2d');
                    
                    croppedCanvas.width = croppedWidth;
                    croppedCanvas.height = croppedHeight;
                    
                    // Draw cropped image
                    croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
                    
                    // Store cropped Omma logo for PDF generation
                    AppState.ommaLogoDataUrl = croppedCanvas.toDataURL('image/png');
                    console.log('OmmaVQ logo cropped successfully, bounds:', {minX, minY, maxX, maxY, width: croppedWidth, height: croppedHeight});
                    Utils.showNotification('Omma logo auto-cropped successfully!', 'success');
                } else {
                    // No transparent areas found or invalid bounds, use original
                    AppState.ommaLogoDataUrl = canvas.toDataURL('image/png');
                    Utils.showNotification('Omma logo processed (no cropping needed)', 'info');
                }
                
            } catch (error) {
                console.error('Error auto-cropping Omma logo:', error);
                // Fallback to original image
                AppState.ommaLogoDataUrl = ommaLogo.src;
                Utils.showNotification('Using original Omma logo', 'warning');
            }
        };
        
        img.onerror = () => {
            Utils.showError('Failed to load Omma logo for cropping');
            AppState.ommaLogoDataUrl = ommaLogo.src;
        };
        
        img.src = ommaLogo.src;
    }

    /**
     * Setup funnel count controls - EXACT MATCH to original script.js
     */
    setupFunnelCountControls() {
        const minusBtn = document.getElementById('funnelMinusBtn');
        const plusBtn = document.getElementById('funnelPlusBtn');
        const countDisplay = document.getElementById('funnelCountDisplay');

        if (!minusBtn || !plusBtn || !countDisplay) {
            console.warn('Funnel count control elements not found');
            return;
        }

        const updateButtonStates = () => {
            const current = parseInt(countDisplay.textContent);
            minusBtn.disabled = current <= CONFIG.FUNNEL.MIN_ITEMS;
            plusBtn.disabled = current >= CONFIG.FUNNEL.MAX_ITEMS;
        };

        minusBtn.addEventListener('click', () => {
            const current = parseInt(countDisplay.textContent);
            if (current > CONFIG.FUNNEL.MIN_ITEMS) {
                countDisplay.textContent = current - 1;
                this.updateFunnelBuilder();
                updateButtonStates();
            }
        });

        plusBtn.addEventListener('click', () => {
            const current = parseInt(countDisplay.textContent);
            if (current < CONFIG.FUNNEL.MAX_ITEMS) {
                countDisplay.textContent = current + 1;
                this.updateFunnelBuilder();
                updateButtonStates();
            }
        });

        // Set initial button states
        updateButtonStates();
    }
}

// Initialize the application
new AnalyticsAnalyzer(); 