document.addEventListener('DOMContentLoaded', function() {
    // Initialize Quill editor
    const quill = new Quill('#quill-editor', {
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'blockquote', 'code-block'],
                    ['clean']
                ],
                handlers: {
                    'image': imageHandler
                }
            }
        },
        placeholder: 'Write your blog content here...',
        theme: 'snow'
    });

    // Set existing content from hidden textarea if it exists
    const contentInput = document.getElementById('hiddenContent');
    if (contentInput && contentInput.value) {
        quill.root.innerHTML = contentInput.value;
    }

    // Image upload handler for Quill
    function imageHandler() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                try {
                    // Show loading indicator
                    const range = quill.getSelection(true);
                    quill.insertText(range.index, 'Uploading image...', { 'italic': true, 'color': '#999' });

                    // Upload the image
                    const imageUrl = await uploadImage(file);
                    
                    // Replace the loading text with the image
                    quill.deleteText(range.index, 'Uploading image...'.length);
                    quill.insertEmbed(range.index, 'image', imageUrl);
                    
                    // Move cursor after image
                    quill.setSelection(range.index + 1);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    alert('Failed to upload image. Please try again.');
                    const range = quill.getSelection(true);
                    quill.deleteText(range.index, 'Uploading image...'.length);
                }
            }
        };
    }

    // Upload image to the server
    async function uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/admin/upload-image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image');
        }

        const data = await response.json();
        return data.url;
    }

    // Featured image upload
    const featuredImageInput = document.getElementById('featuredImage');
    const uploadFeaturedImageBtn = document.getElementById('uploadFeaturedImage');
    const featuredImagePreview = document.getElementById('featuredImagePreview');
    let featuredImageUrl = '';

    if (uploadFeaturedImageBtn) {
        uploadFeaturedImageBtn.addEventListener('click', function() {
            featuredImageInput.click();
        });
    }

    if (featuredImageInput) {
        featuredImageInput.addEventListener('change', async function() {
            if (this.files && this.files[0]) {
                try {
                    // Show loading state
                    featuredImagePreview.innerHTML = `
                        <div class="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                            <div class="w-10 h-10 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                        </div>
                    `;

                    // Upload the image
                    const imageUrl = await uploadImage(this.files[0]);
                    featuredImageUrl = imageUrl;

                    // Update preview
                    featuredImagePreview.innerHTML = `
                        <img src="${imageUrl}" alt="Featured image" class="w-full h-full object-cover">
                        <button type="button" class="remove-image absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                            <i class="fas fa-times"></i>
                        </button>
                    `;

                    // Add the URL to a hidden input
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'featuredImageUrl';
                    hiddenInput.value = imageUrl;
                    document.getElementById('blogForm').appendChild(hiddenInput);

                    // Attach event listener to the new remove button
                    featuredImagePreview.querySelector('.remove-image').addEventListener('click', function() {
                        removeFeaturedImage();
                    });
                } catch (error) {
                    console.error('Error uploading featured image:', error);
                    alert('Failed to upload featured image. Please try again.');
                    resetFeaturedImagePreview();
                }
            }
        });
    }

    // Remove featured image
    function removeFeaturedImage() {
        featuredImageUrl = '';
        resetFeaturedImagePreview();
        
        // Remove hidden input if it exists
        const hiddenInput = document.querySelector('input[name="featuredImageUrl"]');
        if (hiddenInput) {
            hiddenInput.remove();
        }
    }

    function resetFeaturedImagePreview() {
        featuredImagePreview.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full">
                <i class="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                <span class="mt-2 text-sm text-gray-500">Upload Image</span>
            </div>
        `;
    }

    // Initialize existing remove button for featured image
    const existingRemoveFeaturedBtn = featuredImagePreview.querySelector('.remove-image');
    if (existingRemoveFeaturedBtn) {
        existingRemoveFeaturedBtn.addEventListener('click', function() {
            removeFeaturedImage();
        });
    }

    // Additional images handling
    const additionalImageUpload = document.getElementById('additionalImageUpload');
    const additionalImagesInput = document.getElementById('additionalImages');
    const additionalImagesContainer = document.getElementById('additionalImagesContainer');
    const additionalImageUrls = [];

    if (additionalImageUpload && additionalImagesInput) {
        additionalImageUpload.addEventListener('click', function() {
            additionalImagesInput.click();
        });

        additionalImagesInput.addEventListener('change', async function() {
            if (this.files.length) {
                // Check if we've reached the maximum number of images (5)
                const currentImages = additionalImagesContainer.querySelectorAll('.image-preview').length;
                if (currentImages >= 5) {
                    alert('You can upload a maximum of 5 additional images.');
                    return;
                }

                for (const file of this.files) {
                    try {
                        // Create a temporary placeholder
                        const tempId = 'temp-' + Date.now();
                        const tempElement = document.createElement('div');
                        tempElement.id = tempId;
                        tempElement.className = 'relative w-full pt-[100%] border rounded-lg overflow-hidden';
                        tempElement.innerHTML = `
                            <div class="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <div class="w-8 h-8 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                            </div>
                        `;
                        
                        // Insert before the upload button
                        additionalImagesContainer.insertBefore(tempElement, additionalImageUpload);
                        
                        // Upload the image
                        const imageUrl = await uploadImage(file);
                        additionalImageUrls.push(imageUrl);
                        
                        // Replace the temporary element with the actual image preview
                        const imagePreview = document.createElement('div');
                        imagePreview.className = 'relative w-full pt-[100%] border rounded-lg overflow-hidden image-preview';
                        imagePreview.innerHTML = `
                            <img src="${imageUrl}" class="absolute inset-0 w-full h-full object-cover">
                            <button type="button" class="remove-image absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                                <i class="fas fa-times"></i>
                            </button>
                            <input type="hidden" name="additionalImages[]" value="${imageUrl}">
                        `;
                        
                        additionalImagesContainer.replaceChild(imagePreview, tempElement);
                        
                        // Add event listener for the remove button
                        imagePreview.querySelector('.remove-image').addEventListener('click', function() {
                            imagePreview.remove();
                            const index = additionalImageUrls.indexOf(imageUrl);
                            if (index > -1) {
                                additionalImageUrls.splice(index, 1);
                            }
                        });
                        
                        // Check if we need to hide the upload button (maximum 5 images)
                        if (additionalImagesContainer.querySelectorAll('.image-preview').length >= 5) {
                            additionalImageUpload.style.display = 'none';
                            break;
                        }
                    } catch (error) {
                        console.error('Error uploading additional image:', error);
                        alert('Failed to upload an image. Please try again.');
                    }
                }
                
                // Reset the input so the same file can be selected again
                this.value = '';
            }
        });
    }

    // Initialize existing additional image remove buttons
    document.querySelectorAll('.image-preview .remove-image').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.image-preview').remove();
            
            // Show the upload button if it was hidden
            if (additionalImageUpload) {
                additionalImageUpload.style.display = 'block';
            }
        });
    });

    // Character counters for meta fields
    const metaTitleInput = document.getElementById('metaTitle');
    const metaTitleCount = document.getElementById('metaTitleCount');
    const metaDescriptionInput = document.getElementById('metaDescription');
    const metaDescriptionCount = document.getElementById('metaDescriptionCount');

    function updateCharCount(input, counter, limit) {
        if (input && counter) {
            const count = input.value.length;
            counter.textContent = count;
            
            if (count > limit) {
                counter.parentElement.classList.add('text-red-500');
            } else {
                counter.parentElement.classList.remove('text-red-500');
            }
        }
    }

    if (metaTitleInput && metaTitleCount) {
        updateCharCount(metaTitleInput, metaTitleCount, 60);
        metaTitleInput.addEventListener('input', () => updateCharCount(metaTitleInput, metaTitleCount, 60));
    }

    if (metaDescriptionInput && metaDescriptionCount) {
        updateCharCount(metaDescriptionInput, metaDescriptionCount, 160);
        metaDescriptionInput.addEventListener('input', () => updateCharCount(metaDescriptionInput, metaDescriptionCount, 160));
    }

    // Form submission
    const blogForm = document.getElementById('blogForm');
    if (blogForm) {
        blogForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate required fields
            const title = document.getElementById('title').value.trim();
            const content = quill.root.innerHTML;
            const summary = document.getElementById('summary').value.trim();
            const category = document.getElementById('category').value;
            
            if (!title) {
                alert('Please enter a title for your blog post.');
                return;
            }
            
            if (!summary) {
                alert('Please enter a summary for your blog post.');
                return;
            }
            
            if (!category) {
                alert('Please select a category for your blog post.');
                return;
            }
            
            if (quill.getText().trim().length < 50) {
                alert('Your blog content is too short. Please add more content.');
                return;
            }
            
            // Check if we have a featured image
            if (!featuredImageUrl && !document.querySelector('input[name="featuredImageUrl"]')) {
                const existingImage = featuredImagePreview.querySelector('img');
                if (!existingImage) {
                    alert('Please upload a featured image for your blog post.');
                    return;
                }
            }
            
            // Transfer Quill content to hidden field
            document.getElementById('hiddenContent').value = content;
            
            // Show loading state
            const submitBtn = document.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<div class="flex items-center justify-center">
                <div class="w-5 h-5 border-2 border-t-white rounded-full animate-spin mr-2"></div>
                <span>Saving...</span>
            </div>`;
            
            // Submit the form via AJAX
            const formData = new FormData(blogForm);
            
            try {
                const response = await fetch(blogForm.action, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    alert(data.message);
                    
                    // Redirect to blogs list
                    window.location.href = '/admin/blogs';
                } else {
                    alert(data.message || 'An error occurred while saving the blog post.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('An error occurred while saving the blog post. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Auto-save functionality
    let autoSaveTimer;
    const autoSaveInterval = 30000; // 30 seconds
    const autoSaveStatus = document.getElementById('autosaveStatus');
    
    function startAutoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        
        autoSaveTimer = setTimeout(async function() {
            const content = quill.root.innerHTML;
            const title = document.getElementById('title').value.trim();
            const summary = document.getElementById('summary').value.trim();
            
            if (title && summary && content && quill.getText().trim().length > 20) {
                try {
                    // Show autosave status
                    autoSaveStatus.classList.remove('hidden');
                    autoSaveStatus.querySelector('#autosaveMessage').textContent = 'Saving draft...';
                    
                    // Get form data
                    const formData = new FormData(blogForm);
                    formData.set('content', content);
                    formData.set('status', 'draft'); // Always save as draft
                    
                    // Send the autosave request
                    const response = await fetch(blogForm.action, {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        autoSaveStatus.querySelector('#autosaveMessage').textContent = 'Draft saved';
                        
                        // Hide the status after 3 seconds
                        setTimeout(() => {
                            autoSaveStatus.classList.add('hidden');
                        }, 3000);
                        
                        // If this is a new blog, update the form action to edit URL
                        if (blogForm.action.includes('/blogs/new') && data.blog && data.blog._id) {
                            blogForm.action = `/admin/blogs/edit/${data.blog._id}`;
                        }
                    } else {
                        autoSaveStatus.querySelector('#autosaveMessage').textContent = 'Error saving draft';
                    }
                } catch (error) {
                    console.error('Autosave error:', error);
                    autoSaveStatus.querySelector('#autosaveMessage').textContent = 'Error saving draft';
                }
            }
            
            // Restart the timer
            startAutoSave();
        }, autoSaveInterval);
    }
    
    // Start autosave if we have a form
    if (blogForm && quill) {
        startAutoSave();
        
        // Restart autosave timer when user makes changes
        quill.on('text-change', function() {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            startAutoSave();
        });
        
        document.querySelectorAll('#title, #summary').forEach(input => {
            input.addEventListener('input', function() {
                if (autoSaveTimer) clearTimeout(autoSaveTimer);
                startAutoSave();
            });
        });
    }
}); 