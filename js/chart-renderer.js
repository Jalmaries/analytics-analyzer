/**
 * Chart Visualization Module
 * Handles D3.js funnel chart generation with interactive features and theming
 */

import { Utils } from './utils.js';
import { MetricsCalculator } from './metrics-calculator.js';

export class ChartRenderer {
    /**
     * Render D3.js funnel chart
     */
    static renderFunnelChart(containerId, funnelData, options = {}) {
        if (!funnelData || funnelData.length === 0) {
            this.renderEmptyState(containerId);
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container with ID '${containerId}' not found`);
            return;
        }

        try {
            // Clear any existing chart
            container.innerHTML = '';

            // Calculate funnel percentages for visualization
            const funnelWithPercentages = MetricsCalculator.calculateFunnelPercentages(funnelData);
            
            // Check if D3Funnel library is available
            if (typeof D3Funnel !== 'undefined') {
                this.renderD3Funnel(container, funnelWithPercentages, options);
            } else {
                // Fallback to simple funnel
                this.renderSimpleFunnel(container, funnelWithPercentages, options);
            }

        } catch (error) {
            console.error('Error rendering funnel chart:', error);
            this.renderErrorState(container, error.message);
        }
    }

    /**
     * Render D3.js funnel chart
     */
    static renderD3Funnel(container, funnelData, options) {
        // Prepare data for D3 funnel
        const chartData = funnelData.map((item, index) => ({
            label: Utils.formatNumberForPDF(item.value),
            value: item.value,
            formattedValue: Utils.formatNumberForPDF(item.value),
            percentage: item.displayPercentage
        }));

        // Default configuration
        const defaultConfig = {
            chart: {
                width: options.width || 350,
                height: options.height || 300,
                bottomWidth: options.bottomWidth || 1/3,
                bottomPinch: options.bottomPinch || 0,
                inverted: options.inverted || false,
                curve: {
                    enabled: options.curved !== false,
                    height: 20,
                    shade: -0.4
                }
            },
            block: {
                dynamicHeight: true,
                fill: {
                    scale: options.colorScale || [
                        '#667eea', '#764ba2', '#f093fb', 
                        '#f5576c', '#4facfe', '#00f2fe'
                    ],
                    type: 'linear'
                },
                minHeight: options.minHeight || 15,
                highlight: options.interactive !== false
            },
            label: {
                enabled: options.showLabels !== false,
                fontFamily: options.fontFamily || 'Segoe UI, Arial, sans-serif',
                fontSize: options.fontSize || '14px',
                fill: options.labelColor || '#fff'
            },
            tooltip: {
                enabled: options.showTooltips !== false
            },
            animate: options.animate || 0
        };

        // Create and render the chart
        const chart = new D3Funnel(container);
        chart.draw(chartData, defaultConfig);

        // Store chart reference for later use
        container.chartInstance = chart;

        // Add custom event listeners if interactive
        if (options.interactive !== false) {
            this.addChartInteractivity(container, chartData, options);
        }
    }

    /**
     * Render simple funnel fallback
     */
    static renderSimpleFunnel(container, funnelData, options) {
        const maxValue = Math.max(...funnelData.map(item => item.value));
        const colorScale = options.colorScale || [
            '#667eea', '#764ba2', '#f093fb', 
            '#f5576c', '#4facfe', '#00f2fe'
        ];

        const funnelHTML = funnelData.map((item, index) => {
            const width = (item.value / maxValue) * 100;
            const color = colorScale[index % colorScale.length];
            
            return `
                <div class="simple-funnel-step" 
                     style="width: ${width}%; background: ${color}; margin-bottom: 5px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border-radius: 4px;"
                     data-value="${item.value}"
                     data-percentage="${item.displayPercentage}">
                    <span class="funnel-step-label">
                        ${Utils.formatNumberForPDF(item.value)} (${item.displayPercentage})
                    </span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="simple-funnel" style="display: flex; flex-direction: column; align-items: center; gap: 5px; width: 100%; max-width: 300px;">
                ${funnelHTML}
            </div>
        `;

        // Add simple interactivity
        if (options.interactive !== false) {
            this.addSimpleFunnelInteractivity(container, funnelData);
        }
    }

    /**
     * Add interactivity to D3 funnel chart
     */
    static addChartInteractivity(container, chartData, options) {
        const blocks = container.querySelectorAll('.funnel-block');
        
        blocks.forEach((block, index) => {
            block.style.cursor = 'pointer';
            
            // Hover effects
            block.addEventListener('mouseenter', () => {
                block.style.opacity = '0.8';
                
                // Show tooltip if enabled
                if (options.showTooltips !== false) {
                    this.showTooltip(block, chartData[index]);
                }
            });

            block.addEventListener('mouseleave', () => {
                block.style.opacity = '1';
                this.hideTooltip();
            });

            // Click events
            block.addEventListener('click', () => {
                if (options.onItemClick) {
                    options.onItemClick(chartData[index], index);
                }
            });
        });
    }

    /**
     * Add interactivity to simple funnel
     */
    static addSimpleFunnelInteractivity(container, funnelData) {
        const steps = container.querySelectorAll('.simple-funnel-step');
        
        steps.forEach((step, index) => {
            step.style.cursor = 'pointer';
            
            step.addEventListener('mouseenter', () => {
                step.style.transform = 'scale(1.02)';
                step.style.transition = 'transform 0.2s ease';
            });

            step.addEventListener('mouseleave', () => {
                step.style.transform = 'scale(1)';
            });

            step.addEventListener('click', () => {
                Utils.showNotification(
                    `Step ${index + 1}: ${Utils.formatNumberForPDF(funnelData[index].value)} (${funnelData[index].displayPercentage})`,
                    'info'
                );
            });
        });
    }

    /**
     * Show tooltip for chart element
     */
    static showTooltip(element, data) {
        // Remove existing tooltip
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>${data.formattedValue}</strong>
                <br>
                <span>${data.percentage}</span>
            </div>
        `;
        
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;

        // Adjust if tooltip goes off screen
        if (tooltip.getBoundingClientRect().left < 0) {
            tooltip.style.left = '8px';
        }
        if (tooltip.getBoundingClientRect().right > window.innerWidth) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 8}px`;
        }
        if (tooltip.getBoundingClientRect().top < 0) {
            tooltip.style.top = `${rect.bottom + 8}px`;
        }
    }

    /**
     * Hide tooltip
     */
    static hideTooltip() {
        const existingTooltip = document.querySelector('.chart-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }

    /**
     * Render empty state when no data is available
     */
    static renderEmptyState(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #666; text-align: center;">
                <i class="mdi mdi-chart-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <h4 style="margin: 0 0 8px 0; font-weight: 500;">No Chart Data</h4>
                <p style="margin: 0; font-size: 14px;">Configure funnel metrics to display visualization</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    static renderErrorState(container, errorMessage) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div class="chart-error-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #e74c3c; text-align: center;">
                <i class="mdi mdi-alert-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h4 style="margin: 0 0 8px 0; font-weight: 500;">Chart Error</h4>
                <p style="margin: 0; font-size: 14px;">${errorMessage || 'Failed to render chart'}</p>
            </div>
        `;
    }

