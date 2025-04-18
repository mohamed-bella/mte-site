document.addEventListener('DOMContentLoaded', function() {
    const tourForm = document.getElementById('tourForm');
    const saveBtn = document.getElementById('saveBtn');
    
    // Debug Mode - Enable this for detailed logging
    const DEBUG_MODE = true;
    
    // Debug utility function
    function debug(message, data = null) {
        if (DEBUG_MODE) {
            if (data) {
                console.log(`[Tour Form] ${message}:`, data);
            } else {
                console.log(`[Tour Form] ${message}`);
            }
        }
    }
    
    // Add a debug button in development environments
    if (DEBUG_MODE) {
        const debugButton = document.createElement('button');
        debugButton.type = 'button';
        debugButton.textContent = 'Debug Form';
        debugButton.className = 'mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500';
        debugButton.addEventListener('click', function(e) {
            e.preventDefault();
            debugFormState();
        });
        
        // Append to header or another appropriate location
        const header = document.querySelector('.max-w-7xl.mx-auto.px-4.sm\\:px-6.md\\:px-8 .flex');
        if (header) {
            const debugContainer = document.createElement('div');
            debugContainer.className = 'ml-2';
            debugContainer.appendChild(debugButton);
            header.appendChild(debugContainer);
        }
    }
    
    // Debug function to check form state
    function debugFormState() {
        debug('--- FORM DEBUG START ---');
        
        // Check form basics
        debug('Form action', tourForm.action);
        debug('Form mode', tourForm.getAttribute('data-mode'));
        
        // Check required fields
        const requiredFields = [
            { id: 'title', name: 'Tour title' },
            { id: 'description', name: 'Description' },
            { id: 'price', name: 'Price' },
            { id: 'duration', name: 'Duration' },
            { id: 'groupSize', name: 'Group size' },
            { id: 'startLocation', name: 'Starting location' },
            { id: 'accommodation', name: 'Accommodation' }
        ];
        
        debug('Required fields:');
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            debug(`- ${field.name}`, element ? (element.value || 'empty') : 'MISSING ELEMENT');
        });
        
        // Check files
        debug('Files:');
        debug('- Tour images input exists', !!tourImagesInput);
        if (tourImagesInput) {
            debug('- Tour images selected', tourImagesInput.files.length);
        }
        
        debug('- Map image input exists', !!mapImageInput);
        if (mapImageInput) {
            debug('- Map image selected', mapImageInput.files && mapImageInput.files.length > 0);
        }
        
        // Check existing images
        const existingImages = document.querySelectorAll('input[name="existingImages"]');
        debug('- Existing images count', existingImages.length);
        
        // Check itinerary
        const itineraryDays = document.querySelectorAll('.itinerary-day');
        debug('Itinerary days', itineraryDays.length);
        
        // Check includes/excludes
        const includeItems = document.querySelectorAll('input[name="includes[]"]');
        debug('Include items', includeItems.length);
        
        const excludeItems = document.querySelectorAll('input[name="excludes[]"]');
        debug('Exclude items', excludeItems.length);
        
        debug('--- FORM DEBUG END ---');
    }
    
    // ===== IMAGE UPLOAD HANDLING =====
    
    // Tour images upload
    const tourImagesInput = document.getElementById('tourImages');
    const uploadImagesBtn = document.getElementById('uploadImagesBtn');
    const imagesPreview = document.getElementById('imagesPreview');
    const mainImagePreview = document.getElementById('mainImagePreview');
    
    if (uploadImagesBtn) {
        uploadImagesBtn.addEventListener('click', function() {
            tourImagesInput.click();
        });
    }
    
    if (tourImagesInput) {
        tourImagesInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                // Update main image preview with the first image
                const firstFile = this.files[0];
                updateImagePreview(firstFile, mainImagePreview);
                
                // Add all images to the preview grid
                for (const file of this.files) {
                    addImageToPreviewGrid(file);
                }
            }
        });
    }
    
    // Map image upload
    const mapImageInput = document.getElementById('mapImage');
    const uploadMapBtn = document.getElementById('uploadMapBtn');
    const mapImagePreview = document.getElementById('mapImagePreview');
    
    if (uploadMapBtn) {
        uploadMapBtn.addEventListener('click', function() {
            mapImageInput.click();
        });
    }
    
    if (mapImageInput) {
        mapImageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                updateImagePreview(this.files[0], mapImagePreview);
            }
        });
    }
    
    // Image preview helper functions
    function updateImagePreview(file, previewElement) {
        if (!previewElement) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Clear existing content
            previewElement.innerHTML = '';
            
            // Create image element
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Preview';
            img.className = 'object-cover w-full h-full';
            
            previewElement.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
    
    function addImageToPreviewGrid(file) {
        if (!imagesPreview) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create container div
            const div = document.createElement('div');
            div.className = 'relative aspect-w-1 aspect-h-1 rounded-md overflow-hidden bg-gray-100';
            
            // Create image
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Tour image';
            img.className = 'object-cover';
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-image absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm';
            removeBtn.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
            removeBtn.addEventListener('click', function() {
                div.remove();
            });
            
            // Append elements
            div.appendChild(img);
            div.appendChild(removeBtn);
            imagesPreview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
    
    // Remove existing images
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-image')) {
            const removeBtn = e.target.closest('.remove-image');
            const imageContainer = removeBtn.closest('.relative');
            if (imageContainer) {
                imageContainer.remove();
            }
        }
    });
    
    // ===== ITINERARY HANDLING =====
    
    const itineraryContainer = document.getElementById('itineraryContainer');
    const addItineraryDayBtn = document.getElementById('addItineraryDay');
    const emptyItinerary = document.getElementById('emptyItinerary');
    
    if (addItineraryDayBtn) {
        addItineraryDayBtn.addEventListener('click', function() {
            // Hide empty state if it exists
            if (emptyItinerary) {
                emptyItinerary.style.display = 'none';
            }
            
            // Get current number of days
            const dayElements = itineraryContainer.querySelectorAll('.itinerary-day');
            const dayIndex = dayElements.length;
            const dayNumber = dayIndex + 1;
            
            // Create new day element
            const newDay = document.createElement('div');
            newDay.className = 'itinerary-day bg-gray-50 p-5 rounded-lg border border-gray-200';
            newDay.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-md font-medium text-gray-900">Day ${dayNumber}</h4>
                    <button type="button" class="remove-day text-sm text-red-600 hover:text-red-800">
                        Remove
                    </button>
                </div>
                <div class="space-y-4">
                    <input type="hidden" name="itinerary[${dayIndex}][day]" value="${dayNumber}">
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Title</label>
                        <input type="text" name="itinerary[${dayIndex}][title]" required
                            class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="itinerary[${dayIndex}][description]" rows="3" required
                            class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Distance</label>
                        <input type="text" name="itinerary[${dayIndex}][distance]"
                            class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                    
                    <div class="highlights-container">
                        <div class="flex justify-between items-center">
                            <label class="block text-sm font-medium text-gray-700">Highlights</label>
                            <button type="button" class="add-highlight text-xs text-indigo-600 hover:text-indigo-800 flex items-center">
                                <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Highlight
                            </button>
                        </div>
                        <div class="highlights-list space-y-2 mt-2">
                            <div class="highlight-item flex items-center">
                                <input type="text" name="itinerary[${dayIndex}][highlights][]"
                                    class="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                                <button type="button" class="remove-highlight ml-2 text-red-500 hover:text-red-700">
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add new day to container
            itineraryContainer.appendChild(newDay);
        });
    }
    
    // Handle remove day
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-day')) {
            const removeBtn = e.target.closest('.remove-day');
            const dayElement = removeBtn.closest('.itinerary-day');
            if (dayElement) {
                dayElement.remove();
                reorderDays();
                
                // Show empty state if no days left
                if (itineraryContainer && itineraryContainer.querySelectorAll('.itinerary-day').length === 0 && emptyItinerary) {
                    emptyItinerary.style.display = 'block';
                }
            }
        }
    });
    
    // Handle add highlight
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-highlight')) {
            const addBtn = e.target.closest('.add-highlight');
            const highlightsContainer = addBtn.closest('.highlights-container');
            const highlightsList = highlightsContainer.querySelector('.highlights-list');
            const dayElement = addBtn.closest('.itinerary-day');
            
            if (highlightsList && dayElement) {
                const dayIndex = Array.from(itineraryContainer.querySelectorAll('.itinerary-day')).indexOf(dayElement);
                
                const newHighlight = document.createElement('div');
                newHighlight.className = 'highlight-item flex items-center';
                newHighlight.innerHTML = `
                    <input type="text" name="itinerary[${dayIndex}][highlights][]"
                        class="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    <button type="button" class="remove-highlight ml-2 text-red-500 hover:text-red-700">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                `;
                
                highlightsList.appendChild(newHighlight);
            }
        }
    });
    
    // Handle remove highlight
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-highlight')) {
            const removeBtn = e.target.closest('.remove-highlight');
            const highlightItem = removeBtn.closest('.highlight-item');
            if (highlightItem) {
                highlightItem.remove();
            }
        }
    });
    
    // Reorder days after removal
    function reorderDays() {
        const dayElements = itineraryContainer.querySelectorAll('.itinerary-day');
        dayElements.forEach((dayElement, index) => {
            const dayNumber = index + 1;
            
            // Update day title
            const dayTitle = dayElement.querySelector('h4');
            if (dayTitle) {
                dayTitle.textContent = `Day ${dayNumber}`;
            }
            
            // Update hidden day input
            const dayInput = dayElement.querySelector('input[type="hidden"]');
            if (dayInput) {
                dayInput.value = dayNumber;
                dayInput.name = `itinerary[${index}][day]`;
            }
            
            // Update all input names in this day to have the correct index
            const inputs = dayElement.querySelectorAll('input:not([type="hidden"]), textarea');
            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    const newName = name.replace(/itinerary\[\d+\]/, `itinerary[${index}]`);
                    input.setAttribute('name', newName);
                }
            });
        });
    }
    
    // ===== INCLUDES/EXCLUDES HANDLING =====
    
    const includesContainer = document.getElementById('includesContainer');
    const addIncludeBtn = document.getElementById('addInclude');
    
    if (addIncludeBtn && includesContainer) {
        addIncludeBtn.addEventListener('click', function() {
            const newInclude = document.createElement('div');
            newInclude.className = 'include-item flex items-center';
            newInclude.innerHTML = `
                <input type="text" name="includes[]" placeholder="e.g. Accommodation"
                    class="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                <button type="button" class="remove-include ml-2 text-red-500 hover:text-red-700">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            
            includesContainer.appendChild(newInclude);
        });
    }
    
    const excludesContainer = document.getElementById('excludesContainer');
    const addExcludeBtn = document.getElementById('addExclude');
    
    if (addExcludeBtn && excludesContainer) {
        addExcludeBtn.addEventListener('click', function() {
            const newExclude = document.createElement('div');
            newExclude.className = 'exclude-item flex items-center';
            newExclude.innerHTML = `
                <input type="text" name="excludes[]" placeholder="e.g. International flights"
                    class="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                <button type="button" class="remove-exclude ml-2 text-red-500 hover:text-red-700">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            
            excludesContainer.appendChild(newExclude);
        });
    }
    
    // Handle remove include/exclude
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-include')) {
            const removeBtn = e.target.closest('.remove-include');
            const includeItem = removeBtn.closest('.include-item');
            if (includeItem) {
                includeItem.remove();
            }
        }
        
        if (e.target.closest('.remove-exclude')) {
            const removeBtn = e.target.closest('.remove-exclude');
            const excludeItem = removeBtn.closest('.exclude-item');
            if (excludeItem) {
                excludeItem.remove();
            }
        }
    });
    
    // ===== FORM SUBMISSION =====
    
    if (tourForm) {
        tourForm.addEventListener('submit', function(e) {
            e.preventDefault();
            debug('Form submitted');
            
            // Basic form validation
            const validationErrors = validateTourForm();
            if (validationErrors.length > 0) {
                debug('Validation errors detected', validationErrors);
                showFormNotification('Error', 'Please check the form for errors:<br>' + validationErrors.join('<br>'), 'error');
                return;
            }
            
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
            }
            
            // Create form data for AJAX submission
            const formData = new FormData(tourForm);
            
            // Process arrays properly
            processFormArrays(formData);
            
            // Debug form data
            debug('Form action', tourForm.action);
            debug('Form mode', tourForm.getAttribute('data-mode'));
            
            // Check for CloudinaryAPI
            debug('Checking environment variables');
            try {
                // Just checking if Cloudinary variables might be available
                if (!window.cloudinaryConfigured) {
                    debug('WARNING: Cloudinary may not be configured properly');
                }
            } catch (err) {
                debug('Error checking Cloudinary config', err);
            }
            
            // Log form data keys
            debug('Form data keys');
            const formDataKeys = [];
            for (const key of formData.keys()) {
                formDataKeys.push(key);
            }
            debug('Form data fields', formDataKeys);
            
            // Check for required files
            const hasImages = tourImagesInput && tourImagesInput.files && tourImagesInput.files.length > 0;
            const hasMapImage = mapImageInput && mapImageInput.files && mapImageInput.files.length > 0;
            const hasExistingImages = formData.has('existingImages');
            
            debug('Files status:');
            debug('- Has new images', hasImages);
            debug('- Has map image', hasMapImage);
            debug('- Has existing images', hasExistingImages);
            
            // Show loading indicator
            const loadingNotification = showFormNotification('Processing', 'Uploading images and saving tour data...', 'info', 0);
            
            // Send the AJAX request
            debug('Sending request to: ' + tourForm.action);
            fetch(tourForm.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                debug('Response received', {status: response.status, statusText: response.statusText});
                
                // Try to parse JSON, but handle text responses too
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    return response.text().then(text => {
                        debug('Response is not JSON', text);
                        throw new Error('Unexpected response format');
                    });
                }
            })
            .then(data => {
                debug('Response data', data);
                
                // Hide loading indicator
                if (loadingNotification) {
                    closeNotification(loadingNotification);
                }
                
                if (data.success) {
                    // Show success message and redirect
                    debug('Tour saved successfully', data.tour);
                    showFormNotification('Success', data.message, 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/admin/tours';
                    }, 1500);
                } else {
                    // Show error message
                    debug('Server returned error', data.message);
                    showFormNotification('Error', data.message, 'error');
                    
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.textContent = tourForm.getAttribute('data-mode') === 'edit' ? 'Update Tour' : 'Create Tour';
                    }
                }
            })
            .catch(error => {
                debug('Fetch error', error);
                
                // Hide loading indicator
                if (loadingNotification) {
                    closeNotification(loadingNotification);
                }
                
                showFormNotification('Error', 'An unexpected error occurred. Please check the console for details.', 'error');
                
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = tourForm.getAttribute('data-mode') === 'edit' ? 'Update Tour' : 'Create Tour';
                }
            });
        });
    }
    
    // Use imported notification function if available, fallback to local implementation
    function showFormNotification(title, message, type, duration = 5000) {
        // Try to use global function first (from notification.js module)
        if (typeof window.showNotification === 'function') {
            debug('Using global notification function');
            return window.showNotification(title, message, type, duration);
        } else {
            // Fallback to local implementation
            debug('Using local notification function');
            return showNotification(title, message, type, duration);
        }
    }
    
    // Close a notification
    function closeNotification(notification) {
        if (!notification) return;
        
        if (typeof window.closeNotification === 'function') {
            window.closeNotification(notification);
        } else {
            // Local implementation
            notification.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    // Local notification helper (fallback implementation)
    function showNotification(title, message, type, duration = 5000) {
        // Check if we have a notification container, create if not
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-4';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `px-4 py-3 rounded-lg shadow-lg transition transform duration-300 ease-in-out ${
            type === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' : 
            type === 'error' ? 'bg-red-100 border-l-4 border-red-500 text-red-700' :
            type === 'warning' ? 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700' :
            'bg-blue-100 border-l-4 border-blue-500 text-blue-700'
        }`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        ${type === 'success' ? 
                            '<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>' : 
                            type === 'error' ?
                            '<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>' :
                            type === 'warning' ?
                            '<svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>' :
                            '<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                        }
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">${title}</p>
                        <p class="text-sm">${message}</p>
                    </div>
                </div>
                <button class="notification-close ml-4 text-gray-400 hover:text-gray-500">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Add close handler
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeNotification(notification);
            });
        }
        
        // Auto remove after specified duration (only if duration > 0)
        if (duration > 0) {
            setTimeout(() => {
                closeNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    // Validate tour form
    function validateTourForm() {
        const errors = [];
        
        // Check network connectivity
        if (!navigator.onLine) {
            errors.push('You appear to be offline. Please check your internet connection.');
            debug('Network connectivity issue detected');
            return errors;
        }
        
        // Clear existing error messages
        const formErrorContainer = document.getElementById('formErrorContainer');
        const formErrorList = document.getElementById('formErrorList');
        
        if (formErrorContainer && formErrorList) {
            formErrorList.innerHTML = '';
            formErrorContainer.style.display = 'none';
        }
        
        // Check required text fields
        const requiredFields = [
            { id: 'title', name: 'Tour title' },
            { id: 'description', name: 'Description' },
            { id: 'price', name: 'Price' },
            { id: 'duration', name: 'Duration' },
            { id: 'groupSize', name: 'Group size' },
            { id: 'startLocation', name: 'Starting location' },
            { id: 'accommodation', name: 'Accommodation' }
        ];
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                const errorMessage = `${field.name} is required`;
                errors.push(errorMessage);
                
                // Add visual indication for the field
                if (element) {
                    element.classList.add('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                    
                    // Add event listener to remove error styling when user starts typing
                    element.addEventListener('input', function() {
                        if (this.value.trim()) {
                            this.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                        }
                    }, { once: true });
                }
                
                debug(`Missing required field: ${field.name}`);
            }
        });
        
        // Check for images (only for new tours)
        const isNewTour = tourForm.getAttribute('data-mode') === 'create';
        const hasNewImages = tourImagesInput && tourImagesInput.files && tourImagesInput.files.length > 0;
        const hasExistingImages = document.querySelectorAll('input[name="existingImages"]').length > 0;
        
        if (isNewTour && !hasNewImages) {
            errors.push('At least one tour image is required');
            debug('Missing tour images');
            
            // Highlight the upload button
            if (uploadImagesBtn) {
                uploadImagesBtn.classList.add('ring-2', 'ring-red-500');
                
                // Add event listener to remove error styling when user selects files
                tourImagesInput.addEventListener('change', function() {
                    if (this.files && this.files.length > 0) {
                        uploadImagesBtn.classList.remove('ring-2', 'ring-red-500');
                    }
                }, { once: true });
            }
        }
        
        // Check for map image (only for new tours)
        const hasNewMapImage = mapImageInput && mapImageInput.files && mapImageInput.files.length > 0;
        const hasExistingMapImage = document.getElementById('mapImagePreview') && 
                                document.getElementById('mapImagePreview').querySelector('img');
        
        if (isNewTour && !hasNewMapImage && !hasExistingMapImage) {
            errors.push('A map image is required');
            debug('Missing map image');
            
            // Highlight the upload button
            if (uploadMapBtn) {
                uploadMapBtn.classList.add('ring-2', 'ring-red-500');
                
                // Add event listener to remove error styling when user selects files
                mapImageInput.addEventListener('change', function() {
                    if (this.files && this.files.length > 0) {
                        uploadMapBtn.classList.remove('ring-2', 'ring-red-500');
                    }
                }, { once: true });
            }
        }
        
        // Display errors in the error container if available
        if (errors.length > 0 && formErrorContainer && formErrorList) {
            // Show the container
            formErrorContainer.style.display = 'block';
            
            // Add each error to the list
            errors.forEach(error => {
                const errorItem = document.createElement('li');
                errorItem.textContent = error;
                formErrorList.appendChild(errorItem);
            });
            
            // Scroll to error container
            formErrorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Check for itinerary days (at least one is recommended)
        const itineraryDays = document.querySelectorAll('.itinerary-day');
        if (itineraryDays.length === 0) {
            debug('No itinerary days added - this is allowed but unusual');
        }
        
        // Check for includes and excludes (at least one of each is recommended)
        const includeItems = document.querySelectorAll('input[name="includes[]"]');
        const excludeItems = document.querySelectorAll('input[name="excludes[]"]');
        
        if (includeItems.length === 0) {
            debug('No included items added - this is allowed but unusual');
        }
        
        if (excludeItems.length === 0) {
            debug('No excluded items added - this is allowed but unusual');
        }
        
        return errors;
    }
    
    // Process form arrays to handle itinerary, includes, excludes properly
    function processFormArrays(formData) {
        debug('Processing form arrays');
        
        // Handle itinerary data
        const itineraryData = [];
        const dayElements = document.querySelectorAll('.itinerary-day');
        
        debug('Found itinerary days:', dayElements.length);
        
        dayElements.forEach((dayElement, index) => {
            const day = {
                day: parseInt(formData.get(`itinerary[${index}][day]`)),
                title: formData.get(`itinerary[${index}][title]`),
                description: formData.get(`itinerary[${index}][description]`),
                distance: formData.get(`itinerary[${index}][distance]`) || '',
                highlights: []
            };
            
            // Get all highlights for this day
            const highlightInputs = dayElement.querySelectorAll(`input[name="itinerary[${index}][highlights][]"]`);
            debug(`Day ${index+1} has ${highlightInputs.length} highlights`);
            
            highlightInputs.forEach(input => {
                if (input.value.trim()) {
                    day.highlights.push(input.value.trim());
                }
            });
            
            itineraryData.push(day);
        });
        
        // Remove all itinerary form values
        for (const key of Array.from(formData.keys())) {
            if (key.startsWith('itinerary[')) {
                formData.delete(key);
            }
        }
        
        // Add itinerary as JSON string
        if (itineraryData.length > 0) {
            formData.append('itinerary', JSON.stringify(itineraryData));
            debug('Itinerary data processed:', itineraryData);
        } else {
            // Even if empty, we need to send an empty array to ensure the server handles it correctly
            formData.append('itinerary', JSON.stringify([]));
            debug('No itinerary data found, adding empty array');
        }
        
        // Process includes and excludes
        const includesArray = [];
        const includeInputs = document.querySelectorAll('input[name="includes[]"]');
        includeInputs.forEach(input => {
            if (input.value.trim()) {
                includesArray.push(input.value.trim());
            }
        });
        
        const excludesArray = [];
        const excludeInputs = document.querySelectorAll('input[name="excludes[]"]');
        excludeInputs.forEach(input => {
            if (input.value.trim()) {
                excludesArray.push(input.value.trim());
            }
        });
        
        debug('Includes count:', includesArray.length);
        debug('Excludes count:', excludesArray.length);
        
        // Remove existing arrays
        formData.delete('includes[]');
        formData.delete('excludes[]');
        
        // Add as JSON strings - always add arrays even if empty to ensure consistent server handling
        formData.append('includes', JSON.stringify(includesArray));
        formData.append('excludes', JSON.stringify(excludesArray));
    }
}); 