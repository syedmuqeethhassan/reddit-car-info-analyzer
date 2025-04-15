from dotenv import load_dotenv
import os

def load_environment():
    """
    Load environment variables from .env file
    """
    # Load environment variables from .env file
    load_dotenv()
    
    # Check if necessary environment variables are set
    required_vars = ["GOOGLE_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Warning: The following required environment variables are missing: {', '.join(missing_vars)}")
        print("Please make sure they are set in your .env file or environment.")
        
    return os.environ.get("GOOGLE_API_KEY")