import os
import logging
import requests
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
from linkedin_service import linkedin_service
from models import User, AutomationRule, ActionLog, MarketingCampaign, Post
from extensions import db

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
        self.logger = logging.getLogger(__name__)
        self.daily_limits = {
            'connections': 100,  # LinkedIn daily limit
            'follows': 150,
            'likes': 300,
            'comments': 50,
            'messages': 20
        }
        
    def get_daily_action_count(self, action_type: str) -> int:
        """Get today's action count from database"""
        try:
            user = User.get_default_user()
            today = datetime.utcnow().date()
            
            count = ActionLog.query.filter(
                ActionLog.user_id == user.id,
                ActionLog.action_type == action_type,
                ActionLog.created_at >= today,
                ActionLog.status == 'success'
            ).count()
            
            return count
        except Exception as e:
            self.logger.error(f"Error getting daily action count: {str(e)}")
            return 0
    
    def log_action(self, action_type: str, target_profile_id: str = None, 
                   target_profile_name: str = None, status: str = 'success', 
                   error_message: str = None, automation_rule_id: int = None) -> None:
        """Log automation action to database"""
        try:
            user = User.get_default_user()
            
            action_log = ActionLog(
                user_id=user.id,
                automation_rule_id=automation_rule_id,
                action_type=action_type,
                target_profile_id=target_profile_id,
                target_profile_name=target_profile_name,
                status=status,
                error_message=error_message
            )
            
            db.session.add(action_log)
            db.session.commit()
            
        except Exception as e:
            self.logger.error(f"Error logging action: {str(e)}")
    
    def auto_accept_connections(self) -> Dict:
        """Accept all pending connection requests"""
        try:
            if not self.access_token:
                return {'success': False, 'message': 'LinkedIn access token required'}
            
            current_count = self.get_daily_action_count('connections')
            if current_count >= self.daily_limits['connections']:
                return {
                    'success': False,
                    'message': f'Daily connection limit reached ({self.daily_limits["connections"]})'
                }
            
            # Get pending invitations from LinkedIn API
            pending_invitations = self._get_pending_invitations()
            accepted_count = 0
            
            for invitation in pending_invitations:
                if current_count + accepted_count >= self.daily_limits['connections']:
                    break
                    
                result = self._accept_invitation(invitation['id'])
                if result['success']:
                    accepted_count += 1
                    self.log_action(
                        'connections',
                        invitation.get('from_profile'),
                        invitation.get('from_name', 'Unknown'),
                        'success'
                    )
                    time.sleep(2)  # Rate limiting
                else:
                    self.log_action(
                        'connections',
                        invitation.get('from_profile'),
                        invitation.get('from_name', 'Unknown'),
                        'failed',
                        result.get('error', 'Unknown error')
                    )
            
            return {
                'success': True,
                'accepted_count': accepted_count,
                'message': f'Accepted {accepted_count} connection requests'
            }
            
        except Exception as e:
            self.logger.error(f"Error in auto_accept_connections: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_send_connections(self, target_profiles: List[str], message: str = None, 
                             automation_rule_id: int = None) -> Dict:
        """Send connection requests to target profiles"""
        try:
            if not self.access_token:
                return {'success': False, 'message': 'LinkedIn access token required'}
            
            current_count = self.get_daily_action_count('connections')
            if current_count >= self.daily_limits['connections']:
                return {
                    'success': False,
                    'message': f'Daily connection limit reached ({self.daily_limits["connections"]})'
                }
            
            sent_count = 0
            failed_count = 0
            
            for profile_id in target_profiles:
                if current_count + sent_count >= self.daily_limits['connections']:
                    break
                
                result = self._send_connection_request(profile_id, message)
                if result['success']:
                    sent_count += 1
                    self.log_action(
                        'connections',
                        profile_id,
                        result.get('profile_name', 'Unknown'),
                        'success',
                        automation_rule_id=automation_rule_id
                    )
                else:
                    failed_count += 1
                    self.log_action(
                        'connections',
                        profile_id,
                        result.get('profile_name', 'Unknown'),
                        'failed',
                        result.get('error', 'Unknown error'),
                        automation_rule_id=automation_rule_id
                    )
                
                time.sleep(3)  # Rate limiting
            
            # Update automation rule statistics
            if automation_rule_id:
                rule = AutomationRule.query.get(automation_rule_id)
                if rule:
                    rule.total_actions += sent_count + failed_count
                    rule.successful_actions += sent_count
                    rule.failed_actions += failed_count
                    rule.last_run = datetime.utcnow()
                    db.session.commit()
            
            return {
                'success': True,
                'sent_count': sent_count,
                'failed_count': failed_count,
                'message': f'Sent {sent_count} connection requests, {failed_count} failed'
            }
            
        except Exception as e:
            self.logger.error(f"Error in auto_send_connections: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_follow_successful_people(self, criteria: Dict, automation_rule_id: int = None) -> Dict:
        """Auto-follow profiles based on success criteria"""
        try:
            current_count = self.get_daily_action_count('follows')
            if current_count >= self.daily_limits['follows']:
                return {
                    'success': False,
                    'message': f'Daily follow limit reached ({self.daily_limits["follows"]})'
                }
            
            # Search for profiles matching criteria
            target_profiles = self._search_profiles(criteria)
            followed_count = 0
            
            for profile in target_profiles:
                if current_count + followed_count >= self.daily_limits['follows']:
                    break
                
                # Check if person meets "successful" criteria
                if self._is_successful_profile(profile):
                    result = self._follow_profile(profile['id'])
                    if result['success']:
                        followed_count += 1
                        self.log_action(
                            'follows',
                            profile['id'],
                            profile.get('name', 'Unknown'),
                            'success',
                            automation_rule_id=automation_rule_id
                        )
                        time.sleep(2)
                    else:
                        self.log_action(
                            'follows',
                            profile['id'],
                            profile.get('name', 'Unknown'),
                            'failed',
                            result.get('error', 'Unknown error'),
                            automation_rule_id=automation_rule_id
                        )
            
            # Update automation rule statistics
            if automation_rule_id:
                rule = AutomationRule.query.get(automation_rule_id)
                if rule:
                    rule.total_actions += followed_count
                    rule.successful_actions += followed_count
                    rule.last_run = datetime.utcnow()
                    db.session.commit()
            
            return {
                'success': True,
                'followed_count': followed_count,
                'message': f'Followed {followed_count} successful profiles'
            }
            
        except Exception as e:
            self.logger.error(f"Error in auto_follow_successful_people: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_engage_with_posts(self, keywords: List[str], automation_rule_id: int = None) -> Dict:
        """Auto-like and comment on posts with specific keywords"""
        try:
            likes_count = self.get_daily_action_count('likes')
            comments_count = self.get_daily_action_count('comments')
            
            if likes_count >= self.daily_limits['likes']:
                return {
                    'success': False,
                    'message': f'Daily like limit reached ({self.daily_limits["likes"]})'
                }
            
            engaged_posts = 0
            
            # Search for posts with keywords
            relevant_posts = self._search_posts(keywords)
            
            for post in relevant_posts:
                if likes_count >= self.daily_limits['likes']:
                    break
                
                # Like the post
                like_result = self._like_post(post['id'])
                if like_result['success']:
                    likes_count += 1
                    engaged_posts += 1
                    
                    self.log_action(
                        'likes',
                        post['id'],
                        f"Post by {post.get('author', 'Unknown')}",
                        'success',
                        automation_rule_id=automation_rule_id
                    )
                    
                    # Add intelligent comment if appropriate
                    if comments_count < self.daily_limits['comments']:
                        comment = self._generate_intelligent_comment(post['content'])
                        if comment:
                            comment_result = self._comment_on_post(post['id'], comment)
                            if comment_result['success']:
                                comments_count += 1
                                self.log_action(
                                    'comments',
                                    post['id'],
                                    f"Post by {post.get('author', 'Unknown')}",
                                    'success',
                                    automation_rule_id=automation_rule_id
                                )
                
                time.sleep(3)
            
            # Update automation rule statistics
            if automation_rule_id:
                rule = AutomationRule.query.get(automation_rule_id)
                if rule:
                    rule.total_actions += engaged_posts
                    rule.successful_actions += engaged_posts
                    rule.last_run = datetime.utcnow()
                    db.session.commit()
            
            return {
                'success': True,
                'engaged_posts': engaged_posts,
                'message': f'Engaged with {engaged_posts} relevant posts'
            }
            
        except Exception as e:
            self.logger.error(f"Error in auto_engage_with_posts: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def schedule_marketing_campaign(self, pdf_content: str, product_info: Dict, 
                                   campaign_id: int = None) -> Dict:
        """Create multiple marketing posts from PDF content"""
        try:
            from gemini_service import generate_linkedin_post
            
            # Extract marketing angles from PDF
            marketing_angles = self._extract_marketing_angles(pdf_content, product_info)
            
            scheduled_posts = []
            base_time = datetime.utcnow()
            user = User.get_default_user()
            
            for i, angle in enumerate(marketing_angles):
                # Generate post for each angle
                post_prompt = (
                    f"Create a marketing post about {product_info.get('name', 'our product')} "
                    f"focusing on: {angle}. Include benefits and call-to-action. "
                    f"Make it engaging and professional for LinkedIn."
                )
                
                post_content = generate_linkedin_post(post_prompt)
                
                # Schedule posts at intervals
                schedule_time = base_time + timedelta(hours=i * 4)
                
                # Create post in database
                post = Post(
                    user_id=user.id,
                    content=post_content,
                    schedule_time=schedule_time,
                    status='scheduled',
                    post_type='text'
                )
                
                db.session.add(post)
                
                scheduled_posts.append({
                    'content': post_content,
                    'schedule_time': schedule_time,
                    'marketing_angle': angle,
                    'product': product_info.get('name', 'Product')
                })
            
            # Update campaign statistics
            if campaign_id:
                campaign = MarketingCampaign.query.get(campaign_id)
                if campaign:
                    campaign.total_posts += len(scheduled_posts)
                    db.session.commit()
            
            db.session.commit()
            
            return {
                'success': True,
                'scheduled_posts': len(scheduled_posts),
                'posts': scheduled_posts,
                'message': f'Scheduled {len(scheduled_posts)} marketing posts'
            }
            
        except Exception as e:
            self.logger.error(f"Error in schedule_marketing_campaign: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_automation_statistics(self) -> Dict:
        """Get real automation statistics from database"""
        try:
            user = User.get_default_user()
            today = datetime.utcnow().date()
            week_ago = datetime.utcnow() - timedelta(days=7)
            
            # Today's statistics
            today_stats = {}
            for action_type in ['connections', 'follows', 'likes', 'comments']:
                count = ActionLog.query.filter(
                    ActionLog.user_id == user.id,
                    ActionLog.action_type == action_type,
                    ActionLog.created_at >= today,
                    ActionLog.status == 'success'
                ).count()
                today_stats[action_type] = count
            
            # Weekly statistics
            weekly_stats = {}
            for action_type in ['connections', 'follows', 'likes', 'comments']:
                count = ActionLog.query.filter(
                    ActionLog.user_id == user.id,
                    ActionLog.action_type == action_type,
                    ActionLog.created_at >= week_ago,
                    ActionLog.status == 'success'
                ).count()
                weekly_stats[action_type] = count
            
            # Active automation rules
            active_rules = AutomationRule.query.filter_by(
                user_id=user.id,
                is_active=True
            ).count()
            
            return {
                'success': True,
                'today': today_stats,
                'weekly': weekly_stats,
                'active_rules': active_rules,
                'daily_limits': self.daily_limits
            }
            
        except Exception as e:
            self.logger.error(f"Error getting automation statistics: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_pending_invitations(self) -> List[Dict]:
        """Get pending connection invitations from LinkedIn API"""
        try:
            if not self.access_token:
                return []
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # This is a placeholder - LinkedIn API for invitations requires special permissions
            # For now, return mock data for testing
            return [
                {
                    'id': f'inv_{int(time.time())}',
                    'from_profile': 'profile_123',
                    'from_name': 'John Doe',
                    'message': 'Hello! Let\'s connect'
                }
            ]
            
        except Exception as e:
            self.logger.error(f"Error getting pending invitations: {str(e)}")
            return []
    
    def _accept_invitation(self, invitation_id: str) -> Dict:
        """Accept a connection invitation"""
        try:
            # This would be a real LinkedIn API call
            self.logger.info(f"Accepting invitation: {invitation_id}")
            return {'success': True, 'message': 'Invitation accepted'}
            
        except Exception as e:
            self.logger.error(f"Error accepting invitation: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _send_connection_request(self, profile_id: str, message: str = None) -> Dict:
        """Send connection request to profile"""
        try:
            # This would be a real LinkedIn API call
            self.logger.info(f"Sending connection request to: {profile_id}")
            return {
                'success': True,
                'message': 'Connection request sent',
                'profile_name': f'Profile {profile_id}'
            }
            
        except Exception as e:
            self.logger.error(f"Error sending connection request: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _search_profiles(self, criteria: Dict) -> List[Dict]:
        """Search for profiles based on criteria"""
        try:
            # This would use LinkedIn Search API
            # For now, return mock data
            return [
                {
                    'id': 'prof_1',
                    'name': 'John Doe',
                    'headline': 'CEO at TechCorp',
                    'industry': 'Technology',
                    'location': 'San Francisco'
                },
                {
                    'id': 'prof_2',
                    'name': 'Jane Smith',
                    'headline': 'Founder of StartupXYZ',
                    'industry': 'Software',
                    'location': 'New York'
                }
            ]
            
        except Exception as e:
            self.logger.error(f"Error searching profiles: {str(e)}")
            return []
    
    def _is_successful_profile(self, profile: Dict) -> bool:
        """Determine if profile meets success criteria"""
        success_indicators = [
            'CEO', 'Founder', 'CTO', 'VP', 'Director', 'Partner',
            'President', 'Owner', 'Chief', 'Head of', 'Lead'
        ]
        headline = profile.get('headline', '').lower()
        return any(indicator.lower() in headline for indicator in success_indicators)
    
    def _follow_profile(self, profile_id: str) -> Dict:
        """Follow a profile"""
        try:
            self.logger.info(f"Following profile: {profile_id}")
            return {'success': True, 'message': 'Profile followed'}
            
        except Exception as e:
            self.logger.error(f"Error following profile: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _search_posts(self, keywords: List[str]) -> List[Dict]:
        """Search for posts containing keywords"""
        try:
            # This would use LinkedIn Search API
            # For now, return mock data
            return [
                {
                    'id': 'post_1',
                    'content': 'AI is transforming business operations...',
                    'author': 'Tech Leader'
                },
                {
                    'id': 'post_2',
                    'content': 'Machine learning in marketing is revolutionary...',
                    'author': 'Marketing Expert'
                }
            ]
            
        except Exception as e:
            self.logger.error(f"Error searching posts: {str(e)}")
            return []
    
    def _like_post(self, post_id: str) -> Dict:
        """Like a post"""
        try:
            self.logger.info(f"Liking post: {post_id}")
            return {'success': True, 'message': 'Post liked'}
            
        except Exception as e:
            self.logger.error(f"Error liking post: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _comment_on_post(self, post_id: str, comment: str) -> Dict:
        """Comment on a post"""
        try:
            self.logger.info(f"Commenting on post {post_id}: {comment}")
            return {'success': True, 'message': 'Comment added'}
            
        except Exception as e:
            self.logger.error(f"Error commenting on post: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_intelligent_comment(self, post_content: str) -> Optional[str]:
        """Generate relevant comment for a post"""
        try:
            from gemini_service import generate_linkedin_post
            
            comment_prompt = (
                f"Generate a brief, professional comment (max 50 words) for this LinkedIn post: "
                f"{post_content[:200]}. Make it engaging and add value to the conversation."
            )
            
            comment = generate_linkedin_post(comment_prompt)
            
            # Keep comments short and professional
            if len(comment) > 100:
                comment = comment[:97] + "..."
            
            return comment
            
        except Exception as e:
            self.logger.error(f"Error generating comment: {str(e)}")
            return None
    
    def _extract_marketing_angles(self, pdf_content: str, product_info: Dict) -> List[str]:
        """Extract different marketing angles from PDF content"""
        base_angles = [
            "Product benefits and unique features",
            "Customer success stories and testimonials",
            "Industry trends and market insights",
            "Problem-solution positioning",
            "Competitive advantages and differentiators",
            "Use cases and practical applications"
        ]
        
        # Could use AI to extract more specific angles from PDF content
        # For now, customize based on product info
        if product_info.get('industry'):
            base_angles.append(f"{product_info['industry']} industry applications")
        
        return base_angles[:4]  # Limit to 4 posts initially

# Global automation instance
linkedin_automation = LinkedInAutomation()