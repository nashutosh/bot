// Constants and Global Variables
const API_URL = '/api';

// Global state
let currentContent = null;
let currentImageUrl = null;
let currentSchedule = null;
let currentFile = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing LinkedIn AI Agent...");
    
    // Initialize all components
    initializeFormHandlers();
    initializePdfUpload();
    initializeContentPreview();
    initializeToasts();
    initializeStatsUpdate();
    
    // Load initial data
    loadStats();
    loadPostHistory();
});

// Form Handlers
function initializeFormHandlers() {
    const enableImageGen = document.getElementById('enable-image-gen');
    const imagePromptGroup = document.getElementById('image-prompt-group');
    const generateBtn = document.getElementById('generate-btn');
    const contentPrompt = document.getElementById('content-prompt');
    const imagePrompt = document.getElementById('image-prompt');
    const scheduleInput = document.getElementById('schedule-input');
    
    // Image generation toggle
    if (enableImageGen && imagePromptGroup) {
        enableImageGen.addEventListener('change', function() {
            imagePromptGroup.style.display = this.checked ? 'block' : 'none';
            
            if (!this.checked) {
                const imagePreview = document.getElementById('image-preview');
                if (imagePreview) {
                    imagePreview.style.display = 'none';
                    const img = imagePreview.querySelector('img');
                    if (img) img.src = '';
                }
                if (imagePrompt) imagePrompt.value = '';
                currentImageUrl = null;
            }
        });
    }
    
    // Generate button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }
    
    // Schedule input change
    if (scheduleInput) {
        scheduleInput.addEventListener('change', function() {
            currentSchedule = this.value;
            updatePostButton();
            updateScheduleDisplay();
        });
    }
}

// PDF Upload Handlers
function initializePdfUpload() {
    const uploadPdfBtn = document.getElementById('upload-pdf-btn');
    const pdfModal = document.getElementById('pdf-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelUpload = document.getElementById('cancel-upload');
    const uploadArea = document.getElementById('upload-area');
    const fileUpload = document.getElementById('file-upload');
    const processPdf = document.getElementById('process-pdf');
    const removeFile = document.getElementById('remove-file');
    
    if (uploadPdfBtn && pdfModal) {
        uploadPdfBtn.addEventListener('click', () => {
            pdfModal.classList.add('active');
        });
        
        [closeModalBtn, cancelUpload].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    pdfModal.classList.remove('active');
                    resetFileUpload();
                });
            }
        });
        
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
        
        if (processPdf) {
            processPdf.addEventListener('click', handlePdfProcess);
        }
        
        if (removeFile) {
            removeFile.addEventListener('click', resetFileUpload);
        }
    }
}

// Content Preview Handlers
function initializeContentPreview() {
    const regenerateBtn = document.getElementById('regenerate-btn');
    const postBtn = document.getElementById('post-btn');
    const editContentBtn = document.getElementById('edit-content-btn');
    const copyContentBtn = document.getElementById('copy-content-btn');
    const viewAllPostsBtn = document.getElementById('view-all-posts-btn');
    
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', handleGenerate);
    }
    
    if (postBtn) {
        postBtn.addEventListener('click', handlePost);
    }
    
    if (editContentBtn) {
        editContentBtn.addEventListener('click', handleEditContent);
    }
    
    if (copyContentBtn) {
        copyContentBtn.addEventListener('click', handleCopyContent);
    }
    
    if (viewAllPostsBtn) {
        viewAllPostsBtn.addEventListener('click', () => {
            showToast('All posts view coming soon!', 'info');
        });
    }
}

// Toast System
function initializeToasts() {
    const toastClose = document.querySelector('.toast-close');
    if (toastClose) {
        toastClose.addEventListener('click', hideToast);
    }
}

// Stats Update
function initializeStatsUpdate() {
    setInterval(loadStats, 30000);
}

