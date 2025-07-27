import os
import logging
from openai import OpenAI

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "default_key"))

def generate_image_with_dalle(prompt: str) -> str:
    """Generate an image using DALL-E 3"""
    try:
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=f"Professional LinkedIn post image: {prompt}. Style: clean, modern, business-appropriate",
            n=1,
            size="1024x1024",
            quality="standard"
        )
        
        if response.data and len(response.data) > 0:
            image_url = response.data[0].url
            if image_url:
                return image_url
            else:
                raise Exception("No image URL in response")
        else:
            raise Exception("No image generated")
            
    except Exception as e:
        logging.error(f"Error generating image with DALL-E: {str(e)}")
        raise Exception(f"Failed to generate image: {str(e)}")

def enhance_content_with_gpt(content: str) -> str:
    """Enhance content using GPT-4o for better LinkedIn engagement"""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o"
            messages=[
                {
                    "role": "system",
                    "content": "You are a LinkedIn content expert. Enhance the given content to make it more engaging for LinkedIn while keeping it professional and authentic. Add relevant hashtags and ensure it's within 1300 characters."
                },
                {
                    "role": "user",
                    "content": content
                }
            ],
            max_tokens=500
        )
        
        if response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content
            if content:
                return content.strip()
            else:
                raise Exception("Empty content generated")
        else:
            raise Exception("No content generated")
            
    except Exception as e:
        logging.error(f"Error enhancing content with GPT: {str(e)}")
        raise Exception(f"Failed to enhance content: {str(e)}")
