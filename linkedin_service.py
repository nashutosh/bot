import os
import logging
from datetime import datetime
import requests
import json
from urllib.parse import urlencode

class LinkedInService:
    def __init__(self):
        self.client_id = os.environ.get("LINKEDIN_CLIENT_ID")
        self.client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET")
        self.redirect_uri = os.environ.get("LINKEDIN_REDIRECT_URI", "http://localhost:5000/auth/linkedin/callback")
        self.access_token = os.environ.get("LINKEDIN_ACCESS_TOKEN")
        self.api_base = "https://api.linkedin.com/v2"
        self.logger = logging.getLogger(__name__)
        
    def get_authorization_url(self):
        """Generate LinkedIn OAuth authorization URL"""
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'openid profile email w_member_social'
        }
        
        auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"
        return auth_url
    
    def exchange_code_for_token(self, code: str) -> dict:
        """Exchange authorization code for access token"""
        try:
            token_url = "https://www.linkedin.com/oauth/v2/accessToken"
            
            data = {
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': self.redirect_uri,
                'client_id': self.client_id,
                'client_secret': self.client_secret
            }
            
            response = requests.post(token_url, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                
                # Store token in user profile
                from models import User
                from extensions import db
                user = User.get_default_user()
                user.linkedin_access_token = self.access_token
                user.linkedin_token_expires_at = datetime.utcnow() + datetime.timedelta(seconds=token_data.get('expires_in', 3600))
                db.session.commit()
                
                return {
                    'success': True,
                    'token': self.access_token,
                    'expires_in': token_data.get('expires_in', 3600)
                }
            else:
                return {
                    'success': False,
                    'error': f'Token exchange failed: {response.status_code}'
                }
                
        except Exception as e:
            self.logger.error(f"Error exchanging code for token: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_user_profile(self) -> dict:
        """Get LinkedIn user profile information"""
        try:
            if not self.access_token:
                return {
                    'success': False,
                    'error': 'Not authenticated'
                }
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get basic profile
            profile_response = requests.get(
                f"{self.api_base}/people/~:(id,firstName,lastName,headline,summary,industry,location,pictureUrls::(original),publicProfileUrl)",
                headers=headers
            )
            
            if profile_response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Failed to fetch profile'
                }
            
            profile_data = profile_response.json()
            
            # Store/update profile in database
            from models import LinkedInProfile, User
            from extensions import db
            
            user = User.get_default_user()
            linkedin_profile = LinkedInProfile.query.filter_by(user_id=user.id).first()
            
            if not linkedin_profile:
                linkedin_profile = LinkedInProfile(
                    user_id=user.id,
                    linkedin_id=profile_data['id']
                )
                db.session.add(linkedin_profile)
            
            # Update profile data
            linkedin_profile.first_name = profile_data.get('firstName', {}).get('localized', {}).get('en_US', '')
            linkedin_profile.last_name = profile_data.get('lastName', {}).get('localized', {}).get('en_US', '')
            linkedin_profile.headline = profile_data.get('headline', {}).get('localized', {}).get('en_US', '')
            linkedin_profile.industry = profile_data.get('industry', {}).get('localized', {}).get('en_US', '')
            linkedin_profile.location = profile_data.get('location', {}).get('name', '')
            linkedin_profile.public_profile_url = profile_data.get('publicProfileUrl', '')
            linkedin_profile.last_sync = datetime.utcnow()
            
            if 'pictureUrls' in profile_data:
                linkedin_profile.profile_picture_url = profile_data['pictureUrls']['values'][0] if profile_data['pictureUrls']['values'] else None
            
            db.session.commit()
            
            return {
                'success': True,
                'profile': linkedin_profile.to_dict()
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching user profile: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_post(self, content: str, image_url: str = None, video_url: str = None) -> dict:
        """Create a LinkedIn post"""
        try:
            if not self.access_token:
                return {
                    'success': False,
                    'error': 'Not authenticated',
                    'message': 'Please authenticate with LinkedIn first'
                }
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            }
            
            # Get user profile ID
            profile_response = requests.get(
                f"{self.api_base}/people/~:(id)",
                headers=headers
            )
            
            if profile_response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Failed to get user profile',
                    'message': 'LinkedIn authentication may have expired'
                }
            
            profile_data = profile_response.json()
            author_urn = f"urn:li:person:{profile_data['id']}"
            
            # Prepare post data
            post_data = {
                "author": author_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Add media if provided
            if image_url:
                post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
                    {
                        "status": "READY",
                        "description": {
                            "text": "LinkedIn post image"
                        },
                        "media": image_url,
                        "title": {
                            "text": "Image"
                        }
                    }
                ]
            
            # Create the post
            post_response = requests.post(
                f"{self.api_base}/ugcPosts",
                headers=headers,
                json=post_data
            )
            
            if post_response.status_code == 201:
                post_id = post_response.headers.get('x-linkedin-id', 'unknown')
                post_url = f"https://www.linkedin.com/feed/update/{post_id}/"
                
                return {
                    'success': True,
                    'post_id': post_id,
                    'post_url': post_url,
                    'message': 'Post published successfully to LinkedIn!'
                }
            else:
                error_data = post_response.json() if post_response.content else {}
                return {
                    'success': False,
                    'error': error_data.get('message', 'Unknown error'),
                    'message': f'Failed to post to LinkedIn: {post_response.status_code}'
                }
            
        except Exception as e:
            self.logger.error(f"Error creating LinkedIn post: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Failed to post to LinkedIn: {str(e)}'
            }
    
    def post_to_linkedin(self, content: str, image_url: str = None) -> dict:
        """Legacy method for backward compatibility"""
        return self.create_post(content, image_url)
    
    def schedule_post(self, content: str, schedule_time: datetime, image_url: str = None) -> dict:
        """Schedule a post for later publishing"""
        try:
            # Store scheduled post in database
            from models import Post, User
            from extensions import db
            
            user = User.get_default_user()
            post = Post(
                user_id=user.id,
                content=content,
                image_url=image_url,
                schedule_time=schedule_time,
                status='scheduled',
                post_type='image' if image_url else 'text'
            )
            
            db.session.add(post)
            db.session.commit()
            
            self.logger.info(f"LinkedIn post scheduled for {schedule_time} - Content: {content[:100]}...")
            
            return {
                'success': True,
                'scheduled_id': str(post.id),
                'schedule_time': schedule_time.isoformat(),
                'message': 'Post scheduled successfully'
            }
            
        except Exception as e:
            self.logger.error(f"Error scheduling LinkedIn post: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Failed to schedule post: {str(e)}'
            }
    
    def get_connection_status(self) -> dict:
        """Get LinkedIn connection status and profile info"""
        try:
            if not self.access_token:
                return {
                    'connected': False,
                    'profile': None,
                    'auth_url': self.get_authorization_url()
                }
            
            # Verify token is still valid
            profile_result = self.get_user_profile()
            
            if profile_result['success']:
                return {
                    'connected': True,
                    'profile': profile_result['profile'],
                    'auth_url': None
                }
            else:
                return {
                    'connected': False,
                    'profile': None,
                    'auth_url': self.get_authorization_url(),
                    'error': profile_result.get('error', 'Token expired')
                }
                
        except Exception as e:
            self.logger.error(f"Error checking connection status: {str(e)}")
            return {
                'connected': False,
                'profile': None,
                'auth_url': self.get_authorization_url(),
                'error': str(e)
            }

# Global instance
linkedin_service = LinkedInService()
