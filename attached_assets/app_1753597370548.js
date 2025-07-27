// Constants and Global Variables
const API_URL = 'http://localhost:5000/api';

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const contentPrompt = document.getElementById('content-prompt');
    const imagePrompt = document.getElementById('image-prompt');
    const imagePromptGroup = document.getElementById('image-prompt-group');
    const enableImageGen = document.getElementById('enable-image-gen');
    const scheduleInput = document.getElementById('schedule-input');
    const generateBtn = document.getElementById('generate-btn');
    const uploadPdfBtn = document.getElementById('upload-pdf-btn');
    
    // Preview elements
    const contentPreview = document.getElementById('content-preview');
    const generatedText = document.getElementById('generated-text');
    const imagePreview = document.getElementById('image-preview');
    const postingTime = document.getElementById('posting-time');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const postBtn = document.getElementById('post-btn');
    const editContentBtn = document.getElementById('edit-content-btn');
    const copyContentBtn = document.getElementById('copy-content-btn');
    
    // Stats elements
    const totalPostsElement = document.getElementById('total-posts');
    const scheduledPostsElement = document.getElementById('scheduled-posts');
    const publishedPostsElement = document.getElementById('published-posts');
    const viewAllPostsBtn = document.getElementById('view-all-posts-btn');
    
    // PDF Upload elements
    const pdfModal = document.getElementById('pdf-modal');
    const uploadArea = document.getElementById('upload-area');
    const fileUpload = document.getElementById('file-upload');
    const uploadedFile = document.getElementById('uploaded-file');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFile = document.getElementById('remove-file');
    const cancelUpload = document.getElementById('cancel-upload');
    const processPdf = document.getElementById('process-pdf');
    const closeModalBtn = document.querySelector('.close-modal');
    
    // History elements
    const postHistory = document.getElementById('post-history');
    
    // Toast elements
    const toast = document.querySelector('.toast');
    const toastMessage = document.querySelector('.toast-message');
    const toastClose = document.querySelector('.toast-close');
    
    // Current state
    let currentFile = null;
    let currentContent = null;
    let currentImageUrl = null;
    let currentSchedule = null;
    
    console.log("Initializing app.js...");
    
    // Setup image generation toggle behavior
    if (enableImageGen) {
        enableImageGen.addEventListener('change', function() {
            if (imagePromptGroup) {
                imagePromptGroup.style.display = this.checked ? 'block' : 'none';
            }
            
            if (!this.checked && imagePreview) {
                const img = imagePreview.querySelector('img');
                if (img) img.src = '';
                imagePreview.style.display = 'none';
                if (imagePrompt) imagePrompt.value = '';
            }
        });
        
        // Set initial state
        if (imagePromptGroup) {
            imagePromptGroup.style.display = enableImageGen.checked ? 'block' : 'none';
        }
    }
    
    // Generate button click - MAIN FUNCTIONALITY
    if (generateBtn) {
        generateBtn.addEventListener('click', async function() {
            try {
                if (!contentPrompt?.value.trim()) {
                    showToast('Please enter a content prompt', 'error');
                    return;
                }
                
                if (enableImageGen?.checked && !imagePrompt?.value.trim()) {
                    showToast('Image prompt is required when image generation is enabled', 'error');
                    return;
                }
                
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                
                // Generate content
                const content = await generateContent(contentPrompt.value);
                currentContent = content;
                
                if (generatedText) {
                    generatedText.textContent = content;
                }
                
                // Generate image if enabled
                if (enableImageGen?.checked && imagePrompt?.value) {
                    const imageUrl = await generateImage(imagePrompt.value.trim());
                    if (imageUrl && imagePreview) {
                        const img = imagePreview.querySelector('img');
                        if (img) {
                            img.src = imageUrl;
                            currentImageUrl = imageUrl;
                            img.onload = () => imagePreview.style.display = 'block';
                        }
                    }
                }
                
                // Show preview
                if (contentPreview) {
                    contentPreview.style.display = 'block';
                    contentPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                showToast('Content generated successfully', 'success');
                
            } catch (error) {
                console.error('Generation error:', error);
                showToast(error.message || 'Generation failed', 'error');
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate & Preview';
            }
        });
    }
    
    // PDF Upload functionality
    if (uploadPdfBtn && pdfModal) {
        uploadPdfBtn.addEventListener('click', () => {
            pdfModal.classList.add('active');
        });
        
        // Close modal handlers
        [closeModalBtn, cancelUpload].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    pdfModal.classList.remove('active');
                    resetFileUpload();
                });
            }
        });
        
        // File upload handling
        if (uploadArea && fileUpload) {
            uploadArea.addEventListener('click', () => fileUpload.click());
            
            fileUpload.addEventListener('change', function() {
                if (this.files[0]) {
                    handleFileSelection(this.files[0]);
                }
            });
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files[0]) {
                    handleFileSelection(e.dataTransfer.files[0]);
                }
            });
        }
        
        // Process PDF
        if (processPdf) {
            processPdf.addEventListener('click', async function() {
                if (!currentFile) {
                    showToast('Please upload a PDF file first', 'error');
                    return;
                }
                
                try {
                    processPdf.disabled = true;
                    processPdf.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    
                    const result = await uploadPdf(currentFile);
                    
                    if (contentPrompt && result.summary) {
                        contentPrompt.value = `Create a professional LinkedIn post based on the following content: ${result.summary}`;
                        pdfModal.classList.remove('active');
                        resetFileUpload();
                        generateBtn?.click();
                    }
                    
                    showToast('PDF processed successfully', 'success');
                } catch (error) {
                    console.error('PDF processing error:', error);
                    showToast(error.message || 'Failed to process PDF', 'error');
                } finally {
                    processPdf.disabled = false;
                    processPdf.innerHTML = 'Process PDF';
                }
            });
        }
    }

    // Regenerate button
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', function() {
            // Simply click the generate button
            if (generateBtn) {
                generateBtn.click();
            }
        });
    }
    
    // Post/Schedule button
    if (postBtn) {
        postBtn.addEventListener('click', function() {
            if (!currentContent) {
                showToast('Please generate content first', 'error');
                return;
            }
            
            // Show loading state
            postBtn.disabled = true;
            postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Create post data
            const postData = {
                content: currentContent,
                post_type: currentImageUrl ? 'image' : 'text',
                schedule_time: currentSchedule ? formatScheduleForApi(currentSchedule) : null
            };
            
            if (currentImageUrl) {
                postData.image_url = currentImageUrl;
            }
            
            // Call API to create post
            createPost(postData)
                .then(response => {
                    if (response.success) {
                        // Update UI
                        contentPreview.style.display = 'none';
                        
                        // Reset form
                        contentPrompt.value = '';
                        imagePrompt.value = '';
                        scheduleInput.value = '';
                        currentContent = null;
                        currentImageUrl = null;
                        currentSchedule = null;
                        
                        // Load updated post history
                        loadPostHistory();
                        
                        // Show success toast
                        showToast(currentSchedule ? 'Post scheduled successfully' : 'Post published successfully', 'success');
                    } else {
                        throw new Error(response.message || 'Failed to create post');
                    }
                })
                .catch(error => {
                    console.error('Error creating post:', error);
                    showToast(error.message || 'Failed to create post', 'error');
                })
                .finally(() => {
                    // Reset button state
                    postBtn.disabled = false;
                    postBtn.innerHTML = currentSchedule ? 
                        '<i class="fas fa-calendar"></i> Schedule Post' : 
                        '<i class="fas fa-paper-plane"></i> Post Now';
                });
        });
    }
    
    // Edit content button
    if (editContentBtn) {
        editContentBtn.addEventListener('click', function() {
            // Copy generated content back to prompt
            contentPrompt.value = currentContent || '';
            contentPrompt.focus();
            
            // Hide preview
            contentPreview.style.display = 'none';
        });
    }
    
    // Copy content button
    if (copyContentBtn) {
        copyContentBtn.addEventListener('click', function() {
            if (currentContent) {
                navigator.clipboard.writeText(currentContent)
                    .then(() => {
                        showToast('Content copied to clipboard', 'success');
                    })
                    .catch(err => {
                        console.error('Error copying text: ', err);
                        showToast('Failed to copy content', 'error');
                    });
            }
        });
    }
    
    // Toast close button
    if (toastClose) {
        toastClose.addEventListener('click', function() {
            hideToast();
        });
    }
    
    // Helper functions
    
    // Handle file selection
    function handleFileSelection(file) {
        if (file.type !== 'application/pdf') {
            showToast('Please upload a PDF file', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size exceeds 10MB limit', 'error');
            return;
        }
        
        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        uploadedFile.style.display = 'flex';
        uploadArea.style.display = 'none';
    }
    
    // Reset file upload
    function resetFileUpload() {
        currentFile = null;
        if (fileName) fileName.textContent = '';
        if (uploadedFile) uploadedFile.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (fileUpload) fileUpload.value = '';
    }

    // Format file size for display
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Parse schedule input
    function parseScheduleInput(input) {
        if (!input || !input.trim()) return null;
        
        // Basic natural language parsing
        const text = input.toLowerCase().trim();
        
        // Today at specific time
        if (text.match(/today at \d+(?::\d+)?\s*(?:am|pm)?/i)) {
            const time = text.match(/(\d+(?::\d+)?)\s*(?:am|pm)?/i)[1];
            const ampm = text.includes('pm') ? 'PM' : (text.includes('am') ? 'AM' : '');
            const date = new Date();
            return { type: 'one-time', date: formatDate(date), time: formatTime(time, ampm) };
        }
        
        // Tomorrow at specific time
        if (text.match(/tomorrow at \d+(?::\d+)?\s*(?:am|pm)?/i)) {
            const time = text.match(/(\d+(?::\d+)?)\s*(?:am|pm)?/i)[1];
            const ampm = text.includes('pm') ? 'PM' : (text.includes('am') ? 'AM' : '');
            const date = new Date();
            date.setDate(date.getDate() + 1);
            return { type: 'one-time', date: formatDate(date), time: formatTime(time, ampm) };
        }
        
        // Default to tomorrow at 10 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        return { 
            type: 'one-time', 
            date: formatDate(tomorrow), 
            time: '10:00' 
        };
    }
    
    // Format date helper
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    // Format time helper
    function formatTime(time, ampm) {
        if (!time.includes(':')) {
            time = `${time}:00`;
        }
        
        // Convert to 24-hour format if PM
        if (ampm === 'PM' && !time.startsWith('12')) {
            const hours = parseInt(time.split(':')[0]) + 12;
            time = `${hours}:${time.split(':')[1]}`;
        }
        
        return time;
    }
    
    // Format schedule for display
    function formatScheduleForDisplay(schedule) {
        if (!schedule) return '';
        
        if (schedule.type === 'one-time') {
            const date = new Date(`${schedule.date}T${schedule.time}`);
            return date.toLocaleString('en-US', {
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });
        } else if (schedule.type === 'weekly') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const day = days[parseInt(schedule.dayOfWeek)];
            return `Every ${day} at ${formatTimeForDisplay(schedule.time)}`;
        } else if (schedule.type === 'daily') {
            return `Every day at ${formatTimeForDisplay(schedule.time)}`;
        }
        
        return '';
    }
    
    // Format time for display
    function formatTimeForDisplay(time) {
        if (!time) return '';
        
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const isPM = hour >= 12;
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }
    
    // Format schedule for API
    function formatScheduleForApi(schedule) {
        if (!schedule) return null;
        
        if (schedule.type === 'one-time') {
            return `${schedule.date}T${schedule.time}:00`;
        } else if (schedule.type === 'weekly') {
            // Convert to cron expression
            const [hours, minutes] = schedule.time.split(':');
            return `cron:${minutes} ${hours} * * ${schedule.dayOfWeek}`;
        } else if (schedule.type === 'daily') {
            const [hours, minutes] = schedule.time.split(':');
            return `cron:${minutes} ${hours} * * *`;
        }
        
        return null;
    }
    
    // Update post stats
    function updatePostStats(total, scheduled, published) {
        if (totalPostsElement) totalPostsElement.textContent = total;
        if (scheduledPostsElement) scheduledPostsElement.textContent = scheduled;
        if (publishedPostsElement) publishedPostsElement.textContent = published;
    }
    
    // Render post history
    function renderPostHistory(posts) {
        if (!postHistory) return;
        
        if (posts.length === 0) {
            postHistory.innerHTML = '<div class="empty-state">No posts yet. Generate your first post above!</div>';
            return;
        }
        
        // Implementation for rendering posts when available
        postHistory.innerHTML = '';
    }
    
    // View all posts button
    if (viewAllPostsBtn) {
        viewAllPostsBtn.addEventListener('click', function() {
            showToast('Full posts view coming soon!', 'info');
        });
    }
    
    // Initialize app
    console.log('Initializing application...');
    
    // Load post history with mock data for now
    const mockPosts = [];
    updatePostStats(mockPosts.length, 0, 0);
    renderPostHistory(mockPosts);
});

