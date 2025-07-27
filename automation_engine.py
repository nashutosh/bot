import os
import logging
import asyncio
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import json
from extensions import db
from models import User, Post, MarketingCampaign, AutomationRule, ActionLog
from gemini_service import generate_linkedin_post
from image_generation_service import image_service
from linkedin_service import linkedin_service

logger = logging.getLogger(__name__)

class AutomationStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class TargetCategory(Enum):
    BIG_CLIENTS = "big_clients"
    CMOS = "cmos"
    STARTUP_FOUNDERS = "startup_founders"
    CTOS = "ctos"
    SOFTWARE_ENGINEERS = "software_engineers"
    INVESTORS = "investors"

@dataclass
class CampaignConfig:
    name: str
    target_audience: Dict[str, Any]
    content_themes: List[str]
    posting_schedule: Dict[str, Any]
    duration_days: int
    daily_post_limit: int
    engagement_goals: Dict[str, float]

@dataclass
class AutoFollowConfig:
    categories: List[TargetCategory]
    daily_limit: int
    connection_message_template: str
    target_criteria: Dict[str, Any]

class LinkedInAutomationEngine:
    """Advanced LinkedIn automation engine with AI-powered campaign generation and optimization"""
    
    def __init__(self):
        self.daily_limits = {
            'connections': 100,
            'follows': 150,
            'likes': 300,
            'comments': 50,
            'messages': 20,
            'posts': 5
        }
        self.active_campaigns = {}
        self.automation_rules = {}
        
    async def launch_automated_campaign(self, user_id: int, campaign_config: CampaignConfig) -> Dict[str, Any]:
        """Launch a fully automated marketing campaign"""
        try:
            logger.info(f"Launching automated campaign for user {user_id}: {campaign_config.name}")
            
            # Create campaign in database
            campaign = MarketingCampaign(
                user_id=user_id,
                name=campaign_config.name,
                description=f"AI-generated campaign: {campaign_config.name}",
                campaign_type='automated_marketing',
                status='active',
                target_audience=campaign_config.target_audience,
                content_strategy={
                    'themes': campaign_config.content_themes,
                    'schedule': campaign_config.posting_schedule,
                    'daily_limit': campaign_config.daily_post_limit
                },
                kpis=campaign_config.engagement_goals,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=campaign_config.duration_days)
            )
            
            db.session.add(campaign)
            db.session.commit()
            
            # Generate initial content batch
            initial_content = await self._generate_campaign_content_batch(
                user_id, campaign_config, batch_size=7
            )
            
            # Schedule posts across the week
            scheduled_posts = await self._schedule_campaign_posts(
                user_id, campaign.id, initial_content, campaign_config.posting_schedule
            )
            
            # Start background automation
            self.active_campaigns[campaign.id] = {
                'config': campaign_config,
                'status': AutomationStatus.ACTIVE,
                'scheduled_posts': scheduled_posts,
                'created_at': datetime.utcnow()
            }
            
            # Launch autonomous execution
            asyncio.create_task(self._run_campaign_automation(campaign.id, user_id))
            
            return {
                'success': True,
                'campaign_id': campaign.id,
                'scheduled_posts': len(scheduled_posts),
                'message': f'Campaign "{campaign_config.name}" launched successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to launch automated campaign: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _generate_campaign_content_batch(self, user_id: int, config: CampaignConfig, 
                                             batch_size: int = 7) -> List[Dict[str, Any]]:
        """Generate a batch of content for the campaign"""
        content_batch = []
        
        try:
            # Get user's uploaded videos/media for inspiration
            user_media = await self._get_user_media(user_id)
            
            for i in range(batch_size):
                # Rotate through themes
                theme = config.content_themes[i % len(config.content_themes)]
                
                # Generate content prompt based on theme and user media
                content_prompt = await self._create_content_prompt(theme, config.target_audience, user_media)
                
                # Generate LinkedIn post content
                post_content = generate_linkedin_post(content_prompt)
                
                # Generate accompanying image
                image_prompt = f"{theme} professional LinkedIn post image, {config.target_audience.get('industry', 'business')}"
                image_result = await image_service.generate_image_async(image_prompt, 'professional')
                
                # Generate hashtags and optimize content
                optimized_content = await self._optimize_content_for_engagement(
                    post_content, theme, config.target_audience
                )
                
                content_item = {
                    'content': optimized_content['content'],
                    'hashtags': optimized_content['hashtags'],
                    'image_url': image_result.get('image_url') if image_result['success'] else None,
                    'theme': theme,
                    'optimal_time': await self._predict_optimal_posting_time(user_id),
                    'expected_engagement': optimized_content.get('predicted_engagement', 0)
                }
                
                content_batch.append(content_item)
                
                # Add delay to avoid rate limiting
                await asyncio.sleep(2)
            
            return content_batch
            
        except Exception as e:
            logger.error(f"Failed to generate content batch: {str(e)}")
            return []
    
    async def _schedule_campaign_posts(self, user_id: int, campaign_id: int, 
                                     content_batch: List[Dict], schedule_config: Dict) -> List[int]:
        """Schedule posts across optimal times"""
        scheduled_posts = []
        
        try:
            # Get optimal posting times for the week
            optimal_times = await self._get_weekly_optimal_times(user_id, schedule_config)
            
            for i, content_item in enumerate(content_batch):
                if i < len(optimal_times):
                    schedule_time = optimal_times[i]
                    
                    # Create scheduled post
                    post = Post(
                        user_id=user_id,
                        content=content_item['content'],
                        hashtags=content_item['hashtags'],
                        image_url=content_item['image_url'],
                        post_type='image' if content_item['image_url'] else 'text',
                        schedule_time=schedule_time,
                        status='scheduled'
                    )
                    
                    db.session.add(post)
                    db.session.commit()
                    
                    scheduled_posts.append(post.id)
            
            return scheduled_posts
            
        except Exception as e:
            logger.error(f"Failed to schedule campaign posts: {str(e)}")
            return []
    
    async def setup_auto_follow_system(self, user_id: int, config: AutoFollowConfig) -> Dict[str, Any]:
        """Set up automated following system for target categories"""
        try:
            # Create automation rules for each target category
            created_rules = []
            
            for category in config.categories:
                target_criteria = self._get_target_criteria_for_category(category)
                
                rule = AutomationRule(
                    user_id=user_id,
                    name=f"Auto Follow - {category.value.replace('_', ' ').title()}",
                    rule_type='auto_follow',
                    target_criteria=target_criteria,
                    action_template=config.connection_message_template,
                    daily_limit=config.daily_limit // len(config.categories),
                    is_active=True
                )
                
                db.session.add(rule)
                created_rules.append(rule)
            
            db.session.commit()
            
            # Start autonomous execution
            for rule in created_rules:
                asyncio.create_task(self._run_auto_follow_automation(rule.id, user_id))
            
            return {
                'success': True,
                'rules_created': len(created_rules),
                'categories': [cat.value for cat in config.categories],
                'daily_limit': config.daily_limit
            }
            
        except Exception as e:
            logger.error(f"Failed to setup auto-follow system: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_target_criteria_for_category(self, category: TargetCategory) -> Dict[str, Any]:
        """Get targeting criteria for specific category"""
        criteria_map = {
            TargetCategory.BIG_CLIENTS: {
                'company_size': ['1001-5000', '5001-10000', '10000+'],
                'industries': ['Technology', 'Finance', 'Healthcare', 'Manufacturing'],
                'job_titles': ['CEO', 'President', 'VP', 'Director', 'Head of'],
                'keywords': ['enterprise', 'corporate', 'large scale', 'fortune 500']
            },
            TargetCategory.CMOS: {
                'job_titles': ['CMO', 'Chief Marketing Officer', 'VP Marketing', 'Marketing Director'],
                'industries': ['Technology', 'SaaS', 'E-commerce', 'Marketing'],
                'keywords': ['marketing strategy', 'brand management', 'digital marketing', 'growth']
            },
            TargetCategory.STARTUP_FOUNDERS: {
                'job_titles': ['Founder', 'Co-Founder', 'CEO', 'Entrepreneur'],
                'company_size': ['1-10', '11-50', '51-200'],
                'industries': ['Technology', 'SaaS', 'Fintech', 'Healthcare Tech'],
                'keywords': ['startup', 'entrepreneur', 'innovation', 'disruption', 'scaling']
            },
            TargetCategory.CTOS: {
                'job_titles': ['CTO', 'Chief Technology Officer', 'VP Engineering', 'Tech Lead'],
                'industries': ['Technology', 'Software', 'SaaS', 'AI'],
                'keywords': ['technology', 'engineering', 'software development', 'architecture']
            },
            TargetCategory.SOFTWARE_ENGINEERS: {
                'job_titles': ['Software Engineer', 'Developer', 'Programmer', 'Tech Lead', 'Engineering Manager'],
                'industries': ['Technology', 'Software', 'SaaS'],
                'keywords': ['programming', 'coding', 'software development', 'engineering']
            },
            TargetCategory.INVESTORS: {
                'job_titles': ['Investor', 'Partner', 'Managing Director', 'Investment Manager'],
                'industries': ['Venture Capital', 'Private Equity', 'Investment Banking', 'Finance'],
                'keywords': ['investment', 'funding', 'venture capital', 'portfolio']
            }
        }
        
        return criteria_map.get(category, {})
    
    async def optimize_engagement_automatically(self, user_id: int) -> Dict[str, Any]:
        """Automatically optimize engagement based on performance data"""
        try:
            # Analyze recent post performance
            performance_analysis = await self._analyze_post_performance(user_id)
            
            # Generate optimization recommendations
            optimizations = await self._generate_optimization_recommendations(performance_analysis)
            
            # Apply automatic optimizations
            applied_optimizations = []
            
            for optimization in optimizations['recommendations']:
                if optimization['auto_apply']:
                    result = await self._apply_optimization(user_id, optimization)
                    if result['success']:
                        applied_optimizations.append(optimization['type'])
            
            # Generate improved content variants for low-performing posts
            if performance_analysis['low_performing_posts']:
                improved_variants = await self._generate_improved_content_variants(
                    user_id, performance_analysis['low_performing_posts']
                )
                
                # Schedule improved variants
                for variant in improved_variants:
                    await self._schedule_improved_post(user_id, variant)
            
            return {
                'success': True,
                'optimizations_applied': applied_optimizations,
                'performance_score': performance_analysis['overall_score'],
                'recommendations': optimizations['recommendations'],
                'improved_variants_created': len(improved_variants) if 'improved_variants' in locals() else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to optimize engagement: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def boost_conversation_engagement(self, user_id: int) -> Dict[str, Any]:
        """Automatically boost conversations and engagement"""
        try:
            actions_taken = []
            
            # Auto-comment on trending posts in user's niche
            trending_posts = await self._find_trending_posts_in_niche(user_id)
            comment_results = await self._auto_comment_on_trending_posts(user_id, trending_posts[:5])
            actions_taken.extend(comment_results)
            
            # Auto-reply to responses under user's posts
            user_posts_with_responses = await self._get_posts_with_new_responses(user_id)
            reply_results = await self._auto_reply_to_responses(user_id, user_posts_with_responses)
            actions_taken.extend(reply_results)
            
            # Suggest people to tag in future posts
            tag_suggestions = await self._generate_tagging_suggestions(user_id)
            
            # Like and engage with network's content
            network_engagement = await self._engage_with_network_content(user_id)
            actions_taken.extend(network_engagement)
            
            return {
                'success': True,
                'actions_taken': len(actions_taken),
                'trending_posts_commented': len([a for a in actions_taken if a['type'] == 'comment']),
                'replies_sent': len([a for a in actions_taken if a['type'] == 'reply']),
                'tag_suggestions': tag_suggestions,
                'network_engagements': len([a for a in actions_taken if a['type'] == 'like'])
            }
            
        except Exception as e:
            logger.error(f"Failed to boost conversation engagement: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _run_campaign_automation(self, campaign_id: int, user_id: int):
        """Run autonomous campaign execution in background"""
        try:
            while campaign_id in self.active_campaigns:
                campaign_data = self.active_campaigns[campaign_id]
                
                if campaign_data['status'] != AutomationStatus.ACTIVE:
                    break
                
                # Check if it's time to publish scheduled posts
                await self._check_and_publish_scheduled_posts(campaign_id, user_id)
                
                # Generate new content if running low
                await self._replenish_campaign_content(campaign_id, user_id)
                
                # Analyze performance and optimize
                await self._analyze_and_optimize_campaign(campaign_id, user_id)
                
                # Engage with audience
                await self._campaign_audience_engagement(campaign_id, user_id)
                
                # Wait before next cycle (every 30 minutes)
                await asyncio.sleep(1800)
                
        except Exception as e:
            logger.error(f"Campaign automation error: {str(e)}")
            if campaign_id in self.active_campaigns:
                self.active_campaigns[campaign_id]['status'] = AutomationStatus.FAILED
    
    async def _run_auto_follow_automation(self, rule_id: int, user_id: int):
        """Run autonomous auto-follow system"""
        try:
            while True:
                rule = AutomationRule.query.get(rule_id)
                if not rule or not rule.is_active:
                    break
                
                # Check daily limits
                today_actions = self._get_today_action_count(user_id, 'auto_follow')
                if today_actions >= rule.daily_limit:
                    # Wait until next day
                    await asyncio.sleep(3600)  # Check every hour
                    continue
                
                # Find target profiles
                target_profiles = await self._find_target_profiles(rule.target_criteria)
                
                # Send connection requests
                for profile in target_profiles[:min(10, rule.daily_limit - today_actions)]:
                    try:
                        # Personalize connection message
                        message = self._personalize_connection_message(
                            rule.action_template, profile
                        )
                        
                        # Send connection request
                        result = await linkedin_service.send_connection_request(
                            profile['id'], message
                        )
                        
                        # Log action
                        self._log_automation_action(
                            user_id, rule_id, 'auto_follow', profile['id'], 
                            result['success'], result.get('error')
                        )
                        
                        if result['success']:
                            rule.successful_actions += 1
                        else:
                            rule.failed_actions += 1
                        
                        rule.total_actions += 1
                        
                        # Rate limiting
                        await asyncio.sleep(random.randint(30, 120))  # 30-120 seconds between requests
                        
                    except Exception as e:
                        logger.error(f"Auto-follow action failed: {str(e)}")
                        continue
                
                db.session.commit()
                
                # Wait before next batch (2-4 hours)
                await asyncio.sleep(random.randint(7200, 14400))
                
        except Exception as e:
            logger.error(f"Auto-follow automation error: {str(e)}")
    
    # Helper methods for content optimization and analysis
    async def _analyze_post_performance(self, user_id: int) -> Dict[str, Any]:
        """Analyze recent post performance"""
        try:
            recent_posts = Post.query.filter_by(user_id=user_id).filter(
                Post.created_at >= datetime.utcnow() - timedelta(days=30)
            ).all()
            
            if not recent_posts:
                return {'overall_score': 0, 'low_performing_posts': []}
            
            total_engagement = sum(
                post.likes_count + post.comments_count + post.shares_count 
                for post in recent_posts
            )
            
            avg_engagement = total_engagement / len(recent_posts)
            
            # Identify low-performing posts (below 50% of average)
            low_performing = [
                post for post in recent_posts 
                if (post.likes_count + post.comments_count + post.shares_count) < avg_engagement * 0.5
            ]
            
            # Calculate overall performance score
            overall_score = min(100, (avg_engagement / 10) * 100)  # Normalize to 0-100
            
            return {
                'overall_score': overall_score,
                'avg_engagement': avg_engagement,
                'total_posts': len(recent_posts),
                'low_performing_posts': [post.to_dict() for post in low_performing],
                'best_performing_posts': sorted(
                    recent_posts, 
                    key=lambda p: p.likes_count + p.comments_count + p.shares_count,
                    reverse=True
                )[:5]
            }
            
        except Exception as e:
            logger.error(f"Performance analysis failed: {str(e)}")
            return {'overall_score': 0, 'low_performing_posts': []}
    
    def _log_automation_action(self, user_id: int, rule_id: int, action_type: str, 
                             target_id: str, success: bool, error: str = None):
        """Log automation action for audit trail"""
        try:
            action_log = ActionLog(
                user_id=user_id,
                automation_rule_id=rule_id,
                action_type=action_type,
                target_profile_id=target_id,
                status='success' if success else 'failed',
                error_message=error
            )
            
            db.session.add(action_log)
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Failed to log automation action: {str(e)}")
    
    def _get_today_action_count(self, user_id: int, action_type: str) -> int:
        """Get count of actions performed today"""
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            count = ActionLog.query.filter_by(
                user_id=user_id,
                action_type=action_type
            ).filter(
                ActionLog.created_at >= today_start
            ).count()
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to get today's action count: {str(e)}")
            return 0
    
    async def _create_content_prompt(self, theme: str, target_audience: Dict, user_media: List) -> str:
        """Create AI prompt for content generation"""
        audience_desc = f"{target_audience.get('industries', ['Business'])[0]} professionals"
        
        prompt = f"""Create a LinkedIn post about {theme} for {audience_desc}. 
        
        The post should:
        - Be engaging and professional
        - Include actionable insights
        - Use a conversational tone
        - Be optimized for LinkedIn engagement
        - Include relevant industry terminology
        
        Target audience details: {json.dumps(target_audience, indent=2)}
        
        Make it authentic and valuable."""
        
        return prompt
    
    async def _optimize_content_for_engagement(self, content: str, theme: str, 
                                             target_audience: Dict) -> Dict[str, Any]:
        """Optimize content for maximum engagement"""
        try:
            # Generate relevant hashtags
            hashtags = await self._generate_relevant_hashtags(theme, target_audience)
            
            # Add engagement-boosting elements
            optimized_content = content
            
            # Add call-to-action if missing
            if '?' not in content and 'What' not in content:
                cta_options = [
                    "\n\nWhat's your experience with this?",
                    "\n\nHow do you handle this in your organization?",
                    "\n\nWhat would you add to this list?",
                    "\n\nShare your thoughts below!"
                ]
                optimized_content += random.choice(cta_options)
            
            return {
                'content': optimized_content,
                'hashtags': hashtags,
                'predicted_engagement': random.uniform(3.0, 8.5)  # Mock prediction
            }
            
        except Exception as e:
            logger.error(f"Content optimization failed: {str(e)}")
            return {
                'content': content,
                'hashtags': [],
                'predicted_engagement': 2.0
            }
    
    async def _generate_relevant_hashtags(self, theme: str, target_audience: Dict) -> List[str]:
        """Generate relevant hashtags for the content"""
        base_hashtags = ['#LinkedIn', '#Professional', '#Business']
        
        theme_hashtags = {
            'AI': ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#Innovation'],
            'Marketing': ['#Marketing', '#DigitalMarketing', '#ContentMarketing', '#Growth'],
            'Leadership': ['#Leadership', '#Management', '#TeamBuilding', '#Success'],
            'Technology': ['#Technology', '#Tech', '#Innovation', '#Digital'],
            'Entrepreneurship': ['#Entrepreneurship', '#Startup', '#Business', '#Innovation']
        }
        
        industry_hashtags = {
            'Technology': ['#TechIndustry', '#SoftwareDevelopment', '#Innovation'],
            'Marketing': ['#MarketingStrategy', '#BrandBuilding', '#CustomerExperience'],
            'Finance': ['#Finance', '#Investment', '#FinTech'],
            'Healthcare': ['#Healthcare', '#HealthTech', '#MedicalInnovation']
        }
        
        # Combine relevant hashtags
        relevant_tags = base_hashtags.copy()
        
        # Add theme-specific hashtags
        for key, tags in theme_hashtags.items():
            if key.lower() in theme.lower():
                relevant_tags.extend(tags[:2])
        
        # Add industry-specific hashtags
        for industry in target_audience.get('industries', []):
            if industry in industry_hashtags:
                relevant_tags.extend(industry_hashtags[industry][:2])
        
        # Remove duplicates and limit to 5-7 hashtags
        unique_tags = list(dict.fromkeys(relevant_tags))
        return unique_tags[:7]

# Global automation engine instance
automation_engine = LinkedInAutomationEngine()