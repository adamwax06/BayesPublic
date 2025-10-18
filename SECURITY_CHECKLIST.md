# Security Checklist for Public Repository

## ✅ Pre-Push Security Checklist

Before pushing this repository to a public GitHub, verify:

### Files and Configuration
- [ ] `.gitignore` is in place at root and in subdirectories
- [ ] `.env`, `.env.local`, and all environment files are gitignored
- [ ] `.env.example` files exist with placeholder values only
- [ ] No nested `.git` directories exist in subdirectories
- [ ] No `.github` folders from previous repos (except in node_modules)

### Secrets and Keys
- [ ] No API keys hardcoded in source files
- [ ] No database credentials in code
- [ ] No authentication tokens in code
- [ ] Stripe Price IDs are public identifiers (safe to commit)
- [ ] All secrets are loaded from environment variables

### Documentation
- [ ] `README.md` exists with setup instructions
- [ ] `SECURITY.md` exists with security guidelines
- [ ] `.env.example` files document all required variables
- [ ] Setup guide mentions security best practices

### Verification Commands

Run these commands to verify:

```bash
# 1. Check .env files are ignored
git check-ignore .env bayes-backend/.env bayes-frontend/.env.local

# 2. Search for potential secrets in tracked files
git grep -i "api_key" -- ':!*.md' ':!*.example'
git grep -i "secret" -- ':!*.md' ':!*.example'

# 3. List what will be committed
git status

# 4. Check for nested git repos
find . -name ".git" -type d | grep -v "node_modules"

# 5. Run the security verification script
./verify-security.sh
```

## 🔐 What's Safe to Commit

These items are **SAFE** to include in the public repository:

✅ **Public Identifiers:**
- Stripe Price IDs (e.g., `price_1RlMRIKD4x7s8dfVFZq4dnvc`)
- Supabase Project URLs (public endpoints)
- Supabase Anon Keys (designed to be public with RLS)

✅ **Configuration:**
- `.env.example` files with placeholders
- Package.json / requirements.txt
- Build configurations
- TypeScript/ESLint configs

✅ **Source Code:**
- All application code
- UI components
- API route definitions (without keys)
- Database schema definitions

## ❌ What Must NEVER Be Committed

These items are **DANGEROUS** and must never be committed:

❌ **Secret Keys:**
- Gemini API Keys
- Supabase Service Role Keys
- Stripe Secret Keys
- Stripe Webhook Secrets
- GitHub Personal Access Tokens
- Mathpix API Keys
- Resend API Keys

❌ **Environment Files:**
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- Any file containing actual credentials

❌ **Other Sensitive Data:**
- Database connection strings with passwords
- Private SSH keys
- OAuth client secrets
- Session secrets

## 🚨 If You Accidentally Commit Secrets

If you accidentally commit API keys or secrets:

1. **Immediately revoke/regenerate the exposed keys** on the provider's dashboard
2. Remove from git history:
   ```bash
   # Remove the file from git history (use with caution!)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Or use BFG Repo Cleaner (easier)
   bfg --delete-files .env
   
   # Force push (only if repo is not yet public)
   git push origin --force --all
   ```
3. Update all team members
4. Monitor for any suspicious activity

## 📊 Security Score

Current Status: **SECURE** ✅

All checks passed:
- ✅ No .env files in staging area
- ✅ .env.example files exist
- ✅ No nested .git directories
- ✅ No common API key patterns found
- ✅ Security documentation in place

## 🔄 Regular Security Maintenance

### Monthly:
- [ ] Review .gitignore effectiveness
- [ ] Rotate API keys in production
- [ ] Update dependencies for security patches
- [ ] Review Supabase RLS policies

### Before Each Release:
- [ ] Run security verification script
- [ ] Scan dependencies for vulnerabilities: `npm audit` / `pip-audit`
- [ ] Review recent commits for accidental secrets
- [ ] Test with fresh clone to verify setup process

## 📞 Security Contacts

If you discover a security issue:
- **Email:** security@trybayes.com
- **Do not** open public GitHub issues for security vulnerabilities

---

**Repository:** BayesPublic
**Last Security Audit:** October 2025
**Status:** Ready for Public Repository ✅
