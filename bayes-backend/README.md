# Bayes Backend

This is the backend service for Bayes, an AI-powered calculus tutor.

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
```

2. Activate the virtual environment:

- On Windows: `venv\Scripts\activate`
- On macOS/Linux: `source venv/bin/activate`

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file with the following variables:

```
GEMINI_API_KEY=<your-gemini-api-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
JWT_SECRET=<your-jwt-secret>
MATHPIX_APP_ID=<your-mathpix-app-id>
MATHPIX_APP_KEY=<your-mathpix-app-key>
```

5. Run the server:

```bash
uvicorn main:app --reload
```

## Mathpix API Integration

The backend now includes integration with the Mathpix API for OCR (Optical Character Recognition) of handwritten math. This allows users to write math expressions by hand and have them converted to LaTeX.

### Setup Mathpix API

1. Sign up for a Mathpix account at [https://mathpix.com/](https://mathpix.com/)
2. Create an API key in the Mathpix dashboard
3. Add the `MATHPIX_APP_ID` and `MATHPIX_APP_KEY` to your `.env` file

### API Endpoints

The following OCR endpoints are available:

- `POST /api/ocr/math` - Convert an image to LaTeX
- `POST /api/check-answer-ocr` - Check a handwritten answer against a correct answer

### Request Format

For the OCR endpoints, you can send either:

1. A base64-encoded image in the JSON request body:
```json
{
  "image_data": "base64-encoded-image-data"
}
```

2. Or a file upload with multipart/form-data.

For the answer checking endpoint, you need to provide:
```json
{
  "image_data": "base64-encoded-image-data",
  "correct_answer": "LaTeX-formatted-correct-answer",
  "problem_type": "general"
}
```

## Docker

You can also run this service using Docker:

```bash
docker build -t bayes-backend .
docker run -p 8000:8000 --env-file .env bayes-backend
``` 