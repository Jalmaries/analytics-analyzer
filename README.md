# Analytics Analyzer

Upload your CSV to view campaign metrics with advanced PDF generation capabilities.

## Features

- **CSV Data Analysis**: Upload and analyze campaign analytics data
- **Interactive Charts**: D3.js powered funnel visualizations
- **Multi-Format PDF Generation**: Choose from different PDF generation methods
- **Responsive Design**: Works on desktop and mobile devices

## PDF Generation Options

### 🏆 Recommended: Advanced PDF (jsPDF + html2canvas)
- **High-quality visuals**: Captures all rendered charts and graphics
- **Text selection**: Adds invisible text layer for copy/paste functionality
- **Multi-page support**: Automatically handles content overflow
- **Cross-browser compatible**: Works in all modern browsers

### 📄 Simple PDF (jsPDF HTML mode)
- **Direct HTML rendering**: Faster generation for simple layouts
- **Lightweight**: Smaller file sizes
- **Basic compatibility**: Good for text-heavy reports

### 🎨 Vector PDF (PDFKit - Optional)
- **True vector graphics**: Scalable charts and shapes
- **Professional quality**: Best for printing and high-resolution displays
- **Requires additional libraries**: PDFKit and blob-stream

## Implementation Details

### Current Libraries Used:
- **jsPDF 2.5.1**: PDF generation framework
- **html2canvas 1.4.1**: HTML to canvas conversion
- **D3.js v7**: Data visualization
- **d3-funnel**: Funnel chart rendering

### Key Improvements Over Browser Print:
1. **Selectable Text**: PDFs maintain text selection capability
2. **Multi-page Support**: Content automatically flows across pages
3. **High Resolution**: 2x scaling for crisp visuals
4. **Custom Styling**: PDF-specific formatting and layout
5. **Cross-platform Consistency**: Same output across all browsers

### Technical Implementation:

```javascript
// Main PDF generation with text layer
async function generateAdvancedPDF(reportData) {
    // 1. Capture HTML as high-resolution canvas
    const canvas = await html2canvas(element, { scale: 2 });
    
    // 2. Create PDF with proper A4 dimensions
    const pdf = new jsPDF({ format: 'a4' });
    
    // 3. Add images with multi-page support
    pdf.addImage(canvas, 'JPEG', 0, 0, width, height);
    
    // 4. Add invisible text layer for selection
    await addTextLayerToPDF(pdf, element, reportData);
    
    // 5. Save with timestamped filename
    pdf.save(filename);
}
```

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## File Structure

```
Analytics Analyzer/
├── index.html          # Main application interface
├── script.js           # Core functionality and PDF generation
├── styles.css          # Styling and responsive design
├── img/               # Logo and image assets
└── Example Data/      # Sample CSV files for testing
```

## Usage

1. **Upload CSV**: Drag and drop or select your analytics CSV file
2. **Create Report**: Click "Create Report" to configure report parameters
3. **Choose PDF Method**: Select from three PDF generation options:
   - **Generate PDF (Recommended)**: Best quality with text selection
   - **Simple PDF**: Quick generation for basic needs
   - **Vector PDF**: Professional vector graphics (requires additional setup)

## Advanced Configuration

### Adding Vector PDF Support (Optional):
```html
<!-- Add these CDN links for vector PDF generation -->
<script src="https://cdn.jsdelivr.net/npm/pdfkit@0.13.0/js/pdfkit.standalone.js"></script>
<script src="https://github.com/devongovett/blob-stream/releases/download/v0.1.3/blob-stream.js"></script>
```

### Customizing PDF Output:
- Modify `addTextLayerToPDF()` function for custom text positioning
- Adjust `html2canvas` options for different quality/performance trade-offs
- Customize PDF page formatting in `generateAdvancedPDF()` 