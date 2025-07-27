// LinkedIn AI Agent - Enhanced Marketing Automation
console.log('Initializing LinkedIn AI Agent...');

let currentPosts = [];
let currentFiles = [];
let activeCampaigns = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    bindEventListeners();
    loadInitialData();
});

function initializeApp() {
    console.log('App initialized successfully');
    
    // Initialize tooltips
    if (typeof bootstrap !== 'undefined') {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

function bindEventListeners() {
    // Existing listeners
    document.getElementById('generate-btn')?.addEventListener('click', generateContent);
    document.getElementById('upload-pdf-btn')?.addEventListener('click', showPDFUploadModal);
    document.getElementById('view-all-posts-btn')?.addEventListener('click', togglePostsList);
    
    // New automation listeners
    document.getElementById('auto-accept-btn')?.addEventListener('click', autoAcceptConnections);
    document.getElementById('auto-follow-btn')?.addEventListener('click', autoFollowSuccessful);
    document.getElementById('auto-engage-btn')?.addEventListener('click', autoEngagePosts);
    document.getElementById('create-campaign-btn')?.addEventListener('click', showCampaignModal);
    document.getElementById('smart-campaign-btn')?.addEventListener('click', smartCampaignFromPDF);
    document.getElementById('view-automation-btn')?.addEventListener('click', showAutomationModal);
    
    // Modal listeners
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    document.getElementById('create-campaign')?.addEventListener('click', createMarketingCampaign);
    document.getElementById('cancel-campaign')?.addEventListener('click', closeModal);
    document.getElementById('save-automation')?.addEventListener('click', saveAutomationSettings);
    document.getElementById('cancel-automation')?.addEventListener('click', closeModal);
    
    // PDF upload modal listeners
    document.getElementById('cancel-upload')?.addEventListener('click', closePDFModal);
    document.getElementById('cancel-pdf-upload')?.addEventListener('click', closePDFModal);
    document.getElementById('process-pdf')?.addEventListener('click', processPDFFile);
    document.getElementById('remove-file')?.addEventListener('click', removeSelectedFile);
    
    // File upload handlers
    document.getElementById('pdf-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('file-upload')?.addEventListener('change', handleFileUpload);
    
    // Drag and drop for PDF upload
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => document.getElementById('file-upload')?.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleFileDrop);
    }
}

function loadInitialData() {
    Promise.all([
        fetchStats(),
        fetchPosts(),
        fetchFiles(),
        fetchCampaigns()
    ]).then(() => {
        console.log('Initial data loaded');
    }).catch(error => {
        console.error('Error loading initial data:', error);
    });
}

// Enhanced Stats Function
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.success) {
            updateStatsUI(data.stats);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function updateStatsUI(stats) {
    document.getElementById('total-posts').textContent = stats.total_posts || 0;
    document.getElementById('scheduled-posts').textContent = stats.scheduled_posts || 0;
    document.getElementById('published-posts').textContent = stats.published_posts || 0;
    
    // Update new automation stats
    document.getElementById('total-connections').textContent = stats.total_connections || 0;
    document.getElementById('active-campaigns').textContent = activeCampaigns.length || 0;
}

// Automation Functions
async function autoAcceptConnections() {
    const btn = document.getElementById('auto-accept-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing...';
        btn.disabled = true;
        
        const response = await fetch('/api/automation/accept-connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', `Accepted ${data.accepted_count || 0} connection requests!`);
        } else {
            showToast('error', data.message || 'Failed to accept connections');
        }
        
    } catch (error) {
        console.error('Error in auto accept connections:', error);
        showToast('error', 'Error processing connection requests');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function autoFollowSuccessful() {
    const btn = document.getElementById('auto-follow-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Following...';
        btn.disabled = true;
        
        const criteria = {
            industries: ['Technology', 'Software', 'AI', 'Startups'],
            positions: ['CEO', 'Founder', 'CTO', 'VP', 'Director'],
            locations: ['United States', 'United Kingdom', 'Canada', 'Australia']
        };
        
        const response = await fetch('/api/automation/follow-successful', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ criteria })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', `Followed ${data.followed_count || 0} successful profiles!`);
        } else {
            showToast('error', data.message || 'Failed to follow profiles');
        }
        
    } catch (error) {
        console.error('Error in auto follow:', error);
        showToast('error', 'Error following profiles');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function autoEngagePosts() {
    const btn = document.getElementById('auto-engage-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Engaging...';
        btn.disabled = true;
        
        const keywords = ['AI', 'artificial intelligence', 'machine learning', 'automation', 'technology', 'innovation', 'startup', 'business'];
        
        const response = await fetch('/api/automation/engage-posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keywords })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', `Engaged with ${data.engaged_posts || 0} relevant posts!`);
        } else {
            showToast('error', data.message || 'Failed to engage with posts');
        }
        
    } catch (error) {
        console.error('Error in auto engage:', error);
        showToast('error', 'Error engaging with posts');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Smart Campaign from PDF
async function smartCampaignFromPDF() {
    if (currentFiles.length === 0) {
        showToast('warning', 'Please upload a PDF first to create a smart campaign');
        return;
    }
    
    // Auto-populate campaign modal with PDF data
    const latestPDF = currentFiles[0];
    document.getElementById('campaign-name').value = `Smart Campaign - ${latestPDF.original_filename.replace('.pdf', '')}`;
    document.getElementById('product-name').value = 'AI-Powered Solution';
    document.getElementById('target-keywords').value = 'AI, automation, technology, innovation, business growth';
    
    // Populate PDF selector
    const pdfSelect = document.getElementById('pdf-select');
    pdfSelect.innerHTML = '<option value="">Select PDF for content inspiration</option>';
    currentFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file.id;
        option.textContent = file.original_filename;
        if (file === latestPDF) option.selected = true;
        pdfSelect.appendChild(option);
    });
    
    showCampaignModal();
}

// Campaign Management
function showCampaignModal() {
    // Load available PDFs
    const pdfSelect = document.getElementById('pdf-select');
    pdfSelect.innerHTML = '<option value="">Select PDF for content inspiration</option>';
    
    currentFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file.id;
        option.textContent = file.original_filename;
        pdfSelect.appendChild(option);
    });
    
    document.getElementById('campaign-modal').style.display = 'flex';
}

