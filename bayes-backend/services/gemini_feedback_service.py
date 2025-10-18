import os
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)

gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    logger.error("GEMINI_API_KEY not set; Gemini feedback model unavailable")
    feedback_model = None
else:
    genai.configure(api_key=gemini_api_key)
    feedback_model = genai.GenerativeModel("gemini-2.0-flash-exp")
