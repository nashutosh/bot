// LinkedIn Marketing Agent - Frontend JavaScript
class LinkedInMarketingAgent {
    constructor() {
        this.currentUser = { username: 'default_user', first_name: 'LinkedIn', last_name: 'Agent' };
        this.currentSection = 'dashboard';
        this.generatedImageUrl = null;
        this.activeCampaigns = new Map();
        this.automationRules = new Map();
        
        this.init();
    }
    
    async init() {
        // No authentication needed - single user operation
        this.showApp();
        this.loadDashboard();
        this.setupEventListeners();
        this.initializeCharts();
        
        // Check LinkedIn connection status
        this.checkLinkedInStatus();
        
        // Load automation rules if on automation page
        if (this.currentSection === 'automation') {
            this.loadAutomationRules();
        }
        
        // Load marketing dashboard if on marketing page
        if (this.currentSection === 'marketing') {
            this.loadMarketingDashboard();
        }
    }

    setupEventListeners() {
        // No authentication forms needed for single user operation
        
        // Content generation form
        document.getElementById('contentGeneratorForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateContent();
        });
        
        // Image generation form
        document.getElementById('imageGeneratorForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateImage();
        });
        
        // Post form
        document.getElementById('postForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPost();
        });
        
        // File upload
        document.getElementById('fileUpload')?.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        // Campaign form
        document.getElementById('campaignForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCampaign();
        });
        
        // Automation form
        document.getElementById('automationForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createAutomationRule();
        });
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });
        });
        
        // User menu
        document.getElementById('userMenuButton')?.addEventListener('click', () => {
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('hidden');
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#userMenuButton')) {
                document.getElementById('userDropdown')?.classList.add('hidden');
            }
        });
        
        // LinkedIn auth button
        document.getElementById('linkedinAuthBtn')?.addEventListener('click', () => {
            this.connectLinkedIn();
        });
        
        // Generate variations buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('generate-variations-btn')) {
                const postId = e.target.getAttribute('data-post-id');
                this.generateVariations(postId);
            }
        });
        
        // Auto-generate buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auto-generate-btn')) {
                const campaignId = e.target.getAttribute('data-campaign-id');
                this.autoGenerateContent(campaignId);
            }
        });
        
        // Delete buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const type = e.target.getAttribute('data-type');
                const id = e.target.getAttribute('data-id');
                this.deleteItem(type, id);
            }
        });
        
        // Edit buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const type = e.target.getAttribute('data-type');
                const id = e.target.getAttribute('data-id');
                this.editItem(type, id);
            }
        });
        
        // Publish buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('publish-btn')) {
                const postId = e.target.getAttribute('data-post-id');
                this.publishPost(postId);
            }
        });
        
        // Schedule buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('schedule-btn')) {
                const postId = e.target.getAttribute('data-post-id');
                this.schedulePost(postId);
            }
        });
        
        // Pause/Resume automation buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-automation-btn')) {
                const ruleId = e.target.getAttribute('data-rule-id');
                this.toggleAutomationRule(ruleId);
            }
        });
        
        // Campaign status buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-campaign-btn')) {
                const campaignId = e.target.getAttribute('data-campaign-id');
                this.toggleCampaign(campaignId);
            }
        });
        
        // Refresh buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('refresh-btn')) {
                const section = e.target.getAttribute('data-section');
                this.refreshSection(section);
            }
        });
    }

    // Authentication methods removed - single user operation

    async apiCall(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const config = {
            method,
            headers
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(endpoint, config);
            return await response.json();
        } catch (error) {
            console.error('API call error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    showApp() {
        // Show the main application interface
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
    
    // LinkedIn Connection Management
    async connectLinkedIn() {
        try {
            this.showLoading('Connecting to LinkedIn...');
            
            // Get LinkedIn auth URL
            const response = await this.apiCall('/api/linkedin-status', 'GET');
            
            if (response.success && response.auth_url) {
                // Redirect to LinkedIn OAuth
                window.location.href = response.auth_url;
            } else {
                this.hideLoading();
                this.showNotification('Failed to initiate LinkedIn connection', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('LinkedIn connection error:', error);
        }
    }
    
    async checkLinkedInStatus() {
        try {
            const response = await this.apiCall('/api/linkedin-status', 'GET');
            
            if (response.success) {
                const statusButton = document.getElementById('linkedinStatusBtn');
                const statusText = document.getElementById('linkedinStatusText');
                
                if (response.connected && response.profile) {
                    // Update UI to show connected status
                    if (statusButton) {
                        statusButton.innerHTML = `
                            <i class="fab fa-linkedin text-blue-600"></i>
                            Connected as ${response.profile.first_name} ${response.profile.last_name}
                        `;
                        statusButton.classList.remove('bg-gray-100');
                        statusButton.classList.add('bg-green-100', 'text-green-800');
                    }
                    
                    if (statusText) {
                        statusText.textContent = `Connected as ${response.profile.first_name} ${response.profile.last_name}`;
                        statusText.classList.remove('text-red-600');
                        statusText.classList.add('text-green-600');
                    }
                } else {
                    // Update UI to show disconnected status
                    if (statusButton) {
                        statusButton.innerHTML = `
                            <i class="fab fa-linkedin text-gray-400"></i>
                            Connect LinkedIn
                        `;
                        statusButton.classList.remove('bg-green-100', 'text-green-800');
                        statusButton.classList.add('bg-gray-100');
                    }
                    
                    if (statusText) {
                        statusText.textContent = 'Not Connected';
                        statusText.classList.remove('text-green-600');
                        statusText.classList.add('text-red-600');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking LinkedIn status:', error);
        }
    }
    
    // Marketing Manager Functions
    async loadMarketingDashboard() {
        try {
            this.showLoading('Loading marketing dashboard...');
            
            const response = await this.apiCall('/api/marketing/manager/dashboard', 'GET');
            
            this.hideLoading();
            
            if (response.success) {
                this.displayMarketingDashboard(response.data);
            } else {
                this.showNotification('Failed to load marketing dashboard', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error loading dashboard', 'error');
            console.error('Marketing dashboard error:', error);
        }
    }
    
    displayMarketingDashboard(data) {
        const container = document.getElementById('marketingDashboard');
        if (!container) return;
        
        const html = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-bullhorn text-2xl text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Campaigns</p>
                            <p class="text-2xl font-semibold text-gray-900">${data.campaigns.total}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-play-circle text-2xl text-green-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Active Campaigns</p>
                            <p class="text-2xl font-semibold text-gray-900">${data.campaigns.active}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-heart text-2xl text-red-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Engagement</p>
                            <p class="text-2xl font-semibold text-gray-900">${data.engagement.total}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <i class="fas fa-eye text-2xl text-purple-600"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Reach</p>
                            <p class="text-2xl font-semibold text-gray-900">${data.reach.total}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>
                    <div class="space-y-3">
                        ${data.recent_campaigns.map(campaign => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p class="font-medium text-gray-900">${campaign.name}</p>
                                    <p class="text-sm text-gray-500">${campaign.campaign_type}</p>
                                </div>
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(campaign.status)}">
                                    ${campaign.status}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Automation Statistics</h3>
                    <div class="space-y-3">
                        ${data.automation.today ? Object.entries(data.automation.today).map(([key, value]) => `
                            <div class="flex justify-between">
                                <span class="text-gray-600 capitalize">${key}:</span>
                                <span class="font-medium">${value}</span>
                            </div>
                        `).join('') : '<p class="text-gray-500">No automation data available</p>'}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    getStatusColor(status) {
        const colors = {
            'draft': 'bg-gray-100 text-gray-800',
            'active': 'bg-green-100 text-green-800',
            'paused': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-blue-100 text-blue-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }
    
    async createCampaign() {
        const formData = new FormData(document.getElementById('campaignForm'));
        const campaignData = {
            name: formData.get('name'),
            description: formData.get('description'),
            campaign_type: formData.get('campaign_type'),
            target_audience: {
                industries: formData.getAll('industries'),
                job_titles: formData.getAll('job_titles'),
                locations: formData.getAll('locations')
            },
            content_strategy: {
                themes: formData.getAll('themes'),
                posting_frequency: formData.get('posting_frequency')
            },
            budget: parseFloat(formData.get('budget')) || 0
        };
        
        this.showLoading('Creating campaign...');
        
        try {
            const result = await this.apiCall('/api/marketing/campaigns', 'POST', campaignData);
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification('Campaign created successfully!', 'success');
                document.getElementById('campaignForm').reset();
                this.loadMarketingDashboard(); // Refresh dashboard
            } else {
                this.showNotification(result.error || 'Failed to create campaign', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Campaign creation error:', error);
        }
    }
    
    async createAutomationRule() {
        const formData = new FormData(document.getElementById('automationForm'));
        const ruleData = {
            name: formData.get('name'),
            rule_type: formData.get('rule_type'),
            daily_limit: parseInt(formData.get('daily_limit')),
            target_criteria: {
                keywords: formData.get('keywords') ? formData.get('keywords').split(',').map(k => k.trim()) : [],
                industries: formData.getAll('industries'),
                job_titles: formData.getAll('job_titles')
            },
            action_template: formData.get('action_template'),
            is_active: formData.get('is_active') === 'on'
        };
        
        this.showLoading('Creating automation rule...');
        
        try {
            const result = await this.apiCall('/api/automation/rules', 'POST', ruleData);
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification('Automation rule created successfully!', 'success');
                document.getElementById('automationForm').reset();
                this.loadAutomationRules(); // Refresh rules list
            } else {
                this.showNotification(result.error || 'Failed to create rule', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Automation rule creation error:', error);
        }
    }
    
    async loadAutomationRules() {
        try {
            const response = await this.apiCall('/api/automation/rules', 'GET');
            
            if (response.success) {
                this.displayAutomationRules(response.rules);
            } else {
                this.showNotification('Failed to load automation rules', 'error');
            }
        } catch (error) {
            this.showNotification('Network error loading rules', 'error');
            console.error('Load automation rules error:', error);
        }
    }
    
    displayAutomationRules(rules) {
        const container = document.getElementById('automationRulesList');
        if (!container) return;
        
        const html = rules.map(rule => `
            <div class="bg-white p-6 rounded-lg shadow">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">${rule.name}</h3>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                
                <div class="space-y-2 text-sm text-gray-600">
                    <p><strong>Type:</strong> ${rule.rule_type}</p>
                    <p><strong>Daily Limit:</strong> ${rule.daily_limit}</p>
                    <p><strong>Success Rate:</strong> ${rule.total_actions > 0 ? Math.round((rule.successful_actions / rule.total_actions) * 100) : 0}%</p>
                    <p><strong>Total Actions:</strong> ${rule.total_actions}</p>
                </div>
                
                <div class="mt-4 flex space-x-2">
                    <button onclick="executeAutomationRule(${rule.id})" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        Execute
                    </button>
                    <button onclick="toggleAutomationRule(${rule.id})" class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                        ${rule.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button onclick="deleteAutomationRule(${rule.id})" class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html || '<p class="text-gray-500">No automation rules found.</p>';
    }
    
    async executeAutomationRule(ruleId) {
        this.showLoading('Executing automation rule...');
        
        try {
            const result = await this.apiCall('/api/automation/execute', 'POST', {
                rule_id: ruleId
            });
            
            this.hideLoading();
            
            if (result.success) {
                this.showNotification(result.message || 'Automation executed successfully!', 'success');
                this.loadAutomationRules(); // Refresh rules
            } else {
                this.showNotification(result.error || 'Failed to execute automation', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Execute automation error:', error);
        }
    }
    
    async toggleAutomationRule(ruleId) {
        try {
            // Get current rule status first
            const rules = await this.apiCall('/api/automation/rules', 'GET');
            const rule = rules.rules.find(r => r.id === ruleId);
            
            if (!rule) {
                this.showNotification('Rule not found', 'error');
                return;
            }
            
            const result = await this.apiCall(`/api/automation/rules/${ruleId}`, 'PUT', {
                is_active: !rule.is_active
            });
            
            if (result.success) {
                this.showNotification(result.message || 'Rule updated successfully!', 'success');
                this.loadAutomationRules(); // Refresh rules
            } else {
                this.showNotification(result.error || 'Failed to update rule', 'error');
            }
        } catch (error) {
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Toggle automation rule error:', error);
        }
    }
    
    async deleteAutomationRule(ruleId) {
        if (!confirm('Are you sure you want to delete this automation rule?')) {
            return;
        }
        
        try {
            const result = await this.apiCall(`/api/automation/rules/${ruleId}`, 'DELETE');
            
            if (result.success) {
                this.showNotification('Rule deleted successfully!', 'success');
                this.loadAutomationRules(); // Refresh rules
            } else {
                this.showNotification(result.error || 'Failed to delete rule', 'error');
            }
        } catch (error) {
            this.showNotification('Network error. Please try again.', 'error');
            console.error('Delete automation rule error:', error);
        }
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

// Global functions for automation rule management
function executeAutomationRule(ruleId) {
    if (window.linkedinAgent) {
        window.linkedinAgent.executeAutomationRule(ruleId);
    }
}

function toggleAutomationRule(ruleId) {
    if (window.linkedinAgent) {
        window.linkedinAgent.toggleAutomationRule(ruleId);
    }
}

function deleteAutomationRule(ruleId) {
    if (window.linkedinAgent) {
        window.linkedinAgent.deleteAutomationRule(ruleId);
    }
}

function connectLinkedIn() {
    if (window.linkedinAgent) {
        window.linkedinAgent.connectLinkedIn();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.linkedinAgent = new LinkedInMarketingAgent();
});

