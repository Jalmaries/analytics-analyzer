/**
 * Data Processing Engine
 * Handles CSV parsing, validation, and metadata extraction
 */

import { CONFIG, AppState } from './config.js';
import { Utils } from './utils.js';
import { MetricsCalculator } from './metrics-calculator.js';

export class DataProcessor {
    /**
     * Parse CSV file and return content
     */
    static parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const csvContent = e.target.result;
                    resolve(csvContent);
                } catch (error) {
                    reject(new Error('Failed to read CSV file: ' + error.message));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Process CSV content and extract analytics data
     */
    static processData(csvContent, fileName) {
        try {
            // Split into lines and remove empty lines
            const lines = csvContent.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                throw new Error('CSV file is empty');
            }

            // Extract headers from first line
            const headers = Utils.parseCSVLine(lines[0]);
            
            if (headers.length === 0) {
                throw new Error('No headers found in CSV file');
            }

            // Find required column indexes
            const columnIndexes = this.findColumnIndexes(headers);
            
            // Validate required columns exist
            if (columnIndexes.uniqueid === -1) {
                throw new Error('Required column "uniqueid" not found in CSV');
            }

            // Extract metadata from filename
            const metadata = this.extractMetadataFromFilename(fileName);
            
            // Calculate metrics from data
            const metrics = MetricsCalculator.calculateMetrics(lines.slice(1), columnIndexes);
            
            // Store in application state
            AppState.currentAnalyticsData = {
                headers,
                lines: lines.slice(1),
                columnIndexes
            };
            AppState.currentMetadata = metadata;
            AppState.currentMetrics = metrics;

            return { metadata, metrics };

        } catch (error) {
            console.error('Data processing error:', error);
            throw error;
        }
    }

    /**
     * Find column indexes for required fields
     */
    static findColumnIndexes(headers) {
        const columnIndexes = {
            uniqueid: -1,
            visit_count: -1,
            play_count: -1,
            impression_count: -1,
            event_count_finished: -1,
            thumbnail_count: -1,
            first_visited_at: -1,
            last_visited_at: -1,
            first_played_at: -1,
            last_played_at: -1,
            first_impression_at: -1,
            last_impression_at: -1,
            first_received_at_finished: -1,
            last_received_at_finished: -1
        };

        // Find standard columns
        headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            
            if (normalizedHeader === 'uniqueid') {
                columnIndexes.uniqueid = index;
            } else if (normalizedHeader === 'visit_count') {
                columnIndexes.visit_count = index;
            } else if (normalizedHeader === 'play_count') {
                columnIndexes.play_count = index;
            } else if (normalizedHeader === 'impression_count') {
                columnIndexes.impression_count = index;
            } else if (normalizedHeader === 'event_count_finished') {
                columnIndexes.event_count_finished = index;
            } else if (normalizedHeader === 'thumbnail_count') {
                columnIndexes.thumbnail_count = index;
            } else if (normalizedHeader === 'first_visited_at') {
                columnIndexes.first_visited_at = index;
            } else if (normalizedHeader === 'last_visited_at') {
                columnIndexes.last_visited_at = index;
            } else if (normalizedHeader === 'first_played_at') {
                columnIndexes.first_played_at = index;
            } else if (normalizedHeader === 'last_played_at') {
                columnIndexes.last_played_at = index;
            } else if (normalizedHeader === 'first_impression_at') {
                columnIndexes.first_impression_at = index;
            } else if (normalizedHeader === 'last_impression_at') {
                columnIndexes.last_impression_at = index;
            } else if (normalizedHeader === 'first_received_at_finished') {
                columnIndexes.first_received_at_finished = index;
            } else if (normalizedHeader === 'last_received_at_finished') {
                columnIndexes.last_received_at_finished = index;
            }
        });

        // Find interaction columns
        columnIndexes.interactionColumns = [];
        CONFIG.INTERACTION_COLUMNS.forEach(interactionCol => {
            const index = headers.findIndex(header => 
                header.toLowerCase().trim() === interactionCol.toLowerCase()
            );
            if (index !== -1) {
                columnIndexes.interactionColumns.push({
                    name: interactionCol,
                    index: index
                });
            }
        });

        // Find event columns that start with "event_count_" but not "event_count_finished"
        headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            if (normalizedHeader.startsWith('event_count_') && normalizedHeader !== 'event_count_finished') {
                columnIndexes[header] = index;
            }
        });

        return columnIndexes;
    }

    /**
     * Extract metadata from filename
     */
    static extractMetadataFromFilename(fileName) {
        // Remove .csv extension
        const nameWithoutExt = fileName.replace(/\.csv$/i, '');
        
        const metadata = {
            campaignName: 'Unknown Campaign',
            dateRange: 'Unknown Date Range',
            startDate: null,
            endDate: null
        };

        // Try to match different filename patterns
        const patterns = [
            // Pattern: "CampaignName DD_MM_YYYY - DD_MM_YYYY" (no dash after name)
            /^(.+?)\s+(\d{2}_\d{2}_\d{4})\s*-\s*(\d{2}_\d{2}_\d{4})$/,
            // Pattern: "CampaignName - DD_MM_YYYY - DD_MM_YYYY" (with dash after name)
            /^(.+?)\s*-\s*(\d{2}_\d{2}_\d{4})\s*-\s*(\d{2}_\d{2}_\d{4})$/,
            // Pattern: "CampaignName StartDate - EndDate" (YYYY-MM-DD format)
            /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/,
            // Pattern: "CampaignName - YYYY QX DD_MM_YYYY - DD_MM_YYYY"
            /^(.+?)\s*-\s*\d{4}\s+Q\d+\s+(\d{2}_\d{2}_\d{4})\s*-\s*(\d{2}_\d{2}_\d{4})$/,
            // Pattern: "CampaignName YYYY-MM-DD Analytics - Sheet1" (single date with extra text)
            /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+Analytics\s*-\s*Sheet\d+$/,
            // Pattern: "CampaignName YYYY-MM-DD"
            /^(.+?)\s+(\d{4}-\d{2}-\d{2})$/
        ];

        for (const pattern of patterns) {
            const match = nameWithoutExt.match(pattern);
            if (match) {
                metadata.campaignName = match[1].trim();
                
                if (match[2]) {
                    // Parse dates based on format
                    if (match[2].includes('_')) {
                        // DD_MM_YYYY format
                        const [day, month, year] = match[2].split('_');
                        metadata.startDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } else {
                        // YYYY-MM-DD format
                        metadata.startDate = match[2];
                    }
                }
                
                if (match[3]) {
                    if (match[3].includes('_')) {
                        // DD_MM_YYYY format
                        const [day, month, year] = match[3].split('_');
                        metadata.endDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } else {
                        // YYYY-MM-DD format
                        metadata.endDate = match[3];
                    }
                } else if (metadata.startDate) {
                    // Single date, use as both start and end
                    metadata.endDate = metadata.startDate;
                }
                
                if (metadata.startDate && metadata.endDate) {
                    metadata.dateRange = `${metadata.startDate} / ${metadata.endDate}`;
                    metadata.displayDate = `${metadata.startDate} / ${metadata.endDate}`;
                } else if (metadata.startDate) {
                    metadata.dateRange = metadata.startDate;
                    metadata.displayDate = metadata.startDate;
                }
                
                break;
            }
        }

        return metadata;
    }

    /**
     * Get current analytics data
     */
    static getCurrentAnalyticsData() {
        return {
            analyticsData: AppState.currentAnalyticsData,
            metadata: AppState.currentMetadata,
            metrics: AppState.currentMetrics
        };
    }
} 