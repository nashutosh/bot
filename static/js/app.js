// LinkedIn Marketing Agent - Frontend JavaScript
class LinkedInMarketingAgent {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.initializeCharts();
    }
    
    // Authentication Methods
    checkAuthentication() {
        if (this.authToken) {
            this.validateToken();
        } else {
            this.showAuthModal();
        }
    }
    
    async validateToken() {
        try {
            const response = await this.apiCall('/auth/validate', 'GET');
            if (response.success) {
                this.currentUser = response.user;
                this.showApp();
                this.loadDashboardData();
            } else {
                this.showAuthModal();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            this.showAuthModal();
        }
    }
    
    async login(username, password) {
        try {
            this.showLoading();
            const response = await this.apiCall('/auth/login', 'POST', {
                username: username,
                password: password
            });
            
            if (response.success) {
                this.authToken = response.tokens.access_token;
                this.refreshToken = response.tokens.refresh_token;
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('refreshToken', this.refreshToken);
                
                this.currentUser = response.user;
                this.hideAuthModal();
                this.showApp();
                this.loadDashboardData();
                this.showNotification('Welcome back!', 'success');
            } else {
                this.showNotification(response.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.showNotification('Login failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async register(userData) {
        try {
            this.showLoading();
            const response = await this.apiCall('/auth/register', 'POST', userData);
            
            if (response.success) {
                this.authToken = response.tokens.access_token;
                this.refreshToken = response.tokens.refresh_token;
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('refreshToken', this.refreshToken);
                
                this.currentUser = response.user;
                this.hideAuthModal();
                this.showApp();
                this.loadDashboardData();
                this.showNotification('Account created successfully!', 'success');
            } else {
                this.showNotification(response.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showNotification('Registration failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        this.authToken = null;
        this.refreshToken = null;
        this.currentUser = null;
        this.hideApp();
        this.showAuthModal();
        this.showNotification('Logged out successfully', 'info');
    }
    
    // UI Methods
    showAuthModal() {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }
    
    hideAuthModal() {
        document.getElementById('authModal').classList.add('hidden');
    }
    
    showApp() {
        document.getElementById('appContainer').classList.remove('hidden');
        if (this.currentUser) {
            document.getElementById('userDisplayName').textContent = 
                this.currentUser.first_name || this.currentUser.username;
        }
    }
    
    hideApp() {
        document.getElementById('appContainer').classList.add('hidden');
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const typeColors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        const typeIcons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="${typeColors[type]} text-white px-6 py-4 rounded-lg shadow-lg">
                <div class="flex items-center">
                    <i class="${typeIcons[type]} mr-3"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.parentElement.classList.remove('show')" class="ml-4">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
    
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.remove('hidden');
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-linkedin', 'text-white');
            link.classList.add('text-gray-700');
        });
        
        event.target.classList.add('bg-linkedin', 'text-white');
        event.target.classList.remove('text-gray-700');
        
        // Load section-specific data
        this.loadSectionData(sectionName);
    }
    
    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = this.apiBaseUrl + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (this.authToken) {
            options.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (response.status === 401 && this.refreshToken) {
                // Try to refresh token
                await this.refreshAuthToken();
                // Retry original request
                return this.apiCall(endpoint, method, data);
            }
            
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
    
    async refreshAuthToken() {
        try {
            const response = await fetch(this.apiBaseUrl + '/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.authToken = result.tokens.access_token;
                localStorage.setItem('authToken', this.authToken);
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
        }
    }
    
    // Content Generation Methods
    async generateContent(prompt, contentType, targetAudience) {
        try {
            this.showLoading();
            const response = await this.apiCall('/generate-content', 'POST', {
                prompt: prompt,
                content_type: contentType,
                target_audience: targetAudience
            });
            
            if (response.success) {
                this.displayGeneratedContent(response.content);
                this.showNotification('Content generated successfully!', 'success');
            } else {
                this.showNotification(response.error || 'Content generation failed', 'error');
            }
        } catch (error) {
            this.showNotification('Content generation failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayGeneratedContent(content) {
        const contentDiv = document.getElementById('generatedContent');
        contentDiv.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-6 border">
                <div class="whitespace-pre-wrap text-gray-800">${content}</div>
            </div>
        `;
    }
    
    async generateImage(prompt) {
        try {
            this.showLoading();
            const response = await this.apiCall('/generate-image', 'POST', {
                prompt: prompt
            });
            
            if (response.success) {
                this.displayGeneratedImage(response.image_url);
                this.showNotification('Image generated successfully!', 'success');
            } else {
                this.showNotification(response.error || 'Image generation failed', 'error');
            }
        } catch (error) {
            this.showNotification('Image generation failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayGeneratedImage(imageUrl) {
        const imageDiv = document.getElementById('generatedImage');
        const imagePreview = document.getElementById('generatedImagePreview');
        
        imagePreview.src = imageUrl;
        imageDiv.classList.remove('hidden');
    }
    
    // Post Management Methods
    async publishPost() {
        const content = document.querySelector('#generatedContent .whitespace-pre-wrap')?.textContent;
        const imageUrl = document.getElementById('generatedImagePreview')?.src;
        
        if (!content) {
            this.showNotification('No content to publish', 'warning');
            return;
        }
        
        try {
            this.showLoading();
            const response = await this.apiCall('/create-post', 'POST', {
                content: content,
                image_url: imageUrl,
                post_type: imageUrl ? 'image' : 'text'
            });
            
            if (response.success) {
                this.showNotification('Post published successfully!', 'success');
                this.loadDashboardData();
            } else {
                this.showNotification(response.error || 'Publishing failed', 'error');
            }
        } catch (error) {
            this.showNotification('Publishing failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async schedulePost() {
        const content = document.querySelector('#generatedContent .whitespace-pre-wrap')?.textContent;
        const imageUrl = document.getElementById('generatedImagePreview')?.src;
        
        if (!content) {
            this.showNotification('No content to schedule', 'warning');
            return;
        }
        
        // Show schedule modal (implement later)
        this.showNotification('Schedule feature coming soon!', 'info');
    }
    
    // Dashboard Methods
    async loadDashboardData() {
        try {
            const [statsResponse, postsResponse] = await Promise.all([
                this.apiCall('/dashboard/stats'),
                this.apiCall('/posts/recent')
            ]);
            
            if (statsResponse.success) {
                this.updateDashboardStats(statsResponse.data);
            }
            
            if (postsResponse.success) {
                this.updateRecentPosts(postsResponse.posts);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }
    
    updateDashboardStats(stats) {
        document.getElementById('totalPosts').textContent = stats.total_posts || 0;
        document.getElementById('engagementRate').textContent = (stats.engagement_rate || 0) + '%';
        document.getElementById('totalConnections').textContent = stats.total_connections || 0;
        document.getElementById('activeCampaigns').textContent = stats.active_campaigns || 0;
    }
    
    updateRecentPosts(posts) {
        const container = document.getElementById('recentPosts');
        
        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-inbox text-4xl mb-4"></i>
                    <p>No posts yet</p>
                    <p class="text-sm">Create your first post to see it here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = posts.map(post => `
            <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-start justify-between mb-2">
                    <span class="text-sm font-medium text-gray-900">${post.status}</span>
                    <span class="text-xs text-gray-500">${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <p class="text-sm text-gray-700 line-clamp-3">${post.content}</p>
                <div class="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span><i class="fas fa-heart mr-1"></i>${post.likes_count || 0}</span>
                    <span><i class="fas fa-comment mr-1"></i>${post.comments_count || 0}</span>
                    <span><i class="fas fa-share mr-1"></i>${post.shares_count || 0}</span>
                </div>
            </div>
        `).join('');
    }
    
    // Chart Initialization
    initializeCharts() {
        // Initialize engagement chart
        const ctx = document.getElementById('engagementChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Engagement',
                        data: [12, 19, 3, 5, 2, 3, 9],
                        borderColor: '#0a66c2',
                        backgroundColor: 'rgba(10, 102, 194, 0.1)',
                        tension: 0.4
                    }]
                },
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
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }
    
    // Section Data Loading
    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'content-generator':
                // Content generator is ready
                break;
            case 'post-scheduler':
                this.loadScheduledPosts();
                break;
            case 'automation':
                this.loadAutomationData();
                break;
            case 'campaigns':
                this.loadCampaigns();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'file-manager':
                this.loadFiles();
                break;
            case 'linkedin-integration':
                this.loadLinkedInStatus();
                break;
        }
    }
    
    async loadScheduledPosts() {
        // Implement scheduled posts loading
        console.log('Loading scheduled posts...');
    }
    
    async loadAutomationData() {
        // Implement automation data loading
        console.log('Loading automation data...');
    }
    
    async loadCampaigns() {
        // Implement campaigns loading
        console.log('Loading campaigns...');
    }
    
    async loadAnalytics() {
        // Implement analytics loading
        console.log('Loading analytics...');
    }
    
    async loadFiles() {
        // Implement file loading
        console.log('Loading files...');
    }
    
    async loadLinkedInStatus() {
        // Implement LinkedIn status loading
        console.log('Loading LinkedIn status...');
    }
    
    // Event Listeners
    setupEventListeners() {
        // Login form
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            this.login(username, password);
        });
        
        // Register form
        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            const userData = {
                username: document.getElementById('registerUsername').value,
                email: document.getElementById('registerEmail').value,
                password: document.getElementById('registerPassword').value,
                first_name: document.getElementById('registerFirstName').value,
                last_name: document.getElementById('registerLastName').value
            };
            this.register(userData);
        });
        
        // Content generator form
        document.getElementById('contentGeneratorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const prompt = document.getElementById('contentPrompt').value;
            const contentType = document.getElementById('contentType').value;
            const targetAudience = document.getElementById('targetAudience').value;
            this.generateContent(prompt, contentType, targetAudience);
        });
        
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('-translate-x-full');
        });
        
        // User menu toggle
        document.getElementById('userMenuButton').addEventListener('click', () => {
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenuButton');
            const dropdown = document.getElementById('userDropdown');
            
            if (!userMenu.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

// Global functions for HTML onclick handlers
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function showSection(sectionName) {
    window.app.showSection(sectionName);
}

function logout() {
    window.app.logout();
}

function generateImage() {
    const prompt = document.getElementById('contentPrompt').value;
    if (!prompt) {
        window.app.showNotification('Please enter a content prompt first', 'warning');
        return;
    }
    window.app.generateImage(prompt);
}

function publishPost() {
    window.app.publishPost();
}

function schedulePost() {
    window.app.schedulePost();
}

function showScheduleModal() {
    window.app.showNotification('Schedule modal coming soon!', 'info');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LinkedInMarketingAgent();
});