async function createMarketingCampaign() {
    const campaignName = document.getElementById('campaign-name').value;
    const productName = document.getElementById('product-name').value;
    const targetKeywords = document.getElementById('target-keywords').value.split(',').map(k => k.trim());
    const pdfId = document.getElementById('pdf-select').value;
    
    if (!campaignName || !productName) {
        showToast('error', 'Please fill in campaign name and product name');
        return;
    }
    
    const btn = document.getElementById('create-campaign');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Creating...';
        btn.disabled = true;
        
        const response = await fetch('/api/marketing/create-campaign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaign_name: campaignName,
                product_info: { name: productName },
                target_keywords: targetKeywords,
                pdf_id: pdfId || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', `Campaign created! Scheduled ${data.posts_scheduled || 0} posts`);
            closeModal();
            fetchCampaigns();
            fetchStats();
        } else {
            showToast('error', data.error || 'Failed to create campaign');
        }
        
    } catch (error) {
        console.error('Error creating campaign:', error);
        showToast('error', 'Error creating marketing campaign');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function fetchCampaigns() {
    try {
        const response = await fetch('/api/marketing/campaigns');
        const data = await response.json();
        
        if (data.success) {
            activeCampaigns = data.campaigns;
            updateStatsUI({ active_campaigns: activeCampaigns.length });
        }
    } catch (error) {
        console.error('Error fetching campaigns:', error);
    }
}

// Automation Settings
function showAutomationModal() {
    document.getElementById('automation-modal').style.display = 'flex';
}

async function saveAutomationSettings() {
    const keywords = document.getElementById('engagement-keywords').value;
    const message = document.getElementById('connection-message').value;
    const dailyConnections = document.getElementById('daily-connections').value;
    const dailyEngagements = document.getElementById('daily-engagements').value;
    
    // Save settings (could be stored in localStorage or sent to server)
    localStorage.setItem('automation-settings', JSON.stringify({
        keywords: keywords.split(',').map(k => k.trim()),
        connectionMessage: message,
        dailyLimits: {
            connections: parseInt(dailyConnections),
            engagements: parseInt(dailyEngagements)
        }
    }));
    
    showToast('success', 'Automation settings saved successfully!');
    closeModal();
}

// Modal Management
function closeModal() {
    document.getElementById('campaign-modal').style.display = 'none';
    document.getElementById('automation-modal').style.display = 'none';
    
    // Reset forms
    document.getElementById('campaign-form')?.reset();
}

function showPDFUploadModal() {
    document.getElementById('pdf-modal').style.display = 'flex';
}

function closePDFModal() {
    document.getElementById('pdf-modal').style.display = 'none';
    
    // Reset upload state
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('uploaded-file').style.display = 'none';
    document.getElementById('file-upload').value = '';
    document.getElementById('pdf-upload').value = '';
}

function removeSelectedFile() {
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('uploaded-file').style.display = 'none';
    document.getElementById('file-upload').value = '';
    document.getElementById('pdf-upload').value = '';
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf') {
            displaySelectedFile(file);
        } else {
            showToast('error', 'Please select a PDF file');
        }
    }
}

