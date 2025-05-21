# Analytics Data Analyzer

A simple web application that allows you to upload CSV files containing analytics data and process them according to specific requirements.

## Features

- Upload CSV files via drag-and-drop or file selection
- Automatically analyze data based on predefined metrics
- Calculate unique user count (excluding users with ID "X001")
- Calculate total impressions (sum of impression_count, excluding X001 users)
- Calculate unique impressions (count of users with impression_count > 0, excluding X001 users)
- Calculate event_count_finished (count of users with event_count_finished > 0, excluding X001 users)
- Sum all other event_ prefixed columns (including all users, even X001)
- Responsive design that works on all devices

## How to Use

1. Open the index.html file in your web browser
2. Drag and drop a CSV file onto the designated area or click to select a file
3. The application will automatically process the data and display results
4. Results will show counts and sums according to the requirements

## CSV File Requirements

Your CSV file should include the following columns:
- `uniqueid` or `id`: A unique identifier for each user
- `impression_count`: The number of impressions for each user
- `event_count_finished`: Count of finished events for each user
- Other columns with the prefix `event_` will also be summed (these will include all users)

## Processing Rules

- Users with ID "X001" are excluded from the following calculations:
  - Unique user count
  - Total impressions
  - Unique impressions
  - Event count finished
- All users (including X001) are included when summing other event_ prefixed columns

## Technology

This application is built using pure HTML, CSS, and JavaScript without any external dependencies or server requirements. 