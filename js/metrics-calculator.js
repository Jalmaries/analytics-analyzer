/**
 * Metrics Calculation Engine
 * Handles analytics calculations and KPI computations
 */

import { CONFIG, AppState } from './config.js';
import { Utils } from './utils.js';

export class MetricsCalculator {
    /**
     * Calculate all metrics from CSV data - EXACT MATCH to original script.js
     */
    static calculateMetrics(lines, columnIndexes) {
        // Find required column indexes exactly like original
        const uniqueIdIndex = columnIndexes.uniqueid;
        const impressionCountIndex = columnIndexes.impression_count;
        const eventCountFinishedIndex = columnIndexes.event_count_finished;
        
        // Find event columns that start with "event_count_" but not "event_count_finished"
        const eventColumnIndexes = [];
        Object.keys(columnIndexes).forEach(key => {
            if (key.startsWith('event_count_') && key !== 'event_count_finished') {
                const index = columnIndexes[key];
                if (index !== -1) {
                    eventColumnIndexes.push({ header: key, index });
                }
            }
        });
        
        // Find optional sum metrics columns
        const thumbnailCountIndex = columnIndexes.thumbnail_count !== -1 ? columnIndexes.thumbnail_count : null;
        const visitCountIndex = columnIndexes.visit_count !== -1 ? columnIndexes.visit_count : null;
        const playCountIndex = columnIndexes.play_count !== -1 ? columnIndexes.play_count : null;
        
        // Find interaction columns for unique interactions calculation
        const interactionColumnIndexes = columnIndexes.interactionColumns || [];
        
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
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            const columns = Utils.parseCSVLine(lines[i]);
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
     * Get available metrics for funnel building
     */
    static getFunnelMetricsOptions() {
        const metrics = [
            { value: 'totalUsers', label: 'Total Users', data: 'totalUsers' },
            { value: 'uniqueVisitors', label: 'Unique Visitors', data: 'uniqueVisitors' },
            { value: 'totalVisitors', label: 'Total Visitors', data: 'totalVisitors' },
            { value: 'uniquePlays', label: 'Unique Plays', data: 'uniquePlays' },
            { value: 'totalPlays', label: 'Total Plays', data: 'totalPlays' },
            { value: 'uniqueImpressions', label: 'Unique Impressions', data: 'uniqueImpressions' },
            { value: 'totalImpressions', label: 'Total Impressions', data: 'totalImpressions' },
            { value: 'uniqueFinished', label: 'Unique Finished', data: 'uniqueFinished' },
            { value: 'totalFinished', label: 'Total Finished', data: 'totalFinished' },
            { value: 'uniqueInteractions', label: 'Unique Interactions', data: 'uniqueInteractions' },
            { value: 'totalInteractions', label: 'Total Interactions', data: 'totalInteractions' }
        ];

        return metrics;
    }

    /**
     * Calculate funnel percentages based on selected metrics
     */
    static calculateFunnelPercentages(funnelData) {
        const results = [];
        
        funnelData.forEach((item, index) => {
            let percentage = 100;
            let calculation = '';
            
            // Get the base metric (first item) for percentage calculation
            const baseMetric = funnelData[0];
            const totalAudienceInput = document.getElementById('totalAudience');
            const totalAudienceValue = totalAudienceInput ? parseInt(totalAudienceInput.value) : null;
            
            if (index === 0) {
                // First item - calculate against total audience if provided
                if (totalAudienceValue && totalAudienceValue > 0) {
                    percentage = ((item.value / totalAudienceValue) * 100).toFixed(2);
                    calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(totalAudienceValue)}`;
                } else {
                    percentage = 100;
                    calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(item.value)}`;
                }
            } else {
                // Subsequent items - calculate against base metric
                if (baseMetric && baseMetric.value > 0) {
                    percentage = ((item.value / baseMetric.value) * 100).toFixed(2);
                    calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(baseMetric.value)}`;
                } else {
                    percentage = 0;
                    calculation = `${Utils.formatNumberForPDF(item.value)}/${Utils.formatNumberForPDF(0)}`;
                }
                
                // Also calculate against previous step
                const previousItem = funnelData[index - 1];
                if (previousItem && previousItem.value > 0) {
                    const stepPercentage = ((item.value / previousItem.value) * 100).toFixed(2);
                    calculation += ` (${stepPercentage}% from previous)`;
                }
            }
            
            results.push({
                ...item,
                percentage: parseFloat(percentage),
                calculation,
                displayPercentage: `${percentage}%`
            });
        });
        
        return results;
    }

    /**
     * Get interaction metrics for reporting
     */
    static getInteractionMetrics(currentMetrics) {
        if (!currentMetrics) return [];

        const interactionMetrics = [];
        
        // Add standard interaction metrics
        interactionMetrics.push({
            name: 'Total Interactions',
            value: currentMetrics.totalInteractions || 0,
            users: currentMetrics.uniqueInteractions || 0,
            icon: 'hand-pointing-right'
        });

        interactionMetrics.push({
            name: 'Unique Interacting Users',
            value: currentMetrics.uniqueInteractions || 0,
            users: currentMetrics.uniqueInteractions || 0,
            icon: 'account-group'
        });

        // Calculate interaction rate
        const interactionRate = currentMetrics.uniqueVisitors > 0 
            ? ((currentMetrics.uniqueInteractions / currentMetrics.uniqueVisitors) * 100).toFixed(2)
            : '0.00';

        interactionMetrics.push({
            name: 'Interaction Rate',
            value: `${interactionRate}%`,
            users: currentMetrics.uniqueInteractions || 0,
            icon: 'percent'
        });

        return interactionMetrics;
    }
} 