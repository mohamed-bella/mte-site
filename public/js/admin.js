// Image Preview Handling
function handleImagePreview(input, previewContainer) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const preview = document.createElement('div');
            preview.className = 'relative inline-block mr-2 mb-2';
            preview.innerHTML = `
                <img src="${e.target.result}" class="w-24 h-24 object-cover rounded-lg">
                <button type="button" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center -mt-2 -mr-2"
                    onclick="this.parentElement.remove();">×</button>
                <input type="hidden" name="images[]" value="${e.target.result}">
            `;
            previewContainer.appendChild(preview);
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Dynamic List Management
function addListItem(container, placeholder) {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2';
    div.innerHTML = `
        <input type="text" class="form-input flex-grow" placeholder="${placeholder}">
        <button type="button" class="bg-red-500 text-white p-2 rounded" onclick="removeListItem(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeListItem(button) {
    button.closest('div').remove();
}

// Form Validation
function validateExcursionForm() {
    const requiredFields = ['title', 'description', 'location', 'startTime', 'endTime', 'adultPrice'];
    let isValid = true;

    requiredFields.forEach(field => {
        const input = document.querySelector(`[name="${field}"]`);
        if (!input.value.trim()) {
            input.classList.add('border-red-500');
            isValid = false;
        } else {
            input.classList.remove('border-red-500');
        }
    });

    return isValid;
}

// Toggle Featured Status
async function toggleFeatured(excursionId, button) {
    try {
        const response = await fetch(`/admin/excursions/${excursionId}/toggle-featured`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            const icon = button.querySelector('i');
            if (data.featured) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                button.classList.add('text-yellow-500');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.classList.remove('text-yellow-500');
            }
            showToast(data.message, 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error toggling featured status:', error);
        showToast('Failed to update featured status', 'error');
    }
}

// Delete Excursion
async function deleteExcursion(excursionId) {
    if (!confirm('Are you sure you want to delete this excursion?')) {
        return;
    }

    try {
        const response = await fetch(`/admin/excursions/${excursionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            const excursionElement = document.querySelector(`[data-excursion-id="${excursionId}"]`);
            excursionElement.remove();
            showToast(data.message, 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting excursion:', error);
        showToast('Failed to delete excursion', 'error');
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white z-50 animate-fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Image Sorting
function initImageSorting() {
    const imageContainer = document.querySelector('.image-preview-container');
    if (imageContainer) {
        new Sortable(imageContainer, {
            animation: 150,
            onEnd: function() {
                updateMainImage();
            }
        });
    }
}

function updateMainImage() {
    const firstImage = document.querySelector('.image-preview-container img');
    if (firstImage) {
        document.querySelector('[name="mainImage"]').value = firstImage.src;
    }
}

// Search and Filter
function filterExcursions(query) {
    const excursions = document.querySelectorAll('.excursion-card');
    const normalizedQuery = query.toLowerCase();

    excursions.forEach(excursion => {
        const title = excursion.querySelector('.excursion-title').textContent.toLowerCase();
        const location = excursion.querySelector('.excursion-location').textContent.toLowerCase();
        
        if (title.includes(normalizedQuery) || location.includes(normalizedQuery)) {
            excursion.style.display = '';
        } else {
            excursion.style.display = 'none';
        }
    });
}

// Price Formatting
function formatPrice(input) {
    let value = input.value.replace(/[^\d.]/g, '');
    if (value) {
        value = parseFloat(value).toFixed(2);
        input.value = value;
    }
}

// Handle Existing Image Selection
function handleExistingImages() {
    // Add checkbox selection for existing images
    const imagePreviews = document.querySelectorAll('.image-preview');
    
    imagePreviews.forEach(preview => {
        const img = preview.querySelector('img');
        const imgSrc = img.getAttribute('src');
        
        // Create a checkbox for selecting/deselecting the image
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'image-selection mt-1';
        checkboxWrapper.innerHTML = `
            <label class="flex items-center">
                <input type="checkbox" name="existingImages" value="${imgSrc}" checked class="mr-1">
                <span class="text-sm">Keep this image</span>
            </label>
        `;
        
        preview.appendChild(checkboxWrapper);
    });
}

// Prepare arrays for form submission
function prepareArrayInputs() {
    const formArrays = {
        'inclusions': '#inclusionsContainer',
        'exclusions': '#exclusionsContainer',
        'activities': '#activitiesContainer',
        'preparationTips': '#preparationTipsContainer'
    };
    
    for (const [fieldName, containerSelector] of Object.entries(formArrays)) {
        const container = document.querySelector(containerSelector);
        if (!container) continue;
        
        const inputs = container.querySelectorAll(`input[name="${fieldName}"]`);
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `${fieldName}Text`;
        
        const values = Array.from(inputs).map(input => input.value.trim()).filter(val => val);
        hiddenInput.value = values.join('\n');
        
        container.appendChild(hiddenInput);
    }
}

// Initialize edit form
function initEditForm() {
    const editForm = document.querySelector('form[action^="/admin/excursions/edit/"]');
    if (!editForm) return;
    
    // Add method override for PUT request
    const methodInput = document.createElement('input');
    methodInput.type = 'hidden';
    methodInput.name = '_method';
    methodInput.value = 'PUT';
    editForm.appendChild(methodInput);
    
    // Handle form submission
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateExcursionForm()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Prepare array inputs (inclusions, exclusions, etc.)
        prepareArrayInputs();
        
        // Submit the form
        this.submit();
    });
    
    // Handle image deletion confirmation
    handleExistingImages();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize image sorting
    initImageSorting();

    // Initialize search functionality
    const searchInput = document.querySelector('#searchExcursions');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterExcursions(e.target.value));
    }

    // Initialize form validation
    const excursionForm = document.querySelector('#excursionForm');
    if (excursionForm) {
        excursionForm.addEventListener('submit', function(e) {
            if (!validateExcursionForm()) {
                e.preventDefault();
                showToast('Please fill in all required fields', 'error');
            }
        });
    }

    // Initialize price formatting
    const priceInputs = document.querySelectorAll('input[type="number"][step="0.01"]');
    priceInputs.forEach(input => {
        input.addEventListener('blur', () => formatPrice(input));
    });

    // Initialize image upload preview
    const imageUpload = document.querySelector('#imageUpload');
    const previewContainer = document.querySelector('.image-preview-container');
    if (imageUpload && previewContainer) {
        imageUpload.addEventListener('change', function() {
            handleImagePreview(this, previewContainer);
        });
    }
    
    // Check if we're on the edit excursion page
    if (document.querySelector('form[action^="/admin/excursions/edit/"]')) {
        initEditForm();
    }
}); 