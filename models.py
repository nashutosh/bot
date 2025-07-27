from app import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON

class Post(db.Model):
    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    post_type = Column(String(20), default='text')  # 'text' or 'image'
    image_url = Column(String(500))
    schedule_time = Column(DateTime)
    status = Column(String(20), default='draft')  # 'draft', 'scheduled', 'published', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime)
    linkedin_post_id = Column(String(100))
    error_message = Column(Text)

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'post_type': self.post_type,
            'image_url': self.image_url,
            'schedule_time': self.schedule_time.isoformat() if self.schedule_time is not None else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'published_at': self.published_at.isoformat() if self.published_at is not None else None,
            'linkedin_post_id': self.linkedin_post_id,
            'error_message': self.error_message
        }

class UploadedFile(db.Model):
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    extracted_text = Column(Text)
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'summary': self.summary,
            'created_at': self.created_at.isoformat(),
            'processed': self.processed
        }

class AutomationRule(db.Model):
    id = Column(Integer, primary_key=True)
    rule_name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)  # 'auto_connect', 'auto_follow', 'auto_like', 'auto_comment'
    target_criteria = Column(JSON)  # JSON criteria for targeting
    action_limit = Column(Integer, default=50)  # max actions per day
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_executed = Column(DateTime)
    actions_today = Column(Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'rule_name': self.rule_name,
            'rule_type': self.rule_type,
            'target_criteria': self.target_criteria,
            'action_limit': self.action_limit,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'last_executed': self.last_executed.isoformat() if self.last_executed else None,
            'actions_today': self.actions_today
        }

class MarketingCampaign(db.Model):
    id = Column(Integer, primary_key=True)
    campaign_name = Column(String(200), nullable=False)
    product_name = Column(String(200))
    source_pdf_id = Column(Integer)  # Reference to UploadedFile
    campaign_type = Column(String(50), default='product_launch')
    target_keywords = Column(JSON)  # Keywords to target
    posts_generated = Column(Integer, default=0)
    engagement_target = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    start_date = Column(DateTime)
    end_date = Column(DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_name': self.campaign_name,
            'product_name': self.product_name,
            'source_pdf_id': self.source_pdf_id,
            'campaign_type': self.campaign_type,
            'target_keywords': self.target_keywords,
            'posts_generated': self.posts_generated,
            'engagement_target': self.engagement_target,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None
        }

class LinkedInProfile(db.Model):
    id = Column(Integer, primary_key=True)
    linkedin_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(200))
    headline = Column(Text)
    industry = Column(String(100))
    location = Column(String(100))
    connection_status = Column(String(50), default='not_connected')  # 'connected', 'pending', 'not_connected'
    followed = Column(Boolean, default=False)
    last_interaction = Column(DateTime)
    engagement_score = Column(Integer, default=0)  # 0-100 based on interactions
    is_target = Column(Boolean, default=False)  # Marked as target for automation
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'linkedin_id': self.linkedin_id,
            'name': self.name,
            'headline': self.headline,
            'industry': self.industry,
            'location': self.location,
            'connection_status': self.connection_status,
            'followed': self.followed,
            'last_interaction': self.last_interaction.isoformat() if self.last_interaction else None,
            'engagement_score': self.engagement_score,
            'is_target': self.is_target,
            'created_at': self.created_at.isoformat()
        }
