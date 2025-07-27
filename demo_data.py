#!/usr/bin/env python3
"""
Demo Data Generator for LinkedIn Marketing Agent

This script creates sample data to demonstrate the application's features.
Run this after setting up the application to populate it with example content.
"""

import os
import sys
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import User, Post, MarketingCampaign, AutomationRule, UploadedFile

def create_demo_user():
    """Get or create the default user for demo data"""
    demo_user = User.get_default_user()
    
    # Update user info if needed
    if not demo_user.email:
        demo_user.email = 'demo@linkedinagent.com'
        demo_user.first_name = 'LinkedIn'
        demo_user.last_name = 'Agent'
        db.session.commit()
        print("✅ Created demo user (username: demo_user, password: demo123)")
    else:
        print("ℹ️  Demo user already exists")
    
    return demo_user

def create_demo_posts(user):
    """Create sample posts"""
    sample_posts = [
        {
            'content': """🚀 Excited to share our latest breakthrough in AI-powered marketing automation! 

Our new LinkedIn Marketing Agent is revolutionizing how businesses engage with their professional networks. With features like:

✨ AI-generated content that resonates
📊 Smart analytics and insights  
🎯 Targeted automation that respects LinkedIn's guidelines
⚡ Real-time performance tracking

The future of B2B marketing is here, and it's more intelligent than ever.

What's your biggest challenge with LinkedIn marketing? Let's discuss! 👇

#AI #Marketing #LinkedIn #Automation #B2B #TechInnovation""",
            'post_type': 'text',
            'status': 'published',
            'likes_count': 45,
            'comments_count': 12,
            'shares_count': 8,
            'impressions_count': 1250
        },
        {
            'content': """📈 Data-driven insights from our latest LinkedIn campaign:

🎯 Targeted 10,000 decision makers in tech
📊 Achieved 3.2% engagement rate (2x industry average)
💼 Generated 150+ qualified leads
🤝 Secured 25 new business meetings

Key takeaways:
1. Personalization beats generic outreach 10:1
2. Video content drives 5x more engagement
3. Optimal posting time: Tuesdays 9-11 AM
4. Industry-specific hashtags increase reach by 40%

The power of strategic LinkedIn marketing cannot be overstated.

#LinkedInMarketing #B2BLeadGeneration #DataDriven #MarketingROI""",
            'post_type': 'text',
            'status': 'published',
            'likes_count': 67,
            'comments_count': 23,
            'shares_count': 15,
            'impressions_count': 2100
        },
        {
            'content': """🎉 Thrilled to announce our partnership with leading AI companies!

Together, we're building the next generation of intelligent marketing tools that will:

🔮 Predict optimal content timing
🎨 Generate personalized visuals automatically  
📝 Create compelling copy that converts
🤖 Automate relationship building at scale

This collaboration represents a major leap forward in marketing technology.

Stay tuned for exciting updates! 

#Partnership #AI #MarketingTech #Innovation #Automation""",
            'post_type': 'text',
            'status': 'scheduled',
            'schedule_time': datetime.utcnow() + timedelta(days=1),
            'likes_count': 0,
            'comments_count': 0,
            'shares_count': 0,
            'impressions_count': 0
        },
        {
            'content': """💡 5 LinkedIn Marketing Mistakes That Are Costing You Leads:

1️⃣ Generic connection requests (personalize every outreach!)
2️⃣ Posting without a content strategy
3️⃣ Ignoring LinkedIn analytics
4️⃣ Over-automating human interactions
5️⃣ Not engaging with your network's content

The solution? A balanced approach that combines automation with authentic relationship building.

What would you add to this list?

#LinkedInTips #B2BMarketing #LeadGeneration #NetworkBuilding""",
            'post_type': 'text',
            'status': 'draft',
            'likes_count': 0,
            'comments_count': 0,
            'shares_count': 0,
            'impressions_count': 0
        }
    ]
    
    posts_created = 0
    for post_data in sample_posts:
        # Check if post already exists
        existing_post = Post.query.filter_by(
            user_id=user.id,
            content=post_data['content'][:50]  # Check first 50 characters
        ).first()
        
        if not existing_post:
            post = Post(
                user_id=user.id,
                content=post_data['content'],
                post_type=post_data['post_type'],
                status=post_data['status'],
                schedule_time=post_data.get('schedule_time'),
                likes_count=post_data['likes_count'],
                comments_count=post_data['comments_count'],
                shares_count=post_data['shares_count'],
                impressions_count=post_data['impressions_count'],
                created_at=datetime.utcnow() - timedelta(days=posts_created)
            )
            
            if post_data['status'] == 'published':
                post.published_at = datetime.utcnow() - timedelta(days=posts_created)
            
            db.session.add(post)
            posts_created += 1
    
    if posts_created > 0:
        db.session.commit()
        print(f"✅ Created {posts_created} demo posts")
    else:
        print("ℹ️  Demo posts already exist")

