import os
import logging
from datetime import datetime
from flask import render_template, request, jsonify, current_app, g, Blueprint, redirect, session
from extensions import db, limiter
from models import User, Post, UploadedFile, AutomationRule, MarketingCampaign, LinkedInProfile
from gemini_service import generate_linkedin_post, generate_image_with_gemini
from stability_service import generate_image_with_stability
from pdf_service import process_pdf_file
from linkedin_service import linkedin_service
from linkedin_automation import linkedin_automation

logger = logging.getLogger(__name__)

def register_routes(app):
    """Register all application routes"""
    
    @app.before_request
    def load_default_user():
        """Load the default user for single-user operation"""
        g.current_user = User.get_default_user()
    
    @app.route('/')
    def index():
        """Main application page"""
        return render_template('index.html')
    
    # Dashboard Routes
    @app.route('/api/dashboard/stats', methods=['GET'])
    def dashboard_stats():
        """Get dashboard statistics"""
        try:
            user_id = g.current_user.id
            
            # Get statistics for the current user
            total_posts = Post.query.filter_by(user_id=user_id).count()
            published_posts = Post.query.filter_by(user_id=user_id, status='published').count()
            scheduled_posts = Post.query.filter_by(user_id=user_id, status='scheduled').count()
            active_campaigns = MarketingCampaign.query.filter_by(user_id=user_id, status='active').count()
            
            # Calculate engagement rate (mock for now)
            engagement_rate = 12.5 if total_posts > 0 else 0
            
            stats = {
                'total_posts': total_posts,
                'published_posts': published_posts,
                'scheduled_posts': scheduled_posts,
                'active_campaigns': active_campaigns,
                'engagement_rate': engagement_rate,
                'total_connections': 0  # Will be updated when LinkedIn integration is active
            }
            
            return jsonify({
                'success': True,
                'data': stats
            })
            
        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/posts/recent', methods=['GET'])
    def recent_posts():
        """Get recent posts for the current user"""
        try:
            user_id = g.current_user.id
            posts = Post.query.filter_by(user_id=user_id).order_by(Post.created_at.desc()).limit(10).all()
            
            return jsonify({
                'success': True,
                'posts': [post.to_dict() for post in posts]
            })
            
        except Exception as e:
            logger.error(f"Error fetching recent posts: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    # Content Generation Routes
    @app.route('/api/generate-content', methods=['POST'])
    @limiter.limit("20 per hour")
    def generate_content():
        """Generate LinkedIn post content using AI"""
        try:
            data = request.get_json()
            if not data or 'prompt' not in data:
                return jsonify({'success': False, 'error': 'Prompt is required'}), 400
            
            prompt = data['prompt'].strip()
            if not prompt:
                return jsonify({'success': False, 'error': 'Prompt cannot be empty'}), 400
            
            # Enhance prompt with content type and target audience
            content_type = data.get('content_type', 'professional')
            target_audience = data.get('target_audience', '')
            
            enhanced_prompt = f"Create a {content_type} LinkedIn post"
            if target_audience:
                enhanced_prompt += f" for {target_audience}"
            enhanced_prompt += f" about: {prompt}"
            
            # Generate content using Gemini
            content = generate_linkedin_post(enhanced_prompt)
            
            return jsonify({
                'success': True,
                'content': content,
                'message': 'Content generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in generate_content: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate content'
            }), 500

    @app.route('/api/generate-image', methods=['POST'])
    @limiter.limit("10 per hour")
    def generate_image():
        """Generate image for LinkedIn post"""
        try:
            data = request.get_json()
            if not data or 'prompt' not in data:
                return jsonify({'success': False, 'error': 'Image prompt is required'}), 400
            
            prompt = data['prompt'].strip()
            if not prompt:
                return jsonify({'success': False, 'error': 'Image prompt cannot be empty'}), 400
            
            image_url = None
            
            # Try Stability AI first, then fall back to Gemini
            try:
                image_url = generate_image_with_stability(prompt)
                
            except Exception as stability_error:
                logger.warning(f"Stability AI image generation failed: {stability_error}")
                
                # Fall back to Gemini
                try:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"generated_{timestamp}.png")
                    generate_image_with_gemini(prompt, image_path)
                    image_url = f"/static/uploads/{os.path.basename(image_path)}"
                    
                except Exception as gemini_error:
                    logger.error(f"Gemini image generation failed: {gemini_error}")
                    raise Exception("Both image generation services failed")
            
            return jsonify({
                'success': True,
                'image_url': image_url,
                'message': 'Image generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in generate_image: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate image'
            }), 500

    @app.route('/api/upload-pdf', methods=['POST'])
    def upload_pdf():
        """Handle PDF file upload and processing"""
        try:
            if 'file' not in request.files:
                return jsonify({'success': False, 'error': 'No file uploaded'}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            # Process the PDF
            result = process_pdf_file(file, current_app.config['UPLOAD_FOLDER'])
            
            if result['success']:
                # Save to database
                uploaded_file = UploadedFile()
                uploaded_file.filename = result['filename']
                uploaded_file.original_filename = result['original_filename']
                uploaded_file.file_path = result['file_path']
                uploaded_file.file_size = result['file_size']
                uploaded_file.mime_type = 'application/pdf'
                uploaded_file.extracted_text = result['extracted_text']
                uploaded_file.summary = result['summary']
                uploaded_file.processed = True
                
                db.session.add(uploaded_file)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'file_id': uploaded_file.id,
                    'summary': result['summary'],
                    'message': result['message']
                })
            else:
                return jsonify(result), 400
                
        except Exception as e:
            logging.error(f"Error in upload_pdf: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to process PDF'
            }), 500

    # Post Management Routes
    @app.route('/api/create-post', methods=['POST'])
    @limiter.limit("30 per hour")
    def create_post():
        """Create and optionally publish/schedule a LinkedIn post"""
        try:
            data = request.get_json()
            if not data or 'content' not in data:
                return jsonify({'success': False, 'error': 'Content is required'}), 400
            
            content = data['content'].strip()
            if not content:
                return jsonify({'success': False, 'error': 'Content cannot be empty'}), 400
            
            post_type = data.get('post_type', 'text')
            image_url = data.get('image_url')
            schedule_time_str = data.get('schedule_time')
            
            # Parse schedule time if provided
            schedule_time = None
            if schedule_time_str:
                try:
                    schedule_time = datetime.fromisoformat(schedule_time_str.replace('Z', '+00:00'))
                except ValueError:
                    return jsonify({'success': False, 'error': 'Invalid schedule time format'}), 400
            
            # Create post record
            post = Post()
            post.user_id = g.current_user.id
            post.content = content
            post.post_type = post_type
            post.image_url = image_url
            post.schedule_time = schedule_time
            post.status = 'scheduled' if schedule_time else 'draft'
            
            # Handle immediate publishing or scheduling
            if schedule_time:
                # Schedule the post
                result = linkedin_service.schedule_post(content, schedule_time, image_url)
                if result['success']:
                    post.status = 'scheduled'
                    post.linkedin_post_id = result.get('scheduled_id')
                else:
                    post.status = 'failed'
                    post.error_message = result.get('error', 'Unknown error')
            else:
                # Publish immediately
                result = linkedin_service.post_to_linkedin(content, image_url)
                if result['success']:
                    post.status = 'published'
                    post.published_at = datetime.utcnow()
                    post.linkedin_post_id = result.get('post_id')
                    post.linkedin_url = result.get('linkedin_url')
                else:
                    post.status = 'failed'
                    post.error_message = result.get('error', 'Unknown error')
            
            db.session.add(post)
            db.session.commit()
            
            response_data = {
                'success': True,
                'post_id': post.id,
                'status': post.status,
                'message': 'Post created successfully'
            }
            
            # Add LinkedIn URL if published successfully
            if post.status == 'published' and post.linkedin_url:
                response_data['linkedin_url'] = post.linkedin_url
                response_data['message'] = 'Post published successfully to LinkedIn!'
            elif post.status == 'failed':
                response_data['error_message'] = post.error_message
                
            return jsonify(response_data)
            
        except Exception as e:
            logging.error(f"Error in create_post: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to create post'
            }), 500

    @app.route('/api/posts', methods=['GET'])
    def get_posts():
        """Get all posts with pagination"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            
            posts = Post.query.order_by(Post.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return jsonify({
                'success': True,
                'posts': [post.to_dict() for post in posts.items],
                'total': posts.total,
                'pages': posts.pages,
                'current_page': posts.page,
                'has_next': posts.has_next,
                'has_prev': posts.has_prev
            })
            
        except Exception as e:
            logging.error(f"Error in get_posts: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to fetch posts'
            }), 500

    @app.route('/api/stats', methods=['GET'])
    def get_stats():
        """Get posting statistics"""
        try:
            total_posts = Post.query.count()
            scheduled_posts = Post.query.filter_by(status='scheduled').count()
            published_posts = Post.query.filter_by(status='published').count()
            failed_posts = Post.query.filter_by(status='failed').count()
            
            return jsonify({
                'success': True,
                'stats': {
                    'total_posts': total_posts,
                    'scheduled_posts': scheduled_posts,
                    'published_posts': published_posts,
                    'failed_posts': failed_posts
                }
            })
            
        except Exception as e:
            logging.error(f"Error in get_stats: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to fetch statistics'
            }), 500

    @app.route('/static/uploads/<filename>')
    def uploaded_file(filename):
        """Serve uploaded files"""
        from flask import send_from_directory
        return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

# Automation API Endpoints

    @app.route('/api/automation/accept-connections', methods=['POST'])
    def auto_accept_connections():
        """Auto-accept all pending connection requests"""
        try:
            result = linkedin_automation.auto_accept_connections()
            return jsonify(result)
        except Exception as e:
            logging.error(f"Error in auto_accept_connections: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/automation/send-connections', methods=['POST'])
    def auto_send_connections():
        """Send connection requests to target profiles"""
        try:
            data = request.get_json()
            target_profiles = data.get('target_profiles', [])
            message = data.get('message', '')
            
            result = linkedin_automation.auto_send_connections(target_profiles, message)
            return jsonify(result)
        except Exception as e:
            logging.error(f"Error in auto_send_connections: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/automation/follow-successful', methods=['POST'])
    def auto_follow_successful():
        """Auto-follow successful people based on criteria"""
        try:
            data = request.get_json()
            criteria = data.get('criteria', {})
            
            result = linkedin_automation.auto_follow_successful_people(criteria)
            return jsonify(result)
        except Exception as e:
            logging.error(f"Error in auto_follow_successful: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/automation/engage-posts', methods=['POST'])
    def auto_engage_posts():
        """Auto-engage with posts containing specific keywords"""
        try:
            data = request.get_json()
            keywords = data.get('keywords', [])
            
            result = linkedin_automation.auto_engage_with_posts(keywords)
            return jsonify(result)
        except Exception as e:
            logging.error(f"Error in auto_engage_posts: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/marketing/create-campaign', methods=['POST'])
    def create_marketing_campaign():
        """Create a marketing campaign from PDF content"""
        try:
            data = request.get_json()
            campaign_name = data.get('campaign_name', '')
            product_info = data.get('product_info', {})
            pdf_id = data.get('pdf_id')
            target_keywords = data.get('target_keywords', [])
            
            if not campaign_name:
                return jsonify({'success': False, 'error': 'Campaign name required'}), 400
            
            # Get PDF content if provided
            pdf_content = ""
            if pdf_id:
                pdf_file = UploadedFile.query.get(pdf_id)
                if not pdf_file:
                    return jsonify({'success': False, 'error': 'PDF not found'}), 404
                pdf_content = pdf_file.extracted_text or pdf_file.summary or ""
            else:
                # Use product info for content generation
                pdf_content = f"Product: {product_info.get('name', '')}. Keywords: {', '.join(target_keywords)}"
            
            # Create marketing campaign
            campaign = MarketingCampaign()
            campaign.campaign_name = campaign_name
            campaign.product_name = product_info.get('name', '')
            campaign.source_pdf_id = pdf_id
            campaign.target_keywords = target_keywords
            campaign.start_date = datetime.utcnow()
            
            db.session.add(campaign)
            db.session.commit()
            
            # Schedule marketing posts
            result = linkedin_automation.schedule_marketing_campaign(
                pdf_content, 
                product_info
            )
            
            if result['success']:
                # Create scheduled posts
                for post_data in result['posts']:
                    post = Post()
                    post.content = post_data['content']
                    post.schedule_time = post_data['schedule_time']
                    post.status = 'scheduled'
                    post.post_type = 'text'
                    
                    db.session.add(post)
                
                campaign.posts_generated = len(result['posts'])
                db.session.commit()
            
            return jsonify({
                'success': True,
                'campaign_id': campaign.id,
                'posts_scheduled': result.get('scheduled_posts', 0),
                'message': 'Marketing campaign created successfully'
            })
            
        except Exception as e:
            logging.error(f"Error in create_marketing_campaign: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500



    @app.route('/api/marketing/campaigns', methods=['GET'])
    def get_marketing_campaigns():
        """Get all marketing campaigns"""
        try:
            campaigns = MarketingCampaign.query.order_by(MarketingCampaign.created_at.desc()).all()
            
            return jsonify({
                'success': True,
                'campaigns': [campaign.to_dict() for campaign in campaigns]
            })
            
        except Exception as e:
            logging.error(f"Error in get_marketing_campaigns: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/profiles', methods=['GET', 'POST'])
    def linkedin_profiles():
        """Get or add LinkedIn profiles for automation"""
        try:
            if request.method == 'GET':
                profiles = LinkedInProfile.query.order_by(LinkedInProfile.created_at.desc()).limit(50).all()
                return jsonify({
                    'success': True,
                    'profiles': [profile.to_dict() for profile in profiles]
                })
            
            elif request.method == 'POST':
                data = request.get_json()
                
                # Check if profile already exists
                existing = LinkedInProfile.query.filter_by(linkedin_id=data.get('linkedin_id')).first()
                if existing:
                    return jsonify({
                        'success': False,
                        'error': 'Profile already exists'
                    }), 400
                
                profile = LinkedInProfile()
                profile.linkedin_id = data.get('linkedin_id', '')
                profile.name = data.get('name', '')
                profile.headline = data.get('headline', '')
                profile.industry = data.get('industry', '')
                profile.location = data.get('location', '')
                profile.is_target = data.get('is_target', False)
                
                db.session.add(profile)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'profile_id': profile.id,
                    'message': 'Profile added successfully'
                })
                
        except Exception as e:
            logging.error(f"Error in linkedin_profiles: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

    # LinkedIn OAuth Authentication Routes
    @app.route("/auth/linkedin")
    def linkedin_auth():
        """Redirect to LinkedIn OAuth"""
        auth_url = linkedin_service.get_authorization_url()
        return redirect(auth_url)

    @app.route("/auth/linkedin/callback")
    def linkedin_callback():
        """Handle LinkedIn OAuth callback"""
        code = request.args.get("code")
        if not code:
            return jsonify({"error": "No authorization code received"}), 400
        
        result = linkedin_service.exchange_code_for_token(code)
        if result["success"]:
            session["linkedin_token"] = result["token"]
            linkedin_service.access_token = result["token"]
            return redirect("/?auth=success")
        else:
            return redirect("/?auth=error")

    @app.route("/api/linkedin-status")
    def linkedin_status():
        """Check LinkedIn authentication status"""
        try:
            # Check if user has stored token
            user = g.current_user
            if user.linkedin_access_token:
                linkedin_service.access_token = user.linkedin_access_token
            
            status = linkedin_service.get_connection_status()
            
            return jsonify({
                'success': True,
                'connected': status['connected'],
                'profile': status.get('profile'),
                'auth_url': status.get('auth_url'),
                'error': status.get('error')
            })
            
        except Exception as e:
            logger.error(f"Error checking LinkedIn status: {str(e)}")
            return jsonify({
                'success': False,
                'connected': False,
                'auth_url': linkedin_service.get_authorization_url(),
                'error': str(e)
            }), 500
    
    # Marketing Manager Routes
    @app.route('/api/marketing/manager/dashboard', methods=['GET'])
    def marketing_manager_dashboard():
        """Get marketing manager dashboard data"""
        try:
            user_id = g.current_user.id
            
            # Get campaign statistics
            total_campaigns = MarketingCampaign.query.filter_by(user_id=user_id).count()
            active_campaigns = MarketingCampaign.query.filter_by(user_id=user_id, status='active').count()
            completed_campaigns = MarketingCampaign.query.filter_by(user_id=user_id, status='completed').count()
            
            # Get recent campaigns
            recent_campaigns = MarketingCampaign.query.filter_by(user_id=user_id)\
                .order_by(MarketingCampaign.created_at.desc()).limit(5).all()
            
            # Get automation statistics
            automation_stats = linkedin_automation.get_automation_statistics()
            
            # Calculate total engagement across all campaigns
            total_engagement = db.session.query(
                db.func.sum(MarketingCampaign.total_engagement)
            ).filter_by(user_id=user_id).scalar() or 0
            
            # Calculate total reach
            total_reach = db.session.query(
                db.func.sum(MarketingCampaign.total_reach)
            ).filter_by(user_id=user_id).scalar() or 0
            
            return jsonify({
                'success': True,
                'data': {
                    'campaigns': {
                        'total': total_campaigns,
                        'active': active_campaigns,
                        'completed': completed_campaigns
                    },
                    'engagement': {
                        'total': total_engagement,
                        'average': total_engagement / max(total_campaigns, 1)
                    },
                    'reach': {
                        'total': total_reach,
                        'average': total_reach / max(total_campaigns, 1)
                    },
                    'automation': automation_stats.get('data', {}) if automation_stats['success'] else {},
                    'recent_campaigns': [campaign.to_dict() for campaign in recent_campaigns]
                }
            })
            
        except Exception as e:
            logger.error(f"Error in marketing_manager_dashboard: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/marketing/campaigns', methods=['GET', 'POST'])
    def marketing_campaigns():
        """Get all marketing campaigns or create new one"""
        try:
            user_id = g.current_user.id
            
            if request.method == 'GET':
                campaigns = MarketingCampaign.query.filter_by(user_id=user_id)\
                    .order_by(MarketingCampaign.created_at.desc()).all()
                
                return jsonify({
                    'success': True,
                    'campaigns': [campaign.to_dict() for campaign in campaigns]
                })
            
            elif request.method == 'POST':
                data = request.get_json()
                
                # Validate required fields
                required_fields = ['name', 'description', 'campaign_type']
                for field in required_fields:
                    if not data.get(field):
                        return jsonify({'success': False, 'error': f'{field} is required'}), 400
                
                # Create new campaign
                campaign = MarketingCampaign(
                    user_id=user_id,
                    name=data['name'],
                    description=data['description'],
                    campaign_type=data['campaign_type'],
                    target_audience=data.get('target_audience', {}),
                    content_strategy=data.get('content_strategy', {}),
                    kpis=data.get('kpis', {}),
                    budget=data.get('budget', 0.0),
                    start_date=datetime.utcnow(),
                    status='draft'
                )
                
                db.session.add(campaign)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'campaign': campaign.to_dict(),
                    'message': 'Campaign created successfully'
                })
                
        except Exception as e:
            logger.error(f"Error in marketing_campaigns: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/marketing/campaigns/<int:campaign_id>', methods=['GET', 'PUT', 'DELETE'])
    def marketing_campaign_detail(campaign_id):
        """Get, update, or delete a specific marketing campaign"""
        try:
            user_id = g.current_user.id
            campaign = MarketingCampaign.query.filter_by(id=campaign_id, user_id=user_id).first()
            
            if not campaign:
                return jsonify({'success': False, 'error': 'Campaign not found'}), 404
            
            if request.method == 'GET':
                # Get campaign posts
                posts = Post.query.filter_by(user_id=user_id)\
                    .filter(Post.created_at >= campaign.start_date).all()
                
                campaign_data = campaign.to_dict()
                campaign_data['posts'] = [post.to_dict() for post in posts]
                
                return jsonify({
                    'success': True,
                    'campaign': campaign_data
                })
            
            elif request.method == 'PUT':
                data = request.get_json()
                
                # Update campaign fields
                if 'name' in data:
                    campaign.name = data['name']
                if 'description' in data:
                    campaign.description = data['description']
                if 'status' in data:
                    campaign.status = data['status']
                if 'target_audience' in data:
                    campaign.target_audience = data['target_audience']
                if 'content_strategy' in data:
                    campaign.content_strategy = data['content_strategy']
                if 'budget' in data:
                    campaign.budget = data['budget']
                
                campaign.updated_at = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'campaign': campaign.to_dict(),
                    'message': 'Campaign updated successfully'
                })
            
            elif request.method == 'DELETE':
                db.session.delete(campaign)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Campaign deleted successfully'
                })
                
        except Exception as e:
            logger.error(f"Error in marketing_campaign_detail: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/marketing/campaigns/<int:campaign_id>/launch', methods=['POST'])
    def launch_marketing_campaign(campaign_id):
        """Launch a marketing campaign"""
        try:
            user_id = g.current_user.id
            campaign = MarketingCampaign.query.filter_by(id=campaign_id, user_id=user_id).first()
            
            if not campaign:
                return jsonify({'success': False, 'error': 'Campaign not found'}), 404
            
            data = request.get_json()
            pdf_content = data.get('pdf_content', '')
            product_info = data.get('product_info', {})
            
            # Generate campaign posts
            result = linkedin_automation.schedule_marketing_campaign(
                pdf_content, 
                product_info,
                campaign_id
            )
            
            if result['success']:
                # Update campaign status
                campaign.status = 'active'
                campaign.start_date = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'campaign': campaign.to_dict(),
                    'posts_scheduled': result['scheduled_posts'],
                    'message': f'Campaign launched with {result["scheduled_posts"]} posts scheduled'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'Failed to launch campaign')
                }), 500
                
        except Exception as e:
            logger.error(f"Error launching campaign: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # Automation Statistics and Management
    @app.route('/api/automation/statistics', methods=['GET'])
    def automation_statistics():
        """Get automation statistics"""
        try:
            stats = linkedin_automation.get_automation_statistics()
            return jsonify(stats)
            
        except Exception as e:
            logger.error(f"Error getting automation statistics: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/automation/rules', methods=['GET', 'POST'])
    def automation_rules():
        """Get or create automation rules"""
        try:
            user_id = g.current_user.id
            
            if request.method == 'GET':
                rules = AutomationRule.query.filter_by(user_id=user_id).all()
                return jsonify({
                    'success': True,
                    'rules': [rule.to_dict() for rule in rules]
                })
            
            elif request.method == 'POST':
                data = request.get_json()
                
                # Validate required fields
                required_fields = ['name', 'rule_type', 'daily_limit']
                for field in required_fields:
                    if field not in data:
                        return jsonify({'success': False, 'error': f'{field} is required'}), 400
                
                rule = AutomationRule(
                    user_id=user_id,
                    name=data['name'],
                    rule_type=data['rule_type'],
                    target_criteria=data.get('target_criteria', {}),
                    action_template=data.get('action_template', ''),
                    daily_limit=data['daily_limit'],
                    is_active=data.get('is_active', True)
                )
                
                db.session.add(rule)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'rule': rule.to_dict(),
                    'message': 'Automation rule created successfully'
                })
                
        except Exception as e:
            logger.error(f"Error in automation_rules: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/automation/rules/<int:rule_id>', methods=['PUT', 'DELETE'])
    def automation_rule_detail(rule_id):
        """Update or delete automation rule"""
        try:
            user_id = g.current_user.id
            rule = AutomationRule.query.filter_by(id=rule_id, user_id=user_id).first()
            
            if not rule:
                return jsonify({'success': False, 'error': 'Rule not found'}), 404
            
            if request.method == 'PUT':
                data = request.get_json()
                
                # Update rule fields
                if 'name' in data:
                    rule.name = data['name']
                if 'is_active' in data:
                    rule.is_active = data['is_active']
                if 'daily_limit' in data:
                    rule.daily_limit = data['daily_limit']
                if 'target_criteria' in data:
                    rule.target_criteria = data['target_criteria']
                if 'action_template' in data:
                    rule.action_template = data['action_template']
                
                rule.updated_at = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'rule': rule.to_dict(),
                    'message': 'Rule updated successfully'
                })
            
            elif request.method == 'DELETE':
                db.session.delete(rule)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Rule deleted successfully'
                })
                
        except Exception as e:
            logger.error(f"Error in automation_rule_detail: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/automation/execute', methods=['POST'])
    def execute_automation():
        """Execute automation rules"""
        try:
            data = request.get_json()
            rule_type = data.get('rule_type')
            rule_id = data.get('rule_id')
            
            if rule_id:
                rule = AutomationRule.query.get(rule_id)
                if not rule or not rule.is_active:
                    return jsonify({'success': False, 'error': 'Rule not found or inactive'}), 404
                
                if rule.rule_type == 'auto_connect':
                    target_profiles = data.get('target_profiles', [])
                    result = linkedin_automation.auto_send_connections(
                        target_profiles, 
                        rule.action_template,
                        rule_id
                    )
                elif rule.rule_type == 'auto_follow':
                    result = linkedin_automation.auto_follow_successful_people(
                        rule.target_criteria,
                        rule_id
                    )
                elif rule.rule_type == 'auto_like' or rule.rule_type == 'auto_comment':
                    keywords = rule.target_criteria.get('keywords', [])
                    result = linkedin_automation.auto_engage_with_posts(
                        keywords,
                        rule_id
                    )
                else:
                    return jsonify({'success': False, 'error': 'Unknown rule type'}), 400
                
                return jsonify(result)
            
            elif rule_type == 'accept_connections':
                result = linkedin_automation.auto_accept_connections()
            elif rule_type == 'auto_engage':
                keywords = data.get('keywords', [])
                result = linkedin_automation.auto_engage_with_posts(keywords)
            else:
                return jsonify({'success': False, 'error': 'Rule type or rule_id required'}), 400
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Error executing automation: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # Enhanced Post Publishing with Retry Logic
    @app.route('/api/posts/publish-with-retry', methods=['POST'])
    @limiter.limit("10 per hour")
    def publish_post_with_retry():
        """Publish post with retry logic and status updates"""
        try:
            data = request.get_json()
            user_id = g.current_user.id
            
            content = data.get('content', '').strip()
            if not content:
                return jsonify({'success': False, 'error': 'Content is required'}), 400
            
            # Create post record
            post = Post(
                user_id=user_id,
                content=content,
                hashtags=data.get('hashtags', []),
                image_url=data.get('image_url'),
                video_url=data.get('video_url'),
                article_url=data.get('article_url'),
                post_type=data.get('post_type', 'text'),
                status='publishing'
            )
            
            db.session.add(post)
            db.session.commit()
            
            # Attempt to publish with retry logic
            max_retries = 3
            retry_count = 0
            
            while retry_count < max_retries:
                try:
                    # Attempt LinkedIn API call
                    linkedin_result = linkedin_service.create_post(
                        content=content,
                        image_url=data.get('image_url'),
                        video_url=data.get('video_url')
                    )
                    
                    if linkedin_result.get('success'):
                        # Update post status
                        post.status = 'published'
                        post.linkedin_url = linkedin_result.get('post_url')
                        post.linkedin_post_id = linkedin_result.get('post_id')
                        post.published_at = datetime.utcnow()
                        db.session.commit()
                        
                        return jsonify({
                            'success': True,
                            'post_id': post.id,
                            'linkedin_url': post.linkedin_url,
                            'linkedin_post_id': post.linkedin_post_id,
                            'message': 'Post published successfully to LinkedIn!',
                            'retry_count': retry_count
                        })
                    else:
                        retry_count += 1
                        if retry_count < max_retries:
                            # Wait before retry (exponential backoff)
                            import time
                            time.sleep(2 ** retry_count)
                        
                except Exception as e:
                    retry_count += 1
                    logger.warning(f"Publish attempt {retry_count} failed: {str(e)}")
                    
                    if retry_count < max_retries:
                        import time
                        time.sleep(2 ** retry_count)
            
            # All retries failed
            post.status = 'failed'
            post.error_message = 'Failed to publish after multiple attempts'
            db.session.commit()
            
            return jsonify({
                'success': False,
                'post_id': post.id,
                'error': 'Failed to publish after multiple retries',
                'retry_count': retry_count
            }), 500
            
        except Exception as e:
            logger.error(f"Publish with retry error: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # Advanced Image Generation Routes
    @app.route('/api/image/generate-advanced', methods=['POST'])
    @limiter.limit("10 per minute")
    def generate_advanced_image():
        """Generate image with advanced options and instant preview"""
        try:
            data = request.get_json()
            prompt = data.get('prompt', '')
            style = data.get('style', 'professional')
            size = data.get('size', '1024x1024')
            
            if not prompt:
                return jsonify({'success': False, 'error': 'Prompt is required'}), 400
            
            # Import here to avoid circular imports
            from image_generation_service import image_service
            import asyncio
            
            # Generate image asynchronously
            result = asyncio.run(image_service.generate_image_async(prompt, style, size))
            
            if result['success']:
                # Optimize for LinkedIn
                optimized = image_service.optimize_image_for_linkedin(result['filepath'])
                result['optimized_images'] = optimized.get('optimized_images', {})
                
                return jsonify({
                    'success': True,
                    'image_url': result['image_url'],
                    'thumbnail_url': result.get('thumbnail_url'),
                    'optimized_images': result.get('optimized_images', {}),
                    'provider': result.get('provider'),
                    'enhanced_prompt': result.get('enhanced_prompt'),
                    'message': 'Image generated successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'Image generation failed'),
                    'fallback_available': result.get('fallback_available', False)
                }), 500
                
        except Exception as e:
            logger.error(f"Advanced image generation error: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/image/variations', methods=['POST'])
    @limiter.limit("5 per minute")
    def generate_image_variations():
        """Generate multiple variations of an image"""
        try:
            data = request.get_json()
            prompt = data.get('prompt', '')
            count = min(data.get('count', 3), 5)  # Limit to 5 variations
            
            if not prompt:
                return jsonify({'success': False, 'error': 'Prompt is required'}), 400
            
            from image_generation_service import image_service
            
            result = image_service.generate_image_variations(prompt, count)
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Image variations error: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500

