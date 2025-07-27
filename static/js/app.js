// LinkedIn Marketing Agent - Frontend JavaScript
class LinkedInMarketingAgent {
    constructor() {
        this.currentUser = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.currentSection = 'dashboard';
        this.generatedImageUrl = null;
        this.activeCampaigns = new Map();
        this.automationRules = new Map();
        
        this.init();
    }
    
    async init() {
        // Check if user is already authenticated
        const token = localStorage.getItem('access_token');
        if (token) {
            this.accessToken = token;
            this.refreshToken = localStorage.getItem('refresh_token');
            
            try {
                const result = await this.apiCall('/api/auth/validate', 'GET');
                if (result.success) {
                    this.currentUser = result.user;
                    this.showApp();
                    this.loadDashboard();
                } else {
                    this.showAuth();
                }
            } catch (error) {
                console.error('Token validation failed:', error);
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
        
        this.setupEventListeners();
        this.initializeCharts();
    }
    
    setupEventListeners() {
        // Authentication forms
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        document.getElementById('registerFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });
        
        // Content generation form
        document.getElementById('contentGeneratorForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateContent();
        });
        
        // Sidebar navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('onclick');
                if (href) {
                    const section = href.match(/showSection\('([^']+)'\)/);
                    if (section) {
                        this.showSection(section[1]);
                    }
                }
            });
        });
        
        // User menu toggle
        document.getElementById('userMenuButton')?.addEventListener('click', () => {
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('hidden');
        });
        
        // Sidebar toggle for mobile
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('-translate-x-full');
        });
        
        // File upload handling
        this.setupFileUpload();
        
        // Advanced automation event listeners
        this.setupAdvancedAutomation();
    }
    
    setupAdvancedAutomation() {
        // Campaign launch form
        const campaignForm = document.getElementById('campaignLaunchForm');
        if (campaignForm) {
            campaignForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.launchAutomatedCampaign();
            });
        }
        
        // Auto-follow setup form
        const autoFollowForm = document.getElementById('autoFollowForm');
        if (autoFollowForm) {
            autoFollowForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.setupAutoFollow();
            });
        }
        
        // Engagement optimization buttons
        document.getElementById('optimizeEngagementBtn')?.addEventListener('click', () => {
            this.optimizeEngagement();
        });
        
        document.getElementById('boostConversationsBtn')?.addEventListener('click', () => {
            this.boostConversations();
        });
    }
    
    setupFileUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        
        if (!uploadZone || !fileInput) return;
        
        // Click to browse
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files);
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files);
        });
    }
    
    async handleFileUpload(files) {
        if (files.length === 0) return;
        
        const uploadProgress = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const uploadPercent = document.getElementById('uploadPercent');
        
        uploadProgress.classList.remove('hidden');
        
        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                // Simulate progress (in real implementation, you'd track actual progress)
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 10;
                    progressBar.style.width = `${progress}%`;
                    uploadPercent.textContent = `${progress}%`;
                    
                    if (progress >= 100) {
                        clearInterval(progressInterval);
                        setTimeout(() => {
                            uploadProgress.classList.add('hidden');
                            this.showNotification('File uploaded successfully!', 'success');
                        }, 500);
                    }
                }, 100);
                
                // Make actual upload request
                const response = await fetch('/api/upload-pdf', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    },
                    body: formData
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    clearInterval(progressInterval);
                    uploadProgress.classList.add('hidden');
                    this.showNotification(result.error || 'Upload failed', 'error');
                }
                
            } catch (error) {
                console.error('Upload error:', error);
                uploadProgress.classList.add('hidden');
                this.showNotification('Upload failed', 'error');
            }
        }
    }
    
    async login() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }
        
        this.showLoading('Signing in...');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.accessToken = result.access_token;
                this.refreshToken = result.refresh_token;
                this.currentUser = result.user;
                
                localStorage.setItem('access_token', this.accessToken);
                localStorage.setItem('refresh_token', this.refreshToken);
                
                this.hideLoading();
                this.showApp();
                this.loadDashboard();
                this.showNotification('Welcome back!', 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Login error:', error);
        }
    }
    
    async register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        
        if (!username || !email || !password) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        this.showLoading('Creating account...');
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.accessToken = result.access_token;
                this.refreshToken = result.refresh_token;
                this.currentUser = result.user;
                
                localStorage.setItem('access_token', this.accessToken);
                localStorage.setItem('refresh_token', this.refreshToken);
                
                this.hideLoading();
                this.showApp();
                this.loadDashboard();
                this.showNotification('Account created successfully!', 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Registration error:', error);
        }
    }
    
    async apiCall(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        const config = {
            method,
            headers
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(endpoint, config);
            
            if (response.status === 401 && this.refreshToken) {
                // Try to refresh token
                const refreshResult = await this.refreshAccessToken();
                if (refreshResult) {
                    // Retry original request
                    headers['Authorization'] = `Bearer ${this.accessToken}`;
                    config.headers = headers;
                    const retryResponse = await fetch(endpoint, config);
                    return await retryResponse.json();
                } else {
                    this.logout();
                    return { success: false, error: 'Authentication expired' };
                }
            }
            
            return await response.json();
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }
    
    async refreshAccessToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: this.refreshToken })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.accessToken = result.access_token;
                localStorage.setItem('access_token', this.accessToken);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }
    
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.currentUser = null;
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        this.showAuth();
        this.showNotification('Logged out successfully', 'info');
    }
    
    showAuth() {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }
    
    showApp() {
        document.getElementById('authModal').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        
        if (this.currentUser) {
            const displayName = this.currentUser.first_name 
                ? `${this.currentUser.first_name} ${this.currentUser.last_name || ''}`.trim()
                : this.currentUser.username;
            document.getElementById('userDisplayName').textContent = displayName;
        }
    }
    
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('fade-in');
        }
        
        // Add active class to current nav link
        const activeLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.currentSection = sectionName;
        
        // Load section-specific data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'content-generator':
                this.loadContentGenerator();
                break;
            case 'campaigns':
                this.loadCampaigns();
                break;
            case 'automation':
                this.loadAutomation();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }
    
    async loadDashboard() {
        try {
            // Load dashboard stats
            const statsResult = await this.apiCall('/api/dashboard/stats');
            if (statsResult.success) {
                this.updateDashboardStats(statsResult.data);
            }
            
            // Load recent posts
            const postsResult = await this.apiCall('/api/posts/recent');
            if (postsResult.success) {
                this.updateRecentPosts(postsResult.posts);
            }
            
            // Update engagement chart
            this.updateEngagementChart();
            
        } catch (error) {
            console.error('Dashboard loading error:', error);
        }
    }
    
    updateDashboardStats(stats) {
        document.getElementById('totalPosts').textContent = stats.total_posts || 0;
        document.getElementById('engagementRate').textContent = `${stats.engagement_rate || 0}%`;
        document.getElementById('totalConnections').textContent = stats.total_connections || 0;
        document.getElementById('activeCampaigns').textContent = stats.active_campaigns || 0;
        
        // Update sidebar quick stats
        document.getElementById('todayPosts').textContent = stats.published_posts || 0;
        document.getElementById('todayEngagement').textContent = `${stats.engagement_rate || 0}%`;
        document.getElementById('todayConnections').textContent = stats.total_connections || 0;
    }
    
    updateRecentPosts(posts) {
        const container = document.getElementById('recentPosts');
        if (!container) return;
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-file-alt text-4xl mb-4"></i>
                    <p>No recent posts yet</p>
                    <button onclick="showSection('content-generator')" class="mt-4 text-linkedin hover:underline">
                        Create your first post
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = posts.map(post => `
            <div class="border-l-4 border-linkedin pl-4 py-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="status-indicator status-${post.status}"></span>
                    <span class="text-xs text-gray-500">${this.formatDate(post.created_at)}</span>
                </div>
                <p class="text-sm text-gray-800 line-clamp-2">${post.content}</p>
                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span><i class="fas fa-heart mr-1"></i>${post.likes_count || 0}</span>
                    <span><i class="fas fa-comment mr-1"></i>${post.comments_count || 0}</span>
                    <span><i class="fas fa-share mr-1"></i>${post.shares_count || 0}</span>
                </div>
            </div>
        `).join('');
    }
    
    async generateContent() {
        const prompt = document.getElementById('contentPrompt').value.trim();
        const contentType = document.getElementById('contentType').value;
        const targetAudience = document.getElementById('targetAudience').value.trim();
        
        if (!prompt) {
            this.showNotification('Please enter a content prompt', 'error');
            return;
        }
        
        this.showLoading('Generating content...');
        
        try {
            const result = await this.apiCall('/api/generate-content', 'POST', {
                prompt,
                content_type: contentType,
                target_audience: targetAudience
            });
            
            this.hideLoading();
            
            if (result.success) {
                this.displayGeneratedContent(result.content);
                this.showNotification('Content generated successfully!', 'success');
            } else {
                this.showNotification(result.error || 'Content generation failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Content generation error:', error);
        }
    }
    
    displayGeneratedContent(content) {
        const container = document.getElementById('generatedContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-white border-2 border-gray-200 rounded-xl p-6">
                <div class="prose max-w-none">
                    <p class="text-gray-800 whitespace-pre-wrap">${content}</p>
                </div>
            </div>
        `;
    }
    
    async generateImage() {
        const prompt = document.getElementById('contentPrompt').value.trim();
        
        if (!prompt) {
            this.showNotification('Please enter a prompt for image generation', 'error');
            return;
        }
        
        this.showLoading('Generating image...');
        
        try {
            const result = await this.apiCall('/api/image/generate-advanced', 'POST', {
                prompt,
                style: 'professional',
                size: '1024x1024'
            });
            
            this.hideLoading();
            
            if (result.success) {
                this.displayGeneratedImage(result);
                this.generatedImageUrl = result.image_url;
                this.showNotification('Image generated successfully!', 'success');
            } else {
                this.showNotification(result.error || 'Image generation failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Image generation error:', error);
        }
    }
    
    displayGeneratedImage(result) {
        const container = document.getElementById('generatedImage');
        const preview = document.getElementById('generatedImagePreview');
        
        if (!container || !preview) return;
        
        preview.src = result.image_url;
        preview.alt = 'Generated image';
        container.classList.remove('hidden');
        
        // Show optimization options if available
        if (result.optimized_images) {
            this.showImageOptimizations(result.optimized_images);
        }
    }
    
    showImageOptimizations(optimizedImages) {
        // Create UI for showing different optimized versions
        const container = document.getElementById('generatedImage');
        
        const optimizationHTML = `
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-3">LinkedIn Optimized Versions:</h4>
                <div class="grid grid-cols-3 gap-4">
                    ${Object.entries(optimizedImages).map(([type, data]) => `
                        <div class="text-center">
                            <img src="${data.url}" alt="${type}" class="w-full h-20 object-cover rounded border cursor-pointer hover:border-linkedin" 
                                 onclick="document.getElementById('generatedImagePreview').src='${data.url}'">
                            <p class="text-xs text-gray-600 mt-1">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                            <p class="text-xs text-gray-500">${data.dimensions[0]}x${data.dimensions[1]}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', optimizationHTML);
    }
    
    async publishPost() {
        const content = document.querySelector('#generatedContent .prose p')?.textContent;
        
        if (!content) {
            this.showNotification('No content to publish', 'error');
            return;
        }
        
        this.showLoading('Publishing post...');
        
        try {
            const postData = {
                content,
                image_url: this.generatedImageUrl,
                post_type: this.generatedImageUrl ? 'image' : 'text'
            };
            
            const result = await this.apiCall('/api/posts/publish-with-retry', 'POST', postData);
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification('Post published successfully!', 'success');
                this.clearGeneratedContent();
                this.loadDashboard(); // Refresh dashboard stats
            } else {
                this.showNotification(result.error || 'Publishing failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Publishing error:', error);
        }
    }
    
    async schedulePost() {
        // Implementation for post scheduling
        this.showNotification('Post scheduling feature coming soon!', 'info');
    }
    
    async saveDraft() {
        const content = document.querySelector('#generatedContent .prose p')?.textContent;
        
        if (!content) {
            this.showNotification('No content to save', 'error');
            return;
        }
        
        try {
            const result = await this.apiCall('/api/posts/create', 'POST', {
                content,
                image_url: this.generatedImageUrl,
                status: 'draft'
            });
            
            if (result.success) {
                this.showNotification('Draft saved successfully!', 'success');
                this.clearGeneratedContent();
            } else {
                this.showNotification(result.error || 'Failed to save draft', 'error');
            }
        } catch (error) {
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Save draft error:', error);
        }
    }
    
    clearGeneratedContent() {
        const contentContainer = document.getElementById('generatedContent');
        const imageContainer = document.getElementById('generatedImage');
        
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500">
                    <i class="fas fa-file-alt text-5xl mb-4 text-gray-400"></i>
                    <p class="text-lg font-medium">Generated content will appear here</p>
                    <p class="text-sm">Use the form above to create your LinkedIn post</p>
                </div>
            `;
        }
        
        if (imageContainer) {
            imageContainer.classList.add('hidden');
        }
        
        this.generatedImageUrl = null;
        
        // Clear form
        document.getElementById('contentPrompt').value = '';
    }
    
    // Advanced Automation Methods
    async launchAutomatedCampaign() {
        const formData = new FormData(document.getElementById('campaignLaunchForm'));
        const campaignData = {
            name: formData.get('campaignName'),
            target_audience: {
                industries: formData.getAll('industries'),
                job_titles: formData.getAll('jobTitles'),
                company_sizes: formData.getAll('companySizes')
            },
            content_themes: formData.getAll('contentThemes'),
            duration_days: parseInt(formData.get('durationDays')),
            daily_post_limit: parseInt(formData.get('dailyPostLimit')),
            engagement_goals: {
                likes: parseInt(formData.get('targetLikes')),
                comments: parseInt(formData.get('targetComments')),
                shares: parseInt(formData.get('targetShares'))
            }
        };
        
        this.showLoading('Launching automated campaign...');
        
        try {
            const result = await this.apiCall('/api/automation/launch-campaign', 'POST', campaignData);
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification(`Campaign "${campaignData.name}" launched successfully!`, 'success');
                this.activeCampaigns.set(result.campaign_id, campaignData);
                this.loadCampaigns(); // Refresh campaigns view
            } else {
                this.showNotification(result.error || 'Campaign launch failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Campaign launch error:', error);
        }
    }
    
    async setupAutoFollow() {
        const formData = new FormData(document.getElementById('autoFollowForm'));
        const autoFollowData = {
            categories: formData.getAll('targetCategories'),
            daily_limit: parseInt(formData.get('dailyLimit')),
            connection_message_template: formData.get('messageTemplate'),
            target_criteria: {
                min_connections: parseInt(formData.get('minConnections')),
                max_connections: parseInt(formData.get('maxConnections')),
                location: formData.get('location')
            }
        };
        
        this.showLoading('Setting up auto-follow system...');
        
        try {
            const result = await this.apiCall('/api/automation/setup-auto-follow', 'POST', autoFollowData);
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification('Auto-follow system activated!', 'success');
                this.loadAutomation(); // Refresh automation view
            } else {
                this.showNotification(result.error || 'Auto-follow setup failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Auto-follow setup error:', error);
        }
    }
    
    async optimizeEngagement() {
        this.showLoading('Analyzing and optimizing engagement...');
        
        try {
            const result = await this.apiCall('/api/automation/optimize-engagement', 'POST');
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification(
                    `Engagement optimized! Applied ${result.optimizations_applied.length} improvements.`, 
                    'success'
                );
                this.displayOptimizationResults(result);
            } else {
                this.showNotification(result.error || 'Optimization failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Engagement optimization error:', error);
        }
    }
    
    async boostConversations() {
        this.showLoading('Boosting conversations and engagement...');
        
        try {
            const result = await this.apiCall('/api/automation/boost-conversations', 'POST');
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification(
                    `Conversations boosted! Performed ${result.actions_taken} engagement actions.`, 
                    'success'
                );
                this.displayConversationResults(result);
            } else {
                this.showNotification(result.error || 'Conversation boosting failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Conversation boosting error:', error);
        }
    }
    
    displayOptimizationResults(results) {
        // Display optimization results in the UI
        const container = document.getElementById('optimizationResults');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-green-800 mb-2">Optimization Complete!</h4>
                <p class="text-green-700">Performance Score: ${results.performance_score}/100</p>
                <p class="text-green-700">Optimizations Applied: ${results.optimizations_applied.join(', ')}</p>
                <p class="text-green-700">Improved Variants Created: ${results.improved_variants_created}</p>
            </div>
        `;
    }
    
    displayConversationResults(results) {
        // Display conversation boosting results
        const container = document.getElementById('conversationResults');
        if (!container) return;
        
        container.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-blue-800 mb-2">Conversation Boosting Complete!</h4>
                <p class="text-blue-700">Total Actions: ${results.actions_taken}</p>
                <p class="text-blue-700">Trending Posts Commented: ${results.trending_posts_commented}</p>
                <p class="text-blue-700">Replies Sent: ${results.replies_sent}</p>
                <p class="text-blue-700">Network Engagements: ${results.network_engagements}</p>
            </div>
        `;
    }
    
    loadContentGenerator() {
        // Initialize content generator specific features
        this.clearGeneratedContent();
    }
    
    loadCampaigns() {
        // Load and display active campaigns
        this.displayActiveCampaigns();
    }
    
    loadAutomation() {
        // Load automation rules and statistics
        this.displayAutomationStats();
    }
    
    loadAnalytics() {
        // Load analytics data and charts
        this.updateAnalyticsCharts();
    }
    
    displayActiveCampaigns() {
        // Implementation for displaying active campaigns
        console.log('Loading campaigns...');
    }
    
    displayAutomationStats() {
        // Implementation for displaying automation statistics
        console.log('Loading automation stats...');
    }
    
    updateAnalyticsCharts() {
        // Implementation for updating analytics charts
        console.log('Loading analytics...');
    }
    
    // Utility Methods
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
                <i class="${icons[type]}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.classList.remove('show')" class="ml-auto">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        notification.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    initializeCharts() {
        // Initialize Chart.js charts
        this.updateEngagementChart();
    }
    
    updateEngagementChart() {
        const ctx = document.getElementById('engagementChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.engagementChart) {
            this.engagementChart.destroy();
        }
        
        // Sample data - in real app, this would come from API
        const data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Engagement',
                data: [12, 19, 3, 5, 2, 3, 9],
                borderColor: '#0a66c2',
                backgroundColor: 'rgba(10, 102, 194, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
        
        this.engagementChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Global functions for HTML onclick handlers
function showSection(section) {
    if (window.linkedinAgent) {
        window.linkedinAgent.showSection(section);
    }
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function logout() {
    if (window.linkedinAgent) {
        window.linkedinAgent.logout();
    }
}

function generateImage() {
    if (window.linkedinAgent) {
        window.linkedinAgent.generateImage();
    }
}

function publishPost() {
    if (window.linkedinAgent) {
        window.linkedinAgent.publishPost();
    }
}

function schedulePost() {
    if (window.linkedinAgent) {
        window.linkedinAgent.schedulePost();
    }
}

function saveDraft() {
    if (window.linkedinAgent) {
        window.linkedinAgent.saveDraft();
    }
}

function uploadMedia() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function regenerateContent() {
    if (window.linkedinAgent) {
        window.linkedinAgent.generateContent();
    }
}

function editContent() {
    // Implementation for editing generated content
    console.log('Edit content feature coming soon!');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.linkedinAgent = new LinkedInMarketingAgent();
});