// Main Generation Handler
async function handleGenerate() {
    const contentPrompt = document.getElementById('content-prompt');
    const imagePrompt = document.getElementById('image-prompt');
    const enableImageGen = document.getElementById('enable-image-gen');
    const generateBtn = document.getElementById('generate-btn');
    
    try {
        // Validation
        if (!contentPrompt?.value.trim()) {
            showToast('Please enter a content prompt', 'error');
            return;
        }
        
        if (enableImageGen?.checked && !imagePrompt?.value.trim()) {
            showToast('Image prompt is required when image generation is enabled', 'error');
            return;
        }
        
        // Set loading state
        setButtonLoading(generateBtn, 'Generating...');
        
        // Generate content
        const content = await generateContent(contentPrompt.value.trim());
        currentContent = content;
        
        // Display generated text
        const generatedText = document.getElementById('generated-text');
        if (generatedText) {
            generatedText.textContent = content;
        }
        
        // Generate image if enabled
        if (enableImageGen?.checked && imagePrompt?.value.trim()) {
            try {
                const imageUrl = await generateImage(imagePrompt.value.trim());
                if (imageUrl) {
                    currentImageUrl = imageUrl;
                    displayGeneratedImage(imageUrl);
                }
            } catch (imageError) {
                console.warn('Image generation failed:', imageError);
                showToast('Content generated successfully, but image generation failed', 'warning');
            }
        }
        
        // Show preview
        showContentPreview();
        updatePostButton();
        updateScheduleDisplay();
        
        showToast('Content generated successfully!', 'success');
        
    } catch (error) {
        console.error('Generation error:', error);
        showToast(error.message || 'Failed to generate content', 'error');
    } finally {
        resetButtonLoading(generateBtn, '<i class="fas fa-wand-magic-sparkles me-1"></i> Generate & Preview');
    }
}

// PDF Processing Handler
async function handlePdfProcess() {
    const processPdf = document.getElementById('process-pdf');
    const contentPrompt = document.getElementById('content-prompt');
    const pdfModal = document.getElementById('pdf-modal');
    
    if (!currentFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }
    
    try {
        setButtonLoading(processPdf, 'Processing...');
        
        const result = await uploadPdf(currentFile);
        
        if (result.success && result.summary) {
            // Fill the content prompt with the summary
            if (contentPrompt) {
                contentPrompt.value = `Create a professional LinkedIn post based on the following content: ${result.summary}`;
            }
            
            // Close modal and reset
            pdfModal.classList.remove('active');
            resetFileUpload();
            
            showToast('PDF processed successfully! Content prompt has been filled.', 'success');
            
            // Auto-generate after a short delay
            setTimeout(() => {
                const generateBtn = document.getElementById('generate-btn');
                if (generateBtn) {
                    generateBtn.click();
                }
            }, 500);
        } else {
            throw new Error(result.message || 'Failed to process PDF');
        }
        
    } catch (error) {
        console.error('PDF processing error:', error);
        showToast(error.message || 'Failed to process PDF', 'error');
    } finally {
        resetButtonLoading(processPdf, '<i class="fas fa-cogs me-1"></i> Process PDF');
    }
}

// Post Handler
async function handlePost() {
    const postBtn = document.getElementById('post-btn');
    
    if (!currentContent) {
        showToast('Please generate content first', 'error');
        return;
    }
    
    try {
        setButtonLoading(postBtn, 'Publishing...');
        
        const postData = {
            content: currentContent,
            post_type: currentImageUrl ? 'image' : 'text',
            schedule_time: currentSchedule || null
        };
        
        if (currentImageUrl) {
            postData.image_url = currentImageUrl;
        }
        
        const result = await createPost(postData);
        
        if (result.success) {
            // Reset form and state
            resetForm();
            hideContentPreview();
            
            // Reload data
            loadStats();
            loadPostHistory();
            
            const message = currentSchedule ? 'Post scheduled successfully!' : 'Post published successfully!';
            showToast(message, 'success');
        } else {
            throw new Error(result.message || 'Failed to create post');
        }
        
    } catch (error) {
        console.error('Post creation error:', error);
        showToast(error.message || 'Failed to create post', 'error');
    } finally {
        resetButtonLoading(postBtn, currentSchedule ? 
            '<i class="fas fa-calendar me-1"></i> Schedule Post' : 
            '<i class="fas fa-paper-plane me-1"></i> Post Now');
    }
}

