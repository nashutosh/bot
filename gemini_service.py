import json
import logging
import os
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Warning: google-genai not properly installed")
    genai = None
    types = None

# Initialize Gemini client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def generate_linkedin_post(prompt: str) -> str:
    """Generate a LinkedIn post using Gemini AI"""
    try:
        system_prompt = """You are a professional LinkedIn content creator. Create engaging, professional LinkedIn posts that:
        - Are authentic and valuable to the professional community
        - Use a conversational yet professional tone
        - Include relevant hashtags (3-5 maximum)
        - Are optimized for LinkedIn engagement
        - Stay within 1300 characters for optimal visibility
        - Include a clear call-to-action when appropriate
        
        IMPORTANT: Return ONLY the LinkedIn post content. Do not include any introductory text like "Here's your post" or "Here's a LinkedIn post". Start directly with the post content.
        
        Generate content based on the user's prompt."""
        
        full_prompt = f"{system_prompt}\n\nUser request: {prompt}"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )
        
        if response.text:
            content = response.text.strip()
            # Remove any introductory phrases that might slip through
            content = content.replace("Here's your LinkedIn post:", "").replace("Here's a LinkedIn post about", "").replace("Here's your post:", "").replace("Here is your post:", "").replace("---", "").strip()
            return content
        else:
            raise Exception("Empty response from Gemini")
            
    except Exception as e:
        logging.error(f"Error generating LinkedIn post: {str(e)}")
        raise Exception(f"Failed to generate content: {str(e)}")

def summarize_text(text: str) -> str:
    """Summarize text content for LinkedIn post creation"""
    try:
        prompt = f"""Summarize the following text into key points that would be suitable for creating a LinkedIn post. Focus on:
        - Main insights or learnings
        - Professional value or takeaways
        - Actionable information
        - Key statistics or findings
        
        Text to summarize:
        {text}"""
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        if response.text:
            return response.text.strip()
        else:
            raise Exception("Empty response from Gemini")
            
    except Exception as e:
        logging.error(f"Error summarizing text: {str(e)}")
        raise Exception(f"Failed to summarize content: {str(e)}")

def generate_image_with_gemini(prompt: str, image_path: str) -> str:
    """Generate an image using Gemini's image generation capability"""
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-preview-image-generation",
            contents=f"Create a professional image for LinkedIn post: {prompt}",
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )
        
        if not response.candidates:
            raise Exception("No image generated")
        
        content = response.candidates[0].content
        if not content or not content.parts:
            raise Exception("No content in response")
        
        for part in content.parts:
            if part.inline_data and part.inline_data.data:
                with open(image_path, 'wb') as f:
                    f.write(part.inline_data.data)
                return image_path
        
        raise Exception("No image data found in response")
        
    except Exception as e:
        logging.error(f"Error generating image with Gemini: {str(e)}")
        raise Exception(f"Failed to generate image: {str(e)}")
