from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_google_genai import GoogleGenerativeAI
from langchain.chains.summarize import load_summarize_chain
from langchain.schema import Document
import os
from werkzeug.utils import secure_filename
from env_loader import load_environment
from debug_logger import DebugLogger

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = './uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load API key from environment variables
api_key = load_environment()
if not api_key:
    api_key = "YOUR_GOOGLE_API_KEY"

os.environ["GOOGLE_API_KEY"] = api_key

# Define the summarize_text function that directly sends text to Gemini
def summarize_text(text_content):
    """
    Summarize the given text using LangChain and Gemini
    
    Args:
        text_content (str): The raw text content to summarize
        
    Returns:
        str: The generated summary
    """
    try:
        # No preprocessing or JSON parsing, just use the raw text content
        doc = Document(page_content=text_content)
        
        # Initialize the LLM
        llm = GoogleGenerativeAI(model="gemini-2.5-pro-exp-03-25")
        
        # Load the summarization chain
        chain = load_summarize_chain(llm, chain_type="stuff")
        
        # Run the chain with a basic prompt for any type of text
        summary_output = chain.invoke(
            [doc], 
            {
                "prompt": """
                Summarize the following text content.
                Focus on the main points, insights, and key information.
                Organize the summary to be clear and comprehensive.
                """
            }
        )
        
        # Extract and return the summary
        summary = summary_output.get("output_text", "")
        
        # If summary is empty for some reason, create a fallback summary
        if not summary.strip():
            summary = "Unable to generate a summary for the provided text content."
        
        return summary
        
    except Exception as e:
        import traceback
        print(f"Error in summarize_text: {str(e)}")
        print(traceback.format_exc())
        return f"An error occurred during summarization: {str(e)}"

@app.route('/initialize', methods=['POST'])
def initialize():
    try:
        print("===============================")
        print("REQUEST RECEIVED at /initialize endpoint")
        print("Request method:", request.method)
        print("Request headers:", dict(request.headers))
        print("Request form data:", request.form)
        print("Request files:", request.files)
        
        # Check if the request contains a file
        if 'file' not in request.files:
            print("ERROR: No file part in the request")
            return jsonify({"success": False, "error": "No file part in the request"}), 400
        
        file = request.files['file']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            print("ERROR: No selected file")
            return jsonify({"success": False, "error": "No selected file"}), 400
        
        print(f"Processing file: {file.filename}")
        
        # Save the file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        print(f"Saved uploaded file to {file_path}")
        
        # Read the file content as raw text (binary mode to handle any file type)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
        except UnicodeDecodeError:
            # If it fails with UTF-8, try reading in binary mode and decode as best as possible
            with open(file_path, 'rb') as f:
                file_content = f.read().decode('utf-8', errors='replace')
        
        print(f"Read file content ({len(file_content)} chars)")
        
        # Process with LangChain and Gemini - sending raw text directly
        print("Sending raw text to Gemini for summarization...")
        summary = summarize_text(file_content)
        
        # Log the summary
        print("Summary generated successfully")
        
        # Clean up the temporary file
        os.remove(file_path)
        
        # Return the summary
        response = {
            "success": True,
            "summary": summary,
            "source_file": file.filename
        }
        print("Sending response back to client")
        print("===============================")
        return jsonify(response)
    
    except Exception as e:
        import traceback
        print("ERROR in /initialize endpoint:", str(e))
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    DebugLogger.log_status("Starting Flask server on port 5000...", "green")
    DebugLogger.log_status("Text summarization service is ready to accept requests", "green")
    DebugLogger.log_status("Waiting for requests at http://localhost:5000/initialize", "cyan")
    app.run(host='0.0.0.0', port=5000, debug=True)