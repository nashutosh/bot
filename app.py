import os
import logging
from flask import Flask
from flask_cors import CORS
from config import config_dict
from dotenv import load_dotenv
from extensions import db, limiter
from routes import register_routes

load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_name=None):
    """Create and configure the Flask application"""
    
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_dict.get(config_name, config_dict['development']))
    
    # Initialize extensions
    db.init_app(app)
    limiter.init_app(app)
    CORS(app)
    
    # Register routes
    register_routes(app)
    
    # Initialize configuration
    config_dict[config_name].init_app(app)
    
    # Set up logging
    if not app.debug and not app.testing:
        logging.basicConfig(level=logging.INFO)
    
    # Create database tables
    with app.app_context():
        try:
            # Import all models to ensure they are registered with SQLAlchemy
            from models import (
                User, Post, UploadedFile, AutomationRule, 
                MarketingCampaign, LinkedInProfile, ActionLog
            )
            
            # Create all tables
            db.create_all()
            
            # Create default user if it doesn't exist
            default_user = User.get_default_user()
            print(f"✅ Database initialized. Default user: {default_user.username}")
            
        except Exception as e:
            print(f"❌ Error initializing database: {str(e)}")
            logging.error(f"Database initialization error: {str(e)}")
    
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
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    )
