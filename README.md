# Bayes - AI-Powered Math Tutor

Bayes is an AI-powered tutoring platform that helps students master calculus through personalized learning experiences, interactive problem-solving, and instant feedback.

## Features

- **AI-Generated Content**: Custom learning materials generated using Google Gemini AI
- **Interactive Problem Solving**: Practice problems with immediate feedback
- **Handwriting Recognition**: Upload photos of your work for instant analysis using OCR
- **Progress Tracking**: Save your progress and resume learning anytime
- **Tommy AI Assistant**: Get contextual help and hints as you work through problems
- **Subscription Management**: Flexible pricing plans with Stripe integration
- **User Authentication**: Secure authentication powered by Supabase

## Project Structure

```
BayesPublic/
├── bayes-backend/          # FastAPI backend server
│   ├── routers/           # API route handlers
│   ├── services/          # External service integrations
│   ├── models/            # Pydantic data models
│   ├── prompts/           # AI prompt templates
│   └── utils/             # Utility functions
│
├── bayes-frontend/        # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utility libraries
│   └── public/           # Static assets
│
└── SECURITY.md           # Security guidelines and best practices
```

## 🛠️ Setup

### Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- **Git**

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd bayes-backend
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

5. Run the development server:

   ```bash
   uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd bayes-frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Documentation

- [Backend README](./bayes-backend/README.md) - Backend-specific documentation
- [Frontend README](./bayes-frontend/README.md) - Frontend-specific documentation
- [SECURITY.md](./SECURITY.md) - Security guidelines and best practices

## Development

### Backend Development

```bash
cd bayes-backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API documentation will be available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Development

```bash
cd bayes-frontend
npm run dev
```

The app will hot-reload on changes.
