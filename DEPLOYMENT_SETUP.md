# Deployment Setup Guide

This guide explains how to set up your Teli application for both local development and Heroku deployment using environment variables.

## Overview

Your application has been configured to use environment variables for sensitive data like Firebase credentials and API keys. This makes it secure and ready for deployment on platforms like Heroku.

## Local Development Setup

### 1. Backend Environment Variables

Create or update `backend/.env` with your actual values:

```bash
# Firebase Service Account JSON (as a single line string)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# TMDB API Key (copy from your authorizationToken.txt file)
TMDB_API_KEY=Bearer eyJhbGciOiJIUzI1NiJ9.your_actual_token_here

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

**Important Notes:**
- The `FIREBASE_SERVICE_ACCOUNT_JSON` should be your entire Firebase service account JSON file content as a single line string
- The `TMDB_API_KEY` should be the exact content from your `authorizationToken.txt` file
- Remove any line breaks from the JSON string

### 2. Frontend Environment Variables

Your `frontend/.env` is already set up correctly:

```bash
REACT_APP_GOOGLE_CLIENT_ID=566351392268-7fi1kkrd56q9sjglbs407roa83gbskkp.apps.googleusercontent.com
REACT_APP_API_URL=http://localhost:5001/api
```

### 3. Install Dependencies

Install the new python-dotenv dependency:

```bash
cd backend
pip install -r requirements.txt
```

### 4. Test Local Setup

1. Start the backend:
```bash
cd backend
python app.py
```

2. Start the frontend:
```bash
cd frontend
npm start
```

Your application should work exactly as before, but now using environment variables.

## Heroku Deployment Setup

### 1. Create Heroku App

```bash
# Install Heroku CLI if you haven't already
# Then login and create your app
heroku login
heroku create your-app-name
```

### 2. Set Environment Variables on Heroku

Set the same environment variables on Heroku using the Heroku CLI or dashboard:

```bash
# Set Firebase credentials (replace with your actual JSON)
heroku config:set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id",...}'

# Set TMDB API key (replace with your actual token)
heroku config:set TMDB_API_KEY='Bearer eyJhbGciOiJIUzI1NiJ9.your_actual_token_here'

# Set frontend API URL to your Heroku app URL
heroku config:set REACT_APP_API_URL='https://your-app-name.herokuapp.com/api'

# Set Google Client ID
heroku config:set REACT_APP_GOOGLE_CLIENT_ID='566351392268-7fi1kkrd56q9sjglbs407roa83gbskkp.apps.googleusercontent.com'
```

### 3. Deploy to Heroku

```bash
# Add and commit your changes
git add .
git commit -m "Configure environment variables for deployment"

# Deploy to Heroku
git push heroku main
```

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account credentials as JSON string | `{"type":"service_account",...}` |
| `TMDB_API_KEY` | TMDB API authorization token | `Bearer eyJhbGciOiJIUzI1NiJ9...` |
| `PORT` | Server port (automatically set by Heroku) | `5000` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:5001/api` (local) or `https://your-app.herokuapp.com/api` (production) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID | `566351392268-7fi1kkrd56q9sjglbs407roa83gbskkp.apps.googleusercontent.com` |

## Security Notes

1. **Never commit `.env` files to git** - they are already in `.gitignore`
2. **Keep your existing files** - `serviceAccountKey.json` and `authorizationToken.txt` still work for local development
3. **Use environment variables in production** - Heroku will use the config vars you set
4. **Rotate keys regularly** - especially for production deployments

## Troubleshooting

### Local Development Issues

1. **Firebase connection fails**: Check that your `FIREBASE_SERVICE_ACCOUNT_JSON` is properly formatted as a single line
2. **TMDB API fails**: Verify your `TMDB_API_KEY` matches the content in `authorizationToken.txt`
3. **Frontend can't connect**: Ensure `REACT_APP_API_URL` points to your running backend

### Heroku Deployment Issues

1. **Build fails**: Check that all environment variables are set correctly
2. **App crashes**: Check Heroku logs with `heroku logs --tail`
3. **API calls fail**: Verify the `REACT_APP_API_URL` points to your Heroku app URL

## Fallback Behavior

Your application is designed with fallback behavior:

- **Backend**: If environment variables aren't found, it falls back to reading from files (`serviceAccountKey.json`, `authorizationToken.txt`)
- **Frontend**: Uses the environment variable for API URL, with localhost as default

This means your existing local development setup continues to work even if you don't set up environment variables immediately.
