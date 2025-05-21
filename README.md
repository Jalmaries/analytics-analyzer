# Analytics Data Analyzer

A web-based tool for processing and analyzing marketing analytics CSV data with a focus on extracting key performance metrics.

## Features

- **CSV File Processing**: Upload CSV files via drag-and-drop or file selection
- **Key Metrics Calculation**:
  - Total Users (excluding users with ID "X001")
  - Total Impressions (sum of impression_count, excluding X001 users)
  - Unique Impressions (count of users with impression_count > 0, excluding X001 users)
  - Completions (count of users with event_count_finished > 0, excluding X001 users)
  - Various event metrics (all users included, even X001)
- **MissingID Detection**: Identifies and counts records with "MissingID-" prefix
- **Data Export**: Download CSV files containing extracted MissingIDs
- **One-Click Copy**: Click on any metric to copy its raw value to clipboard
- **Smart Filename Parsing**: Automatically extracts campaign names and dates from filenames

## How to Use

1. Open the `index.html` file in your web browser
2. Upload a CSV file using one of the following methods:
   - Drag and drop the file onto the designated area
   - Click the "Select File" button and choose a file
3. View the analysis results in the dashboard
4. Click on any metric card to copy its raw value to clipboard
5. If MissingIDs are detected, use the "Download List" button to export them

## Project Structure

- `index.html`: The main HTML file containing the structure of the application
- `styles.css`: Contains all styling for the application
- `script.js`: JavaScript code for processing CSV files and calculating metrics

## CSV Format Requirements

The application expects CSV files with the following columns:
- `uniqueid` or `id`: Unique identifier for each user
- `impression_count`: Number of impressions for each user
- `event_count_finished`: Number of completed views

Additional `event_` prefixed columns will be included in the analysis.

## Special ID Handling

- Records with ID "X001" are excluded from user counts, impressions, and completions
- IDs starting with "MissingID-" are tracked and can be exported separately

## Development

This project uses vanilla JavaScript, HTML and CSS without any external dependencies, making it easy to run locally without any setup.

### Extending the Application

To add new features:
1. Modify the HTML structure in `index.html`
2. Add necessary styles in `styles.css`
3. Implement functionality in `script.js`

Key JavaScript functions:
- `processData()`: Main data processing entry point
- `calculateMetrics()`: Handles calculations of all metrics
- `extractMetadataFromFilename()`: Parses campaign names and dates
- `findColumnIndexes()`: Locates required data columns
- `displayResults()`: Renders analysis results 