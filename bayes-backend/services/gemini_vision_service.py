import google.generativeai as genai
import logging
import json
from typing import Dict, Any
import os
import base64
from PIL import Image
import io

# Configure logging
logger = logging.getLogger(__name__)


class GeminiVisionService:
    """Service for interacting with Gemini Vision API to process and analyze images."""

    def __init__(self, api_key: str):
        """Initialize the Gemini Vision service with API credentials.

        Args:
            api_key: Google Gemini API key
        """
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.5-pro")

    async def detect_topic(
        self, image_data: str, is_base64: bool = False
    ) -> Dict[str, Any]:
        """Process an image with Gemini Vision API to detect the math topic.

        Args:
            image_data: Either a base64-encoded image string or a URL to an image
            is_base64: True if image_data is a base64-encoded string, False if it's a URL

        Returns:
            Dict containing the detected topic and confidence level
        """
        try:
            # Prepare the image for processing (supports common raster formats and PDFs)
            if is_base64:
                logger.info("Processing base64-encoded data")

                # Detect and strip any data URI prefix (e.g. data:image/png;base64, or data:application/pdf;base64,)
                mime_type = None
                if image_data.startswith("data:") and ";base64," in image_data:
                    mime_type, image_data = image_data.split(";base64,", 1)
                    mime_type = mime_type.replace(
                        "data:", ""
                    )  # e.g. image/png or application/pdf
                    logger.info(f"Detected MIME type from data URI: {mime_type}")

                try:
                    # Decode base64 to bytes
                    image_bytes = base64.b64decode(image_data)
                    logger.info(f"Decoded base64: {len(image_bytes)} bytes")

                    # --------------------------------------------------------
                    # Handle PDF separately by converting first page to image
                    # --------------------------------------------------------
                    is_pdf = False
                    if mime_type == "application/pdf" or image_bytes[:4] == b"%PDF":
                        is_pdf = True

                    if is_pdf:
                        logger.info(
                            "Input appears to be a PDF. Converting pages to images…"
                        )
                        try:
                            from pdf2image import (
                                convert_from_bytes,
                            )  # Lazy import to avoid hard dep if unused

                            try:
                                pages = convert_from_bytes(image_bytes)
                            except Exception as conv_err:
                                logger.warning(
                                    f"Poppler conversion failed ({conv_err}). Trying pdfium renderer..."
                                )
                                try:
                                    pages = convert_from_bytes(
                                        image_bytes, pdf_renderer="pdfium"
                                    )
                                except Exception as pdfium_err:
                                    logger.error(
                                        f"PDFium conversion also failed: {pdfium_err}"
                                    )
                                    raise

                            if not pages:
                                raise ValueError("PDF contained no pages")

                            # Limit to first 10 pages to control prompt size / cost
                            max_pages = int(os.getenv("PDF_PAGE_LIMIT", "10"))
                            images = pages[:max_pages]
                            logger.info(
                                f"Converted {len(images)} page(s) to images for Gemini analysis"
                            )
                        except Exception as e:
                            logger.error(f"Failed to convert PDF to image: {e}")
                            raise ValueError(
                                "Unable to process PDF file. Ensure the PDF is not password-protected and try again."
                            )
                    else:
                        # Assume raster image that Pillow can open
                        image = Image.open(io.BytesIO(image_bytes))
                        images = [image]
                        logger.info(f"Opened image with Pillow. Size: {image.size}")

                except Exception as e:
                    logger.error(f"Failed to decode/prepare image bytes: {str(e)}")
                    raise ValueError(f"Invalid image data: {str(e)}")
            else:
                # Handle image URL case if needed
                logger.error("URL-based images not supported yet")
                raise ValueError("URL-based images not supported yet")

            # Create the prompt
            prompt = """
            You are analyzing a math homework or problem image. 
            
            1. Identify the main math topic being covered in this image.
            2. Be specific but use standard educational terminology (e.g., "Definite Integrals" not just "Calculus").
            3. If you cannot identify a specific math topic, return an error.
            4. Return ONLY a JSON object with the following structure. The "course" field MUST be one of the EXACT codes below (case-sensitive):
               k-1, 2-3, 4-6, pre-algebra, algebra-1, geometry, algebra-2, trigonometry, calc-1, calc-2, calc-3.
               Do NOT return spaces (e.g. use "calc-1" not "calc 1").
            {
                "topic": "The specific math topic",
                "course": "<one of the codes above>",
                "confidence": 0.95 // Your confidence level from 0-1
            }
            
            DO NOT include any explanations, descriptions, or additional text. ONLY the JSON object.
            If you cannot identify a math topic, return: {"error": "Could not identify a mathematics topic in this image"}
            """

            # Prepare parts for Gemini request (prompt + one or more images)
            content_parts = [prompt] + images  # 'images' is list in both branches above

            # Make the API request
            logger.info(
                f"Sending request to Gemini Vision API with {len(images)} image(s)"
            )
            response = self.model.generate_content(content_parts)

            # Extract the JSON response
            result_text = response.text
            logger.info(
                f"Received response from Gemini Vision API: {result_text[:100]}..."
            )

            # Clean up the response to get valid JSON
            if "```json" in result_text:
                logger.info("Extracting JSON from code block")
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                logger.info("Extracting content from code block")
                result_text = result_text.split("```")[1].strip()

            try:
                result = json.loads(result_text)
                logger.info(f"Successfully parsed JSON: {result}")

                # Check if there's an error in the result
                if "error" in result:
                    logger.warning(f"Gemini returned an error: {result['error']}")
                    return {
                        "topic": "Error detecting topic",
                        "course": "calc 1",
                        "confidence": 0.0,
                        "error": result["error"],
                    }

                # Validate that we have a proper topic
                topic = result.get("topic", "").strip()
                if not topic or topic.lower() in [
                    "general mathematics",
                    "unknown",
                    "error",
                    "none",
                ]:
                    logger.warning(f"Invalid topic detected: '{topic}'")
                    return {
                        "topic": "Error detecting topic",
                        "course": "calc 1",
                        "confidence": 0.0,
                        "error": "Could not identify a specific mathematics topic in this image",
                    }

                logger.info(f"Successfully detected topic from image: {topic}")
                return result

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {str(e)}")
                logger.error(f"Response text: {result_text}")
                # Provide a default response instead of failing
                return {
                    "topic": "Error detecting topic",
                    "course": "calc 1",
                    "confidence": 0.0,
                    "error": "Failed to parse AI response",
                }

        except Exception as e:
            logger.error(
                f"Error detecting topic from image with Gemini Vision: {str(e)}"
            )
            # Return a default response instead of raising an exception
            return {
                "topic": "Error detecting topic",
                "course": "calc 1",
                "confidence": 0.0,
                "error": str(e),
            }


# Create a singleton instance if credentials are available
gemini_api_key = os.getenv("GEMINI_API_KEY")

gemini_vision_service = None
if gemini_api_key:
    gemini_vision_service = GeminiVisionService(gemini_api_key)
    logger.info("Gemini Vision Service initialized successfully")
else:
    logger.warning(
        "Gemini API key not found. Topic detection features will be disabled."
    )
