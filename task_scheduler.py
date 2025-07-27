import os
import logging
import asyncio
import schedule
import time
from datetime import datetime, timedelta
from threading import Thread
from typing import Dict, List, Any
from extensions import db
from models import User, Post, MarketingCampaign, AutomationRule
from automation_engine import automation_engine
from linkedin_service import linkedin_service
from app import create_app

logger = logging.getLogger(__name__)

class TaskScheduler:
    """Comprehensive task scheduler for LinkedIn automation"""
    
    def __init__(self):
        self.running = False
        self.scheduler_thread = None
        self.app = None
        
    def start(self):
        """Start the task scheduler"""
        if self.running:
            logger.warning("Task scheduler is already running")
            return
        
        self.running = True
        self.app = create_app()
        
        # Schedule all tasks
        self.schedule_tasks()
        
        # Start scheduler in background thread
        self.scheduler_thread = Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Task scheduler started successfully")
    
    def stop(self):
        """Stop the task scheduler"""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        logger.info("Task scheduler stopped")
    
    def schedule_tasks(self):
        """Schedule all automation tasks"""
        
        # Post publishing tasks (every 5 minutes)
        schedule.every(5).minutes.do(self._check_scheduled_posts)
        
        # Campaign management (every 30 minutes)
        schedule.every(30).minutes.do(self._manage_active_campaigns)
        
        # Engagement optimization (twice daily)
        schedule.every().day.at("09:00").do(self._run_engagement_optimization)
        schedule.every().day.at("17:00").do(self._run_engagement_optimization)
        
        # Auto-follow automation (every 2 hours)
        schedule.every(2).hours.do(self._run_auto_follow_automation)
        
        # Conversation boosting (every 4 hours during business hours)
        schedule.every().day.at("10:00").do(self._boost_conversations)
        schedule.every().day.at("14:00").do(self._boost_conversations)
        schedule.every().day.at("18:00").do(self._boost_conversations)
        
        # Content generation for campaigns (daily at 6 AM)
        schedule.every().day.at("06:00").do(self._generate_campaign_content)
        
        # Analytics and metrics update (every hour)
        schedule.every().hour.do(self._update_metrics)
        
        # Database cleanup (daily at midnight)
        schedule.every().day.at("00:00").do(self._cleanup_database)
        
        # Performance monitoring (every 15 minutes)
        schedule.every(15).minutes.do(self._monitor_performance)
        
        logger.info("All automation tasks scheduled")
    
    def _run_scheduler(self):
        """Run the scheduler loop"""
        with self.app.app_context():
            while self.running:
                try:
                    schedule.run_pending()
                    time.sleep(1)
                except Exception as e:
                    logger.error(f"Scheduler error: {str(e)}")
                    time.sleep(5)  # Wait before retrying
    
    def _check_scheduled_posts(self):
        """Check and publish scheduled posts"""
        try:
            with self.app.app_context():
                # Get posts that are ready to be published
                now = datetime.utcnow()
                scheduled_posts = Post.query.filter(
                    Post.status == 'scheduled',
                    Post.schedule_time <= now
                ).all()
                
                logger.info(f"Found {len(scheduled_posts)} posts ready for publishing")
                
                for post in scheduled_posts:
                    asyncio.run(self._publish_scheduled_post(post))
                    
        except Exception as e:
            logger.error(f"Error checking scheduled posts: {str(e)}")
    
    async def _publish_scheduled_post(self, post: Post):
        """Publish a scheduled post"""
        try:
            post.status = 'publishing'
            db.session.commit()
            
            # Attempt to publish to LinkedIn
            linkedin_result = await linkedin_service.create_post_async(
                content=post.content,
                image_url=post.image_url,
                video_url=post.video_url
            )
            
            if linkedin_result.get('success'):
                post.status = 'published'
                post.published_at = datetime.utcnow()
                post.linkedin_url = linkedin_result.get('post_url')
                logger.info(f"Successfully published post {post.id}")
            else:
                post.status = 'failed'
                post.error_message = linkedin_result.get('error', 'Unknown error')
                logger.error(f"Failed to publish post {post.id}: {post.error_message}")
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error publishing scheduled post {post.id}: {str(e)}")
            post.status = 'failed'
            post.error_message = str(e)
            db.session.commit()
    
    def _manage_active_campaigns(self):
        """Manage active marketing campaigns"""
        try:
            with self.app.app_context():
                active_campaigns = MarketingCampaign.query.filter_by(status='active').all()
                
                logger.info(f"Managing {len(active_campaigns)} active campaigns")
                
                for campaign in active_campaigns:
                    asyncio.run(self._process_campaign(campaign))
                    
        except Exception as e:
            logger.error(f"Error managing campaigns: {str(e)}")
    
    async def _process_campaign(self, campaign: MarketingCampaign):
        """Process a single campaign"""
        try:
            # Check if campaign has ended
            if campaign.end_date and datetime.utcnow() > campaign.end_date:
                campaign.status = 'completed'
                db.session.commit()
                logger.info(f"Campaign {campaign.id} completed")
                return
            
            # Check if we need to generate more content
            upcoming_posts = Post.query.filter(
                Post.user_id == campaign.user_id,
                Post.status == 'scheduled',
                Post.created_at >= campaign.start_date
            ).count()
            
            # If we have less than 3 scheduled posts, generate more
            if upcoming_posts < 3:
                await self._generate_campaign_content_for_campaign(campaign)
            
            # Update campaign metrics
            await self._update_campaign_metrics(campaign)
            
        except Exception as e:
            logger.error(f"Error processing campaign {campaign.id}: {str(e)}")
    
    async def _generate_campaign_content_for_campaign(self, campaign: MarketingCampaign):
        """Generate content for a specific campaign"""
        try:
            from automation_engine import CampaignConfig
            
            config = CampaignConfig(
                name=campaign.name,
                target_audience=campaign.target_audience,
                content_themes=campaign.content_strategy.get('themes', ['business']),
                posting_schedule=campaign.content_strategy.get('schedule', {}),
                duration_days=30,  # Default
                daily_post_limit=campaign.content_strategy.get('daily_limit', 2),
                engagement_goals=campaign.kpis or {}
            )
            
            # Generate content batch
            content_batch = await automation_engine._generate_campaign_content_batch(
                campaign.user_id, config, batch_size=5
            )
            
            # Schedule the posts
            scheduled_posts = await automation_engine._schedule_campaign_posts(
                campaign.user_id, campaign.id, content_batch, config.posting_schedule
            )
            
            logger.info(f"Generated {len(scheduled_posts)} posts for campaign {campaign.id}")
            
        except Exception as e:
            logger.error(f"Error generating campaign content: {str(e)}")
    
    def _run_engagement_optimization(self):
        """Run engagement optimization for all users"""
        try:
            with self.app.app_context():
                # Get users with active automation
                users_with_automation = User.query.join(AutomationRule).filter(
                    AutomationRule.is_active == True
                ).distinct().all()
                
                logger.info(f"Running engagement optimization for {len(users_with_automation)} users")
                
                for user in users_with_automation:
                    asyncio.run(automation_engine.optimize_engagement_automatically(user.id))
                    
        except Exception as e:
            logger.error(f"Error in engagement optimization: {str(e)}")
    
    def _run_auto_follow_automation(self):
        """Run auto-follow automation for all active rules"""
        try:
            with self.app.app_context():
                active_rules = AutomationRule.query.filter(
                    AutomationRule.is_active == True,
                    AutomationRule.rule_type == 'auto_follow'
                ).all()
                
                logger.info(f"Running auto-follow for {len(active_rules)} rules")
                
                for rule in active_rules:
                    # Check daily limits
                    today_actions = automation_engine._get_today_action_count(
                        rule.user_id, 'auto_follow'
                    )
                    
                    if today_actions < rule.daily_limit:
                        # Run auto-follow for this rule
                        asyncio.create_task(
                            automation_engine._run_auto_follow_automation(rule.id, rule.user_id)
                        )
                    
        except Exception as e:
            logger.error(f"Error in auto-follow automation: {str(e)}")
    
    def _boost_conversations(self):
        """Boost conversations for all users"""
        try:
            with self.app.app_context():
                # Get users with recent activity
                recent_users = User.query.join(Post).filter(
                    Post.created_at >= datetime.utcnow() - timedelta(days=7)
                ).distinct().all()
                
                logger.info(f"Boosting conversations for {len(recent_users)} users")
                
                for user in recent_users:
                    asyncio.run(automation_engine.boost_conversation_engagement(user.id))
                    
        except Exception as e:
            logger.error(f"Error boosting conversations: {str(e)}")
    
    def _generate_campaign_content(self):
        """Generate content for all active campaigns"""
        try:
            with self.app.app_context():
                active_campaigns = MarketingCampaign.query.filter_by(status='active').all()
                
                logger.info(f"Generating content for {len(active_campaigns)} campaigns")
                
                for campaign in active_campaigns:
                    asyncio.run(self._generate_campaign_content_for_campaign(campaign))
                    
        except Exception as e:
            logger.error(f"Error generating campaign content: {str(e)}")
    
    def _update_metrics(self):
        """Update metrics for posts and campaigns"""
        try:
            with self.app.app_context():
                # Update post metrics
                recent_posts = Post.query.filter(
                    Post.status == 'published',
                    Post.published_at >= datetime.utcnow() - timedelta(days=7)
                ).all()
                
                for post in recent_posts:
                    asyncio.run(self._update_post_metrics(post))
                
                # Update campaign metrics
                active_campaigns = MarketingCampaign.query.filter_by(status='active').all()
                for campaign in active_campaigns:
                    asyncio.run(self._update_campaign_metrics(campaign))
                    
        except Exception as e:
            logger.error(f"Error updating metrics: {str(e)}")
    
    async def _update_post_metrics(self, post: Post):
        """Update metrics for a single post"""
        try:
            if not post.linkedin_url:
                return
            
            # Get metrics from LinkedIn API
            metrics = await linkedin_service.get_post_metrics(post.linkedin_url)
            
            if metrics:
                post.likes_count = metrics.get('likes', 0)
                post.comments_count = metrics.get('comments', 0)
                post.shares_count = metrics.get('shares', 0)
                post.impressions_count = metrics.get('impressions', 0)
                post.last_metrics_update = datetime.utcnow()
                
                db.session.commit()
                
        except Exception as e:
            logger.error(f"Error updating post metrics for {post.id}: {str(e)}")
    
    async def _update_campaign_metrics(self, campaign: MarketingCampaign):
        """Update metrics for a campaign"""
        try:
            # Get all posts for this campaign
            campaign_posts = Post.query.filter(
                Post.user_id == campaign.user_id,
                Post.created_at >= campaign.start_date
            ).all()
            
            if campaign.end_date:
                campaign_posts = [p for p in campaign_posts if p.created_at <= campaign.end_date]
            
            # Calculate campaign metrics
            total_likes = sum(post.likes_count or 0 for post in campaign_posts)
            total_comments = sum(post.comments_count or 0 for post in campaign_posts)
            total_shares = sum(post.shares_count or 0 for post in campaign_posts)
            total_impressions = sum(post.impressions_count or 0 for post in campaign_posts)
            
            # Update campaign metrics
            campaign.total_reach = total_impressions
            campaign.total_engagement = total_likes + total_comments + total_shares
            campaign.posts_count = len([p for p in campaign_posts if p.status == 'published'])
            
            # Calculate ROI and other KPIs
            if campaign.budget and campaign.budget > 0:
                campaign.roi = (campaign.total_engagement / campaign.budget) * 100
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error updating campaign metrics for {campaign.id}: {str(e)}")
    
    def _cleanup_database(self):
        """Clean up old data and optimize database"""
        try:
            with self.app.app_context():
                # Delete old failed posts (older than 30 days)
                old_failed_posts = Post.query.filter(
                    Post.status == 'failed',
                    Post.created_at < datetime.utcnow() - timedelta(days=30)
                ).all()
                
                for post in old_failed_posts:
                    db.session.delete(post)
                
                # Archive completed campaigns (older than 90 days)
                old_campaigns = MarketingCampaign.query.filter(
                    MarketingCampaign.status == 'completed',
                    MarketingCampaign.end_date < datetime.utcnow() - timedelta(days=90)
                ).all()
                
                for campaign in old_campaigns:
                    campaign.status = 'archived'
                
                # Clean up old action logs (older than 60 days)
                from models import ActionLog
                old_logs = ActionLog.query.filter(
                    ActionLog.created_at < datetime.utcnow() - timedelta(days=60)
                ).all()
                
                for log in old_logs:
                    db.session.delete(log)
                
                db.session.commit()
                logger.info("Database cleanup completed")
                
        except Exception as e:
            logger.error(f"Error in database cleanup: {str(e)}")
    
    def _monitor_performance(self):
        """Monitor system performance and health"""
        try:
            with self.app.app_context():
                # Check for stuck posts
                stuck_posts = Post.query.filter(
                    Post.status == 'publishing',
                    Post.updated_at < datetime.utcnow() - timedelta(minutes=30)
                ).all()
                
                for post in stuck_posts:
                    post.status = 'failed'
                    post.error_message = 'Publishing timeout'
                    logger.warning(f"Marked stuck post {post.id} as failed")
                
                # Check for inactive campaigns
                inactive_campaigns = MarketingCampaign.query.filter(
                    MarketingCampaign.status == 'active',
                    MarketingCampaign.updated_at < datetime.utcnow() - timedelta(hours=24)
                ).all()
                
                for campaign in inactive_campaigns:
                    logger.warning(f"Campaign {campaign.id} appears inactive")
                
                # Monitor automation rule performance
                underperforming_rules = AutomationRule.query.filter(
                    AutomationRule.is_active == True,
                    AutomationRule.success_rate < 0.5,
                    AutomationRule.total_actions > 10
                ).all()
                
                for rule in underperforming_rules:
                    logger.warning(f"Automation rule {rule.id} has low success rate: {rule.success_rate}")
                
                db.session.commit()
                
        except Exception as e:
            logger.error(f"Error in performance monitoring: {str(e)}")
    
    def add_immediate_task(self, task_func, *args, **kwargs):
        """Add a task to be executed immediately"""
        try:
            with self.app.app_context():
                if asyncio.iscoroutinefunction(task_func):
                    asyncio.run(task_func(*args, **kwargs))
                else:
                    task_func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error executing immediate task: {str(e)}")
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        return {
            'running': self.running,
            'scheduled_jobs': len(schedule.jobs),
            'next_run': str(schedule.next_run()) if schedule.jobs else None,
            'thread_alive': self.scheduler_thread.is_alive() if self.scheduler_thread else False
        }

