import os
from datetime import timedelta
from decouple import config

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-in-production')
    FLASK_ENV = config('FLASK_ENV', default='development')
    DEBUG = config('FLASK_DEBUG', default=True, cast=bool)
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = config('DATABASE_URL', default='sqlite:///linkedin_agent.db')
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = config('MAX_CONTENT_LENGTH', default=16 * 1024 * 1024, cast=int)  # 16MB
    UPLOAD_FOLDER = config('UPLOAD_FOLDER', default='static/uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'txt', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'gif'}
    
    # LinkedIn API Configuration
    LINKEDIN_CLIENT_ID = config('LINKEDIN_CLIENT_ID', default='')
    LINKEDIN_CLIENT_SECRET = config('LINKEDIN_CLIENT_SECRET', default='')
    LINKEDIN_ACCESS_TOKEN = config('LINKEDIN_ACCESS_TOKEN', default='')
    LINKEDIN_REDIRECT_URI = config('LINKEDIN_REDIRECT_URI', default='http://localhost:5000/auth/linkedin/callback')
    
    # AI Services Configuration
    GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
    OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
    STABILITY_API_KEY = config('STABILITY_API_KEY', default='')
    
    # Redis Configuration
    REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')
    
    # Email Configuration
    SMTP_SERVER = config('SMTP_SERVER', default='smtp.gmail.com')
    SMTP_PORT = config('SMTP_PORT', default=587, cast=int)
    SMTP_USERNAME = config('SMTP_USERNAME', default='')
    SMTP_PASSWORD = config('SMTP_PASSWORD', default='')
    SMTP_USE_TLS = True
    
    # Security Configuration
    JWT_SECRET_KEY = config('JWT_SECRET_KEY', default='jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    BCRYPT_LOG_ROUNDS = config('BCRYPT_LOG_ROUNDS', default=12, cast=int)
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = config('RATE_LIMIT_STORAGE_URL', default='redis://localhost:6379/1')
    RATELIMIT_DEFAULT = "100 per hour"
    
    # Automation Limits
    DAILY_CONNECTION_LIMIT = config('DAILY_CONNECTION_LIMIT', default=100, cast=int)
    DAILY_FOLLOW_LIMIT = config('DAILY_FOLLOW_LIMIT', default=150, cast=int)
    DAILY_LIKE_LIMIT = config('DAILY_LIKE_LIMIT', default=300, cast=int)
    DAILY_COMMENT_LIMIT = config('DAILY_COMMENT_LIMIT', default=50, cast=int)
    DAILY_MESSAGE_LIMIT = config('DAILY_MESSAGE_LIMIT', default=20, cast=int)
    
    # Monitoring
    SENTRY_DSN = config('SENTRY_DSN', default='')
    
    # Application Settings
    APP_NAME = config('APP_NAME', default='LinkedIn Marketing Agent')
    APP_VERSION = config('APP_VERSION', default='1.0.0')
    TIMEZONE = config('TIMEZONE', default='UTC')
    
    # Celery Configuration
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TIMEZONE = TIMEZONE
    CELERY_ENABLE_UTC = True
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Create upload directory
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # Initialize Sentry if DSN is provided
        if app.config.get('SENTRY_DSN'):
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
            
            sentry_sdk.init(
                dsn=app.config['SENTRY_DSN'],
                integrations=[
                    FlaskIntegration(),
                    SqlalchemyIntegration(),
                ],
                traces_sample_rate=1.0
            )

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log to stderr in production
        import logging
        from logging import StreamHandler
        file_handler = StreamHandler()
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

config_dict = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}