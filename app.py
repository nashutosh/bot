import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from config import config_dict
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

# Initialize extensions
db = SQLAlchemy(model_class=Base)
cors = CORS()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

def create_app(config_name=None):
    """Application factory pattern"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_dict.get(config_name, config_dict['default']))
    
    # Initialize configuration
    config_dict[config_name].init_app(app)
    
    # Configure proxy fix for production
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    
    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, origins=["http://localhost:3000", "http://localhost:5000"])
    limiter.init_app(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints/routes
    with app.app_context():
        # Import models to ensure they're registered
        from models import Post, UploadedFile, AutomationRule, MarketingCampaign, LinkedInProfile
        
        # Create all database tables
        db.create_all()
        
        # Import and register routes
        from routes import register_routes
        register_routes(app)
    
    return app

def register_error_handlers(app):
    """Register error handlers for the application"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return {
            'success': False,
            'error': 'Bad Request',
            'message': 'The request could not be understood by the server'
        }, 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return {
            'success': False,
            'error': 'Unauthorized',
            'message': 'Authentication is required'
        }, 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return {
            'success': False,
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource'
        }, 403
    
    @app.errorhandler(404)
    def not_found(error):
        return {
            'success': False,
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }, 404
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return {
            'success': False,
            'error': 'Rate Limit Exceeded',
            'message': 'Too many requests. Please try again later.'
        }, 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error(f"Internal server error: {str(error)}")
        return {
            'success': False,
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }, 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        logger.error(f"Unexpected error: {str(error)}", exc_info=True)
        return {
            'success': False,
            'error': 'Unexpected Error',
            'message': 'An unexpected error occurred'
        }, 500

# Create the application instance
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
