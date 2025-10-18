# Bayes - AI Calculus Tutoring Assistant

Bayes is an intelligent tutoring system that helps students learn calculus concepts through interactive AI-powered conversations. Built with a modern tech stack, it provides personalized explanations, worked examples, and practice problems.

## 🏗️ **Technology Stack**

### Frontend

- **Next.js 15.3.5** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **React 19** - Latest React with concurrent features

### Backend

- **FastAPI** - Modern Python web framework
- **Google Gemini 1.5 Flash** - AI model for tutoring responses
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI web server

## 🚀 **Getting Started**

### Prerequisites

- **Node.js 18+** for the frontend
- **Python 3.11+** for the backend
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### 1. Clone & Setup

```bash
git clone <repository-url>
cd bayes
```

### 2. Backend Setup

#### Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Environment Configuration

Create a `.env` file in the project root:

```env
# Required: Get your key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Server configuration
FASTAPI_HOST=127.0.0.1
FASTAPI_PORT=8000

# Frontend API endpoint
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Frontend Setup

#### Install Node.js Dependencies

```bash
npm install --legacy-peer-deps
```

## 🎯 **Start Commands**

### Development Mode (Both Services)

#### 1. Start Backend (Terminal 1)

```bash
# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Start Frontend (Terminal 2)

```bash
# Start Next.js development server
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🛠️ **Development Workflow**

### Available Scripts

#### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

#### Backend

```bash
# With virtual environment activated
uvicorn backend.main:app --reload                    # Development server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 # Production server
```

### Testing the API

```bash
# Test the tutoring endpoint
curl -X POST "http://localhost:8000/api/learn-topic" \
     -H "Content-Type: application/json" \
     -d '{"topic": "chain rule"}'

# Health check
curl http://localhost:8000/api/health
```

## 📁 **Project Structure**

```
bayes/
├── src/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx       # Main chat interface
│   │   ├── layout.tsx     # Root layout
│   │   └── globals.css    # Global styles
├── backend/               # FastAPI backend
│   ├── main.py           # API routes and Gemini integration
│   └── README.md         # Backend-specific documentation
├── memory_bank/          # Project context and documentation
├── public/               # Static assets
├── venv/                 # Python virtual environment
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
└── .env                  # Environment variables (create this)
```

## 🤖 **Features**

- **AI-Powered Tutoring**: Uses Google Gemini for intelligent calculus explanations
- **Interactive Chat**: ChatGPT-style interface for natural conversations
- **Structured Learning**: Provides key concepts, examples, and practice problems
- **Topic History**: Sidebar showing previous calculus topics discussed
- **Responsive Design**: Works on desktop and mobile devices

## 🔧 **Configuration**

### Environment Variables

| Variable              | Description           | Required                            |
| --------------------- | --------------------- | ----------------------------------- |
| `GEMINI_API_KEY`      | Google Gemini API key | Yes                                 |
| `FASTAPI_HOST`        | Backend host address  | No (default: 127.0.0.1)             |
| `FASTAPI_PORT`        | Backend port number   | No (default: 8000)                  |
| `NEXT_PUBLIC_API_URL` | Frontend API endpoint | No (default: http://localhost:8000) |

### API Endpoints

- `GET /` - Health check
- `POST /api/learn-topic` - Process calculus topic
- `GET /api/health` - Service health status
- `GET /docs` - Interactive API documentation

## 🎓 **How It Works**

1. **User Input**: Student enters a calculus topic (e.g., "chain rule")
2. **AI Processing**: Backend sends topic to Gemini with specialized tutoring prompt
3. **Structured Response**: AI provides explanation, examples, and practice problems
4. **Interactive Display**: Frontend shows response in chat-style interface
5. **Topic History**: Previous topics are saved in sidebar for easy reference

## 🚀 **Quick Start (TL;DR)**

```bash
# Backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Add GEMINI_API_KEY to .env file
cd bayes-backend
uv run main.py


# Frontend (new terminal)
npm install && npm run dev
```

Open http://localhost:3000 and start learning calculus! 🎉
