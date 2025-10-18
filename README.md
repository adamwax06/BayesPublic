# Bayes - AI-Powered Math Tutor

Bayes is an AI-powered tutoring platform that helps students master calculus through personalized learning experiences, interactive problem-solving, and instant feedback.

## 🚀 Features

- **AI-Generated Content**: Custom learning materials generated using Google Gemini AI
- **Interactive Problem Solving**: Practice problems with immediate feedback
- **Handwriting Recognition**: Upload photos of your work for instant analysis using OCR
- **Progress Tracking**: Save your progress and resume learning anytime
- **Tommy AI Assistant**: Get contextual help and hints as you work through problems
- **Subscription Management**: Flexible pricing plans with Stripe integration
- **User Authentication**: Secure authentication powered by Supabase

## 📁 Project Structure

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

## 🔐 Security

**IMPORTANT**: This repository is configured to never expose API keys or secrets. Before contributing:

1. Review [SECURITY.md](./SECURITY.md) for detailed security guidelines
2. Ensure all API keys are in `.env` files (which are gitignored)
3. Never commit files containing actual credentials
4. Use `.env.example` files as templates

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

## 🔑 Required API Keys

To run this project, you'll need the following API keys:

### Required

- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Supabase**: Create a project at [Supabase](https://app.supabase.com/)
- **Stripe**: Get keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### Optional (for full functionality)

- **Mathpix**: For handwriting OCR - [Mathpix](https://mathpix.com/)
- **GitHub Token**: For bug reporting - [GitHub Settings](https://github.com/settings/tokens)
- **Resend**: For email services - [Resend](https://resend.com/api-keys)

See `.env.example` files in each directory for detailed setup instructions.

## 🗄️ Database Setup

The project uses Supabase (PostgreSQL) for data storage. You'll need to:

1. Create a Supabase project
2. Set up the following tables:

   - `user_profiles`
   - `subscriptions`
   - `saved_topics`
   - `topic_progress`

3. Enable Row Level Security (RLS) on all tables
4. Apply the migration scripts (if provided)

## 🚢 Deployment

### Backend Deployment

The backend can be deployed to:

- **Railway**: Automatic deployments from Git
- **Heroku**: Using the included Dockerfile
- **Any VPS**: Using Docker or direct Python deployment

Remember to set all environment variables in your deployment platform.

### Frontend Deployment

The frontend is optimized for:

- **Vercel**: Automatic deployments from Git (recommended for Next.js)
- **Netlify**: Alternative static hosting
- **Any Node.js hosting**: Using `npm run build && npm start`

## 📚 Documentation

- [Backend README](./bayes-backend/README.md) - Backend-specific documentation
- [Frontend README](./bayes-frontend/README.md) - Frontend-specific documentation
- [SECURITY.md](./SECURITY.md) - Security guidelines and best practices

## 🧪 Development

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

## 🧹 Before Committing

Always run these checks before pushing:

```bash
# Check for accidentally tracked secrets
git status

# Verify .env files are ignored
git check-ignore .env bayes-backend/.env bayes-frontend/.env.local

# Search for potential secrets in tracked files
git grep -i "api_key\|secret_key\|password" -- ':!*.md' ':!*.example'
```

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Important**: Review [SECURITY.md](./SECURITY.md) before contributing to ensure you don't accidentally commit secrets.

## 📧 Contact

For questions or support:

- Email: support@trybayes.com
- Website: [trybayes.com](https://trybayes.com)

## 🙏 Acknowledgments

- **Google Gemini**: AI content generation
- **Supabase**: Authentication and database
- **Stripe**: Payment processing
- **Mathpix**: OCR technology
- **Vercel**: Frontend hosting
- **FastAPI**: Backend framework
- **Next.js**: Frontend framework
