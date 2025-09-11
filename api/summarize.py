import json
import os
from http.server import BaseHTTPRequestHandler

from langchain_google_genai import GoogleGenerativeAI


def run_summarize(text_content: str) -> str:
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY env var")

    llm = GoogleGenerativeAI(model="gemini-2.0-flash-lite", google_api_key=api_key)

    prompt = (
        "You are an expert automotive research assistant. Read the provided Reddit-derived "
        "content and produce a concise, structured summary with sections: Key Insights, "
        "Pros, Cons, and Advice. Keep it under 250 words.\n\n"
        f"Content to summarize:\n{text_content}"
    )

    result = llm.invoke(prompt)

    # Handle both string and message/object outputs defensively
    if isinstance(result, str):
        summary = result
    else:
        summary = getattr(result, "content", "") or str(result)

    summary = (summary or "").strip()
    if not summary:
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


