from app import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean

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
