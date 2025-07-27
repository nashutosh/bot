import os
import logging
from werkzeug.utils import secure_filename
import PyPDF2
from gemini_service import summarize_text

# Ensure all API keys and tokens are loaded from environment variables as set in .env

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text content from PDF file"""
    try:
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
        
        return text.strip()
    
    except Exception as e:
        logging.error(f"Error extracting text from PDF: {str(e)}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def process_pdf_file(file, upload_folder: str) -> dict:
    """Process uploaded PDF file and extract content"""
    try:
        if not file or file.filename == '':
            raise Exception("No file selected")
        
        if not allowed_file(file.filename):
            raise Exception("Invalid file type. Only PDF files are allowed.")
        
        # Secure the filename
        filename = secure_filename(file.filename)
        if not filename:
            filename = "upload.pdf"
        
        # Save the file
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        # Extract text from PDF
        extracted_text = extract_text_from_pdf(file_path)
        
        if not extracted_text.strip():
            raise Exception("No text content found in the PDF")
        
        # Generate summary using Gemini
        summary = summarize_text(extracted_text)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        return {
            'success': True,
            'filename': filename,
            'original_filename': file.filename,
            'file_path': file_path,
            'file_size': file_size,
            'extracted_text': extracted_text,
            'summary': summary,
            'message': 'PDF processed successfully'
        }
        
    except Exception as e:
        logging.error(f"Error processing PDF: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'message': f'Failed to process PDF: {str(e)}'
        }
