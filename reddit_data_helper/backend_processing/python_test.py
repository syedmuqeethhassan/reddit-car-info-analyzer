import os
import json
import requests
import sys

def test_summarization(file_path=None):
    """
    Test the Flask application by sending a sample text file for summarization.
    
    Args:
        file_path (str, optional): Path to the text file to summarize.
                                 If None, creates a sample file.
    """
    # If no file path is provided, create a sample file
    if not file_path:
        sample_text = """
        Reddit is a social media platform founded in 2005 by Steve Huffman and Alexis Ohanian.
        It features content rating, discussion threads, and topic categories called "subreddits."
        Users can post text, links, images, and videos which others can upvote or downvote.
        Reddit has over 52 million daily active users and is known as "the front page of the internet."
        The platform uses a karma system to reward valuable contributions.
        Moderators are volunteers who enforce rules within specific subreddits.
        Reddit has been involved in several controversies but remains popular for its unique community-driven approach.
        """
        
        # Create a temporary file
        file_path = "sample_text.txt"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(sample_text)
        print(f"Created sample file at: {file_path}")
    
    # Ensure the file exists
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return
    
    # Prepare the request
    url = "http://localhost:5000/initialise"
    payload = {"filePath": os.path.abspath(file_path)}
    headers = {"Content-Type": "application/json"}
    
    print(f"Sending request to summarize file: {file_path}")
    print(f"Request payload: {json.dumps(payload, indent=2)}")
    
    try:
        # Send the request
        response = requests.post(url, json=payload, headers=headers)
        
        # Process the response
        if response.status_code == 200:
            result = response.json()
            print("\nSummary received from API:")
            print("-" * 50)
            print(result.get("summary", "No summary returned"))
            print("-" * 50)
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
    
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the Flask application.")
        print("Make sure the Flask app is running on http://localhost:5000")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    # If a file path is provided as an argument, use it
    if len(sys.argv) > 1:
        test_summarization(sys.argv[1])
    else:
        test_summarization()