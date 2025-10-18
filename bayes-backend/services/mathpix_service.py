import httpx
import logging
from typing import Dict, Any
import os

# Configure logging
logger = logging.getLogger(__name__)


class MathpixService:
    """Service for interacting with the Mathpix OCR API to convert math images to LaTeX."""

    # Base API URL for Mathpix
    BASE_URL = "https://api.mathpix.com/v3/text"

    def __init__(self, app_id: str, app_key: str):
        """Initialize the Mathpix service with API credentials.

        Args:
            app_id: Mathpix application ID
            app_key: Mathpix application key
        """
        self.app_id = app_id
        self.app_key = app_key
        self.headers = {
            "app_id": app_id,
            "app_key": app_key,
            "Content-Type": "application/json",
        }

    async def process_image(
        self, image_data: str, is_base64: bool = False
    ) -> Dict[str, Any]:
        """Process an image with the Mathpix OCR API.

        Args:
            image_data: Either a base64-encoded image string or a URL to an image
            is_base64: True if image_data is a base64-encoded string, False if it's a URL

        Returns:
            Dict containing the OCR results, including the LaTeX representation
        """
        try:
            # Prepare the request payload
            payload = {}

            if is_base64:
                # Make sure the base64 string doesn't include the "data:image/..." prefix
                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]

                payload = {
                    "src": f"data:image/jpeg;base64,{image_data}",
                    "formats": ["latex", "text"],
                    "data_options": {
                        "include_latex": True,
                        "include_asciimath": False,
                        "include_mathml": False,
                    },
                }
            else:
                # Image is a URL
                payload = {
                    "src": image_data,
                    "formats": ["latex", "text"],
                    "data_options": {
                        "include_latex": True,
                        "include_asciimath": False,
                        "include_mathml": False,
                    },
                }

            # Make the API request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.BASE_URL,
                    headers=self.headers,
                    json=payload,
                    timeout=30.0,  # 30 second timeout
                )

            # Check for successful response
            response.raise_for_status()

            # Parse and return the response
            result = response.json()
            logger.info(
                f"Successfully processed image with Mathpix: {result.get('text', '')[:50]}..."
            )
            return result

        except httpx.HTTPError as e:
            logger.error(f"HTTP error occurred when calling Mathpix API: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error processing image with Mathpix: {str(e)}")
            raise


# Create a singleton instance if credentials are available
mathpix_app_id = os.getenv("MATHPIX_APP_ID")
mathpix_app_key = os.getenv("MATHPIX_APP_KEY")

mathpix_service = None
if mathpix_app_id and mathpix_app_key:
    mathpix_service = MathpixService(mathpix_app_id, mathpix_app_key)
else:
    logger.warning("Mathpix credentials not found. OCR features will be disabled.")
