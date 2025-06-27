/**
 * PDF Generator Module
 * Handles PDF generation using browser's native print functionality - EXACT MATCH to original script.js
 */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { ReportGenerator } from './report-generator.js';

export class PDFGenerator {
    /**
     * Generate PDF using browser's print dialog - EXACT MATCH to original script.js
     */
    static async generatePDF(reportData) {
        try {
            if (!reportData) {
                Utils.showError('Please fill in the required report information first.');
                return;
            }

            // Generate the report preview first to ensure all data is ready
            ReportGenerator.generateReportPreview(reportData);
            
            // Wait for the report to be fully rendered
            setTimeout(() => {
                try {
                    // Get the report HTML
                    const reportElement = document.getElementById('reportPreview');
                    if (!reportElement) {
                        Utils.showError('Report preview not found. Please try generating a preview first.');
                        return;
                    }

                    const reportHTML = reportElement.innerHTML;
                    
                    if (!reportHTML || reportHTML.trim() === '') {
                        Utils.showError('Report content is empty. Please try again.');
                        return;
                    }
                    
                    // Create a new window for printing
                    const printWindow = window.open('', '_blank');
                    
                    if (!printWindow) {
                        Utils.showError('Could not open print window. Please check your popup blocker settings.');
                        return;
                    }
                    
                    // Write the complete HTML document
                    printWindow.document.write(this.createPrintHTML(reportData, reportHTML));
                    printWindow.document.close();
                } catch (error) {
                    Utils.showError('Failed to generate PDF: ' + error.message);
                    console.error('PDF generation error:', error);
                }
            }, CONFIG.PRINT_TIMEOUT);
        } catch (error) {
            Utils.showError('Failed to initialize PDF generation: ' + error.message);
            console.error('PDF initialization error:', error);
        }
    }

    /**
     * Create the HTML content for printing - EXACT MATCH to original script.js
     */
    static createPrintHTML(reportData, reportHTML) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${reportData.contentName} - Analytics Report - ${reportData.reportDate}</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css">
                <script src="https://d3js.org/d3.v7.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/d3-funnel@2.0.0/dist/d3-funnel.min.js"></script>
                <style>
                    ${this.getPrintStyles()}
                </style>
            </head>
            <body>
                <div style="width: 210mm; margin: 0 auto; background: white;">
                    ${reportHTML}
                </div>
                <script>
                    ${this.getPrintScript(reportData)}
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Get print-specific styles - EXACT MATCH to original script.js
     */
    static getPrintStyles() {
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
            
            .content-title {
                color: #2c3e50;
                font-size: 18px;
                font-weight: 600;
                text-transform: uppercase;
                text-align: center;
                margin-top: 10px;
                letter-spacing: 1px;
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
     * Get print-specific JavaScript - EXACT MATCH to original script.js
     */
    static getPrintScript(reportData) {
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
            
            function formatNumberForPrint(value) {
                if (typeof value !== 'number') {
                    value = parseInt(value) || 0;
                }
                return value.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
            }
            
            function generatePrintFunnel(funnelData, funnelContainer) {
                if (!funnelContainer || !window.D3Funnel) return;

                // Clear previous funnel
                funnelContainer.innerHTML = '';

                // Calculate dimensions to be proportional to data values
                const statsListHeight = Math.max(funnelData.length * 50, 250); // Ensure minimum height
                const funnelWidth = 250; // Match reference funnel width

                // Prepare data for D3 Funnel
                const data = funnelData.map(item => ({
                    label: formatNumberForPrint(item.value), // Show value instead of metric name
                    value: item.value,
                    formattedValue: formatNumberForPrint(item.value)
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
} 