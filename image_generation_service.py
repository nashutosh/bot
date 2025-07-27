import os
import logging
import requests
import base64
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from PIL import Image, ImageDraw, ImageFont
import io
from stability_service import generate_image_with_stability
from gemini_service import generate_image_with_gemini

logger = logging.getLogger(__name__)

class ImageGenerationService:
    """Advanced image generation service with multiple AI providers and instant previews"""
    
    def __init__(self):
        self.upload_folder = os.environ.get('UPLOAD_FOLDER', 'static/uploads')
        self.max_retries = 3
        self.supported_formats = ['PNG', 'JPEG', 'WEBP']
        
    async def generate_image_async(self, prompt: str, style: str = "professional", 
                                 size: str = "1024x1024") -> Dict[str, Any]:
        """Generate image asynchronously with multiple provider fallback"""
        try:
            # Enhanced prompt for LinkedIn-specific content
            enhanced_prompt = self._enhance_prompt_for_linkedin(prompt, style)
            
            # Try multiple providers in order of preference
            providers = [
                ('stability', self._generate_with_stability),
                ('gemini', self._generate_with_gemini),
                ('fallback', self._generate_fallback_image)
            ]
            
            for provider_name, provider_func in providers:
                try:
                    logger.info(f"Attempting image generation with {provider_name}")
                    result = await provider_func(enhanced_prompt, size)
                    
                    if result['success']:
                        result['provider'] = provider_name
                        result['enhanced_prompt'] = enhanced_prompt
                        return result
                        
                except Exception as e:
                    logger.warning(f"{provider_name} failed: {str(e)}")
                    continue
            
            # If all providers fail, return error
            return {
                'success': False,
                'error': 'All image generation providers failed',
                'fallback_available': True
            }
            
        except Exception as e:
            logger.error(f"Image generation service error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'fallback_available': True
            }
    
    def _enhance_prompt_for_linkedin(self, prompt: str, style: str) -> str:
        """Enhance prompt for LinkedIn-appropriate imagery"""
        style_modifiers = {
            'professional': 'clean, modern, professional business style, corporate aesthetic, high quality, minimal design',
            'creative': 'creative, innovative, artistic, modern design, vibrant colors, engaging visual',
            'technical': 'technical, clean, modern interface, professional tech aesthetic, blue and white theme',
            'marketing': 'marketing-focused, engaging, professional, call-to-action visual, modern design',
            'educational': 'educational, informative, clear, professional presentation style, easy to read'
        }
        
        base_modifiers = "LinkedIn post image, social media ready, 16:9 aspect ratio, professional quality"
        style_modifier = style_modifiers.get(style, style_modifiers['professional'])
        
        enhanced = f"{prompt}, {style_modifier}, {base_modifiers}"
        return enhanced
    
    async def _generate_with_stability(self, prompt: str, size: str) -> Dict[str, Any]:
        """Generate image using Stability AI"""
        try:
            # Convert size format
            width, height = map(int, size.split('x'))
            
            image_data = generate_image_with_stability(prompt)
            
            if image_data:
                # Save image
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"stability_{timestamp}.png"
                filepath = os.path.join(self.upload_folder, filename)
                
                # Handle base64 data URL
                if image_data.startswith('data:image'):
                    image_data = image_data.split(',')[1]
                
                # Decode and save
                image_bytes = base64.b64decode(image_data)
                with open(filepath, 'wb') as f:
                    f.write(image_bytes)
                
                # Generate thumbnail
                thumbnail_path = self._generate_thumbnail(filepath)
                
                return {
                    'success': True,
                    'image_url': f"/static/uploads/{filename}",
                    'thumbnail_url': f"/static/uploads/{os.path.basename(thumbnail_path)}",
                    'filepath': filepath,
                    'size': size,
                    'format': 'PNG'
                }
            
            raise Exception("No image data received from Stability AI")
            
        except Exception as e:
            logger.error(f"Stability AI generation failed: {str(e)}")
            raise
    
    async def _generate_with_gemini(self, prompt: str, size: str) -> Dict[str, Any]:
        """Generate image using Gemini"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"gemini_{timestamp}.png"
            filepath = os.path.join(self.upload_folder, filename)
            
            # Generate with Gemini
            generate_image_with_gemini(prompt, filepath)
            
            if os.path.exists(filepath):
                # Generate thumbnail
                thumbnail_path = self._generate_thumbnail(filepath)
                
                return {
                    'success': True,
                    'image_url': f"/static/uploads/{filename}",
                    'thumbnail_url': f"/static/uploads/{os.path.basename(thumbnail_path)}",
                    'filepath': filepath,
                    'size': size,
                    'format': 'PNG'
                }
            
            raise Exception("Gemini failed to generate image")
            
        except Exception as e:
            logger.error(f"Gemini generation failed: {str(e)}")
            raise
    
    async def _generate_fallback_image(self, prompt: str, size: str) -> Dict[str, Any]:
        """Generate a fallback placeholder image"""
        try:
            width, height = map(int, size.split('x'))
            
            # Create a professional placeholder
            img = Image.new('RGB', (width, height), color='#f8fafc')
            draw = ImageDraw.Draw(img)
            
            # Try to load a font, fallback to default if not available
            try:
                font_size = max(24, width // 30)
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
            
            # Add LinkedIn branding colors
            draw.rectangle([0, 0, width, height//4], fill='#0a66c2')
            
            # Add text
            text_lines = [
                "LinkedIn Marketing",
                "Professional Content",
                "Generated Image"
            ]
            
            y_offset = height // 3
            for line in text_lines:
                bbox = draw.textbbox((0, 0), line, font=font)
                text_width = bbox[2] - bbox[0]
                x = (width - text_width) // 2
                
                draw.text((x, y_offset), line, fill='#374151', font=font)
                y_offset += font_size + 10
            
            # Add subtle prompt text
            if len(prompt) < 100:
                prompt_font_size = max(12, width // 50)
                try:
                    prompt_font = ImageFont.truetype("arial.ttf", prompt_font_size)
                except:
                    prompt_font = ImageFont.load_default()
                
                # Word wrap the prompt
                words = prompt.split()
                lines = []
                current_line = []
                
                for word in words:
                    test_line = ' '.join(current_line + [word])
                    bbox = draw.textbbox((0, 0), test_line, font=prompt_font)
                    if bbox[2] - bbox[0] < width - 40:
                        current_line.append(word)
                    else:
                        if current_line:
                            lines.append(' '.join(current_line))
                        current_line = [word]
                
                if current_line:
                    lines.append(' '.join(current_line))
                
                # Draw wrapped text
                y_offset = height - (len(lines) * (prompt_font_size + 5)) - 20
                for line in lines[:3]:  # Limit to 3 lines
                    bbox = draw.textbbox((0, 0), line, font=prompt_font)
                    text_width = bbox[2] - bbox[0]
                    x = (width - text_width) // 2
                    draw.text((x, y_offset), line, fill='#6b7280', font=prompt_font)
                    y_offset += prompt_font_size + 5
            
            # Save the image
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"fallback_{timestamp}.png"
            filepath = os.path.join(self.upload_folder, filename)
            
            img.save(filepath, 'PNG', quality=95)
            
            # Generate thumbnail
            thumbnail_path = self._generate_thumbnail(filepath)
            
            return {
                'success': True,
                'image_url': f"/static/uploads/{filename}",
                'thumbnail_url': f"/static/uploads/{os.path.basename(thumbnail_path)}",
                'filepath': filepath,
                'size': size,
                'format': 'PNG',
                'is_fallback': True
            }
            
        except Exception as e:
            logger.error(f"Fallback image generation failed: {str(e)}")
            raise
    
    def _generate_thumbnail(self, image_path: str, max_size: tuple = (300, 300)) -> str:
        """Generate a thumbnail for the image"""
        try:
            with Image.open(image_path) as img:
                # Create thumbnail
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Save thumbnail
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                thumbnail_filename = f"{base_name}_thumb.png"
                thumbnail_path = os.path.join(self.upload_folder, thumbnail_filename)
                
                img.save(thumbnail_path, 'PNG', quality=85)
                
                return thumbnail_path
                
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {str(e)}")
            return image_path  # Return original if thumbnail fails
    
    def optimize_image_for_linkedin(self, image_path: str) -> Dict[str, Any]:
        """Optimize image for LinkedIn posting"""
        try:
            with Image.open(image_path) as img:
                # LinkedIn recommended dimensions
                linkedin_sizes = {
                    'post': (1200, 627),  # 1.91:1 ratio
                    'story': (1080, 1920),  # 9:16 ratio
                    'cover': (1584, 396),   # 4:1 ratio
                }
                
                optimized_images = {}
                
                for size_name, dimensions in linkedin_sizes.items():
                    # Create optimized version
                    optimized_img = img.copy()
                    
                    # Calculate aspect ratios
                    target_ratio = dimensions[0] / dimensions[1]
                    current_ratio = optimized_img.width / optimized_img.height
                    
                    if current_ratio > target_ratio:
                        # Image is too wide, crop width
                        new_width = int(optimized_img.height * target_ratio)
                        left = (optimized_img.width - new_width) // 2
                        optimized_img = optimized_img.crop((left, 0, left + new_width, optimized_img.height))
                    elif current_ratio < target_ratio:
                        # Image is too tall, crop height
                        new_height = int(optimized_img.width / target_ratio)
                        top = (optimized_img.height - new_height) // 2
                        optimized_img = optimized_img.crop((0, top, optimized_img.width, top + new_height))
                    
                    # Resize to target dimensions
                    optimized_img = optimized_img.resize(dimensions, Image.Resampling.LANCZOS)
                    
                    # Save optimized version
                    base_name = os.path.splitext(os.path.basename(image_path))[0]
                    optimized_filename = f"{base_name}_{size_name}.png"
                    optimized_path = os.path.join(self.upload_folder, optimized_filename)
                    
                    optimized_img.save(optimized_path, 'PNG', quality=95, optimize=True)
                    
                    optimized_images[size_name] = {
                        'url': f"/static/uploads/{optimized_filename}",
                        'path': optimized_path,
                        'dimensions': dimensions
                    }
                
                return {
                    'success': True,
                    'optimized_images': optimized_images,
                    'message': 'Images optimized for LinkedIn'
                }
                
        except Exception as e:
            logger.error(f"Image optimization failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_image_variations(self, base_prompt: str, count: int = 3) -> Dict[str, Any]:
        """Generate multiple variations of an image"""
        try:
            variations = []
            styles = ['professional', 'creative', 'technical']
            
            for i in range(min(count, len(styles))):
                style = styles[i]
                variation_prompt = f"{base_prompt}, variation {i+1}, {style} style"
                
                # This would be called asynchronously in practice
                result = asyncio.run(self.generate_image_async(variation_prompt, style))
                
                if result['success']:
                    variations.append({
                        'style': style,
                        'image_url': result['image_url'],
                        'thumbnail_url': result.get('thumbnail_url'),
                        'prompt': variation_prompt
                    })
            
            return {
                'success': True,
                'variations': variations,
                'count': len(variations)
            }
            
        except Exception as e:
            logger.error(f"Image variation generation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

# Global service instance
image_service = ImageGenerationService()