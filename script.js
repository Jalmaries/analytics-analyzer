/**
 * Analytics Analyzer
 * 
 * This script processes CSV files containing analytics data,
 * calculates key metrics, and visualizes the results.
 */

// Configuration: Test user IDs to exclude from main metrics
const TEST_USER_IDS = ['X001', 'PH123', 'OMMATEST'];

// Configuration: Interaction columns to check for unique interactions
// If sum of these columns > 0 for a user, count as 1 unique interaction
const INTERACTION_COLUMNS = ['event_count_answer_correct', 'event_count_answer_wrong', 'event_count_back_to_home', 'event_count_replay', 'event_count_scene2_earning_details', 'event_count_scene2_skip_details', 'event_count_scene5_availability', 'event_count_scene5_unique_packcodes', 'event_count_scene5_visibility', 'event_count_scene8_home_page', 'event_count_scene8_nps_campaign', 'event_count_scene8_service_catalog_stg', 'event_count_scene8_service_chargili'];

// Global variables for report creation
let currentAnalyticsData = null;
let currentMetadata = null;
let currentMetrics = null;
let cropper = null;
let clientLogoDataUrl = null;

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
        const createReportBtn = document.getElementById('createReportBtn');
        const reportModal = document.getElementById('reportModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cropModal = document.getElementById('cropModal');
        const closeCropModalBtn = document.getElementById('closeCropModalBtn');
        const previewModal = document.getElementById('previewModal');
        const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');

        // Modal open/close handlers
        createReportBtn?.addEventListener('click', openReportModal);
        closeModalBtn?.addEventListener('click', closeReportModal);
        closeCropModalBtn?.addEventListener('click', closeCropModal);
        closePreviewModalBtn?.addEventListener('click', closePreviewModal);

        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === reportModal) closeReportModal();
            if (event.target === cropModal) closeCropModal();
            if (event.target === previewModal) closePreviewModal();
        });

        // Client logo upload handling
        const clientLogoUpload = document.getElementById('clientLogoUpload');
        const clientLogoInput = document.getElementById('clientLogoInput');
        
        clientLogoUpload?.addEventListener('click', () => {
            clientLogoInput?.click();
        });

        clientLogoInput?.addEventListener('change', handleClientLogoUpload);

        // Crop button handling
        const cropBtn = document.getElementById('cropBtn');
        cropBtn?.addEventListener('click', openCropModal);

        // Crop modal buttons
        const applyCropBtn = document.getElementById('applyCropBtn');
        const cancelCropBtn = document.getElementById('cancelCropBtn');
        
        applyCropBtn?.addEventListener('click', applyCrop);
        cancelCropBtn?.addEventListener('click', closeCropModal);

        // Funnel items change handler
        const funnelItems = document.getElementById('funnelItems');
        funnelItems?.addEventListener('change', updateFunnelBuilder);

        // Report generation buttons
        const previewReportBtn = document.getElementById('previewReportBtn');
        const generateReportBtn = document.getElementById('generateReportBtn');
        
        previewReportBtn?.addEventListener('click', previewReport);
        generateReportBtn?.addEventListener('click', generatePDF);
    }

    /**
     * Open report creation modal
     */
    function openReportModal() {
        if (!currentMetrics || !currentMetadata) {
            showError('No data available for report creation');
            return;
        }

        populateReportData();
        updateFunnelBuilder();
        populateInteractivityData();
        
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
        document.getElementById('contentName').value = currentMetadata.campaignName || '';
        document.getElementById('reportDate').value = currentMetadata.displayDate || '';
        
        // Summary data
        document.getElementById('totalImpression').value = currentMetrics.totalImpressions || 0;
        document.getElementById('uniqueImpressions').value = currentMetrics.uniqueImpressions || 0;
        
        // Calculate unique completion rate
        const completionRate = currentMetrics.uniqueImpressions > 0 
            ? ((currentMetrics.uniqueContentFinishes / currentMetrics.uniqueImpressions) * 100).toFixed(1)
            : '0';
        document.getElementById('uniqueCompletionRate').value = completionRate + '%';
    }

    /**
     * Update funnel builder based on selected number of items
     */
    function updateFunnelBuilder() {
        const funnelItems = document.getElementById('funnelItems');
        const funnelBuilder = document.getElementById('funnelBuilder');
        const numItems = parseInt(funnelItems?.value || 4);

        if (!funnelBuilder || !currentMetrics) return;

        // Get available metrics for funnel
        const availableMetrics = getFunnelMetricsOptions();
        
        funnelBuilder.innerHTML = '';
        
        for (let i = 0; i < numItems; i++) {
            const funnelItem = createFunnelItem(i, availableMetrics);
            funnelBuilder.appendChild(funnelItem);
        }

        // Add move button event listeners
        setupFunnelMoveButtons();
    }

    /**
     * Get available metrics for funnel selection
     */
    function getFunnelMetricsOptions() {
        const options = [
            { value: 'impression', label: 'Impression', data: currentMetrics.totalImpressions },
            { value: 'unique_impression', label: 'Unique Impression', data: currentMetrics.uniqueImpressions },
            { value: 'unique_completion', label: 'Unique Completion', data: currentMetrics.uniqueContentFinishes },
            { value: 'unique_interactivity', label: 'Unique Interactivity', data: currentMetrics.uniqueInteractions }
        ];

        // Add event metrics
        Object.entries(currentMetrics.eventSums || {}).forEach(([key, value]) => {
            const label = toTitleCase(key.replace(/^event_count_/, ''));
            options.push({
                value: key,
                label: label,
                data: value
            });
        });

        return options.filter(option => option.data !== null && option.data > 0);
    }

    /**
     * Create a funnel item element
     */
    function createFunnelItem(index, availableMetrics) {
        const div = document.createElement('div');
        div.className = 'funnel-item';
        div.dataset.index = index;

        const defaultMetric = availableMetrics[Math.min(index, availableMetrics.length - 1)];

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
            <input type="text" class="funnel-percentage" value="${index === 0 ? '100' : ''}%" readonly>
            <button class="move-btn move-up" ${index === 0 ? 'disabled' : ''}>
                <iconify-icon icon="mdi:chevron-up"></iconify-icon>
            </button>
        `;

        // Add change listener to metric selector
        const select = div.querySelector('.funnel-metric');
        select.addEventListener('change', (e) => {
            updateFunnelItemData(index, e.target.value, availableMetrics);
            calculateFunnelPercentages();
        });

        return div;
    }

    /**
     * Update funnel item data when metric selection changes
     */
    function updateFunnelItemData(index, metricValue, availableMetrics) {
        const metric = availableMetrics.find(m => m.value === metricValue);
        const funnelItem = document.querySelector(`[data-index="${index}"]`);
        if (funnelItem && metric) {
            funnelItem.querySelector('.funnel-value').value = metric.data;
        }
    }

    /**
     * Calculate and update funnel percentages
     */
    function calculateFunnelPercentages() {
        const funnelItems = document.querySelectorAll('.funnel-item');
        let baseValue = 0;

        funnelItems.forEach((item, index) => {
            const value = parseInt(item.querySelector('.funnel-value').value) || 0;
            const percentageInput = item.querySelector('.funnel-percentage');
            
            if (index === 0) {
                baseValue = value;
                percentageInput.value = '100%';
            } else {
                const percentage = baseValue > 0 ? ((value / baseValue) * 100).toFixed(1) : '0';
                percentageInput.value = percentage + '%';
            }
        });
    }

    /**
     * Setup move button functionality for funnel items
     */
    function setupFunnelMoveButtons() {
        document.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const funnelItem = e.target.closest('.funnel-item');
                const index = parseInt(funnelItem.dataset.index);
                if (index > 0) {
                    moveFunnelItem(index, index - 1);
                }
            });
        });
    }

    /**
     * Move funnel item to new position
     */
    function moveFunnelItem(fromIndex, toIndex) {
        const funnelBuilder = document.getElementById('funnelBuilder');
        const items = Array.from(funnelBuilder.children);
        
        // Swap items
        const temp = items[fromIndex];
        items[fromIndex] = items[toIndex];
        items[toIndex] = temp;

        // Clear and re-append in new order
        funnelBuilder.innerHTML = '';
        items.forEach((item, newIndex) => {
            item.dataset.index = newIndex;
            item.querySelector('.funnel-order').textContent = newIndex + 1;
            
            // Update move button states
            const moveBtn = item.querySelector('.move-up');
            moveBtn.disabled = newIndex === 0;
            
            funnelBuilder.appendChild(item);
        });

        calculateFunnelPercentages();
    }

    /**
     * Populate interactivity data
     */
    function populateInteractivityData() {
        const interactivityGrid = document.getElementById('interactivityGrid');
        if (!interactivityGrid || !currentMetrics.eventSums) return;

        // Sort events by value (highest to lowest)
        const sortedEvents = Object.entries(currentMetrics.eventSums)
            .sort(([,a], [,b]) => b - a);

        interactivityGrid.innerHTML = '';

        sortedEvents.forEach(([eventKey, eventValue]) => {
            const uniqueUsers = currentMetrics.eventUniqueUserCounts[eventKey] || 0;
            const displayName = toTitleCase(eventKey.replace(/^event_count_/, ''));
            
            const div = document.createElement('div');
            div.className = 'interactivity-item';
            div.innerHTML = `
                <h4>${displayName}</h4>
                <div class="value">${eventValue.toLocaleString()}</div>
                <div class="users">${uniqueUsers.toLocaleString()} unique users</div>
            `;
            
            interactivityGrid.appendChild(div);
        });
    }

    /**
     * Handle client logo upload
     */
    function handleClientLogoUpload(event) {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            showError('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const clientLogoImg = document.getElementById('clientLogoImg');
            const clientLogoUpload = document.getElementById('clientLogoUpload');
            const clientLogoPreview = document.getElementById('clientLogoPreview');
            
            clientLogoImg.src = e.target.result;
            clientLogoUpload.style.display = 'none';
            clientLogoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    /**
     * Open crop modal
     */
    function openCropModal() {
        const clientLogoImg = document.getElementById('clientLogoImg');
        const cropImage = document.getElementById('cropImage');
        const cropModal = document.getElementById('cropModal');
        
        if (!clientLogoImg.src) return;
        
        cropImage.src = clientLogoImg.src;
        cropModal.style.display = 'block';
        
        // Initialize cropper
        setTimeout(() => {
            if (cropper) {
                cropper.destroy();
            }
            cropper = new Cropper(cropImage, {
                aspectRatio: 16 / 9,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        }, 100);
    }

    /**
     * Close crop modal
     */
    function closeCropModal() {
        const cropModal = document.getElementById('cropModal');
        cropModal.style.display = 'none';
        
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    /**
     * Apply crop to client logo
     */
    function applyCrop() {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            width: 300,
            height: 169,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        clientLogoDataUrl = canvas.toDataURL('image/png');
        
        const clientLogoImg = document.getElementById('clientLogoImg');
        clientLogoImg.src = clientLogoDataUrl;
        
        closeCropModal();
    }

    /**
     * Preview report
     */
    function previewReport() {
        const reportData = collectReportData();
        if (!reportData) return;

        generateReportPreview(reportData);
        
        const previewModal = document.getElementById('previewModal');
        previewModal.style.display = 'block';
    }

    /**
     * Close preview modal
     */
    function closePreviewModal() {
        const previewModal = document.getElementById('previewModal');
        previewModal.style.display = 'none';
    }

    /**
     * Collect all report data from form
     */
    function collectReportData() {
        const contentName = document.getElementById('contentName').value;
        const contentId = document.getElementById('contentId').value;
        const contentToken = document.getElementById('contentToken').value;
        const contentCreateDate = document.getElementById('contentCreateDate').value;
        const reportDate = document.getElementById('reportDate').value;
        const totalAudience = document.getElementById('totalAudience').value;

        if (!contentName.trim()) {
            showError('Content name is required');
            return null;
        }

        // Collect funnel data
        const funnelData = [];
        document.querySelectorAll('.funnel-item').forEach(item => {
            const metric = item.querySelector('.funnel-metric').value;
            const metricText = item.querySelector('.funnel-metric').selectedOptions[0].text;
            const value = item.querySelector('.funnel-value').value;
            const percentage = item.querySelector('.funnel-percentage').value;
            
            funnelData.push({
                metric,
                metricText,
                value: parseInt(value) || 0,
                percentage
            });
        });

        // Collect interactivity data
        const interactivityData = [];
        document.querySelectorAll('.interactivity-item').forEach(item => {
            const title = item.querySelector('h4').textContent;
            const value = item.querySelector('.value').textContent;
            const users = item.querySelector('.users').textContent;
            
            interactivityData.push({ title, value, users });
        });

        return {
            contentInfo: {
                name: contentName,
                id: contentId,
                token: contentToken,
                createDate: contentCreateDate,
                reportDate: reportDate
            },
            summary: {
                totalAudience: totalAudience ? parseInt(totalAudience) : null,
                totalImpression: currentMetrics.totalImpressions,
                uniqueImpressions: currentMetrics.uniqueImpressions,
                completionRate: document.getElementById('uniqueCompletionRate').value
            },
            funnel: funnelData,
            interactivity: interactivityData,
            clientLogo: clientLogoDataUrl
        };
    }

    /**
     * Generate report preview HTML
     */
    function generateReportPreview(reportData) {
        const reportPreview = document.getElementById('reportPreview');
        
        const summaryCards = reportData.summary.totalAudience 
            ? `
                <div class="summary-card">
                    <iconify-icon icon="mdi:account-group"></iconify-icon>
                    <div class="value">${reportData.summary.totalAudience.toLocaleString()}</div>
                    <div class="label">Total Audience</div>
                </div>
                <div class="summary-card">
                    <iconify-icon icon="mdi:eye"></iconify-icon>
                    <div class="value">${reportData.summary.totalImpression.toLocaleString()}</div>
                    <div class="label">Total Impression</div>
                </div>
                <div class="summary-card">
                    <iconify-icon icon="mdi:account-multiple"></iconify-icon>
                    <div class="value">${reportData.summary.uniqueImpressions.toLocaleString()}</div>
                    <div class="label">Unique Impression</div>
                </div>
                <div class="summary-card">
                    <iconify-icon icon="mdi:check-circle"></iconify-icon>
                    <div class="value">${reportData.summary.completionRate}</div>
                    <div class="label">Unique Completion Rate</div>
                </div>
            ` : `
                <div class="summary-card">
                    <iconify-icon icon="mdi:eye"></iconify-icon>
                    <div class="value">${reportData.summary.totalImpression.toLocaleString()}</div>
                    <div class="label">Total Impression</div>
                </div>
                <div class="summary-card">
                    <iconify-icon icon="mdi:account-multiple"></iconify-icon>
                    <div class="value">${reportData.summary.uniqueImpressions.toLocaleString()}</div>
                    <div class="label">Unique Impression</div>
                </div>
                <div class="summary-card">
                    <iconify-icon icon="mdi:check-circle"></iconify-icon>
                    <div class="value">${reportData.summary.completionRate}</div>
                    <div class="label">Unique Completion Rate</div>
                </div>
            `;

        const funnelSteps = reportData.funnel.map(item => 
            `<div class="funnel-step">
                <span>${item.metricText}</span>
                <span>${item.value.toLocaleString()}</span>
            </div>`
        ).join('');

        const funnelStats = reportData.funnel.map(item => 
            `<div class="funnel-stat">
                <iconify-icon icon="mdi:chart-line"></iconify-icon>
                <div class="stat-value">${item.percentage}</div>
                <div class="stat-label">${item.value.toLocaleString()} of viewers</div>
            </div>`
        ).join('');

        const interactivityStats = reportData.interactivity.slice(0, 9).map(item => 
            `<div class="interactivity-stat">
                <h4>${item.title}</h4>
                <div class="value">${item.value}</div>
                <div class="percentage">${item.users}</div>
            </div>`
        ).join('');

        const clientLogoHtml = reportData.clientLogo 
            ? `<img src="${reportData.clientLogo}" alt="Client Logo" class="client-logo-preview">` 
            : '';

        reportPreview.innerHTML = `
            <div class="report-header">
                <div class="report-content-info">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                        <strong>Content Name:</strong> ${reportData.contentInfo.name}<br>
                        ${reportData.contentInfo.id ? `<strong>ID:</strong> ${reportData.contentInfo.id}<br>` : ''}
                        ${reportData.contentInfo.token ? `<strong>Token:</strong> ${reportData.contentInfo.token}<br>` : ''}
                        ${reportData.contentInfo.createDate ? `<strong>Content Create Date:</strong> ${reportData.contentInfo.createDate}<br>` : ''}
                        ${reportData.contentInfo.reportDate ? `<strong>Report Date:</strong> ${reportData.contentInfo.reportDate}` : ''}
                    </div>
                    <h1>VQ CONTENT ANALYTICS</h1>
                </div>
                <div class="report-logos">
                    <img src="img/OmmaVQ Black.png" alt="OmmaVQ Logo" class="omma-logo-preview">
                    ${clientLogoHtml}
                </div>
            </div>

            <div class="report-summary">
                <h2>Summary</h2>
                <div class="summary-cards">
                    ${summaryCards}
                </div>
            </div>

            <div class="report-funnel">
                <h2>Funnel</h2>
                <div class="funnel-visualization">
                    ${funnelSteps}
                </div>
                <div class="funnel-stats">
                    ${funnelStats}
                </div>
            </div>

            <div class="report-interactivity">
                <h2>Interactivity</h2>
                <div class="interactivity-stats">
                    ${interactivityStats}
                </div>
            </div>
        `;
    }

    /**
     * Generate PDF from report
     */
    function generatePDF() {
        const reportData = collectReportData();
        if (!reportData) return;

        // Generate the report preview first
        generateReportPreview(reportData);
        
        // Use browser's print functionality to generate PDF
        const printWindow = window.open('', '_blank');
        const reportHtml = document.getElementById('reportPreview').innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportData.contentInfo.name} - Analytics Report</title>
                <style>
                    ${getReportPrintStyles()}
                </style>
            </head>
            <body>
                <div class="report-preview">
                    ${reportHtml}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 1000);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }

    /**
     * Get print-specific styles for PDF generation
     */
    function getReportPrintStyles() {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: white;
                color: #333;
            }
            
            .report-preview {
                background: white;
                padding: 40px;
                max-width: 595px;
                margin: 0 auto;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .report-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .report-content-info {
                flex: 1;
            }
            
            .report-content-info h1 {
                color: #2c3e50;
                font-size: 28px;
                margin-bottom: 20px;
                font-weight: 700;
            }
            
            .report-logos {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }
            
            .omma-logo-preview {
                max-width: 120px;
                height: auto;
            }
            
            .client-logo-preview {
                max-width: 100px;
                max-height: 80px;
                height: auto;
            }
            
            .report-summary h2,
            .report-funnel h2,
            .report-interactivity h2 {
                color: #2c3e50;
                font-size: 20px;
                margin-bottom: 20px;
                font-weight: 600;
            }
            
            .summary-cards {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .summary-card {
                text-align: center;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            
            .summary-card .value {
                font-size: 18px;
                font-weight: bold;
                color: #2c3e50;
                margin: 8px 0 5px;
            }
            
            .summary-card .label {
                font-size: 11px;
                color: #666;
                font-weight: 600;
            }
            
            .funnel-visualization {
                display: flex;
                flex-direction: column;
                gap: 3px;
                max-width: 350px;
                margin-bottom: 20px;
            }
            
            .funnel-step {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                font-size: 14px;
            }
            
            .funnel-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 30px;
            }
            
            .funnel-stat {
                text-align: center;
                padding: 8px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
            }
            
            .funnel-stat .stat-value {
                font-size: 14px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 3px;
            }
            
            .funnel-stat .stat-label {
                font-size: 9px;
                color: #666;
            }
            
            .interactivity-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            
            .interactivity-stat {
                background: white;
                padding: 8px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                text-align: center;
            }
            
            .interactivity-stat h4 {
                color: #2c3e50;
                font-size: 10px;
                margin-bottom: 5px;
                font-weight: 600;
            }
            
            .interactivity-stat .value {
                font-size: 14px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 3px;
            }
            
            .interactivity-stat .percentage {
                font-size: 8px;
                color: #666;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
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
            currentAnalyticsData = { lines, headers, columnIndexes };
            currentMetadata = metadata;
            currentMetrics = metrics;
            
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
        const interactionColumnIndexes = INTERACTION_COLUMNS
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
}); 