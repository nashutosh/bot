# LinkedIn AI Agent

## Overview

This is a comprehensive Flask-based LinkedIn Marketing Automation Agent that combines AI-powered content generation with advanced automation features. The application provides a complete LinkedIn marketing solution including content creation, automated networking, connection management, engagement automation, and multi-post marketing campaigns from PDF content analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite (default) with configurable database URL support
- **AI Integration**: Dual AI provider setup with Google Gemini AI for content generation and OpenAI (GPT-4o/DALL-E 3) for content enhancement and image generation
- **File Processing**: PDF text extraction using PyPDF2
- **Session Management**: Flask sessions with configurable secret key

### Frontend Architecture
- **UI Framework**: Bootstrap 5 with dark theme
- **JavaScript**: Vanilla JavaScript with modular component structure
- **Styling**: Custom CSS with LinkedIn branding colors
- **Icons**: Font Awesome integration

### Design Patterns
- **MVC Pattern**: Clear separation with models, routes (controllers), and templates (views)
- **Service Layer**: Dedicated service modules for AI integrations and external APIs
- **Factory Pattern**: Database model creation through SQLAlchemy DeclarativeBase

## Key Components

### Core Models
1. **Post Model**: Manages LinkedIn post data including content, scheduling, status tracking, and LinkedIn integration metadata
2. **UploadedFile Model**: Handles PDF file uploads with text extraction and summarization capabilities
3. **AutomationRule Model**: Configures automation rules for connections, follows, likes, and comments with daily limits
4. **MarketingCampaign Model**: Manages multi-post marketing campaigns with keyword targeting and PDF content integration
5. **LinkedInProfile Model**: Tracks LinkedIn profiles for automation targeting with engagement scoring and connection status

### AI Services
1. **Gemini Service**: Primary content generation using Google's Gemini 2.5 Flash model with LinkedIn-optimized prompts and image generation via Gemini 2.0 Flash
2. **Stability AI Service**: Professional image generation for business content with SDXL model
3. **Content Processing**: Intelligent text summarization and marketing angle extraction from PDF content
4. **Automation Intelligence**: AI-powered comment generation and engagement optimization

### File Processing
- **PDF Service**: Secure file upload handling with text extraction and AI-powered summarization
- **Upload Management**: File validation, storage, and metadata tracking

### LinkedIn Automation
- **Connection Management**: Auto-accept incoming connections and send targeted connection requests
- **Follow Automation**: Intelligent following of successful profiles based on criteria (CEO, Founder, industry leaders)
- **Engagement Automation**: Auto-like and comment on posts with specific keywords
- **Marketing Campaigns**: Multi-post campaigns generated from PDF content with scheduled publishing
- **Profile Tracking**: Database of LinkedIn profiles with engagement scoring and automation targeting

## Data Flow

### Content Generation Flow
1. User inputs content prompt through web interface
2. Frontend validates input and sends request to Flask API
3. Gemini service processes prompt with LinkedIn-specific instructions
4. Generated content is stored in database with draft status
5. Optional image generation through OpenAI DALL-E 3
6. Content preview displayed to user for review/editing

### PDF Processing Flow
1. User uploads PDF through drag-and-drop interface
2. Backend validates file type and saves securely
3. PyPDF2 extracts text content from PDF
4. Gemini AI summarizes extracted text for LinkedIn optimization
5. Summary is stored and can be used as content generation prompt

### Publishing Flow
1. User reviews and approves generated content
2. Optional scheduling time selection
3. Content status updated to scheduled/published
4. LinkedIn service handles actual posting (ready for API integration)
5. Post history and statistics updated

### Marketing Automation Flow
1. User uploads PDF with product/service information
2. AI analyzes content and extracts marketing angles
3. System generates multiple targeted posts for different audiences
4. Posts are automatically scheduled at optimal intervals
5. Automation engine engages with relevant content and builds connections
6. Campaign performance tracked with engagement metrics

## External Dependencies

### AI Services
- **Google Gemini AI**: Content generation and text summarization
- **Stability AI**: Professional image generation with SDXL model

### LinkedIn Integration
- **LinkedIn API**: Real posting functionality with OAuth2 authentication
- **Client ID**: 86rn2qqk775fwu
- **Client Secret**: WPL_AP1.9YvV50e1umGE236w.ChAN4g== (configured)
- **OAuth Scopes**: w_member_social, r_liteprofile, r_emailaddress

### File Processing
- **PyPDF2**: PDF text extraction capabilities

### Frontend Libraries
- **Bootstrap 5**: UI framework with dark theme
- **Font Awesome**: Icon library

### Python Dependencies
- **Flask**: Web framework
- **SQLAlchemy**: Database ORM
- **Werkzeug**: WSGI utilities and security

## Deployment Strategy

### Environment Configuration
- Database URL configurable via environment variable (DATABASE_URL)
- AI API keys managed through environment variables
- Session secret key configurable for production security
- Upload folder automatically created and managed

### Production Considerations
- **Proxy Support**: ProxyFix middleware for deployment behind reverse proxies
- **Database Connection**: Pool recycling and health checks configured
- **File Upload Limits**: 16MB maximum file size restriction
- **Security**: Secure filename handling and file type validation

### Scalability Features
- **Database Agnostic**: Ready to migrate from SQLite to PostgreSQL
- **Service Modularity**: AI services can be easily swapped or load-balanced
- **Stateless Design**: Session-based state management allows horizontal scaling

The application is designed with a clear separation of concerns, making it easy to extend functionality, integrate with real LinkedIn APIs, and scale for production use.