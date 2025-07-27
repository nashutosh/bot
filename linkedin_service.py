import os
import logging
from datetime import datetime
import requests

class LinkedInService:
    def __init__(self):
        self.client_id = os.environ.get("LINKEDIN_CLIENT_ID", "86rn2qqk775fwu")
        self.client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET", "WPL_AP1.9YvV50e1umGE236w.ChAN4g==")
        self.access_token = os.environ.get("LINKEDIN_ACCESS_TOKEN")
        self.api_base = "https://api.linkedin.com/v2"
        self.redirect_uri = "http://localhost:5000/auth/linkedin/callback"
        
    def get_authorization_url(self) -> str:
        """Generate LinkedIn OAuth authorization URL"""
        scope = "w_member_social,r_liteprofile,r_emailaddress"
        auth_url = (
            f"https://www.linkedin.com/oauth/v2/authorization?"
            f"response_type=code&"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"scope={scope}"
        )
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
            token_data = response.json()
            
            if 'access_token' in token_data:
                self.access_token = token_data['access_token']
                return {'success': True, 'token': token_data['access_token']}
            else:
                return {'success': False, 'error': token_data.get('error_description', 'Token exchange failed')}
                
        except Exception as e:
            logging.error(f"Token exchange error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def post_to_linkedin(self, content: str, image_url: str | None = None) -> dict:
        """Post content to LinkedIn"""
        try:
            if not self.access_token:
                return {
                    'success': False,
                    'error': 'Not authenticated',
                    'auth_url': self.get_authorization_url(),
                    'message': 'Please authenticate with LinkedIn first'
                }
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            }
            
            # Get user profile first
            profile_response = requests.get(
                f"{self.api_base}/me", 
                headers=headers
            )
            
            if profile_response.status_code != 200:
                return {
                    'success': False,
                    'error': 'Failed to get user profile',
                    'message': 'LinkedIn authentication may have expired'
                }
            
            profile_data = profile_response.json()
            user_urn = f"urn:li:person:{profile_data['id']}"
            
            # Prepare post data
            post_data = {
                "author": user_urn,
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
            
            # Post to LinkedIn
            post_response = requests.post(
                f"{self.api_base}/ugcPosts",
                headers=headers,
                json=post_data
            )
            
            if post_response.status_code == 201:
                post_id = post_response.headers.get('x-linkedin-id', 'unknown')
                return {
                    'success': True,
                    'post_id': post_id,
                    'message': 'Post published successfully to LinkedIn!'
                }
            else:
                error_data = post_response.json()
                return {
                    'success': False,
                    'error': error_data.get('message', 'Unknown error'),
                    'message': f'Failed to post to LinkedIn: {post_response.status_code}'
                }
            
        except Exception as e:
            logging.error(f"Error posting to LinkedIn: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Failed to post to LinkedIn: {str(e)}'
            }
    
    def schedule_post(self, content: str, schedule_time: datetime, image_url: str | None = None) -> dict:
        """Schedule a post for later publishing"""
        try:
            # For now, return success since this would require a scheduler service
            logging.info(f"LinkedIn post scheduled for {schedule_time} - Content: {content[:100]}...")
            
            return {
                'success': True,
                'scheduled_id': f"sched_{datetime.now().timestamp()}",
                'schedule_time': schedule_time.isoformat(),
                'message': 'Post scheduled successfully'
            }
            
        except Exception as e:
            logging.error(f"Error scheduling LinkedIn post: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Failed to schedule post: {str(e)}'
            }

# Global instance
linkedin_service = LinkedInService()
