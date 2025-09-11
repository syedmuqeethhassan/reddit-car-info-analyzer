import json
import os
from http.server import BaseHTTPRequestHandler

from langchain_google_genai import GoogleGenerativeAI
from langchain.chains.summarize import load_summarize_chain
from langchain.schema import Document


def run_summarize(text_content: str) -> str:
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY env var")

    llm = GoogleGenerativeAI(model="gemini-2.0-flash-lite")
    chain = load_summarize_chain(llm, chain_type="stuff")
    doc = Document(page_content=text_content)
    output = chain.invoke([doc], {
        "prompt": (
            "Summarize the following text content. Focus on key insights, pros/cons, "
            "owner experiences, and common advice. Return a concise, structured summary."
        )
    })
    summary = output.get("output_text", "")
    if not summary.strip():
        summary = "Unable to generate a summary for the provided text content."
    return summary


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('content-length', '0'))
            body = self.rfile.read(content_length) if content_length else b''
            data = json.loads(body.decode('utf-8') or '{}')
            text_content = data.get('text_content', '')

            if not text_content:
                self.send_response(400)
                self.send_header('content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "text_content is required"
                }).encode('utf-8'))
                return

            summary = run_summarize(text_content)

            self.send_response(200)
            self.send_header('content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "summary": summary,
            }).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e),
            }).encode('utf-8'))


