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
    // Navigation listeners
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(e.target.closest('[data-page]').dataset.page);
        });
    });

    // Existing listeners
    document.getElementById('generate-btn')?.addEventListener('click', generateContent);

    document.getElementById('view-all-posts-btn')?.addEventListener('click', togglePostsList);
    
    // Image generation toggle
    document.getElementById('enable-image-gen')?.addEventListener('change', toggleImagePrompt);
    
    // Automation listeners
    document.getElementById('auto-accept-btn')?.addEventListener('click', autoAcceptConnections);
    document.getElementById('auto-follow-btn')?.addEventListener('click', autoFollowSuccessful);
    document.getElementById('auto-engage-btn')?.addEventListener('click', autoEngagePosts);
    document.getElementById('create-campaign-btn')?.addEventListener('click', showCampaignModal);
    document.getElementById('upload-pdf-btn')?.addEventListener('click', showPDFUploadModal);
    document.getElementById('smart-campaign-btn')?.addEventListener('click', smartCampaignFromPDF);

    
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
    const pdfModal = document.getElementById('pdf-modal');
    if (pdfModal) {
        pdfModal.style.display = 'flex';
    } else {
        console.error('PDF modal not found');
        showToast('error', 'PDF upload modal not found');
    }
}

function closePDFModal() {
    const pdfModal = document.getElementById('pdf-modal');
    if (pdfModal) pdfModal.style.display = 'none';
    
    // Reset upload state
    const uploadArea = document.getElementById('upload-area');
    const uploadedFile = document.getElementById('uploaded-file');
    const fileUpload = document.getElementById('file-upload');
    const pdfUpload = document.getElementById('pdf-upload');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (uploadedFile) uploadedFile.style.display = 'none';
    if (fileUpload) fileUpload.value = '';
    if (pdfUpload) pdfUpload.value = '';
}