    /**
     * Generate chart for print/PDF
     */
    static generatePrintChart(funnelData, options = {}) {
        // Create temporary container for print chart
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = 'position: absolute; left: -9999px; top: -9999px;';
        document.body.appendChild(tempContainer);

        try {
            // Render chart without animations for print
            const printOptions = {
                ...options,
                animate: 0,
                interactive: false,
                showTooltips: false,
                width: options.width || 350,
                height: options.height || 300
            };

            this.renderFunnelChart(tempContainer.id || 'temp-chart', funnelData, printOptions);

            // Get the chart HTML
            const chartHTML = tempContainer.innerHTML;
            
            // Clean up
            document.body.removeChild(tempContainer);

            return chartHTML;

        } catch (error) {
            document.body.removeChild(tempContainer);
            throw error;
        }
    }

    /**
     * Create responsive chart that adapts to container size
     */
    static createResponsiveChart(containerId, funnelData, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        const width = Math.max(300, Math.min(containerRect.width, 500));
        const height = Math.max(200, width * 0.6);

        const responsiveOptions = {
            ...options,
            width: width,
            height: height
        };

        this.renderFunnelChart(containerId, funnelData, responsiveOptions);

        // Add resize listener for responsiveness
        const resizeObserver = new ResizeObserver(() => {
            const newRect = container.getBoundingClientRect();
            const newWidth = Math.max(300, Math.min(newRect.width, 500));
            const newHeight = Math.max(200, newWidth * 0.6);

            if (Math.abs(newWidth - width) > 20 || Math.abs(newHeight - height) > 20) {
                const updatedOptions = {
                    ...responsiveOptions,
                    width: newWidth,
                    height: newHeight
                };
                this.renderFunnelChart(containerId, funnelData, updatedOptions);
            }
        });

        resizeObserver.observe(container);

        // Store observer for cleanup
        container.resizeObserver = resizeObserver;
    }

    /**
     * Cleanup chart resources
     */
    static cleanupChart(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Destroy chart instance if it exists
        if (container.chartInstance) {
            if (typeof container.chartInstance.destroy === 'function') {
                container.chartInstance.destroy();
            }
            container.chartInstance = null;
        }

        // Disconnect resize observer
        if (container.resizeObserver) {
            container.resizeObserver.disconnect();
            container.resizeObserver = null;
        }

        // Remove tooltips
        this.hideTooltip();

        // Clear container
        container.innerHTML = '';
    }

    /**
     * Export chart as image (if supported)
     */
    static async exportChartAsImage(containerId, format = 'png') {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('Chart container not found');

        try {
            // For SVG-based charts, we can export directly
            const svgElement = container.querySelector('svg');
            if (svgElement) {
                return await this.exportSVGAsImage(svgElement, format);
            }

            // Fallback: use html2canvas if available
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(container);
                return canvas.toDataURL(`image/${format}`);
            }

            throw new Error('Chart export not supported');

        } catch (error) {
            console.error('Failed to export chart:', error);
            throw error;
        }
    }

    /**
     * Export SVG as image
     */
    static async exportSVGAsImage(svgElement, format) {
        return new Promise((resolve, reject) => {
            try {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = svgElement.clientWidth || 350;
                    canvas.height = svgElement.clientHeight || 300;
                    
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(svgUrl);
                    
                    resolve(canvas.toDataURL(`image/${format}`));
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(svgUrl);
                    reject(new Error('Failed to load SVG for export'));
                };
                
                img.src = svgUrl;

            } catch (error) {
                reject(error);
            }
        });
    }
} 