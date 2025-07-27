import os
import logging
import requests
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
from linkedin_service import linkedin_service

@dataclass
class LinkedInProfile:
    """Profile information for LinkedIn automation"""
    profile_id: str
    name: str
    headline: str
    industry: str
    location: str
    connection_status: str
    last_activity: Optional[datetime] = None

@dataclass
class AutomationRule:
    """Automation rule configuration"""
    rule_type: str  # 'auto_connect', 'auto_follow', 'auto_like', 'auto_comment'
    target_criteria: Dict  # criteria for targeting
    action_limit: int  # max actions per day
    is_active: bool = True

class LinkedInAutomation:
    def __init__(self):
        self.access_token = os.environ.get("LINKEDIN_ACCESS_TOKEN")
        self.api_base = "https://api.linkedin.com/v2"
        self.daily_limits = {
            'connections': 100,  # LinkedIn daily limit
            'follows': 150,
            'likes': 300,
            'comments': 50,
            'messages': 20
        }
        self.actions_today = {
            'connections': 0,
            'follows': 0,
            'likes': 0,
            'comments': 0,
            'messages': 0
        }
        
    def auto_accept_connections(self) -> Dict:
        """Accept all pending connection requests"""
        try:
            if not self.access_token:
                return {'success': False, 'message': 'LinkedIn access token required'}
            
            # Simulate getting pending invitations
            pending_invitations = self._get_pending_invitations()
            accepted_count = 0
            
            for invitation in pending_invitations:
                if self.actions_today['connections'] >= self.daily_limits['connections']:
                    break
                    
                result = self._accept_invitation(invitation['id'])
                if result['success']:
                    accepted_count += 1
                    self.actions_today['connections'] += 1
                    time.sleep(2)  # Rate limiting
            
            return {
                'success': True,
                'accepted_count': accepted_count,
                'message': f'Accepted {accepted_count} connection requests'
            }
            
        except Exception as e:
            logging.error(f"Error in auto_accept_connections: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_send_connections(self, target_profiles: List[str], message: str = None) -> Dict:
        """Send connection requests to target profiles"""
        try:
            if not self.access_token:
                return {'success': False, 'message': 'LinkedIn access token required'}
            
            sent_count = 0
            failed_count = 0
            
            for profile_id in target_profiles:
                if self.actions_today['connections'] >= self.daily_limits['connections']:
                    break
                
                result = self._send_connection_request(profile_id, message)
                if result['success']:
                    sent_count += 1
                    self.actions_today['connections'] += 1
                else:
                    failed_count += 1
                
                time.sleep(3)  # Rate limiting
            
            return {
                'success': True,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'message': f'Sent {sent_count} connection requests'
            }
            
        except Exception as e:
            logging.error(f"Error in auto_send_connections: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_follow_successful_people(self, criteria: Dict) -> Dict:
        """Auto-follow profiles based on success criteria"""
        try:
            # Search for profiles matching criteria
            target_profiles = self._search_profiles(criteria)
            followed_count = 0
            
            for profile in target_profiles:
                if self.actions_today['follows'] >= self.daily_limits['follows']:
                    break
                
                # Check if person meets "successful" criteria
                if self._is_successful_profile(profile):
                    result = self._follow_profile(profile['id'])
                    if result['success']:
                        followed_count += 1
                        self.actions_today['follows'] += 1
                        time.sleep(2)
            
            return {
                'success': True,
                'followed_count': followed_count,
                'message': f'Followed {followed_count} successful profiles'
            }
            
        except Exception as e:
            logging.error(f"Error in auto_follow_successful_people: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_engage_with_posts(self, keywords: List[str]) -> Dict:
        """Auto-like and comment on posts with specific keywords"""
        try:
            engaged_posts = 0
            
            # Search for posts with keywords
            relevant_posts = self._search_posts(keywords)
            
            for post in relevant_posts:
                if self.actions_today['likes'] >= self.daily_limits['likes']:
                    break
                
                # Like the post
                like_result = self._like_post(post['id'])
                if like_result['success']:
                    self.actions_today['likes'] += 1
                    engaged_posts += 1
                    
                    # Add intelligent comment if appropriate
                    if self.actions_today['comments'] < self.daily_limits['comments']:
                        comment = self._generate_intelligent_comment(post['content'])
                        if comment:
                            comment_result = self._comment_on_post(post['id'], comment)
                            if comment_result['success']:
                                self.actions_today['comments'] += 1
                
                time.sleep(3)
            
            return {
                'success': True,
                'engaged_posts': engaged_posts,
                'message': f'Engaged with {engaged_posts} relevant posts'
            }
            
        except Exception as e:
            logging.error(f"Error in auto_engage_with_posts: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def schedule_marketing_campaign(self, pdf_content: str, product_info: Dict) -> Dict:
        """Create multiple marketing posts from PDF content"""
        try:
            from gemini_service import generate_linkedin_post
            
            # Extract marketing angles from PDF
            marketing_angles = self._extract_marketing_angles(pdf_content, product_info)
            
            scheduled_posts = []
            base_time = datetime.now()
            
            for i, angle in enumerate(marketing_angles):
                # Generate post for each angle
                post_content = generate_linkedin_post(
                    f"Create a marketing post about {product_info.get('name', 'our product')} "
                    f"focusing on: {angle}. Include benefits and call-to-action."
                )
                
                # Schedule posts at intervals
                schedule_time = base_time + timedelta(hours=i * 4)
                
                scheduled_posts.append({
                    'content': post_content,
                    'schedule_time': schedule_time,
                    'marketing_angle': angle,
                    'product': product_info.get('name', 'Product')
                })
            
            return {
                'success': True,
                'scheduled_posts': len(scheduled_posts),
                'posts': scheduled_posts,
                'message': f'Scheduled {len(scheduled_posts)} marketing posts'
            }
            
        except Exception as e:
            logging.error(f"Error in schedule_marketing_campaign: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_pending_invitations(self) -> List[Dict]:
        """Get pending connection invitations"""
        # Simulate API call - replace with actual LinkedIn API
        return [
            {'id': 'inv_1', 'from_profile': 'profile_123', 'message': 'Hello!'},
            {'id': 'inv_2', 'from_profile': 'profile_456', 'message': 'Let\'s connect'}
        ]
    
    def _accept_invitation(self, invitation_id: str) -> Dict:
        """Accept a connection invitation"""
        # Simulate API call
        logging.info(f"Accepting invitation: {invitation_id}")
        return {'success': True, 'message': 'Invitation accepted'}
    
    def _send_connection_request(self, profile_id: str, message: str = None) -> Dict:
        """Send connection request to profile"""
        # Simulate API call
        logging.info(f"Sending connection request to: {profile_id}")
        return {'success': True, 'message': 'Connection request sent'}
    
    def _search_profiles(self, criteria: Dict) -> List[Dict]:
        """Search for profiles based on criteria"""
        # Simulate profile search
        return [
            {'id': 'prof_1', 'name': 'John Doe', 'headline': 'CEO at TechCorp'},
            {'id': 'prof_2', 'name': 'Jane Smith', 'headline': 'Founder of StartupXYZ'}
        ]
    
    def _is_successful_profile(self, profile: Dict) -> bool:
        """Determine if profile meets success criteria"""
        success_indicators = ['CEO', 'Founder', 'CTO', 'VP', 'Director', 'Partner']
        headline = profile.get('headline', '').lower()
        return any(indicator.lower() in headline for indicator in success_indicators)
    
    def _follow_profile(self, profile_id: str) -> Dict:
        """Follow a profile"""
        logging.info(f"Following profile: {profile_id}")
        return {'success': True, 'message': 'Profile followed'}
    
    def _search_posts(self, keywords: List[str]) -> List[Dict]:
        """Search for posts containing keywords"""
        # Simulate post search
        return [
            {'id': 'post_1', 'content': 'AI is transforming business...'},
            {'id': 'post_2', 'content': 'Machine learning in marketing...'}
        ]
    
    def _like_post(self, post_id: str) -> Dict:
        """Like a post"""
        logging.info(f"Liking post: {post_id}")
        return {'success': True, 'message': 'Post liked'}
    
    def _comment_on_post(self, post_id: str, comment: str) -> Dict:
        """Comment on a post"""
        logging.info(f"Commenting on post {post_id}: {comment}")
        return {'success': True, 'message': 'Comment added'}
    
    def _generate_intelligent_comment(self, post_content: str) -> Optional[str]:
        """Generate relevant comment for a post"""
        try:
            from gemini_service import generate_linkedin_post
            
            comment_prompt = f"Generate a brief, professional comment (max 50 words) for this LinkedIn post: {post_content[:200]}"
            comment = generate_linkedin_post(comment_prompt)
            
            # Keep comments short and professional
            if len(comment) > 100:
                comment = comment[:97] + "..."
            
            return comment
            
        except Exception as e:
            logging.error(f"Error generating comment: {str(e)}")
            return None
    
    def _extract_marketing_angles(self, pdf_content: str, product_info: Dict) -> List[str]:
        """Extract different marketing angles from PDF content"""
        angles = [
            "Product benefits and features",
            "Customer success stories",
            "Industry trends and insights",
            "Problem-solution positioning",
            "Competitive advantages",
            "Use cases and applications"
        ]
        
        # Could use AI to extract more specific angles from PDF content
        return angles[:4]  # Limit to 4 posts initially

# Global automation instance
linkedin_automation = LinkedInAutomation()