def create_demo_campaigns(user):
    """Create sample marketing campaigns"""
    sample_campaigns = [
        {
            'name': 'AI Revolution Campaign',
            'description': 'Educate the market about AI-powered marketing solutions',
            'campaign_type': 'thought_leadership',
            'status': 'active',
            'target_audience': {
                'industries': ['Technology', 'Marketing', 'SaaS'],
                'job_titles': ['CMO', 'Marketing Director', 'VP Marketing'],
                'company_size': ['51-200', '201-500', '501-1000']
            },
            'content_strategy': {
                'themes': ['AI Innovation', 'Marketing Automation', 'ROI Optimization'],
                'posting_frequency': 'daily',
                'content_types': ['educational', 'case_studies', 'industry_insights']
            },
            'kpis': {
                'target_impressions': 50000,
                'target_engagement_rate': 3.5,
                'target_leads': 200
            },
            'budget': 5000.0,
            'total_posts': 15,
            'total_engagement': 450,
            'total_reach': 12500,
            'total_leads': 67
        },
        {
            'name': 'Product Launch Series',
            'description': 'Multi-phase campaign for new feature rollout',
            'campaign_type': 'product_launch',
            'status': 'active',
            'target_audience': {
                'industries': ['Software', 'Marketing', 'Sales'],
                'job_titles': ['Sales Manager', 'Marketing Manager', 'Business Development'],
                'company_size': ['11-50', '51-200']
            },
            'content_strategy': {
                'themes': ['Product Features', 'Customer Success', 'Industry Trends'],
                'posting_frequency': '3x_weekly',
                'content_types': ['product_demos', 'testimonials', 'feature_highlights']
            },
            'kpis': {
                'target_impressions': 25000,
                'target_engagement_rate': 4.0,
                'target_leads': 100
            },
            'budget': 3000.0,
            'total_posts': 8,
            'total_engagement': 234,
            'total_reach': 8900,
            'total_leads': 34
        }
    ]
    
    campaigns_created = 0
    for campaign_data in sample_campaigns:
        existing_campaign = MarketingCampaign.query.filter_by(
            user_id=user.id,
            name=campaign_data['name']
        ).first()
        
        if not existing_campaign:
            campaign = MarketingCampaign(
                user_id=user.id,
                name=campaign_data['name'],
                description=campaign_data['description'],
                campaign_type=campaign_data['campaign_type'],
                status=campaign_data['status'],
                target_audience=campaign_data['target_audience'],
                content_strategy=campaign_data['content_strategy'],
                kpis=campaign_data['kpis'],
                budget=campaign_data['budget'],
                total_posts=campaign_data['total_posts'],
                total_engagement=campaign_data['total_engagement'],
                total_reach=campaign_data['total_reach'],
                total_leads=campaign_data['total_leads'],
                start_date=datetime.utcnow() - timedelta(days=30),
                end_date=datetime.utcnow() + timedelta(days=30)
            )
            
            db.session.add(campaign)
            campaigns_created += 1
    
    if campaigns_created > 0:
        db.session.commit()
        print(f"✅ Created {campaigns_created} demo campaigns")
    else:
        print("ℹ️  Demo campaigns already exist")

