from app import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
import json

class Post(db.Model):
    """LinkedIn post model"""
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    content = Column(Text, nullable=False)
    post_type = Column(String(20), default='text')  # 'text', 'image', 'video', 'article'
    image_url = Column(String(500))
    video_url = Column(String(500))
    article_url = Column(String(500))
    hashtags = Column(JSON)  # Store hashtags as JSON array
    mentions = Column(JSON)  # Store mentions as JSON array
    schedule_time = Column(DateTime)
    status = Column(String(20), default='draft')  # 'draft', 'scheduled', 'published', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    linkedin_post_id = Column(String(100))
    linkedin_url = Column(String(500))
    error_message = Column(Text)
    
    # Engagement metrics
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    impressions_count = Column(Integer, default=0)
    last_metrics_update = Column(DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'post_type': self.post_type,
            'image_url': self.image_url,
            'video_url': self.video_url,
            'article_url': self.article_url,
            'hashtags': self.hashtags or [],
            'mentions': self.mentions or [],
            'schedule_time': self.schedule_time.isoformat() if self.schedule_time else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'linkedin_post_id': self.linkedin_post_id,
            'linkedin_url': self.linkedin_url,
            'error_message': self.error_message,
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'shares_count': self.shares_count,
            'impressions_count': self.impressions_count,
            'last_metrics_update': self.last_metrics_update.isoformat() if self.last_metrics_update else None
        }

class UploadedFile(db.Model):
    """File upload model"""
    __tablename__ = 'uploaded_files'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    file_type = Column(String(50))  # 'pdf', 'image', 'document', etc.
    extracted_text = Column(Text)
    summary = Column(Text)
    keywords = Column(JSON)  # Extracted keywords
    created_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)
    processing_status = Column(String(20), default='pending')  # 'pending', 'processing', 'completed', 'failed'
    processing_error = Column(Text)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'file_type': self.file_type,
            'summary': self.summary,
            'keywords': self.keywords or [],
            'created_at': self.created_at.isoformat(),
            'processed': self.processed,
            'processing_status': self.processing_status,
            'processing_error': self.processing_error
        }

class AutomationRule(db.Model):
    """Automation rules for LinkedIn activities"""
    __tablename__ = 'automation_rules'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # 'auto_connect', 'auto_follow', 'auto_like', 'auto_comment', 'auto_message'
    target_criteria = Column(JSON)  # Targeting criteria as JSON
    action_template = Column(Text)  # Template for messages/comments
    daily_limit = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run = Column(DateTime)
    
    # Statistics
    total_actions = Column(Integer, default=0)
    successful_actions = Column(Integer, default=0)
    failed_actions = Column(Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'rule_type': self.rule_type,
            'target_criteria': self.target_criteria or {},
            'action_template': self.action_template,
            'daily_limit': self.daily_limit,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'total_actions': self.total_actions,
            'successful_actions': self.successful_actions,
            'failed_actions': self.failed_actions
        }

class MarketingCampaign(db.Model):
    """Marketing campaign model"""
    __tablename__ = 'marketing_campaigns'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    campaign_type = Column(String(50))  # 'content_series', 'lead_generation', 'brand_awareness'
    status = Column(String(20), default='draft')  # 'draft', 'active', 'paused', 'completed'
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    target_audience = Column(JSON)  # Audience targeting criteria
    content_strategy = Column(JSON)  # Content strategy details
    kpis = Column(JSON)  # Key performance indicators
    budget = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Campaign metrics
    total_posts = Column(Integer, default=0)
    total_engagement = Column(Integer, default=0)
    total_reach = Column(Integer, default=0)
    total_leads = Column(Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'campaign_type': self.campaign_type,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'target_audience': self.target_audience or {},
            'content_strategy': self.content_strategy or {},
            'kpis': self.kpis or {},
            'budget': self.budget,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'total_posts': self.total_posts,
            'total_engagement': self.total_engagement,
            'total_reach': self.total_reach,
            'total_leads': self.total_leads
        }

class LinkedInProfile(db.Model):
    """LinkedIn profile information"""
    __tablename__ = 'linkedin_profiles'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    linkedin_id = Column(String(100), unique=True, nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    headline = Column(String(200))
    summary = Column(Text)
    industry = Column(String(100))
    location = Column(String(100))
    profile_picture_url = Column(String(500))
    public_profile_url = Column(String(500))
    connections_count = Column(Integer)
    followers_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync = Column(DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'linkedin_id': self.linkedin_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'headline': self.headline,
            'summary': self.summary,
            'industry': self.industry,
            'location': self.location,
            'profile_picture_url': self.profile_picture_url,
            'public_profile_url': self.public_profile_url,
            'connections_count': self.connections_count,
            'followers_count': self.followers_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_sync': self.last_sync.isoformat() if self.last_sync else None
        }

class ActionLog(db.Model):
    """Log of automation actions"""
    __tablename__ = 'action_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    automation_rule_id = Column(Integer, ForeignKey('automation_rules.id'))
    action_type = Column(String(50), nullable=False)
    target_profile_id = Column(String(100))
    target_profile_name = Column(String(100))
    action_data = Column(JSON)  # Additional action data
    status = Column(String(20))  # 'success', 'failed', 'pending'
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'automation_rule_id': self.automation_rule_id,
            'action_type': self.action_type,
            'target_profile_id': self.target_profile_id,
            'target_profile_name': self.target_profile_name,
            'action_data': self.action_data or {},
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat()
        }
