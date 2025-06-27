/**
 * UI Management Module
 * Handles modal functionality, form validation, funnel builder, and UI state management
 */

import { CONFIG, AppState } from './config.js';
import { Utils } from './utils.js';
import { MetricsCalculator } from './metrics-calculator.js';
import { ReportGenerator } from './report-generator.js';

export class UIManager {
    constructor() {
        this.currentFunnelCount = CONFIG.FUNNEL.DEFAULT_ITEMS;
        this.initializeUI();
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        this.setupFunnelCountControls();
        this.setupClientLogoUpload();
        this.setupModalControls();
    }

    /**
     * Setup funnel count controls
     */
    setupFunnelCountControls() {
        const funnelMinusBtn = document.getElementById('funnelMinusBtn');
        const funnelPlusBtn = document.getElementById('funnelPlusBtn');
        const funnelCountDisplay = document.getElementById('funnelCountDisplay');

        if (!funnelMinusBtn || !funnelPlusBtn || !funnelCountDisplay) return;

        const updateButtonStates = () => {
            if (funnelMinusBtn) funnelMinusBtn.disabled = this.currentFunnelCount <= CONFIG.FUNNEL.MIN_ITEMS;
            if (funnelPlusBtn) funnelPlusBtn.disabled = this.currentFunnelCount >= CONFIG.FUNNEL.MAX_ITEMS;
        };

        funnelMinusBtn.addEventListener('click', () => {
            if (this.currentFunnelCount > CONFIG.FUNNEL.MIN_ITEMS) {
                this.currentFunnelCount--;
                funnelCountDisplay.textContent = this.currentFunnelCount;
                this.updateFunnelBuilder();
                updateButtonStates();
            }
        });

        funnelPlusBtn.addEventListener('click', () => {
            if (this.currentFunnelCount < CONFIG.FUNNEL.MAX_ITEMS) {
                this.currentFunnelCount++;
                funnelCountDisplay.textContent = this.currentFunnelCount;
                this.updateFunnelBuilder();
                updateButtonStates();
            }
        });

        updateButtonStates();
        this.updateFunnelBuilder();
    }

    /**
     * Update funnel builder with current count
     */
    updateFunnelBuilder() {
        const funnelBuilder = document.getElementById('funnelBuilder');
        if (!funnelBuilder) return;

        const availableMetrics = MetricsCalculator.getFunnelMetricsOptions();
        funnelBuilder.innerHTML = '';

        for (let i = 0; i < this.currentFunnelCount; i++) {
            const funnelItem = this.createFunnelItem(i, availableMetrics);
            funnelBuilder.appendChild(funnelItem);
        }

        this.setupFunnelDragAndDrop();
    }