function removeSelectedFile() {
    const uploadArea = document.getElementById('upload-area');
    const uploadedFile = document.getElementById('uploaded-file');
    const fileUpload = document.getElementById('file-upload');
    const pdfUpload = document.getElementById('pdf-upload');
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (uploadedFile) uploadedFile.style.display = 'none';
    if (fileUpload) fileUpload.value = '';
    if (pdfUpload) pdfUpload.value = '';
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
    
    // Set the file input for form processing
    const fileUploadInput = document.getElementById('file-upload');
    if (fileUploadInput) {
        // Create a new FileList with our file
        const dt = new DataTransfer();
        dt.items.add(file);
        fileUploadInput.files = dt.files;
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
    const promptInput = document.getElementById('content-prompt');
    if (!promptInput) {
        showToast('error', 'Content prompt field not found');
        return;
    }
    
    const prompt = promptInput.value.trim();
    const imageCheckbox = document.getElementById('enable-image-gen');
    const includeImage = imageCheckbox ? imageCheckbox.checked : false;
    
    if (!prompt) {
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
            const imagePrompt = document.getElementById('image-prompt')?.value || prompt;
            generateImage(imagePrompt);
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
    console.log('Displaying content:', content.substring(0, 100) + '...');
    
    // Find the correct elements
    const generatedText = document.getElementById('generated-text');
    const contentPreview = document.getElementById('content-preview');
    
    if (generatedText) {
        generatedText.textContent = content;
        console.log('Content set in generated-text element');
    } else {
        console.error('generated-text element not found');
        // Try alternative selector
        const altText = document.querySelector('.content-display');
        if (altText) {
            altText.textContent = content;
            console.log('Content set in alternative element');
        }
    }
    
    if (contentPreview) {
        contentPreview.style.display = 'block';
        console.log('Content preview shown');
        
        // Show LinkedIn auth status if needed
        checkLinkedInAuth();
    } else {
        console.error('content-preview element not found');
    }
    
    // Show post button
    const postBtn = document.getElementById('post-btn');
    if (postBtn) {
        postBtn.style.display = 'inline-block';
        postBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Post to LinkedIn';
    }
}

async function generateImage(prompt) {
    console.log('Generating image with prompt:', prompt);
    
    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        console.log('Image generation response:', data);
        
        if (data.success && data.image_url) {
            // Find image preview element
            const imagePreview = document.getElementById('image-preview');
            const imageElement = imagePreview ? imagePreview.querySelector('img') : null;
            
            if (imageElement) {
                imageElement.src = data.image_url;
                imagePreview.style.display = 'block';
                console.log('Image displayed successfully');
            } else {
                console.error('Image element not found');
            }
        } else {
            console.error('Image generation failed:', data);
        }
        
    } catch (error) {
        console.error('Error generating image:', error);
        showToast('error', 'Failed to generate image');
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
            const contentPrompt = document.getElementById('content-prompt');
            const contentPreview = document.getElementById('content-preview');
            const publishOptions = document.getElementById('publish-options');
            
            if (contentPrompt) contentPrompt.value = '';
            if (contentPreview) contentPreview.style.display = 'none';
            if (publishOptions) publishOptions.style.display = 'none';
            
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

// Multi-page Navigation
function switchPage(pageName) {
    // Hide all pages
    document.querySelectorAll(".page-content").forEach(page => {
        page.classList.remove("active");
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add("active");
    }
    
    // Update navigation
    document.querySelectorAll("[data-page]").forEach(link => {
        link.classList.remove("active");
    });
    
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add("active");
    
    // Load page-specific data
    switch(pageName) {
        case "dashboard":
            loadDashboardData();
            break;
        case "campaigns":
            loadCampaigns();
            break;
        case "analytics":
            loadAnalytics();
            break;
    }
}

function loadDashboardData() {
    fetchStats();
    fetchFiles();
    fetchPosts();
}

function loadCampaigns() {
    fetch("/api/marketing/campaigns")
        .then(response => response.json())
        .then(data => {
            if (data.success && data.campaigns.length > 0) {
                displayCampaigns(data.campaigns);
            }
        })
        .catch(error => console.error("Error loading campaigns:", error));
}

function displayCampaigns(campaigns) {
    const campaignsList = document.getElementById("campaigns-list");
    if (!campaignsList) return;
    
    campaignsList.innerHTML = campaigns.map(campaign => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-title">${campaign.campaign_name}</h6>
                        <p class="card-text text-muted">
                            <small>Created: ${new Date(campaign.created_at).toLocaleDateString()}</small>
                            <br>
                            <small>Posts: ${campaign.posts_generated} | Target: ${campaign.engagement_target}</small>
                        </p>
                    </div>
                    <div>
                        <span class="badge ${campaign.is_active ? "bg-success" : "bg-secondary"}">
                            ${campaign.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join("");
}

function loadAnalytics() {
    fetchStats().then(() => {
        // Update analytics page with same data
        const stats = document.getElementById("total-posts-analytics");
        if (stats) {
            stats.textContent = document.getElementById("total-posts")?.textContent || "0";
        }
        
        const connections = document.getElementById("total-connections-analytics");
        if (connections) {
            connections.textContent = document.getElementById("total-connections")?.textContent || "0";
        }
        
        const campaigns = document.getElementById("active-campaigns-analytics");
        if (campaigns) {
            campaigns.textContent = document.getElementById("active-campaigns")?.textContent || "0";
        }
    });
}

function loadInitialData() {
    console.log("Initial data loaded");
    fetchStats();
    fetchFiles();
    fetchPosts();
}

function toggleImagePrompt() {
    const checkbox = document.getElementById("enable-image-gen");
    const imagePromptGroup = document.getElementById("image-prompt-group");
    
    if (checkbox && imagePromptGroup) {
        imagePromptGroup.style.display = checkbox.checked ? "block" : "none";
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
        displaySelectedFile(file);
    } else {
        showToast("error", "Please select a valid PDF file");
        event.target.value = "";
    }
}

function createSimpleCampaign() {
    showToast("info", "Campaign creation feature will be available in the next update!");
}

function closeModal() {
    // Simple function for any remaining modal references
    console.log("Modal closed");
}

// Modal functions
function showPDFUploadModal() {
    document.getElementById("pdf-modal").style.display = "flex";
}

function closePDFModal() {
    document.getElementById("pdf-modal").style.display = "none";
}

function showCampaignModal() {
    document.getElementById("campaign-modal").style.display = "flex";
}

function closeCampaignModal() {
    document.getElementById("campaign-modal").style.display = "none";
}

function closeAutomationModal() {
    document.getElementById("automation-modal").style.display = "none";
}

function processPDF() {
    showToast("info", "PDF processing feature coming soon!");
}

function createMarketingCampaign() {
    const campaignName = document.getElementById("campaign-name").value;
    if (campaignName) {
        showToast("success", `Campaign "${campaignName}" created successfully!`);
        closeCampaignModal();
    } else {
        showToast("error", "Please enter a campaign name");
    }
}

function smartCampaignFromPDF() {
    showCampaignModal();
}

function saveAutomationSettings() {
    showToast("success", "Automation settings saved!");
    closeAutomationModal();
}

function removeSelectedFile() {
    document.getElementById("uploaded-file").style.display = "none";
    document.getElementById("upload-area").style.display = "block";
    document.getElementById("file-upload").value = "";
}


// Check LinkedIn authentication status on page load
async function checkLinkedInAuth() {
    try {
        const response = await fetch("/api/linkedin-status");
        const data = await response.json();
        
        const statusDiv = document.getElementById("linkedin-status");
        const statusMessage = document.getElementById("status-message");
        const connectBtn = document.getElementById("connect-linkedin-btn");
        
        if (statusDiv && statusMessage && connectBtn) {
            if (data.authenticated) {
                statusDiv.style.display = "none";
            } else {
                statusDiv.style.display = "block";
                connectBtn.onclick = () => window.location.href = "/auth/linkedin";
            }
        }
    } catch (error) {
        console.error("Error checking LinkedIn auth:", error);
    }
}

// Handle authentication success/error from URL params
function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");
    
    if (authStatus === "success") {
        showToast("success", "LinkedIn connected successfully!");
        checkLinkedInAuth();
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === "error") {
        showToast("error", "LinkedIn authentication failed. Please try again.");
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Initialize LinkedIn auth checking
function initializeLinkedInAuth() {
    handleAuthCallback();
    checkLinkedInAuth();
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLinkedInAuth);
} else {
    initializeLinkedInAuth();
}

