/**
 * Application Configuration
 * Contains all constants, settings, and configuration options
 */

// Application Configuration
export const CONFIG = {
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

// Application State Management
export const AppState = {
    currentAnalyticsData: null,
    currentMetadata: null,
    currentMetrics: null,
    cropper: null,
    clientLogoDataUrl: null,
    ommaLogoDataUrl: null,
    funnelData: []
}; 