const modalConfirm = document.getElementById('modal-confirm');
const closeModal = document.querySelector('.close-modal');
const navItems = document.querySelectorAll('.nav-item');
const postTypeOptions = document.querySelectorAll('.toggle-option');
const pages = document.querySelectorAll('.page');
const pageTitle = document.querySelector('.page-title');

// Navigation Functionality
navItems.forEach(item => {
    item.addEventListener('click', function() {
        const pageId = this.getAttribute('data-page');
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        // Show selected page
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        // Update page title
        pageTitle.textContent = this.querySelector('span').textContent;
    });
});

// Post Type Toggle
postTypeOptions.forEach(option => {
    option.addEventListener('click', function() {
        const type = this.getAttribute('data-type');
        
        // Update active option
        postTypeOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // Show/hide image options
        if (type === 'image') {
            imageGroup.style.display = 'block';
        } else {
            imageGroup.style.display = 'none';
        }
    });
});

// Generate Content Toggle
if (generateContentToggle) {
    generateContentToggle.addEventListener('change', function() {
        if (this.checked) {
            contentPromptGroup.style.display = 'block';
        } else {
            contentPromptGroup.style.display = 'none';
        }
    });
}

// Generate Content Button
if (generateBtn) {
    generateBtn.addEventListener('click', function() {
        const prompt = document.getElementById('content-prompt').value;
        
        if (!prompt) {
            showToast('Please enter a content prompt first', 'error');
            return;
        }
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        // Call API to generate content
        generateContent(prompt)
            .then(content => {
                postContent.value = content;
                updateCharCount();
                showToast('Content generated successfully', 'success');
            })
            .catch(error => {
                console.error('Error generating content:', error);
                showToast('Failed to generate content', 'error');
            })
            .finally(() => {
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Generate Content';
            });
    });
}

