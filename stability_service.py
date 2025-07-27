import os
import logging
import requests
import base64

# Initialize Stability AI client
STABILITY_API_KEY = os.environ.get("STABILITY_API_KEY")
STABILITY_API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image"

def generate_image_with_stability(prompt: str) -> str:
    """Generate an image using Stability AI"""
    try:
        if not STABILITY_API_KEY:
            raise Exception("Stability AI API key not configured")
        
        headers = {
            "Authorization": f"Bearer {STABILITY_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        data = {
            "text_prompts": [
                {
                    "text": f"Professional LinkedIn post image: {prompt}. Style: clean, modern, business-appropriate, high quality",
                    "weight": 1
                }
            ],
            "cfg_scale": 7,
            "height": 1024,
            "width": 1024,
            "samples": 1,
            "steps": 30,
        }
        
        response = requests.post(
            STABILITY_API_URL,
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code != 200:
            raise Exception(f"Stability AI API error: {response.status_code} - {response.text}")
        
        response_data = response.json()
        
        if "artifacts" in response_data and len(response_data["artifacts"]) > 0:
            # Get the base64 image data
            image_data = response_data["artifacts"][0]["base64"]
            
            # Convert to data URL for direct display
            image_url = f"data:image/png;base64,{image_data}"
            return image_url
        else:
            raise Exception("No image generated in response")
            
    except Exception as e:
        logging.error(f"Error generating image with Stability AI: {str(e)}")
        raise Exception(f"Failed to generate image: {str(e)}")