    /**
     * Create a funnel item
     */
    createFunnelItem(index, availableMetrics) {
        const funnelItem = document.createElement('div');
        funnelItem.className = 'funnel-item';
        funnelItem.setAttribute('data-index', index);
        funnelItem.draggable = true;

        // Create funnel step number
        const stepNumber = document.createElement('div');
        stepNumber.className = 'funnel-order';
        stepNumber.innerHTML = `<i class="mdi mdi-numeric-${index + 1}-circle"></i>`;

        // Create metric selection dropdown
        const select = document.createElement('select');
        select.innerHTML = '<option value="">Select metric</option>';
        
        availableMetrics.forEach(metric => {
            const option = document.createElement('option');
            option.value = metric.value;
            option.textContent = metric.label;
            option.setAttribute('data-value', metric.data);
            select.appendChild(option);
        });

        // Create custom value input
        const customInput = document.createElement('input');
        customInput.type = 'number';
        customInput.placeholder = 'Custom value';
        customInput.style.display = 'none';

        // Create metric label
        const metricLabel = document.createElement('div');
        metricLabel.className = 'funnel-metric-label';
        metricLabel.textContent = `Step ${index + 1}`;

        // Handle metric selection
        select.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            const metricValue = selectedOption ? selectedOption.getAttribute('data-value') : null;
            
            if (metricValue === 'custom') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
                this.updateFunnelItemData(index, metricValue, availableMetrics);
            }
        });

        customInput.addEventListener('input', (e) => {
            const customValue = e.target.value;
            if (customValue) {
                this.updateFunnelItemData(index, customValue, availableMetrics);
            }
        });

        funnelItem.appendChild(stepNumber);
        funnelItem.appendChild(metricLabel);
        funnelItem.appendChild(select);
        funnelItem.appendChild(customInput);

        return funnelItem;
    }

    /**
     * Setup funnel drag and drop functionality
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

    /**
     * Handle drag start
     */
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-index'));
        e.target.classList.add('dragging');
    }

    /**
     * Handle drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    /**
     * Handle drag enter
     */
    handleDragEnter(e) {
        e.preventDefault();
        if (e.target.classList.contains('funnel-item')) {
            e.target.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        if (e.target.classList.contains('funnel-item')) {
            e.target.classList.remove('drag-over');
        }
    }

    /**
     * Handle funnel drop
     */
    handleFunnelDrop(e) {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = parseInt(e.target.getAttribute('data-index'));
        
        if (fromIndex !== toIndex && !isNaN(fromIndex) && !isNaN(toIndex)) {
            this.swapFunnelItems(fromIndex, toIndex);
        }
        
        // Remove drag styling
        document.querySelectorAll('.funnel-item').forEach(item => {
            item.classList.remove('drag-over', 'dragging');
        });
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.funnel-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    /**
     * Swap funnel items
     */
    swapFunnelItems(fromIndex, toIndex) {
        const funnelBuilder = document.getElementById('funnelBuilder');
        if (!funnelBuilder) return;

        const items = Array.from(funnelBuilder.children);
        const fromItem = items[fromIndex];
        const toItem = items[toIndex];

        if (fromItem && toItem) {
            // Swap DOM elements
            const tempNextSibling = fromItem.nextSibling;
            const tempParent = fromItem.parentNode;
            
            toItem.parentNode.insertBefore(fromItem, toItem.nextSibling);
            tempParent.insertBefore(toItem, tempNextSibling);

            // Update data-index attributes
            items.forEach((item, index) => {
                item.setAttribute('data-index', index);
                const metricLabel = item.querySelector('.funnel-metric-label');
                if (metricLabel) {
                    metricLabel.textContent = `Step ${index + 1}`;
                }
                
                const stepNumber = item.querySelector('.funnel-order');
                if (stepNumber) {
                    stepNumber.innerHTML = `<i class="mdi mdi-numeric-${index + 1}-circle"></i>`;
                }
            });
        }
    }

    /**
     * Update funnel item data
     */
    updateFunnelItemData(index, metricValue, availableMetrics) {
        if (!AppState.currentMetrics) return;

        let value = 0;
        if (typeof metricValue === 'string' && availableMetrics) {
            const metric = availableMetrics.find(m => m.data === metricValue);
            if (metric && AppState.currentMetrics[metricValue]) {
                value = AppState.currentMetrics[metricValue];
            }
        } else if (typeof metricValue === 'number' || !isNaN(metricValue)) {
            value = parseInt(metricValue);
        }

        // Store funnel data for later use
        if (!AppState.funnelData) AppState.funnelData = [];
        AppState.funnelData[index] = {
            metric: metricValue,
            value: value,
            step: index + 1
        };
    }

    /**
     * Setup client logo upload functionality - EXACT MATCH to original script.js
     */
    setupClientLogoUpload() {
        const clientLogoUpload = document.getElementById('clientLogoUpload');
        const clientLogoInput = document.getElementById('clientLogoInput');
        const uploadClientLogoBtn = document.getElementById('uploadClientLogoBtn');
        
        if (!clientLogoInput) return;

        // Handle click on upload area
        if (clientLogoUpload) {
            clientLogoUpload.addEventListener('click', () => {
                clientLogoInput.click();
            });
        }

        // Handle click on upload button
        if (uploadClientLogoBtn) {
            uploadClientLogoBtn.addEventListener('click', () => {
                clientLogoInput.click();
            });
        }

        // Handle file selection
        clientLogoInput.addEventListener('change', (event) => {
            this.handleClientLogoUpload(event);
        });
    }

    /**
     * Handle client logo upload - EXACT MATCH to original script.js
     */
    handleClientLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const clientLogoPreview = document.getElementById('clientLogoPreview');
            const clientLogoUpload = document.getElementById('clientLogoUpload');
            const clientLogoImg = document.getElementById('clientLogoImg');
            const uploadClientLogoBtn = document.getElementById('uploadClientLogoBtn');
            
            if (clientLogoImg && clientLogoPreview && clientLogoUpload) {
                // First set the image
                clientLogoImg.src = e.target.result;
                clientLogoPreview.style.display = 'block';
                clientLogoUpload.style.display = 'none';
                
                // Hide the upload button
                if (uploadClientLogoBtn) {
                    uploadClientLogoBtn.style.display = 'none';
                }
                
                // Auto-crop the client logo after it loads
                setTimeout(() => {
                    this.autoCropClientLogo();
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
                        if (uploadClientLogoBtn) {
                            uploadClientLogoBtn.style.display = 'block';
                        }
                        changeBtn.remove();
                        AppState.clientLogoDataUrl = null;
                    });
                    clientLogoPreview.appendChild(changeBtn);
                }
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Generic auto-crop function to reduce code duplication - EXACT MATCH to original script.js
     */
    autoCropImage(imageElement, onSuccess, onError) {
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
        img.onload = () => {
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
        
        img.onerror = () => {
            onError('Failed to load image for auto-cropping');
        };
        
        img.src = imageElement.src;
    }

    /**
     * Auto-crop client logo by removing transparent areas - EXACT MATCH to original script.js
     */
    autoCropClientLogo() {
        const clientLogoImg = document.getElementById('clientLogoImg');
        
        this.autoCropImage(
            clientLogoImg,
            (croppedDataURL) => {
                clientLogoImg.src = croppedDataURL;
                AppState.clientLogoDataUrl = croppedDataURL; // Store for PDF generation
                Utils.showNotification('Client logo auto-cropped successfully!', 'success');
            },
            (errorMessage) => {
                Utils.showNotification(errorMessage, 'warning');
            }
        );
    }

    /**
     * Setup modal controls
     */
    setupModalControls() {
        // Preview modal
        const previewModal = document.getElementById('previewModal');
        const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');

        if (closePreviewModalBtn) {
            closePreviewModalBtn.addEventListener('click', () => {
                this.closePreviewModal();
            });
        }

        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            if (previewModal && event.target === previewModal) {
                this.closePreviewModal();
            }
        });
    }

    /**
     * Close preview modal
     */
    closePreviewModal() {
        const previewModal = document.getElementById('previewModal');
        if (previewModal) {
            previewModal.style.display = 'none';
        }
    }

    /**
     * Populate interactivity data in the UI
     */
    populateInteractivityData() {
        const interactivityGrid = document.getElementById('interactivityGrid');
        if (!interactivityGrid || !AppState.currentMetrics) return;

        const interactionMetrics = MetricsCalculator.getInteractionMetrics(AppState.currentMetrics);
        
        interactivityGrid.innerHTML = '';
        
        interactionMetrics.forEach(metric => {
            const interactivityItem = document.createElement('div');
            interactivityItem.className = 'interactivity-item';
            
            interactivityItem.innerHTML = `
                <div class="interactivity-header">
                    <i class="mdi mdi-${metric.icon}"></i>
                    <h4>${metric.name}</h4>
                </div>
                <div class="value">${metric.value}</div>
                <div class="users">${Utils.formatNumberForPDF(metric.users)} users</div>
            `;
            
            interactivityGrid.appendChild(interactivityItem);
        });
    }

    /**
     * Collect all form data from the report modal - EXACT MATCH to original script.js
     */
    collectReportData() {
        try {
            // Get form elements
            const contentNameEl = document.getElementById('contentName');
            const contentIdEl = document.getElementById('contentId');
            const contentTokenEl = document.getElementById('contentToken');
            const contentCreateDateEl = document.getElementById('contentCreateDate');
            const reportDateEl = document.getElementById('reportDate');

            if (!contentNameEl) {
                Utils.showError('Content name field not found');
                return null;
            }

            const contentName = contentNameEl.value;
            const contentId = contentIdEl?.value || '';
            const contentToken = contentTokenEl?.value || '';
            const contentCreateDate = contentCreateDateEl?.value || '';
            const reportDate = reportDateEl?.value || '';

            if (!contentName.trim()) {
                Utils.showError('Content name is required');
                return null;
            }

            // Collect funnel data
            const funnelItems = [];
            const funnelElements = document.querySelectorAll('.funnel-item');
            
            if (funnelElements.length === 0) {
                console.warn('No funnel items found, creating default funnel items');
                // Create default funnel items if none exist
                const availableMetrics = ReportGenerator.getFunnelMetricsOptions();
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
                                    const availableMetrics = ReportGenerator.getFunnelMetricsOptions();
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
            Utils.showError('Failed to collect report data: ' + error.message);
            console.error('Error collecting report data:', error);
            return null;
        }
    }

    /**
     * Show processing state
     */
    showProcessing(show, message = 'Processing...') {
        // Implementation for showing loading states
        const loadingElements = document.querySelectorAll('.loading-overlay');
        
        if (show) {
            // Create loading overlay if it doesn't exist
            if (loadingElements.length === 0) {
                const overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `
                    <div class="loading-content">
                        <div class="spinner"></div>
                        <p>${message}</p>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
        } else {
            // Remove loading overlays
            loadingElements.forEach(element => {
                element.remove();
            });
        }
    }
} 