// Generate Image Button
if (generateImageBtn) {
    generateImageBtn.addEventListener('click', function() {
        const prompt = imagePrompt.value;
        
        if (!prompt) {
            showToast('Please enter an image prompt first', 'error');
            return;
        }
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        // Call API to generate image
        generateImage(prompt)
            .then(imageUrl => {
                imagePreview.src = imageUrl;
                imagePreview.style.display = 'block';
                imagePreviewPlaceholder.style.display = 'none';
                showToast('Image generated successfully', 'success');
            })
            .catch(error => {
                console.error('Error generating image:', error);
                showToast('Failed to generate image', 'error');
            })
            .finally(() => {
                // Reset button state
                this.disabled = false;
                this.innerHTML = 'Generate Image';
            });
    });
}

// Schedule Post Toggle
if (schedulePostToggle) {
    schedulePostToggle.addEventListener('change', function() {
        if (this.checked) {
            scheduleOptions.style.display = 'block';
            submitText.textContent = 'Schedule Post';
        } else {
            scheduleOptions.style.display = 'none';
            submitText.textContent = 'Post Now';
        }
    });
}

// Schedule Type Change
if (scheduleType) {
    scheduleType.addEventListener('change', function() {
        const value = this.value;
        
        if (value === 'one-time') {
            recurringOptions.style.display = 'none';
            document.querySelector('.schedule-date').style.display = 'block';
            document.querySelector('.schedule-time').style.display = 'block';
        } else {
            recurringOptions.style.display = 'block';
            
            // Hide all specific options first
            weeklyOptions.style.display = 'none';
            monthlyOptions.style.display = 'none';
            document.querySelector('.custom-cron-options').style.display = 'none';
            
            if (value === 'weekly') {
                weeklyOptions.style.display = 'block';
                document.querySelector('.schedule-date').style.display = 'none';
                document.querySelector('.schedule-time').style.display = 'block';
            } else if (value === 'monthly') {
                monthlyOptions.style.display = 'block';
                document.querySelector('.schedule-date').style.display = 'none';
                document.querySelector('.schedule-time').style.display = 'block';
            } else if (value === 'custom-cron') {
                document.querySelector('.custom-cron-options').style.display = 'block';
                document.querySelector('.schedule-date').style.display = 'none';
                document.querySelector('.schedule-time').style.display = 'none';
            } else {
                // Daily option
                document.querySelector('.schedule-date').style.display = 'none';
                document.querySelector('.schedule-time').style.display = 'block';
            }
        }
    });
}

// Populate days of month dropdown
if (dayOfMonth) {
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        dayOfMonth.appendChild(option);
    }
}

// Character count for post content
if (postContent) {
    postContent.addEventListener('input', updateCharCount);
}

function updateCharCount() {
    if (charCount && postContent) {
        const count = postContent.value.length;
        charCount.textContent = `${count}/1300 characters`;
        
        // Warn if too long
        if (count > 1300) {
            charCount.style.color = 'var(--danger-color)';
        } else {
            charCount.style.color = 'var(--light-text)';
        }
    }
}

