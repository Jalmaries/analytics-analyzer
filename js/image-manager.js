/**
 * Image Management Module
 * Handles logo upload, image cropping, optimization, and processing with Base64 encoding
 */

import { AppState } from './config.js';
import { Utils } from './utils.js';

export class ImageManager {
    /**
     * Initialize image upload functionality
     */
    static initializeImageUpload(uploadElementId, inputElementId, previewElementId, options = {}) {
        const uploadElement = document.getElementById(uploadElementId);
        const inputElement = document.getElementById(inputElementId);
        const previewElement = document.getElementById(previewElementId);

        if (!uploadElement || !inputElement) {
            console.warn('Image upload elements not found');
            return;
        }

        // Set up click handler for upload area
        uploadElement.addEventListener('click', () => {
            inputElement.click();
        });

        // Set up drag and drop
        this.setupDragAndDrop(uploadElement, inputElement, options);

        // Set up file input change handler
        inputElement.addEventListener('change', (event) => {
            this.handleFileSelection(event, previewElement, options);
        });
    }

    /**
     * Setup drag and drop functionality
     */
    static setupDragAndDrop(uploadElement, inputElement, options) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadElement.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadElement.addEventListener(eventName, () => {
                uploadElement.classList.add('drag-highlight');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadElement.addEventListener(eventName, () => {
                uploadElement.classList.remove('drag-highlight');
            }, false);
        });