// Edit Content Handler
function handleEditContent() {
    const contentPrompt = document.getElementById('content-prompt');
    const contentPreview = document.getElementById('content-preview');
    
    if (currentContent && contentPrompt) {
        contentPrompt.value = currentContent;
        contentPrompt.focus();
        
        if (contentPreview) {
            contentPreview.style.display = 'none';
        }
    }
}

// Copy Content Handler
async function handleCopyContent() {
    if (!currentContent) {
        showToast('No content to copy', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(currentContent);
        showToast('Content copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        
        // Fallback: select and copy
        const textArea = document.createElement('textarea');
        textArea.value = currentContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Content copied to clipboard!', 'success');
    }
}

// File Handling
function handleFileSelection(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please select a PDF file', 'error');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) { // 16MB
        showToast('File size too large. Maximum size is 16MB', 'error');
        return;
    }
    
    currentFile = file;
    
    // Show file info
    const uploadArea = document.getElementById('upload-area');
    const uploadedFile = document.getElementById('uploaded-file');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    
    if (uploadArea) uploadArea.style.display = 'none';
    if (uploadedFile) uploadedFile.style.display = 'block';
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
}

function resetFileUpload() {
    currentFile = null;
    
    const uploadArea = document.getElementById('upload-area');
    const uploadedFile = document.getElementById('uploaded-file');
    const fileUpload = document.getElementById('file-upload');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (uploadedFile) uploadedFile.style.display = 'none';
    if (fileUpload) fileUpload.value = '';
}

// API Functions
async function generateContent(prompt) {
    const response = await fetch(`${API_URL}/generate-content`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Failed to generate content');
    }
    
    return data.content;
}

async function generateImage(prompt) {
    const response = await fetch(`${API_URL}/generate-image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
    }
    
    return data.image_url;
}

async function uploadPdf(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload-pdf`, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    return data;
}

async function createPost(postData) {
    const response = await fetch(`${API_URL}/create-post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
    });
    
    const data = await response.json();
    return data;
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadPostHistory() {
    try {
        const response = await fetch(`${API_URL}/posts?per_page=5`);
        const data = await response.json();
        
        if (data.success) {
            displayPostHistory(data.posts);
        }
    } catch (error) {
        console.error('Failed to load post history:', error);
    }
}

// UI Helper Functions
function showContentPreview() {
    const contentPreview = document.getElementById('content-preview');
    if (contentPreview) {
        contentPreview.style.display = 'block';
        contentPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function hideContentPreview() {
    const contentPreview = document.getElementById('content-preview');
    if (contentPreview) {
        contentPreview.style.display = 'none';
    }
}

function displayGeneratedImage(imageUrl) {
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) {
        const img = imagePreview.querySelector('img');
        if (img) {
            img.src = imageUrl;
            img.onload = () => {
                imagePreview.style.display = 'block';
            };
            img.onerror = () => {
                console.error('Failed to load generated image');
                showToast('Generated image could not be displayed', 'warning');
            };
        }
    }
}

function updatePostButton() {
    const postBtn = document.getElementById('post-btn');
    if (postBtn) {
        if (currentSchedule) {
            postBtn.innerHTML = '<i class="fas fa-calendar me-1"></i> Schedule Post';
        } else {
            postBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Post Now';
        }
    }
}

function updateScheduleDisplay() {
    const postingTime = document.getElementById('posting-time');
    const scheduleDisplay = document.getElementById('schedule-display');
    
    if (postingTime && scheduleDisplay) {
        if (currentSchedule) {
            const scheduleDate = new Date(currentSchedule);
            scheduleDisplay.textContent = scheduleDate.toLocaleString();
            postingTime.style.display = 'block';
        } else {
            postingTime.style.display = 'none';
        }
    }
}

function updateStatsDisplay(stats) {
    const totalPosts = document.getElementById('total-posts');
    const scheduledPosts = document.getElementById('scheduled-posts');
    const publishedPosts = document.getElementById('published-posts');
    
    if (totalPosts) totalPosts.textContent = stats.total_posts || 0;
    if (scheduledPosts) scheduledPosts.textContent = stats.scheduled_posts || 0;
    if (publishedPosts) publishedPosts.textContent = stats.published_posts || 0;
}

function displayPostHistory(posts) {
    const postHistory = document.getElementById('post-history');
    if (!postHistory) return;
    
    if (!posts || posts.length === 0) {
        postHistory.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x mb-2"></i>
                <p>No posts yet</p>
                <small>Create your first post to see it here</small>
            </div>
        `;
        return;
    }
    
    const historyHTML = posts.map(post => {
        const createdAt = new Date(post.created_at).toLocaleDateString();
        const content = post.content.length > 100 ? 
            post.content.substring(0, 100) + '...' : 
            post.content;
        
        return `
            <div class="post-item">
                <div class="post-meta">
                    <span class="post-status status-${post.status}">${post.status}</span>
                    <span class="ms-2">${createdAt}</span>
                </div>
                <div class="post-content-preview">${content}</div>
                ${post.post_type === 'image' ? '<small class="text-muted"><i class="fas fa-image me-1"></i>Contains image</small>' : ''}
            </div>
        `;
    }).join('');
    
    postHistory.innerHTML = historyHTML;
}

function resetForm() {
    const contentPrompt = document.getElementById('content-prompt');
    const imagePrompt = document.getElementById('image-prompt');
    const scheduleInput = document.getElementById('schedule-input');
    const enableImageGen = document.getElementById('enable-image-gen');
    const imagePromptGroup = document.getElementById('image-prompt-group');
    const imagePreview = document.getElementById('image-preview');
    
    if (contentPrompt) contentPrompt.value = '';
    if (imagePrompt) imagePrompt.value = '';
    if (scheduleInput) scheduleInput.value = '';
    if (enableImageGen) enableImageGen.checked = false;
    if (imagePromptGroup) imagePromptGroup.style.display = 'none';
    if (imagePreview) imagePreview.style.display = 'none';
    
    currentContent = null;
    currentImageUrl = null;
    currentSchedule = null;
}

// Button state management
function setButtonLoading(button, text) {
    if (button) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> ${text}`;
    }
}

function resetButtonLoading(button, originalText) {
    if (button) {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.querySelector('.toast');
    const toastMessage = document.querySelector('.toast-message');
    const toastIcon = document.querySelector('.toast-icon');
    
    if (!toast || !toastMessage || !toastIcon) return;
    
    // Set message
    toastMessage.textContent = message;
    
    // Update icon and styling based on type
    toast.className = 'toast show';
    toast.classList.add(type);
    
    switch (type) {
        case 'success':
            toastIcon.className = 'toast-icon fas fa-check-circle text-success me-2';
            break;
        case 'error':
            toastIcon.className = 'toast-icon fas fa-exclamation-circle text-danger me-2';
            break;
        case 'warning':
            toastIcon.className = 'toast-icon fas fa-exclamation-triangle text-warning me-2';
            break;
        default:
            toastIcon.className = 'toast-icon fas fa-info-circle text-primary me-2';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    const toast = document.querySelector('.toast');
    if (toast) {
        toast.classList.remove('show', 'success', 'error', 'warning', 'info');
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}