// Post Form Submit
if (postForm) {
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get active post type
        const postType = document.querySelector('.toggle-option.active').getAttribute('data-type');
        
        // Get form data
        const content = postContent.value;
        const isScheduled = schedulePostToggle.checked;
        let scheduleData = null;
        
        if (isScheduled) {
            const type = scheduleType.value;
            scheduleData = {
                type: type
            };
            
            if (type === 'custom-cron') {
                const cronExpression = document.getElementById('cron-expression').value;
                if (!cronExpression) {
                    showToast('Please enter a cron expression', 'error');
                    return;
                }
                scheduleData.cronExpression = cronExpression;
            } else if (type === 'one-time') {
                const scheduleDate = document.getElementById('schedule-date').value;
                const scheduleTime = document.getElementById('schedule-time').value;
                if (!scheduleDate || !scheduleTime) {
                    showToast('Please select schedule date and time', 'error');
                    return;
                }
                scheduleData.date = scheduleDate;
                scheduleData.time = scheduleTime;
            } else {
                // Daily, weekly, monthly
                const scheduleTime = document.getElementById('schedule-time').value;
                if (!scheduleTime) {
                    showToast('Please select schedule time', 'error');
                    return;
                }
                scheduleData.time = scheduleTime;
                
                if (type === 'weekly') {
                    scheduleData.dayOfWeek = document.getElementById('day-of-week').value;
                } else if (type === 'monthly') {
                    scheduleData.dayOfMonth = dayOfMonth.value;
                }
            }
            
            // Get regeneration options
            const regenerateContent = document.getElementById('regenerate-content').checked;
            const regenerateImage = document.getElementById('regenerate-image').checked;
            
            if (regenerateContent) {
                scheduleData.regenerateContent = true;
                scheduleData.contentPrompt = document.getElementById('content-prompt')?.value || content;
            }
            
            if (regenerateImage) {
                scheduleData.regenerateImage = true;
                scheduleData.imagePrompt = document.getElementById('image-prompt')?.value || prompt;
            }
        }
        
        // Validate form
        if (!content) {
            showToast('Please enter post content', 'error');
            return;
        }
        
        if (postType === 'image' && !imagePreview.src) {
            showToast('Please generate or upload an image', 'error');
            return;
        }
        
        // Only validate schedule time if scheduling is enabled
        if (isScheduled) {
            const scheduleTypeValue = scheduleType.value;
            if (scheduleTypeValue === 'one-time' && 
                (!document.getElementById('schedule-date').value || !document.getElementById('schedule-time').value)) {
                showToast('Please select schedule date and time', 'error');
                return;
            } else if ((scheduleTypeValue === 'daily' || scheduleTypeValue === 'weekly' || scheduleTypeValue === 'monthly') && 
                      !document.getElementById('schedule-time').value) {
                showToast('Please select schedule time', 'error');
                return;
            } else if (scheduleTypeValue === 'custom-cron' && !document.getElementById('cron-expression').value) {
                showToast('Please enter a cron expression', 'error');
                return;
            }
        }
        
        // Show loading state
        const submitButton = postForm.querySelector('button[type="submit"]');
        const spinnerIcon = submitButton.querySelector('.fa-spinner');
        submitButton.disabled = true;
        submitText.style.display = 'none';
        spinnerIcon.style.display = 'inline-block';
        
        // Create post data
        const postData = {
            content: content,
            post_type: postType,
            schedule_time: isScheduled ? formatScheduleTime(scheduleData) : null
        };
        
        // If not scheduled, mark it for immediate posting
        if (!isScheduled) {
            postData.post_now = true;
        }
        
        if (postType === 'image') {
            postData.image_url = imagePreview.src;
        }
        
        // Add scheduling specific data
        if (isScheduled) {
            if (scheduleData.type === 'custom-cron') {
                postData.cron_expression = scheduleData.cronExpression;
                postData.schedule_type = 'custom-cron';
            } else {
                postData.schedule_type = scheduleData.type;
                
                if (scheduleData.type === 'weekly') {
                    postData.day_of_week = scheduleData.dayOfWeek;
                } else if (scheduleData.type === 'monthly') {
                    postData.day_of_month = scheduleData.dayOfMonth;
                }
            }
            
            // Add Gemini regeneration options
            if (scheduleData.regenerateContent) {
                postData.regenerate_content = true;
                postData.content_prompt = scheduleData.contentPrompt;
            }
            
            if (scheduleData.regenerateImage) {
                postData.regenerate_image = true;
                postData.image_prompt = scheduleData.imagePrompt;
            }
        }
        
        // Call API to create post
        createPost(postData)
            .then(response => {
                if (response.success) {
                    showToast(isScheduled ? 'Post scheduled successfully' : 'Post published successfully', 'success');
                    resetForm();
                } else {
                    throw new Error(response.message || 'Failed to create post');
                }
            })
            .catch(error => {
                console.error('Error creating post:', error);
                showToast(error.message || 'Failed to create post', 'error');
            })
            .finally(() => {
                // Reset button state
                submitButton.disabled = false;
                submitText.style.display = 'inline';
                spinnerIcon.style.display = 'none';
            });
    }
    
    function resetForm() {
        if (postForm) {
            postForm.reset();
            postContent.value = '';
            imagePreview.src = '';
            imagePreview.style.display = 'none';
            imagePreviewPlaceholder.style.display = 'flex';
            updateCharCount();
            
            // Reset toggles
            if (generateContentToggle) {
                generateContentToggle.checked = false;
            }
            if (contentPromptGroup) {
                contentPromptGroup.style.display = 'none';
            }
            if (schedulePostToggle) {
                schedulePostToggle.checked = false;
            }
            if (scheduleOptions) {
                scheduleOptions.style.display = 'none';
            }
            if (submitText) {
                submitText.textContent = 'Post Now';
            }
            
            // Set default post type to text
            postTypeOptions.forEach(opt => opt.classList.remove('active'));
            postTypeOptions[0].classList.add('active');
            imageGroup.style.display = 'none';
        }
    }
    
    // File Upload Functionality
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            fileUpload.click();
        });
        
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('active');
        });
        
        uploadArea.addEventListener('dragleave', function() {
            this.classList.remove('active');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('active');
            
            if (e.dataTransfer.files.length) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }
    
    if (fileUpload) {
        fileUpload.addEventListener('change', function() {
            if (this.files.length) {
                handleFileUpload(this.files[0]);
            }
        });
    }
    
    if (removeFile) {
        removeFile.addEventListener('click', function() {
            uploadedFile.style.display = 'none';
            extractionOptions.style.display = 'none';
            fileUpload.value = '';
        });
    }
    
    function handleFileUpload(file) {
        // Check file type
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'txt'].includes(fileExt)) {
            showToast('Invalid file type. Please upload PDF, DOCX, or TXT file.', 'error');
            return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size exceeds 10MB limit', 'error');
            return;
        }
        
        // Update UI
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        uploadedFile.style.display = 'flex';
        extractionOptions.style.display = 'block';
        
        // If we're already showing generated content, hide it
        generatedContent.style.display = 'none';
    }
    
    if (extractContent) {
        extractContent.addEventListener('click', function() {
            if (!fileUpload.files.length) {
                showToast('Please upload a file first', 'error');
                return;
            }
            
            const file = fileUpload.files[0];
            const numPosts = document.getElementById('num-posts').value;
            
            // Show loading state
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            
            // Upload file and extract content
            uploadFile(formData)
                .then(response => {
                    if (response.success) {
                        return generatePostsFromText(response.extracted_text, numPosts);
                    } else {
                        throw new Error(response.message || 'Failed to upload file');
                    }
                })
                .then(posts => {
                    displayGeneratedPosts(posts);
                    showToast('Posts generated successfully', 'success');
                })
                .catch(error => {
                    console.error('Error generating posts:', error);
                    showToast(error.message || 'Failed to generate posts', 'error');
                })
                .finally(() => {
                    // Reset button state
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-magic"></i> Generate LinkedIn Posts';
                });
        });
    }
    
    function displayGeneratedPosts(posts) {
        if (!generatedPosts) return;
        
        // Clear previous posts
        generatedPosts.innerHTML = '';
        
        // Create post elements
        posts.forEach((post, index) => {
            const postItem = document.createElement('div');
            postItem.className = 'post-item';
            
            postItem.innerHTML = `
                <div class="post-content">
                    <h4>Post ${index + 1}</h4>
                    <p>${post}</p>
                </div>
                <div class="post-actions">
                    <button class="btn btn-secondary edit-post-btn" data-content="${encodeURIComponent(post)}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-primary use-post-btn" data-content="${encodeURIComponent(post)}">
                        <i class="fas fa-check"></i> Use This Post
                    </button>
                </div>
            `;
            
            generatedPosts.appendChild(postItem);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const content = decodeURIComponent(this.getAttribute('data-content'));
                openEditModal(content);
            });
        });
        
        document.querySelectorAll('.use-post-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const content = decodeURIComponent(this.getAttribute('data-content'));
                useGeneratedPost(content);
            });
        });
        
        // Show the generated content section
        generatedContent.style.display = 'block';
    }
    
    function openEditModal(content) {
        modalTitle.textContent = 'Edit Post';
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="edit-post-content">Post Content</label>
                <textarea id="edit-post-content" rows="8">${content}</textarea>
            </div>
        `;
        
        // Set up modal actions
        modalConfirm.textContent = 'Save Changes';
        modalConfirm.onclick = function() {
            const editedContent = document.getElementById('edit-post-content').value;
            // Find the button that opened this modal and update its data attribute
            const activeEditBtn = document.querySelector('.edit-post-btn[data-content="' + encodeURIComponent(content) + '"]');
            if (activeEditBtn) {
                activeEditBtn.setAttribute('data-content', encodeURIComponent(editedContent));
                const useBtn = activeEditBtn.nextElementSibling;
                if (useBtn) {
                    useBtn.setAttribute('data-content', encodeURIComponent(editedContent));
                }
                
                // Update the displayed content
                const postContent = activeEditBtn.closest('.post-item').querySelector('p');
                if (postContent) {
                    postContent.textContent = editedContent;
                }
            }
            
            closeModalFunc();
            showToast('Post updated successfully', 'success');
        };
        
        // Show modal
        modal.classList.add('active');
    }
    
    function useGeneratedPost(content) {
        // Navigate to Create Post page
        navItems.forEach(nav => {
            if (nav.getAttribute('data-page') === 'create-post') {
                nav.click();
            }
        });
        
        // Fill in the content
        if (postContent) {
            postContent.value = content;
            updateCharCount();
        }
        
        showToast('Post content added to editor', 'success');
    }
    
    // Connect LinkedIn Button
    if (connectLinkedInBtn) {
        // Update button text since LinkedIn is always connected in local mode
        connectLinkedInBtn.innerHTML = '<i class="fab fa-linkedin"></i> LinkedIn Connected';
        connectLinkedInBtn.classList.add('connected');
        
        connectLinkedInBtn.addEventListener('click', function() {
            showToast('LinkedIn is already connected in local mode', 'info');
        });
        
        // Check LinkedIn connection status on page load
        checkLinkedInStatus()
            .then(data => {
                if (data.success && data.is_connected) {
                    // LinkedIn is connected, update UI
                    document.querySelector('.connect-btn').classList.add('connected');
                }
            })
            .catch(error => {
                console.error('Error checking LinkedIn status:', error);
            });
    }
    
    // Modal close handlers
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', closeModalFunc);
    }
    
    function closeModalFunc() {
        modal.classList.remove('active');
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        const toastProgress = toast.querySelector('.toast-progress');
        
        // Set message
        toastMessage.textContent = message;
        
        // Set icon and color based on type
        if (type === 'error') {
            toastIcon.className = 'fas fa-times-circle toast-icon';
            toastIcon.style.color = 'var(--danger-color)';
            toastProgress.style.backgroundColor = 'var(--danger-color)';
        } else {
            toastIcon.className = 'fas fa-check-circle toast-icon';
            toastIcon.style.color = 'var(--success-color)';
            toastProgress.style.backgroundColor = 'var(--success-color)';
        }
        
        // Show toast
        toast.classList.add('active');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
    
    // Helper functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatScheduleTime(scheduleData) {
        if (scheduleData.type === 'one-time') {
            return `${scheduleData.date}T${scheduleData.time}:00`;
        } else if (scheduleData.type === 'custom-cron') {
            return scheduleData.cronExpression;
        } else {
            return scheduleData.time;
        }
    }
    
    // API Functions
    async function generateContent(prompt) {
        try {
            const response = await fetch(`${API_URL}/posts/generate-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ prompt: prompt })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate content');
            }
            
            return data.content;
        } catch (error) {
            console.error('Error in generateContent:', error);
            throw error;
        }
    }
    
    async function generateImage(prompt) {
        try {
            if (!prompt) {
                throw new Error('Image prompt is required');
            }

            const response = await fetch(`${API_URL}/posts/generate-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate image');
            }
            
            return data.image_url;
        } catch (error) {
            console.error('Error in generateImage:', error);
            throw error;
        }
    }
    
    // Upload PDF function (was referenced but not defined)
    async function uploadPdf(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${API_URL}/files/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error uploading PDF:', error);
            throw error;
        }
    }
    
    // Initialize application
    function init() {
        // Populate day of month dropdown
        if (dayOfMonth) {
            for (let i = 1; i <= 31; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                dayOfMonth.appendChild(option);
            }
        }
        
        // Set default date for schedule to today
        const scheduleDate = document.getElementById('schedule-date');
        if (scheduleDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            scheduleDate.value = `${year}-${month}-${day}`;
        }
        
        // Set default time to current hour + 1
        const scheduleTime = document.getElementById('schedule-time');
        if (scheduleTime) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            scheduleTime.value = `${hours}:${minutes}`;
        }
        
        // Fetch and populate dashboard data
        fetchDashboardData();
    }
    
    async function fetchDashboardData() {
        // This would typically fetch data from your API
        // For this demo, we'll just use static data
        
        // You could implement this with:
        // try {
        //     const response = await fetch(`${API_URL}/dashboard`);
        //     const data = await response.json();
        //     
        //     if (data.success) {
        //         updateDashboardStats(data.stats);
        //         updateUpcomingPosts(data.upcoming_posts);
        //         updateRecentActivity(data.recent_activity);
        //     }
        // } catch (error) {
        //     console.error('Error fetching dashboard data:', error);
        // }
    }
    
    // Call init function
    init();
                <textarea id="edit-post-content" rows="8">${content}</textarea>
            </div>
        `;
        
        // Set up modal actions
        modalConfirm.textContent = 'Save Changes';
        modalConfirm.onclick = function() {
            const editedContent = document.getElementById('edit-post-content').value;
            // Find the button that opened this modal and update its data attribute
            const activeEditBtn = document.querySelector('.edit-post-btn[data-content="' + encodeURIComponent(content) + '"]');
            if (activeEditBtn) {
                activeEditBtn.setAttribute('data-content', encodeURIComponent(editedContent));
                const useBtn = activeEditBtn.nextElementSibling;
                if (useBtn) {
                    useBtn.setAttribute('data-content', encodeURIComponent(editedContent));
                }
                
                // Update the displayed content
                const postContent = activeEditBtn.closest('.post-item').querySelector('p');
                if (postContent) {
                    postContent.textContent = editedContent;
                }
            }
            
            closeModalFunc();
            showToast('Post updated successfully', 'success');
        };
        
        // Show modal
        modal.classList.add('active');
    }
    
    function useGeneratedPost(content) {
        // Navigate to Create Post page
        navItems.forEach(nav => {
            if (nav.getAttribute('data-page') === 'create-post') {
                nav.click();
            }
        });
        
        // Fill in the content
        if (postContent) {
            postContent.value = content;
            updateCharCount();
        }
        
        showToast('Post content added to editor', 'success');
    }
    
    // Connect LinkedIn Button
    if (connectLinkedInBtn) {
        // Update button text since LinkedIn is always connected in local mode
        connectLinkedInBtn.innerHTML = '<i class="fab fa-linkedin"></i> LinkedIn Connected';
        connectLinkedInBtn.classList.add('connected');
        
        connectLinkedInBtn.addEventListener('click', function() {
            showToast('LinkedIn is already connected in local mode', 'info');
        });
        
        // Check LinkedIn connection status on page load
        checkLinkedInStatus()
            .then(data => {
                if (data.success && data.is_connected) {
                    // LinkedIn is connected, update UI
                    document.querySelector('.connect-btn').classList.add('connected');
                }
            })
            .catch(error => {
                console.error('Error checking LinkedIn status:', error);
            });
    }
    
    // Modal close handlers
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', closeModalFunc);
    }
    
    function closeModalFunc() {
        modal.classList.remove('active');
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        const toastProgress = toast.querySelector('.toast-progress');
        
        // Set message
        toastMessage.textContent = message;
        
        // Set icon and color based on type
        if (type === 'error') {
            toastIcon.className = 'fas fa-times-circle toast-icon';
            toastIcon.style.color = 'var(--danger-color)';
            toastProgress.style.backgroundColor = 'var(--danger-color)';
        } else {
            toastIcon.className = 'fas fa-check-circle toast-icon';
            toastIcon.style.color = 'var(--success-color)';
            toastProgress.style.backgroundColor = 'var(--success-color)';
        }
        
        // Show toast
        toast.classList.add('active');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
    
    // Helper functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatScheduleTime(scheduleData) {
        if (scheduleData.type === 'one-time') {
            return `${scheduleData.date}T${scheduleData.time}:00`;
        } else if (scheduleData.type === 'custom-cron') {
            return scheduleData.cronExpression;
        } else {
            return scheduleData.time;
        }
    }
    
    // API Functions
    async function generateContent(prompt) {
        try {
            console.log('Calling content generation API with prompt:', prompt);
            
            const response = await fetch(`${API_URL}/posts/generate-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ prompt: prompt })
            });
            
            console.log('Content API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Content API error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Content API response data:', data);
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate content');
            }
            
            return data.content;
        } catch (error) {
            console.error('Error in generateContent:', error);
            throw error;
        }
    }
    
    async function generateImage(prompt) {
        try {
            console.log('Calling image generation API with prompt:', prompt);
            
            const response = await fetch(`${API_URL}/posts/generate-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });
            
            console.log('Image API response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Image API error:', errorData);
                throw new Error(errorData.message || `API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Image API response data:', data);
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate image');
            }
            
            return data.image_url;
        } catch (error) {
            console.error('Error in generateImage:', error);
            throw error;
        }
    }
    
    // Upload PDF function (was referenced but not defined)
    async function uploadPdf(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${API_URL}/files/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error uploading PDF:', error);
            throw error;
        }
    }
    
    // Initialize application
    function init() {
        // Populate day of month dropdown
        if (dayOfMonth) {
            for (let i = 1; i <= 31; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                dayOfMonth.appendChild(option);
            }
        }
        
        // Set default date for schedule to today
        const scheduleDate = document.getElementById('schedule-date');
        if (scheduleDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            scheduleDate.value = `${year}-${month}-${day}`;
        }
        
        // Set default time to current hour + 1
        const scheduleTime = document.getElementById('schedule-time');
        if (scheduleTime) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            scheduleTime.value = `${hours}:${minutes}`;
        }
        
        // Fetch and populate dashboard data
        fetchDashboardData();
    }
    
    async function fetchDashboardData() {
        // This would typically fetch data from your API
        // For this demo, we'll just use static data
        
        // You could implement this with:
        // try {
        //     const response = await fetch(`${API_URL}/dashboard`);
        //     const data = await response.json();
        //     
        //     if (data.success) {
        //         updateDashboardStats(data.stats);
        //         updateUpcomingPosts(data.upcoming_posts);
        //         updateRecentActivity(data.recent_activity);
        //     }
        // } catch (error) {
        //     console.error('Error fetching dashboard data:', error);
        // }
    }
    
    // Call init function
    init();
                    showToast('Please enter a cron expression', 'error');
                    return;
                }
            }
            
            // Show loading state
            const submitButton = postForm.querySelector('button[type="submit"]');
            const spinnerIcon = submitButton.querySelector('.fa-spinner');
            submitButton.disabled = true;
            submitText.style.display = 'none';
            spinnerIcon.style.display = 'inline-block';
            
            // Create post data
            const postData = {
                content: content,
                post_type: postType,
                schedule_time: isScheduled ? formatScheduleTime(scheduleData) : null
            };
            
            // If not scheduled, mark it for immediate posting
            if (!isScheduled) {
                postData.post_now = true;
            }
            
            if (postType === 'image') {
                postData.image_url = imagePreview.src;
            }
            
            // Add scheduling specific data
            if (isScheduled) {
                if (scheduleData.type === 'custom-cron') {
                    postData.cron_expression = scheduleData.cronExpression;
                    postData.schedule_type = 'custom-cron';
                } else {
                    postData.schedule_type = scheduleData.type;
                    
                    if (scheduleData.type === 'weekly') {
                        postData.day_of_week = scheduleData.dayOfWeek;
                    } else if (scheduleData.type === 'monthly') {
                        postData.day_of_month = scheduleData.dayOfMonth;
                    }
                }
                
                // Add Gemini regeneration options
                if (scheduleData.regenerateContent) {
                    postData.regenerate_content = true;
                    postData.content_prompt = scheduleData.contentPrompt;
                }
                
                if (scheduleData.regenerateImage) {
                    postData.regenerate_image = true;
                    postData.image_prompt = scheduleData.imagePrompt;
                }
            }
            
            // Call API to create post
            createPost(postData)
                .then(response => {
                    if (response.success) {
                        showToast(isScheduled ? 'Post scheduled successfully' : 'Post published successfully', 'success');
                        resetForm();
                    } else {
                        throw new Error(response.message || 'Failed to create post');
                    }
                })
                .catch(error => {
                    console.error('Error creating post:', error);
                    showToast(error.message || 'Failed to create post', 'error');
                })
                .finally(() => {
                    // Reset button state
                    submitButton.disabled = false;
                    submitText.style.display = 'inline';
                    spinnerIcon.style.display = 'none';
                });
        });
    }
    
    function resetForm() {
        if (postForm) {
            postForm.reset();
            postContent.value = '';
            imagePreview.src = '';
            imagePreview.style.display = 'none';
            imagePreviewPlaceholder.style.display = 'flex';
            updateCharCount();
            
            // Reset toggles
            if (generateContentToggle) {
                generateContentToggle.checked = false;
            }
            if (contentPromptGroup) {
                contentPromptGroup.style.display = 'none';
            }
            if (schedulePostToggle) {
                schedulePostToggle.checked = false;
            }
            if (scheduleOptions) {
                scheduleOptions.style.display = 'none';
            }
            if (submitText) {
                submitText.textContent = 'Post Now';
            }
            
            // Set default post type to text
            postTypeOptions.forEach(opt => opt.classList.remove('active'));
            postTypeOptions[0].classList.add('active');
            imageGroup.style.display = 'none';
        }
    }
    
    // File Upload Functionality
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            fileUpload.click();
        });
        
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('active');
        });
        
        uploadArea.addEventListener('dragleave', function() {
            this.classList.remove('active');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('active');
            
            if (e.dataTransfer.files.length) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }
    
    if (fileUpload) {
        fileUpload.addEventListener('change', function() {
            if (this.files.length) {
                handleFileUpload(this.files[0]);
            }
        });
    }
    
    if (removeFile) {
        removeFile.addEventListener('click', function() {
            uploadedFile.style.display = 'none';
            extractionOptions.style.display = 'none';
            fileUpload.value = '';
        });
    }
    
    function handleFileUpload(file) {
        // Check file type
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'txt'].includes(fileExt)) {
            showToast('Invalid file type. Please upload PDF, DOCX, or TXT file.', 'error');
            return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size exceeds 10MB limit', 'error');
            return;
        }
        
        // Update UI
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        uploadedFile.style.display = 'flex';
        extractionOptions.style.display = 'block';
        
        // If we're already showing generated content, hide it
        generatedContent.style.display = 'none';
    }
    
    if (extractContent) {
        extractContent.addEventListener('click', function() {
            if (!fileUpload.files.length) {
                showToast('Please upload a file first', 'error');
                return;
            }
            
            const file = fileUpload.files[0];
            const numPosts = document.getElementById('num-posts').value;
            
            // Show loading state
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            
            // Upload file and extract content
            uploadFile(formData)
                .then(response => {
                    if (response.success) {
                        return generatePostsFromText(response.extracted_text, numPosts);
                    } else {
                        throw new Error(response.message || 'Failed to upload file');
                    }
                })
                .then(posts => {
                    displayGeneratedPosts(posts);
                    showToast('Posts generated successfully', 'success');
                })
                .catch(error => {
                    console.error('Error generating posts:', error);
                    showToast(error.message || 'Failed to generate posts', 'error');
                })
                .finally(() => {
                    // Reset button state
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-magic"></i> Generate LinkedIn Posts';
                });
        });
    }
    
    function displayGeneratedPosts(posts) {
        if (!generatedPosts) return;
        
        // Clear previous posts
        generatedPosts.innerHTML = '';
        
        // Create post elements
        posts.forEach((post, index) => {
            const postItem = document.createElement('div');
            postItem.className = 'post-item';
            
            postItem.innerHTML = `
                <div class="post-content">
                    <h4>Post ${index + 1}</h4>
                    <p>${post}</p>
                </div>
                <div class="post-actions">
                    <button class="btn btn-secondary edit-post-btn" data-content="${encodeURIComponent(post)}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-primary use-post-btn" data-content="${encodeURIComponent(post)}">
                        <i class="fas fa-check"></i> Use This Post
                    </button>
                </div>
            `;
            
            generatedPosts.appendChild(postItem);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const content = decodeURIComponent(this.getAttribute('data-content'));
                openEditModal(content);
            });
        });
        
        document.querySelectorAll('.use-post-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const content = decodeURIComponent(this.getAttribute('data-content'));
                useGeneratedPost(content);
            });
        });
        
        // Show the generated content section
        generatedContent.style.display = 'block';
    }
    
    function openEditModal(content) {
        modalTitle.textContent = 'Edit Post';
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="edit-post-content">Post Content</label>
                <textarea id="edit-post-content" rows="8">${content}</textarea>
            </div>
        `;
        
        // Set up modal actions
        modalConfirm.textContent = 'Save Changes';
        modalConfirm.onclick = function() {
            const editedContent = document.getElementById('edit-post-content').value;
            // Find the button that opened this modal and update its data attribute
            const activeEditBtn = document.querySelector('.edit-post-btn[data-content="' + encodeURIComponent(content) + '"]');
            if (activeEditBtn) {
                activeEditBtn.setAttribute('data-content', encodeURIComponent(editedContent));
                const useBtn = activeEditBtn.nextElementSibling;
                if (useBtn) {
                    useBtn.setAttribute('data-content', encodeURIComponent(editedContent));
                }
                
                // Update the displayed content
                const postContent = activeEditBtn.closest('.post-item').querySelector('p');
                if (postContent) {
                    postContent.textContent = editedContent;
                }
            }
            
            closeModalFunc();
            showToast('Post updated successfully', 'success');
        };
        
        // Show modal
        modal.classList.add('active');
    }
    
    function useGeneratedPost(content) {
        // Navigate to Create Post page
        navItems.forEach(nav => {
            if (nav.getAttribute('data-page') === 'create-post') {
                nav.click();
            }
        });
        
        // Fill in the content
        if (postContent) {
            postContent.value = content;
            updateCharCount();
        }
        
        showToast('Post content added to editor', 'success');
    }
    
    // Connect LinkedIn Button
    if (connectLinkedInBtn) {
        // Update button text since LinkedIn is always connected in local mode
        connectLinkedInBtn.innerHTML = '<i class="fab fa-linkedin"></i> LinkedIn Connected';
        connectLinkedInBtn.classList.add('connected');
        
        connectLinkedInBtn.addEventListener('click', function() {
            showToast('LinkedIn is already connected in local mode', 'info');
        });
        
        // Check LinkedIn connection status on page load
        checkLinkedInStatus()
            .then(data => {
                if (data.success && data.is_connected) {
                    // LinkedIn is connected, update UI
                    document.querySelector('.connect-btn').classList.add('connected');
                }
            })
            .catch(error => {
                console.error('Error checking LinkedIn status:', error);
            });
    }
    
    // Modal close handlers
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunc);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', closeModalFunc);
    }
    
    function closeModalFunc() {
        modal.classList.remove('active');
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        const toastProgress = toast.querySelector('.toast-progress');
        
        // Set message
        toastMessage.textContent = message;
        
        // Set icon and color based on type
        if (type === 'error') {
            toastIcon.className = 'fas fa-times-circle toast-icon';
            toastIcon.style.color = 'var(--danger-color)';
            toastProgress.style.backgroundColor = 'var(--danger-color)';
        } else {
            toastIcon.className = 'fas fa-check-circle toast-icon';
            toastIcon.style.color = 'var(--success-color)';
            toastProgress.style.backgroundColor = 'var(--success-color)';
        }
        
        // Show toast
        toast.classList.add('active');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
    
    // Helper functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatScheduleTime(scheduleData) {
        if (scheduleData.type === 'one-time') {
            return `${scheduleData.date}T${scheduleData.time}:00`;
        } else if (scheduleData.type === 'custom-cron') {
            return scheduleData.cronExpression;
        } else {
            return scheduleData.time;
        }
    }
    
    // API Functions
    async function generateContent(prompt) {
        try {
            const response = await fetch(`${API_URL}/posts/generate-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ prompt: prompt })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate content');
            }
            
            return data.content;
        } catch (error) {
            console.error('Error in generateContent:', error);
            throw error;
        }
    }
    
    async function generateImage(prompt) {
        try {
            if (!prompt) {
                throw new Error('Image prompt is required');
            }

            const response = await fetch(`${API_URL}/posts/generate-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate image');
            }
            
            return data.image_url;
        } catch (error) {
            console.error('Error in generateImage:', error);
            throw error;
        }
    }
    
    // Upload PDF function (was referenced but not defined)
    async function uploadPdf(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${API_URL}/files/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error uploading PDF:', error);
            throw error;
        }
    }
    
    // Initialize application
    function init() {
        // Populate day of month dropdown
        if (dayOfMonth) {
            for (let i = 1; i <= 31; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                dayOfMonth.appendChild(option);
            }
        }
        
        // Set default date for schedule to today
        const scheduleDate = document.getElementById('schedule-date');
        if (scheduleDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            scheduleDate.value = `${year}-${month}-${day}`;
        }
        
        // Set default time to current hour + 1
        const scheduleTime = document.getElementById('schedule-time');
        if (scheduleTime) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            scheduleTime.value = `${hours}:${minutes}`;
        }
        
        // Fetch and populate dashboard data
        fetchDashboardData();
    }
    
    async function fetchDashboardData() {
        // This would typically fetch data from your API
        // For this demo, we'll just use static data
        
        // You could implement this with:
        // try {
        //     const response = await fetch(`${API_URL}/dashboard`);
        //     const data = await response.json();
        //     
        //     if (data.success) {
        //         updateDashboardStats(data.stats);
        //         updateUpcomingPosts(data.upcoming_posts);
        //         updateRecentActivity(data.recent_activity);
        //     }
        // } catch (error) {
        //     console.error('Error fetching dashboard data:', error);
        // }
    }
    
    // Call init function
    init();
