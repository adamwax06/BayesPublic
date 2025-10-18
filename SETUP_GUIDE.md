# Setup Guide - Bayes Project

This guide will help you set up the Bayes project for development or deployment.

## ✅ Security Status

**This repository is now secure and ready to be pushed to a public GitHub repository!**

All sensitive information has been protected:
- ✅ All `.env` files are gitignored
- ✅ No API keys are committed to the repository
- ✅ `.env.example` templates are provided
- ✅ Nested `.git` and `.github` folders have been removed
- ✅ Security documentation is in place

## 🚀 Quick Start

### 1. Clone and Setup Environment Variables

```bash
# Backend setup
cd bayes-backend
cp .env.example .env
# Edit .env with your actual API keys

# Frontend setup
cd ../bayes-frontend
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 2. Install Dependencies

**Backend:**
```bash
cd bayes-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd bayes-frontend
npm install
```

### 3. Run Development Servers

**Backend (Terminal 1):**
```bash
cd bayes-backend
source venv/bin/activate
uvicorn main:app --reload
# Server runs at http://localhost:8000
```

**Frontend (Terminal 2):**
```bash
cd bayes-frontend
npm run dev
# App runs at http://localhost:3000
```

## 🔑 Required API Keys

### Essential Services

1. **Gemini API Key** (Required)
   - Get from: https://makersuite.google.com/app/apikey
   - Used for: AI content generation and tutoring

2. **Supabase** (Required)
   - Create project: https://app.supabase.com/
   - Get: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Used for: Authentication, database, user management

3. **Stripe** (Required for payments)
   - Get from: https://dashboard.stripe.com/apikeys
   - Get: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - Used for: Subscription management

### Optional Services

4. **Mathpix OCR** (Optional)
   - Get from: https://mathpix.com/
   - Get: `MATHPIX_APP_ID`, `MATHPIX_APP_KEY`
   - Used for: Handwriting recognition

5. **GitHub Token** (Optional)
   - Get from: https://github.com/settings/tokens
   - Get: `GITHUB_TOKEN`
   - Used for: Bug reporting feature

6. **Resend Email** (Optional)
   - Get from: https://resend.com/api-keys
   - Get: `RESEND_API_KEY`
   - Used for: Welcome emails

## 📋 Environment Variables Reference

### Backend (.env)

```bash
# Required
GEMINI_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Optional
MATHPIX_APP_ID=your_id_here
MATHPIX_APP_KEY=your_key_here
GITHUB_TOKEN=your_token_here
RESEND_API_KEY=your_key_here

# Configuration
FASTAPI_HOST=127.0.0.1
FASTAPI_PORT=8000
FRONTEND_URL=http://localhost:3000
DEVELOPMENT_MODE=true
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🗄️ Database Setup (Supabase)

1. Create a new Supabase project
2. Create the following tables:

### Tables Required:
- `user_profiles` - User information
- `subscriptions` - Subscription plans and usage
- `saved_topics` - User-saved learning topics
- `topic_progress` - Learning progress tracking

### Enable Row Level Security (RLS)
Make sure RLS is enabled on all tables to protect user data.

## 🔒 Before Pushing to GitHub

Always verify security before pushing:

```bash
# Run the security verification script
./verify-security.sh

# Or manually check:
git status  # Ensure no .env files are listed
git check-ignore .env bayes-backend/.env bayes-frontend/.env.local
```

## 📦 Production Deployment

### Backend Deployment Options:
- **Railway**: Automatic deployments from Git
- **Heroku**: Use the included Dockerfile
- **DigitalOcean/AWS**: Deploy with Docker or directly

### Frontend Deployment Options:
- **Vercel**: Recommended (automatic Next.js optimization)
- **Netlify**: Alternative static hosting
- **Any Node.js hosting**: Build with `npm run build`

### Production Environment Variables:
⚠️ **IMPORTANT**: Always use different API keys for production!
- Set environment variables through your hosting platform's dashboard
- Never commit production keys
- Enable `DEVELOPMENT_MODE=false` in production
- Use `https://` URLs only

## 🧪 Testing the Setup

1. **Backend Health Check:**
   ```bash
   curl http://localhost:8000/api/health
   ```

2. **Frontend:**
   - Open http://localhost:3000
   - Try creating an account
   - Generate learning content

## 📚 Additional Documentation

- [Main README](./README.md) - Project overview
- [SECURITY.md](./SECURITY.md) - Security best practices
- [Backend README](./bayes-backend/README.md) - Backend documentation
- [Frontend README](./bayes-frontend/README.md) - Frontend documentation

## 🐛 Troubleshooting

### Backend won't start:
- Check that all required API keys are set in `.env`
- Verify Python virtual environment is activated
- Check port 8000 is not in use

### Frontend won't start:
- Run `npm install` to ensure dependencies are installed
- Check that `.env.local` exists with correct values
- Verify port 3000 is not in use

### Database connection issues:
- Verify Supabase URL and keys are correct
- Check that RLS policies are set up
- Ensure service role key is used for server-side operations

### CORS errors:
- Verify `FRONTEND_URL` is set correctly in backend `.env`
- Check that `NEXT_PUBLIC_API_URL` points to backend
- Ensure `DEVELOPMENT_MODE=true` for local development

## 🤝 Contributing

See the main [README.md](./README.md) for contribution guidelines.

Remember to review [SECURITY.md](./SECURITY.md) before contributing!

## 📧 Support

For questions or issues:
- Email: support@trybayes.com
- Create an issue on GitHub

---

**Last Updated:** October 2025

