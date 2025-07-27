# LinkedIn Marketing Agent

A comprehensive, professional LinkedIn marketing automation platform built with Flask, featuring AI-powered content generation, post scheduling, automation rules, and analytics.

## 🚀 Features

### Core Features
- **AI Content Generation**: Generate engaging LinkedIn posts using Google Gemini AI
- **Image Generation**: Create professional images using Stability AI and Gemini
- **Post Scheduling**: Schedule posts for optimal engagement times
- **LinkedIn Automation**: Automated connection requests, likes, comments, and follows
- **Marketing Campaigns**: Create and manage comprehensive marketing campaigns
- **Analytics Dashboard**: Track performance metrics and engagement rates
- **File Management**: Upload and process PDFs for content inspiration
- **User Authentication**: Secure JWT-based authentication system

### Advanced Features
- **Professional UI**: Modern, responsive design with Tailwind CSS
- **Rate Limiting**: Protect APIs from abuse
- **Error Handling**: Comprehensive error tracking and logging
- **Database Management**: SQLAlchemy ORM with migration support
- **Security**: CORS protection, input validation, and secure password hashing
- **Multi-user Support**: User-specific data isolation and management

## 🛠️ Technology Stack

### Backend
- **Framework**: Flask 3.1+
- **Database**: SQLAlchemy with SQLite/PostgreSQL support
- **Authentication**: JWT tokens with refresh mechanism
- **AI Services**: Google Gemini, Stability AI
- **Task Queue**: Celery with Redis
- **Rate Limiting**: Flask-Limiter

### Frontend
- **CSS Framework**: Tailwind CSS
- **JavaScript**: Vanilla ES6+ with modern API patterns
- **Charts**: Chart.js for analytics visualization
- **Icons**: Font Awesome 6
- **Fonts**: Inter font family

### Infrastructure
- **Web Server**: Gunicorn for production
- **Caching**: Redis for sessions and rate limiting
- **Monitoring**: Sentry for error tracking
- **Email**: SMTP support for notifications

## 📋 Prerequisites

- Python 3.8+
- Redis server
- PostgreSQL (optional, SQLite by default)
- API keys for AI services

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd linkedin-marketing-agent
```

### 2. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-super-secret-key-here

# Database
DATABASE_URL=sqlite:///linkedin_agent.db

# LinkedIn API
LINKEDIN_CLIENT_ID=your-linkedin-client-id

# AI Services
GEMINI_API_KEY=your-gemini-api-key
STABILITY_API_KEY=your-stability-ai-api-key

# Redis (for automation)
REDIS_URL=redis://localhost:6379/0
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# AI Services
GEMINI_API_KEY=your-gemini-api-key
STABILITY_API_KEY=your-stability-ai-api-key

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 5. Database Setup
```bash
# Initialize the database
python app.py
```

### 6. Start Redis Server
```bash
# On macOS with Homebrew
brew services start redis

# On Ubuntu/Debian
sudo systemctl start redis-server

# Or run directly
redis-server
```

## 🚀 Running the Application

### Development Mode
```bash
python app.py
```

### Production Mode
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

The application will be available at `http://localhost:5000`

## 📖 Usage Guide

### 1. User Registration
- Visit the application homepage
- Click "Sign up" to create a new account
- Fill in your details and create a password

### 2. LinkedIn Integration
- Navigate to "LinkedIn Integration" section
- Connect your LinkedIn account using OAuth
- Grant necessary permissions for posting and automation

### 3. Content Generation
- Go to "Content Generator"
- Enter your content prompt
- Select content type and target audience
- Generate AI-powered LinkedIn posts
- Optionally add AI-generated images

### 4. Post Management
- **Publish Now**: Immediately post to LinkedIn
- **Schedule**: Set specific date and time for posting
- **Save Draft**: Save for later editing

### 5. Automation Setup
- Visit "Automation" section
- Configure automation rules:
  - Auto-connect with targeted profiles
  - Auto-like relevant posts
  - Auto-comment on industry content
- Set daily limits to comply with LinkedIn's terms

### 6. Campaign Management
- Create marketing campaigns in "Campaigns"
- Set campaign objectives and target audience
- Track campaign performance and ROI

### 7. Analytics
- Monitor performance in "Analytics" dashboard
- Track engagement rates, reach, and conversions
- Export data for external analysis

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/validate` - Validate current token

### Content Generation
- `POST /api/generate-content` - Generate LinkedIn post content
- `POST /api/generate-image` - Generate images for posts

### Post Management
- `POST /api/create-post` - Create and publish/schedule posts
- `GET /api/posts/recent` - Get recent user posts

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Cross-origin request security
- **Password Hashing**: Secure password storage with bcrypt
- **SQL Injection Prevention**: SQLAlchemy ORM protection

## 🎯 LinkedIn Automation Compliance

This application is designed to comply with LinkedIn's terms of service:

- **Rate Limits**: Built-in daily limits for all automation activities
- **Human-like Behavior**: Randomized delays between actions
- **Quality Control**: Content filtering and relevance checking
- **User Control**: Full control over automation settings
- **Transparency**: Complete activity logging and reporting

### Default Daily Limits
- Connections: 100 per day
- Likes: 300 per day
- Comments: 50 per day
- Messages: 20 per day

## 📊 Database Schema

### Users
- User authentication and profile information
- LinkedIn integration status

### Posts
- Generated and published content
- Scheduling information
- Engagement metrics

### Automation Rules
- User-defined automation criteria
- Action templates and limits

### Marketing Campaigns
- Campaign objectives and targeting
- Performance tracking

## 🔧 Configuration Options

### AI Service Configuration
```python
# Gemini AI settings
GEMINI_API_KEY = "your-key"
GEMINI_MODEL = "gemini-2.5-flash"

# Stability AI settings
STABILITY_API_KEY = "your-key"
STABILITY_MODEL = "stable-diffusion-xl-1024-v1-0"
```

### Automation Limits
```python
# Daily action limits
DAILY_CONNECTION_LIMIT = 100
DAILY_FOLLOW_LIMIT = 150
DAILY_LIKE_LIMIT = 300
DAILY_COMMENT_LIMIT = 50
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Reset database
   rm linkedin_agent.db
   python app.py
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   redis-cli ping
   # Should return "PONG"
   ```

3. **AI Service Errors**
   - Verify API keys in `.env` file
   - Check API quotas and limits
   - Ensure internet connectivity

4. **LinkedIn Authentication Issues**
   - Verify LinkedIn app credentials
   - Check redirect URI configuration
   - Ensure app has proper permissions

## 📈 Performance Optimization

### Database Optimization
- Use PostgreSQL for production
- Enable connection pooling
- Regular database maintenance

### Caching Strategy
- Redis for session storage
- API response caching
- Static file caching

### Monitoring
- Sentry for error tracking
- Application performance monitoring
- Resource usage tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is for educational and legitimate marketing purposes only. Users are responsible for complying with LinkedIn's terms of service and applicable laws. The developers are not responsible for any misuse of this software.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting section

## 🔄 Updates and Roadmap

### Upcoming Features
- Advanced analytics with ML insights
- Multi-platform social media support
- Enhanced automation with AI decision-making
- Team collaboration features
- API integrations with CRM systems

### Version History
- v1.0.0 - Initial release with core features
- v1.1.0 - Enhanced UI and authentication
- v1.2.0 - Advanced automation features (planned)

---

**Built with ❤️ for LinkedIn Marketing Professionals**