#!/usr/bin/env python3
"""
Comprehensive test script for LinkedIn Marketing Agent features
"""

import os
import sys
import asyncio
import json
import time
from datetime import datetime, timedelta

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import User, Post, MarketingCampaign, AutomationRule
from automation_engine import automation_engine, CampaignConfig, AutoFollowConfig, TargetCategory
from image_generation_service import image_service
from task_scheduler import task_scheduler

class FeatureTester:
    """Test all LinkedIn Marketing Agent features"""
    
    def __init__(self):
        self.app = create_app('testing')
        self.test_user = None
        self.test_results = []
        
    def run_all_tests(self):
        """Run all feature tests"""
        print("🧪 Starting LinkedIn Marketing Agent Feature Tests")
        print("=" * 60)
        
        with self.app.app_context():
            try:
                # Setup test environment
                self.setup_test_environment()
                
                # Run tests
                self.test_user_management()
                self.test_content_generation()
                self.test_image_generation()
                self.test_post_management()
                self.test_campaign_automation()
                self.test_auto_follow_system()
                self.test_engagement_optimization()
                self.test_task_scheduler()
                
                # Print results
                self.print_test_results()
                
            except Exception as e:
                print(f"❌ Critical test error: {str(e)}")
                return False
            
            finally:
                self.cleanup_test_environment()
        
        return all(result['passed'] for result in self.test_results)
    
    def setup_test_environment(self):
        """Setup test environment"""
        print("\n🔧 Setting up test environment...")
        
        # Create tables
        db.create_all()
        
        # Get default user for testing
        self.test_user = User.get_default_user()
        if not self.test_user.email:
            self.test_user.email = 'test@example.com'
            self.test_user.first_name = 'Test'
            self.test_user.last_name = 'User'
        
        db.session.add(self.test_user)
        db.session.commit()
        
        print("✅ Test environment setup complete")
    
    def cleanup_test_environment(self):
        """Cleanup test environment"""
        print("\n🧹 Cleaning up test environment...")
        
        try:
            # Delete test data
            if self.test_user:
                # Delete related records first
                Post.query.filter_by(user_id=self.test_user.id).delete()
                MarketingCampaign.query.filter_by(user_id=self.test_user.id).delete()
                AutomationRule.query.filter_by(user_id=self.test_user.id).delete()
                
                # Delete user
                db.session.delete(self.test_user)
                db.session.commit()
            
            print("✅ Test environment cleanup complete")
            
        except Exception as e:
            print(f"⚠️  Cleanup warning: {str(e)}")
    
    def test_user_management(self):
        """Test user management for single-user operation"""
        print("\n🔐 Testing User Management...")
        
        try:
            # Test default user creation/retrieval
            user = User.get_default_user()
            assert user is not None, "Default user creation failed"
            assert user.username == 'default_user', "Default username incorrect"
            assert user.is_active == True, "Default user should be active"
            
            # Test user settings
            user.settings = {'theme': 'dark', 'notifications': True}
            db.session.commit()
            
            # Retrieve user again and verify settings
            user_retrieved = User.get_default_user()
            assert user_retrieved.settings['theme'] == 'dark', "User settings not persisted"
            
            # Test user dictionary representation
            user_dict = user.to_dict()
            assert 'id' in user_dict, "User dict missing id"
            assert 'username' in user_dict, "User dict missing username"
            assert 'settings' in user_dict, "User dict missing settings"
            
            self.record_test_result("User Management", True, "All user management tests passed")
            
        except Exception as e:
            self.record_test_result("User Management", False, str(e))
    
    def test_content_generation(self):
        """Test AI content generation"""
        print("\n✍️  Testing Content Generation...")
        
        try:
            from gemini_service import generate_linkedin_post
            
            # Test content generation
            prompt = "Write about the importance of AI in modern business"
            content = generate_linkedin_post(prompt)
            
            assert content, "Content generation returned empty result"
            assert len(content) > 50, "Generated content too short"
            assert isinstance(content, str), "Content is not a string"
            
            self.record_test_result("Content Generation", True, f"Generated {len(content)} characters")
            
        except Exception as e:
            self.record_test_result("Content Generation", False, str(e))
    
    def test_image_generation(self):
        """Test AI image generation"""
        print("\n🎨 Testing Image Generation...")
        
        try:
            # Test image generation
            prompt = "Professional business meeting"
            result = asyncio.run(image_service.generate_image_async(prompt, 'professional'))
            
            assert result['success'], f"Image generation failed: {result.get('error')}"
            assert 'image_url' in result, "Image URL not returned"
            
            # Test image optimization
            if result['success'] and 'filepath' in result:
                optimization_result = image_service.optimize_image_for_linkedin(result['filepath'])
                assert optimization_result['success'], "Image optimization failed"
                assert 'optimized_images' in optimization_result, "Optimized images not generated"
            
            self.record_test_result("Image Generation", True, f"Generated image: {result.get('image_url', 'N/A')}")
            
        except Exception as e:
            self.record_test_result("Image Generation", False, str(e))
    
    def test_post_management(self):
        """Test post creation and management"""
        print("\n📝 Testing Post Management...")
        
        try:
            # Create test post
            post = Post(
                user_id=self.test_user.id,
                content="This is a test post for LinkedIn Marketing Agent",
                post_type='text',
                status='draft'
            )
            
            db.session.add(post)
            db.session.commit()
            
            assert post.id is not None, "Post creation failed"
            
            # Test post status updates
            post.status = 'scheduled'
            post.schedule_time = datetime.utcnow() + timedelta(hours=1)
            db.session.commit()
            
            # Test post retrieval
            retrieved_post = Post.query.get(post.id)
            assert retrieved_post is not None, "Post retrieval failed"
            assert retrieved_post.status == 'scheduled', "Post status update failed"
            
            self.record_test_result("Post Management", True, f"Created and managed post {post.id}")
            
        except Exception as e:
            self.record_test_result("Post Management", False, str(e))
    
    def test_campaign_automation(self):
        """Test automated marketing campaigns"""
        print("\n🚀 Testing Campaign Automation...")
        
        try:
            # Create campaign configuration
            campaign_config = CampaignConfig(
                name="Test Campaign",
                target_audience={
                    'industries': ['Technology', 'Marketing'],
                    'job_titles': ['CEO', 'CTO', 'Marketing Manager']
                },
                content_themes=['AI', 'Business Growth', 'Innovation'],
                posting_schedule={'times_per_day': 1, 'optimal_times': ['09:00']},
                duration_days=7,
                daily_post_limit=2,
                engagement_goals={'likes': 50, 'comments': 10, 'shares': 5}
            )
            
            # Launch campaign
            result = asyncio.run(automation_engine.launch_automated_campaign(
                self.test_user.id, campaign_config
            ))
            
            assert result['success'], f"Campaign launch failed: {result.get('error')}"
            assert 'campaign_id' in result, "Campaign ID not returned"
            
            # Verify campaign was created
            campaign = MarketingCampaign.query.get(result['campaign_id'])
            assert campaign is not None, "Campaign not found in database"
            assert campaign.status == 'active', "Campaign status not set to active"
            
            self.record_test_result("Campaign Automation", True, f"Campaign {result['campaign_id']} launched successfully")
            
        except Exception as e:
            self.record_test_result("Campaign Automation", False, str(e))
    
    def test_auto_follow_system(self):
        """Test automated following system"""
        print("\n👥 Testing Auto-Follow System...")
        
        try:
            # Create auto-follow configuration
            config = AutoFollowConfig(
                categories=[TargetCategory.STARTUP_FOUNDERS, TargetCategory.CTOS],
                daily_limit=20,
                connection_message_template="Hi {name}, I'd love to connect with fellow {title}!",
                target_criteria={'min_connections': 100, 'max_connections': 5000}
            )
            
            # Setup auto-follow system
            result = asyncio.run(automation_engine.setup_auto_follow_system(
                self.test_user.id, config
            ))
            
            assert result['success'], f"Auto-follow setup failed: {result.get('error')}"
            assert result['rules_created'] > 0, "No automation rules created"
            
            # Verify rules were created
            rules = AutomationRule.query.filter_by(
                user_id=self.test_user.id,
                rule_type='auto_follow'
            ).all()
            
            assert len(rules) > 0, "Auto-follow rules not found in database"
            
            self.record_test_result("Auto-Follow System", True, f"Created {len(rules)} auto-follow rules")
            
        except Exception as e:
            self.record_test_result("Auto-Follow System", False, str(e))
    
    def test_engagement_optimization(self):
        """Test engagement optimization"""
        print("\n📈 Testing Engagement Optimization...")
        
        try:
            # Create some test posts for analysis
            for i in range(3):
                post = Post(
                    user_id=self.test_user.id,
                    content=f"Test post {i+1} for engagement analysis",
                    post_type='text',
                    status='published',
                    published_at=datetime.utcnow() - timedelta(days=i),
                    likes_count=10 + i * 5,
                    comments_count=2 + i,
                    shares_count=1 + i
                )
                db.session.add(post)
            
            db.session.commit()
            
            # Run engagement optimization
            result = asyncio.run(automation_engine.optimize_engagement_automatically(
                self.test_user.id
            ))
            
            assert result['success'], f"Engagement optimization failed: {result.get('error')}"
            assert 'performance_score' in result, "Performance score not calculated"
            
            self.record_test_result("Engagement Optimization", True, f"Performance score: {result['performance_score']}")
            
        except Exception as e:
            self.record_test_result("Engagement Optimization", False, str(e))
    
    def test_task_scheduler(self):
        """Test task scheduler functionality"""
        print("\n⏰ Testing Task Scheduler...")
        
        try:
            # Test scheduler status
            status = task_scheduler.get_scheduler_status()
            
            assert isinstance(status, dict), "Scheduler status not returned as dict"
            assert 'running' in status, "Running status not in scheduler status"
            assert 'scheduled_jobs' in status, "Scheduled jobs count not in status"
            
            # Test immediate task execution
            test_result = {'executed': False}
            
            def test_task():
                test_result['executed'] = True
            
            task_scheduler.add_immediate_task(test_task)
            
            assert test_result['executed'], "Immediate task was not executed"
            
            self.record_test_result("Task Scheduler", True, f"Scheduler status: {status}")
            
        except Exception as e:
            self.record_test_result("Task Scheduler", False, str(e))
    
    def record_test_result(self, test_name, passed, message):
        """Record a test result"""
        self.test_results.append({
            'name': test_name,
            'passed': passed,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {status}: {test_name} - {message}")
    
    def print_test_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 60)
        print("🧪 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in self.test_results if result['passed'])
        total_tests = len(self.test_results)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests / total_tests * 100):.1f}%")
        
        print("\nDetailed Results:")
        print("-" * 40)
        
        for result in self.test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['name']}: {result['message']}")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED! LinkedIn Marketing Agent is ready to use.")
        else:
            print(f"\n⚠️  {total_tests - passed_tests} tests failed. Please check the issues above.")
        
        # Save results to file
        with open('test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': total_tests,
                    'passed_tests': passed_tests,
                    'failed_tests': total_tests - passed_tests,
                    'success_rate': passed_tests / total_tests * 100,
                    'timestamp': datetime.utcnow().isoformat()
                },
                'results': self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to test_results.json")

def main():
    """Main test function"""
    print("LinkedIn Marketing Agent - Feature Test Suite")
    print("Version: 1.0.0")
    print("=" * 60)
    
    # Check environment
    if not os.path.exists('.env'):
        print("⚠️  Warning: .env file not found. Some tests may fail.")
        print("Please copy .env.example to .env and configure your API keys.")
    
    # Run tests
    tester = FeatureTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()