# Global scheduler instance
task_scheduler = TaskScheduler()

def start_scheduler():
    """Start the global task scheduler"""
    task_scheduler.start()

def stop_scheduler():
    """Stop the global task scheduler"""
    task_scheduler.stop()

# CLI commands for scheduler management
import click

@click.group()
def scheduler_cli():
    """Task scheduler management commands"""
    pass

@scheduler_cli.command()
def start():
    """Start the task scheduler"""
    click.echo("Starting LinkedIn Marketing Agent Task Scheduler...")
    start_scheduler()
    click.echo("Task scheduler started successfully!")
    
    try:
        # Keep the scheduler running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        click.echo("\nShutting down task scheduler...")
        stop_scheduler()
        click.echo("Task scheduler stopped.")

@scheduler_cli.command()
def status():
    """Check scheduler status"""
    status = task_scheduler.get_scheduler_status()
    click.echo(f"Scheduler Status: {'Running' if status['running'] else 'Stopped'}")
    click.echo(f"Scheduled Jobs: {status['scheduled_jobs']}")
    click.echo(f"Next Run: {status['next_run']}")
    click.echo(f"Thread Alive: {status['thread_alive']}")

@scheduler_cli.command()
def stop():
    """Stop the task scheduler"""
    click.echo("Stopping task scheduler...")
    stop_scheduler()
    click.echo("Task scheduler stopped.")

if __name__ == '__main__':
    scheduler_cli()