function displaySelectedFile(file) {
    const uploadArea = document.getElementById('upload-area');
    const uploadedFile = document.getElementById('uploaded-file');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    
    if (uploadArea && uploadedFile && fileName && fileSize) {
        uploadArea.style.display = 'none';
        uploadedFile.style.display = 'block';
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function processPDFFile() {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('error', 'Please select a PDF file first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const btn = document.getElementById('process-pdf');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing...';
        btn.disabled = true;
        
        const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'PDF processed successfully! You can now use it for content generation.');
            closePDFModal();
            fetchFiles();
        } else {
            showToast('error', data.error || 'Failed to process PDF');
        }
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        showToast('error', 'Error processing PDF file');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Existing Functions (Updated)
async function generateContent() {
    const prompt = document.getElementById('content-prompt').value;
    const includeImage = document.getElementById('include-image').checked;
    
    if (!prompt.trim()) {
        showToast('error', 'Please enter a content prompt');
        return;
    }
    
    const btn = document.getElementById('generate-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Generating...';
        btn.disabled = true;
        
        // Generate content
        const contentResponse = await fetch('/api/generate-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
        
        const contentData = await contentResponse.json();
        
        if (!contentData.success) {
            throw new Error(contentData.error || 'Failed to generate content');
        }
        
        // Display generated content
        displayGeneratedContent(contentData.content);
        
        // Generate image if requested
        if (includeImage) {
            generateImage(prompt);
        }
        
        showToast('success', 'Content generated successfully!');
        
    } catch (error) {
        console.error('Error generating content:', error);
        showToast('error', 'Error generating content: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function displayGeneratedContent(content) {
    const previewSection = document.getElementById('content-preview');
    const contentDisplay = document.getElementById('generated-content');
    
    if (contentDisplay) {
        contentDisplay.textContent = content;
        previewSection.style.display = 'block';
        
        // Show publish options
        const publishSection = document.getElementById('publish-options');
        if (publishSection) {
            publishSection.style.display = 'block';
        }
    }
}

async function generateImage(prompt) {
    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        
        if (data.success && data.image_url) {
            const imageDisplay = document.getElementById('generated-image');
            if (imageDisplay) {
                imageDisplay.src = data.image_url;
                imageDisplay.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

async function fetchPosts() {
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        if (data.success) {
            currentPosts = data.posts;
            updatePostsList();
        }
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

async function fetchFiles() {
    try {
        const response = await fetch('/api/files');
        const data = await response.json();
        
        if (data.success) {
            currentFiles = data.files;
        }
    } catch (error) {
        console.error('Error fetching files:', error);
    }
}

function updatePostsList() {
    const postsContainer = document.getElementById('posts-list');
    if (!postsContainer || !currentPosts.length) return;
    
    postsContainer.innerHTML = currentPosts.map(post => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <span class="badge bg-${getStatusColor(post.status)}">${post.status}</span>
                    <small class="text-muted">${new Date(post.created_at).toLocaleDateString()}</small>
                </div>
                <p class="card-text mt-2">${post.content.substring(0, 150)}...</p>
                ${post.image_url ? `<img src="${post.image_url}" alt="Post image" class="img-fluid mt-2" style="max-height: 200px;">` : ''}
            </div>
        </div>
    `).join('');
}

function getStatusColor(status) {
    const colors = {
        'draft': 'secondary',
        'scheduled': 'warning',
        'published': 'success',
        'failed': 'danger'
    };
    return colors[status] || 'secondary';
}

function togglePostsList() {
    const postsSection = document.getElementById('posts-section');
    if (postsSection) {
        postsSection.style.display = postsSection.style.display === 'none' ? 'block' : 'none';
    }
}

function triggerFileUpload() {
    showPDFUploadModal();
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
        showToast('error', 'Please select a PDF file');
        return;
    }
    
    // Display the selected file in the modal
    displaySelectedFile(file);
}

function showToast(type, message) {
    const toast = document.getElementById('notification-toast');
    const toastMessage = document.querySelector('.toast-message');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success'} border-0`;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Make functions available globally
window.generateContent = generateContent;
window.publishPost = publishPost;

async function publishPost() {
    const content = document.getElementById('generated-content').textContent;
    const scheduleTime = document.getElementById('schedule-time').value;
    const imageElement = document.getElementById('generated-image');
    const imageUrl = imageElement && imageElement.style.display !== 'none' ? imageElement.src : null;
    
    if (!content) {
        showToast('error', 'No content to publish');
        return;
    }
    
    try {
        const response = await fetch('/api/create-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                schedule_time: scheduleTime || null,
                image_url: imageUrl,
                post_type: imageUrl ? 'image' : 'text'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', scheduleTime ? 'Post scheduled successfully!' : 'Post published successfully!');
            
            // Clear the form
            document.getElementById('content-prompt').value = '';
            document.getElementById('content-preview').style.display = 'none';
            document.getElementById('publish-options').style.display = 'none';
            
            // Refresh data
            fetchStats();
            fetchPosts();
        } else {
            showToast('error', data.error || 'Failed to publish post');
        }
        
    } catch (error) {
        console.error('Error publishing post:', error);
        showToast('error', 'Error publishing post');
    }
}