        // Handle dropped files
        uploadElement.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const mockEvent = { target: { files: files } };
                this.handleFileSelection(mockEvent, null, options);
            }
        }, false);
    }

    /**
     * Prevent default drag behaviors
     */
    static preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file selection
     */
    static handleFileSelection(event, previewElement, options = {}) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!this.validateFileType(file, options.allowedTypes)) {
            Utils.showError('Please select a valid image file (JPG, PNG, GIF, or SVG)');
            return;
        }

        // Validate file size
        if (!this.validateFileSize(file, options.maxSize)) {
            const maxSizeMB = (options.maxSize || 5000000) / 1000000;
            Utils.showError(`File size must be less than ${maxSizeMB}MB`);
            return;
        }

        // Process the image
        this.processImage(file, previewElement, options);
    }

    /**
     * Validate file type
     */
    static validateFileType(file, allowedTypes) {
        const defaultTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
        const types = allowedTypes || defaultTypes;
        return types.includes(file.type);
    }

    /**
     * Validate file size
     */
    static validateFileSize(file, maxSize) {
        const maxSizeBytes = maxSize || 5000000; // 5MB default
        return file.size <= maxSizeBytes;
    }

    /**
     * Process uploaded image
     */
    static processImage(file, previewElement, options = {}) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            
            // Show preview if preview element exists
            if (previewElement) {
                this.showImagePreview(previewElement, imageDataUrl, options);
            }

            // Auto-crop if enabled
            if (options.autoCrop !== false) {
                this.autoCropImage(imageDataUrl, options);
            } else {
                // Store original image
                AppState.clientLogoDataUrl = imageDataUrl;
                Utils.showNotification('Image uploaded successfully', 'success');
            }

            // Trigger callback if provided
            if (options.onImageProcessed) {
                options.onImageProcessed(imageDataUrl);
            }
        };

        reader.onerror = () => {
            Utils.showError('Failed to read image file');
        };

        reader.readAsDataURL(file);
    }

    /**
     * Show image preview
     */
    static showImagePreview(previewElement, imageDataUrl, options) {
        const imgElement = previewElement.querySelector('img') || document.createElement('img');
        imgElement.src = imageDataUrl;
        imgElement.style.cssText = `
            max-width: 100%;
            max-height: 150px;
            object-fit: contain;
            border-radius: 4px;
        `;

        if (!previewElement.contains(imgElement)) {
            previewElement.innerHTML = '';
            previewElement.appendChild(imgElement);
        }

        previewElement.style.display = 'block';

        // Hide upload area if configured
        if (options.hideUploadOnPreview) {
            const uploadElement = document.getElementById(options.uploadElementId);
            if (uploadElement) {
                uploadElement.style.display = 'none';
            }
        }
    }

    /**
     * Auto-crop image to optimal dimensions
     */
    static autoCropImage(imageDataUrl, options = {}) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set target dimensions
            const targetWidth = options.targetWidth || 120;
            const targetHeight = options.targetHeight || 60;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // Calculate scaling to maintain aspect ratio
            const scaleX = targetWidth / img.width;
            const scaleY = targetHeight / img.height;
            const scale = Math.min(scaleX, scaleY);
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // Center the image
            const x = (targetWidth - scaledWidth) / 2;
            const y = (targetHeight - scaledHeight) / 2;
            
            // Fill with background color
            const bgColor = options.backgroundColor || 'white';
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            
            // Draw the scaled image
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            // Store the cropped image data
            const croppedDataUrl = canvas.toDataURL(options.outputFormat || 'image/png', options.quality || 0.8);
            AppState.clientLogoDataUrl = croppedDataUrl;
            
            Utils.showNotification('Image processed successfully', 'success');

            // Update preview with cropped image
            if (options.previewElement) {
                this.showImagePreview(options.previewElement, croppedDataUrl, options);
            }
        };
        
        img.onerror = () => {
            Utils.showError('Failed to process image');
        };
        
        img.src = imageDataUrl;
    }

    /**
     * Open advanced image cropping modal
     */
    static openCropModal(imageDataUrl, options = {}) {
        const cropModal = document.getElementById('cropModal');
        const cropImage = document.getElementById('cropImage');
        
        if (!cropModal || !cropImage) {
            console.warn('Crop modal elements not found');
            return;
        }

        // Set image source
        cropImage.src = imageDataUrl;
        cropModal.style.display = 'flex';

        // Initialize cropper when image loads
        cropImage.onload = () => {
            this.initializeCropper(cropImage, options);
        };
    }

    /**
     * Initialize image cropper (if Cropper.js is available)
     */
    static initializeCropper(imageElement, options = {}) {
        // Destroy existing cropper
        if (AppState.cropper) {
            AppState.cropper.destroy();
        }

        // Check if Cropper.js is available
        if (typeof Cropper !== 'undefined') {
            AppState.cropper = new Cropper(imageElement, {
                aspectRatio: options.aspectRatio || 2, // 2:1 ratio for logos
                viewMode: options.viewMode || 1,
                dragMode: options.dragMode || 'move',
                autoCropArea: options.autoCropArea || 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                ready: () => {
                    Utils.showNotification('Image cropper ready', 'info');
                }
            });
        } else {
            Utils.showError('Image cropping library not available');
        }
    }

    /**
     * Apply crop and get cropped image
     */
    static applyCrop(options = {}) {
        if (!AppState.cropper) {
            Utils.showError('No cropper instance available');
            return;
        }

        try {
            // Get cropped canvas
            const canvas = AppState.cropper.getCroppedCanvas({
                width: options.width || 120,
                height: options.height || 60,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            // Convert to data URL
            const croppedDataUrl = canvas.toDataURL(options.format || 'image/png', options.quality || 0.8);
            
            // Store cropped image
            AppState.clientLogoDataUrl = croppedDataUrl;
            
            // Close crop modal
            this.closeCropModal();
            
            // Update preview
            if (options.previewElementId) {
                const previewElement = document.getElementById(options.previewElementId);
                if (previewElement) {
                    this.showImagePreview(previewElement, croppedDataUrl, options);
                }
            }
            
            Utils.showNotification('Image cropped successfully', 'success');
            
            return croppedDataUrl;

        } catch (error) {
            Utils.showError('Failed to crop image: ' + error.message);
        }
    }

    /**
     * Close crop modal
     */
    static closeCropModal() {
        const cropModal = document.getElementById('cropModal');
        if (cropModal) {
            cropModal.style.display = 'none';
        }
        
        // Destroy cropper instance
        if (AppState.cropper) {
            AppState.cropper.destroy();
            AppState.cropper = null;
        }
    }

    /**
     * Optimize image for web/print
     */
    static optimizeImage(imageDataUrl, options = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate optimal dimensions
                const maxWidth = options.maxWidth || 800;
                const maxHeight = options.maxHeight || 600;
                
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw optimized image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Get optimized data URL
                const quality = options.quality || 0.8;
                const format = options.format || 'image/jpeg';
                const optimizedDataUrl = canvas.toDataURL(format, quality);
                
                resolve(optimizedDataUrl);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image for optimization'));
            };
            
            img.src = imageDataUrl;
        });
    }

    /**
     * Get image dimensions
     */
    static getImageDimensions(imageDataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height
                });
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = imageDataUrl;
        });
    }

    /**
     * Convert image to different format
     */
    static convertImageFormat(imageDataUrl, targetFormat, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                // For JPEG format, fill with white background
                if (targetFormat === 'image/jpeg') {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                ctx.drawImage(img, 0, 0);
                
                const convertedDataUrl = canvas.toDataURL(targetFormat, quality);
                resolve(convertedDataUrl);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to convert image format'));
            };
            
            img.src = imageDataUrl;
        });
    }

    /**
     * Clear stored image data
     */
    static clearImageData() {
        AppState.clientLogoDataUrl = null;
        
        // Clear preview elements
        const previewElements = document.querySelectorAll('[id*="Preview"]');
        previewElements.forEach(element => {
            element.style.display = 'none';
            element.innerHTML = '';
        });
        
        // Show upload areas
        const uploadElements = document.querySelectorAll('[id*="Upload"]');
        uploadElements.forEach(element => {
            element.style.display = 'block';
        });
        
        Utils.showNotification('Image data cleared', 'info');
    }

    /**
     * Download image as file
     */
    static downloadImage(imageDataUrl, filename, format = 'png') {
        try {
            // Create download link
            const link = document.createElement('a');
            link.download = `${filename}.${format}`;
            link.href = imageDataUrl;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Utils.showNotification('Image downloaded successfully', 'success');
            
        } catch (error) {
            Utils.showError('Failed to download image: ' + error.message);
        }
    }
} 