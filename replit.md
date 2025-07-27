# LinkedIn AI Agent

## Overview

This is a Flask-based web application that serves as a LinkedIn AI Agent for creating, generating, and managing LinkedIn posts. The application leverages multiple AI services (Gemini AI and OpenAI) to generate professional LinkedIn content and images. It provides a complete content management system with scheduling capabilities, PDF document processing, and post history tracking.

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

### AI Services
1. **Gemini Service**: Primary content generation using Google's Gemini 2.5 Flash model with LinkedIn-optimized prompts
2. **OpenAI Service**: Secondary content enhancement and DALL-E 3 image generation
3. **Content Processing**: Intelligent text summarization for PDF-to-post conversion

### File Processing
- **PDF Service**: Secure file upload handling with text extraction and AI-powered summarization
- **Upload Management**: File validation, storage, and metadata tracking

### LinkedIn Integration
- **LinkedIn Service**: Post publishing and scheduling (currently simulated, ready for OAuth implementation)
- **Status Tracking**: Comprehensive post lifecycle management

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

## External Dependencies

### AI Services
- **Google Gemini AI**: Content generation and text summarization
- **OpenAI API**: Content enhancement and image generation (GPT-4o, DALL-E 3)

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