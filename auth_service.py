import os
import jwt
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app, g
from models import User, db
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service for user management and JWT tokens"""
    
    @staticmethod
    def generate_tokens(user_id: int) -> dict:
        """Generate access and refresh tokens for a user"""
        try:
            payload = {
                'user_id': user_id,
                'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
                'iat': datetime.utcnow(),
                'type': 'access'
            }
            
            access_token = jwt.encode(
                payload,
                current_app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )
            
            refresh_payload = {
                'user_id': user_id,
                'exp': datetime.utcnow() + current_app.config['JWT_REFRESH_TOKEN_EXPIRES'],
                'iat': datetime.utcnow(),
                'type': 'refresh'
            }
            
            refresh_token = jwt.encode(
                refresh_payload,
                current_app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds())
            }
            
        except Exception as e:
            logger.error(f"Error generating tokens: {str(e)}")
            raise Exception("Failed to generate authentication tokens")
    
    @staticmethod
    def verify_token(token: str, token_type: str = 'access') -> dict:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            
            if payload.get('type') != token_type:
                raise jwt.InvalidTokenError(f"Invalid token type. Expected {token_type}")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError as e:
            raise Exception(f"Invalid token: {str(e)}")
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise Exception("Token verification failed")
    
    @staticmethod
    def create_user(username: str, email: str, password: str, first_name: str = None, last_name: str = None) -> dict:
        """Create a new user account"""
        try:
            # Check if user already exists
            existing_user = User.query.filter(
                (User.username == username) | (User.email == email)
            ).first()
            
            if existing_user:
                if existing_user.username == username:
                    raise Exception("Username already exists")
                else:
                    raise Exception("Email already registered")
            
            # Create new user
            user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            # Generate tokens
            tokens = AuthService.generate_tokens(user.id)
            
            return {
                'success': True,
                'user': user.to_dict(),
                'tokens': tokens,
                'message': 'User created successfully'
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {str(e)}")
            raise Exception(str(e))
    
    @staticmethod
    def authenticate_user(username_or_email: str, password: str) -> dict:
        """Authenticate user with username/email and password"""
        try:
            # Find user by username or email
            user = User.query.filter(
                (User.username == username_or_email) | (User.email == username_or_email)
            ).first()
            
            if not user:
                raise Exception("Invalid credentials")
            
            if not user.is_active:
                raise Exception("Account is deactivated")
            
            if not user.check_password(password):
                raise Exception("Invalid credentials")
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Generate tokens
            tokens = AuthService.generate_tokens(user.id)
            
            return {
                'success': True,
                'user': user.to_dict(),
                'tokens': tokens,
                'message': 'Authentication successful'
            }
            
        except Exception as e:
            logger.error(f"Error authenticating user: {str(e)}")
            raise Exception(str(e))
    
    @staticmethod
    def refresh_token(refresh_token: str) -> dict:
        """Refresh access token using refresh token"""
        try:
            payload = AuthService.verify_token(refresh_token, 'refresh')
            user_id = payload['user_id']
            
            # Verify user still exists and is active
            user = User.query.get(user_id)
            if not user or not user.is_active:
                raise Exception("User not found or inactive")
            
            # Generate new tokens
            tokens = AuthService.generate_tokens(user_id)
            
            return {
                'success': True,
                'tokens': tokens,
                'message': 'Token refreshed successfully'
            }
            
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            raise Exception(str(e))
    
    @staticmethod
    def get_current_user(user_id: int) -> User:
        """Get current user by ID"""
        user = User.query.get(user_id)
        if not user or not user.is_active:
            raise Exception("User not found or inactive")
        return user
    
    @staticmethod
    def update_user_profile(user_id: int, **kwargs) -> dict:
        """Update user profile information"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise Exception("User not found")
            
            # Update allowed fields
            allowed_fields = ['first_name', 'last_name', 'email']
            for field, value in kwargs.items():
                if field in allowed_fields and value is not None:
                    setattr(user, field, value)
            
            db.session.commit()
            
            return {
                'success': True,
                'user': user.to_dict(),
                'message': 'Profile updated successfully'
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user profile: {str(e)}")
            raise Exception(str(e))
    
    @staticmethod
    def change_password(user_id: int, current_password: str, new_password: str) -> dict:
        """Change user password"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise Exception("User not found")
            
            if not user.check_password(current_password):
                raise Exception("Current password is incorrect")
            
            user.set_password(new_password)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Password changed successfully'
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error changing password: {str(e)}")
            raise Exception(str(e))

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid authorization header format'
                }), 401
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'Authorization token is required'
            }), 401
        
        try:
            payload = AuthService.verify_token(token)
            user_id = payload['user_id']
            current_user = AuthService.get_current_user(user_id)
            g.current_user = current_user
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if not g.current_user.is_admin:
            return jsonify({
                'success': False,
                'error': 'Admin privileges required'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated

def optional_auth(f):
    """Decorator for optional authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.current_user = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
                payload = AuthService.verify_token(token)
                user_id = payload['user_id']
                g.current_user = AuthService.get_current_user(user_id)
            except Exception:
                pass  # Ignore authentication errors for optional auth
        
        return f(*args, **kwargs)
    
    return decorated