def create_demo_automation_rules(user):
    """Create sample automation rules"""
    sample_rules = [
        {
            'name': 'Tech Industry Auto-Connect',
            'rule_type': 'auto_connect',
            'target_criteria': {
                'industries': ['Technology', 'Software', 'AI'],
                'job_titles': ['CEO', 'CTO', 'VP Engineering', 'Founder'],
                'keywords': ['artificial intelligence', 'machine learning', 'automation']
            },
            'action_template': "Hi {first_name}, I noticed your work in {industry} and would love to connect. I'm working on innovative AI solutions that might interest your team.",
            'daily_limit': 20,
            'is_active': True,
            'total_actions': 145,
            'successful_actions': 89,
            'failed_actions': 12
        },
        {
            'name': 'Marketing Content Auto-Like',
            'rule_type': 'auto_like',
            'target_criteria': {
                'hashtags': ['#marketing', '#digitalmarketing', '#contentmarketing', '#b2bmarketing'],
                'keywords': ['marketing strategy', 'lead generation', 'content creation'],
                'connection_level': ['1st', '2nd']
            },
            'action_template': '',
            'daily_limit': 50,
            'is_active': True,
            'total_actions': 892,
            'successful_actions': 867,
            'failed_actions': 25
        },
        {
            'name': 'Industry Insights Auto-Comment',
            'rule_type': 'auto_comment',
            'target_criteria': {
                'hashtags': ['#AI', '#automation', '#saas', '#startup'],
                'keywords': ['innovation', 'technology trends', 'business growth'],
                'min_likes': 10
            },
            'action_template': "Great insights, {first_name}! This aligns perfectly with what we're seeing in the market. Thanks for sharing!",
            'daily_limit': 10,
            'is_active': True,
            'total_actions': 67,
            'successful_actions': 61,
            'failed_actions': 6
        }
    ]
    
    rules_created = 0
    for rule_data in sample_rules:
        existing_rule = AutomationRule.query.filter_by(
            user_id=user.id,
            name=rule_data['name']
        ).first()
        
        if not existing_rule:
            rule = AutomationRule(
                user_id=user.id,
                name=rule_data['name'],
                rule_type=rule_data['rule_type'],
                target_criteria=rule_data['target_criteria'],
                action_template=rule_data['action_template'],
                daily_limit=rule_data['daily_limit'],
                is_active=rule_data['is_active'],
                total_actions=rule_data['total_actions'],
                successful_actions=rule_data['successful_actions'],
                failed_actions=rule_data['failed_actions'],
                last_run=datetime.utcnow() - timedelta(hours=2)
            )
            
            db.session.add(rule)
            rules_created += 1
    
    if rules_created > 0:
        db.session.commit()
        print(f"✅ Created {rules_created} demo automation rules")
    else:
        print("ℹ️  Demo automation rules already exist")

def main():
    """Main function to create all demo data"""
    print("🎯 LinkedIn Marketing Agent - Demo Data Generator")
    print("=" * 50)
    
    # Create Flask app and initialize database
    app = create_app('development')
    
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Create demo data
        demo_user = create_demo_user()
        create_demo_posts(demo_user)
        create_demo_campaigns(demo_user)
        create_demo_automation_rules(demo_user)
        
        print("\n🎉 Demo data creation completed!")
        print("\n📝 Demo Account Details:")
        print("   Username: demo_user")
        print("   Password: demo123")
        print("   Email: demo@linkedinagent.com")
        print("\n🚀 You can now log in and explore the application with sample data!")

if __name__ == '__main__':
    main()