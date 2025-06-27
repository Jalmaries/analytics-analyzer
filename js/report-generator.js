/**
 * Report Generator Module
 * Generates HTML reports - EXACT MATCH to original script.js
 */

import { CONFIG, AppState } from './config.js';
import { Utils } from './utils.js';
import { MetricsCalculator } from './metrics-calculator.js';

export class ReportGenerator {
    /**
     * Generate report preview - EXACT MATCH to original script.js
     */
    static generateReportPreview(reportData) {
        try {
            if (!reportData) {
                Utils.showError('No report data provided');
                return;
            }

            if (!reportData.funnelItems || reportData.funnelItems.length === 0) {
                Utils.showError('No funnel data available. Please ensure CSV data is loaded and funnel is configured.');
                return;
            }

            // Use cropped logos if available, otherwise use originals
            const ommaLogoSrc = AppState.ommaLogoDataUrl || 'img/OmmaVQ Black.png';
            const clientLogoPreviewEl = document.getElementById('clientLogoPreview');
            const clientLogoSrc = AppState.clientLogoDataUrl || clientLogoPreviewEl?.querySelector('img')?.src || 'data:';

            // Get current analytics data for summary
            const currentData = this.getCurrentAnalyticsData();

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
                                calculation = totalAudienceValue ? `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(totalAudienceValue)}` : `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(item.value)}`;
                            } else {
                                // Find the base metric value
                                const availableMetrics = this.getFunnelMetricsOptions();
                                const baseMetric = availableMetrics.find(m => m.value === percentageBase);
                                calculation = baseMetric ? `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(baseMetric.data)}` : `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(item.value)}`;
                            }
                        } else {
                            calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(item.value)}`;
                        }
                    } else {
                        percentage = 100;
                        calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(item.value)}`;
                    }
                } else {
                    // Calculate percentage relative to previous item (funnel logic)
                    const previousValue = reportData.funnelItems[index - 1].value;
                    percentage = previousValue > 0 ? Math.round((item.value / previousValue) * 100) : 0;
                    calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(previousValue)}`;
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
                    } else if (metricName.includes('content finished') || metricName.includes('total content finished')) {
                        icon = 'mdi:check-circle';
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
                                    <div class="value">${Utils.formatNumberForPDF(value)}</div>
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
                            <div class="content-title">${reportData.contentName.toLowerCase()}</div>
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

            // Set the report HTML in the preview container
            const previewContainer = document.getElementById('reportPreview');
            if (previewContainer) {
                previewContainer.innerHTML = reportHTML;
            }

            // Generate D3 funnel after DOM is ready
            setTimeout(() => {
                this.generateD3Funnel(reportData.funnelItems);
            }, 100);

        } catch (error) {
            console.error('Error generating report preview:', error);
            Utils.showError('Failed to generate report preview: ' + error.message);
        }
    }

    /**
     * Get current analytics data - EXACT MATCH to original script.js
     */
    static getCurrentAnalyticsData() {
        if (!AppState.currentMetrics || !AppState.currentAnalyticsData) {
            return { summary: {}, events: {} };
        }

        // Build summary data in the correct order
        const summary = {};

        // Add Total Audience first if available (optional) - ONLY if user manually entered it
        const totalAudienceInput = document.getElementById('totalAudience');
        if (totalAudienceInput && totalAudienceInput.value) {
            summary['Total Audience'] = Utils.formatNumberForPDF(parseInt(totalAudienceInput.value));
        }

        // Add required metrics
        summary['Total Impressions'] = Utils.formatNumberForPDF(AppState.currentMetrics.totalImpressions);
        summary['Unique Impressions'] = Utils.formatNumberForPDF(AppState.currentMetrics.uniqueImpressions);
        
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
                const formattedName = Utils.toTitleCase(displayName);
                events[formattedName] = value;
            });
        }

        return { summary, events };
    }

    /**
     * Get funnel metrics options - EXACT MATCH to original script.js
     */
    static getFunnelMetricsOptions() {
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
     * Generate D3 funnel chart - EXACT MATCH to original script.js
     */
    static generateD3Funnel(funnelData) {
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
            label: Utils.formatNumberForPDF(item.value), // Show value instead of metric name
            value: item.value,
            formattedValue: Utils.formatNumberForPDF(item.value)
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
} 