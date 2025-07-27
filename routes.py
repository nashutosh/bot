import os
import logging
from datetime import datetime
from flask import render_template, request, jsonify, current_app
from app import app, db
from models import Post, UploadedFile
from gemini_service import generate_linkedin_post, generate_image_with_gemini
# from openai_service import generate_image_with_dalle, enhance_content_with_gpt
from stability_service import generate_image_with_stability
from pdf_service import process_pdf_file
from linkedin_service import linkedin_service

@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html')

@app.route('/api/generate-content', methods=['POST'])
def generate_content():
    """Generate LinkedIn post content using AI"""
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({'success': False, 'error': 'Prompt is required'}), 400
        
        prompt = data['prompt'].strip()
        if not prompt:
            return jsonify({'success': False, 'error': 'Prompt cannot be empty'}), 400
        
        # Generate content using Gemini
        content = generate_linkedin_post(prompt)
        
        return jsonify({
            'success': True,
            'content': content,
            'message': 'Content generated successfully'
        })
        
    except Exception as e:
        logging.error(f"Error in generate_content: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to generate content'
        }), 500

@app.route('/api/generate-image', methods=['POST'])
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
            logging.warning(f"Stability AI image generation failed: {stability_error}")
            
            # Fall back to Gemini
            try:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"generated_{timestamp}.png")
                generate_image_with_gemini(prompt, image_path)
                image_url = f"/static/uploads/{os.path.basename(image_path)}"
                
            except Exception as gemini_error:
                logging.error(f"Gemini image generation failed: {gemini_error}")
                raise Exception("Both image generation services failed")
        
        return jsonify({
            'success': True,
            'image_url': image_url,
            'message': 'Image generated successfully'
        })
        
    except Exception as e:
        logging.error(f"Error in generate_image: {str(e)}")
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

@app.route('/api/create-post', methods=['POST'])
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
            else:
                post.status = 'failed'
                post.error_message = result.get('error', 'Unknown error')
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'post_id': post.id,
            'status': post.status,
            'message': 'Post created successfully'
        })
        
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

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500
