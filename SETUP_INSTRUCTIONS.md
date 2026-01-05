# Teli Application Setup Instructions

This guide provides step-by-step instructions for setting up the Teli application from scratch, including environment variables and building the product.

## Prerequisites

Before starting, ensure you have the following installed on your system:

### Required Software

1. **Python 3.8 or higher**
   ```bash
   # Check Python version
   python3 --version
   # or
   python --version
   ```

2. **Node.js 16 or higher and npm**
   ```bash
   # Check Node.js version
   node --version
   
   # Check npm version
   npm --version
   ```

3. **Git**
   ```bash
   # Check Git version
   git --version
   ```

### Installation Links (if needed)

- **Python**: https://www.python.org/downloads/
- **Node.js**: https://nodejs.org/en/download/
- **Git**: https://git-scm.com/downloads

## Required Credentials

You'll need to obtain the following credentials before setup:

### 1. Firebase Service Account JSON

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. You'll need the entire JSON content as a single line string

### 2. TMDB API Key

1. Create an account at [The Movie Database (TMDB)](https://www.themoviedb.org/)
2. Go to Settings → API
3. Request an API key
4. Copy the Bearer token (it should start with "Bearer eyJhbGciOiJIUzI1NiJ9...")

## Manual Setup Process

### Step 1: Clone and Navigate to Project

```bash
# If you haven't cloned the repository yet
git clone <your-repository-url>
cd teli-app
```

### Step 2: Backend Setup

1. **Create Python Virtual Environment**
   ```bash
   cd backend
   python3 -m venv venv
   
   # Activate virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   # venv\Scripts\activate
   ```

2. **Install Backend Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Backend Environment Variables**
   
   Edit `backend/.env` and replace the placeholder values:
   ```bash
   # Firebase Service Account JSON (as a single line string)
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-actual-project-id",...}
   
   # TMDB API Key
   TMDB_API_KEY=Bearer eyJhbGciOiJIUzI1NiJ9.your_actual_token_here
   
   # Flask Configuration (already set)
   FLASK_ENV=development
   FLASK_DEBUG=True
   ```

   **Important**: 
   - Remove all line breaks from the Firebase JSON
   - Use your actual TMDB Bearer token

### Step 3: Frontend Setup

1. **Navigate to Frontend Directory**
   ```bash
   cd ../frontend
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Verify Frontend Environment Variables**
   
   Check that `frontend/.env` contains:
   ```bash
   REACT_APP_GOOGLE_CLIENT_ID=566351392268-7fi1kkrd56q9sjglbs407roa83gbskkp.apps.googleusercontent.com
   REACT_APP_API_URL=http://localhost:5001/api
   ```

### Step 4: Start the Application

1. **Start Backend Server** (in one terminal)
   ```bash
   cd backend
   # Activate virtual environment if not already active
   source venv/bin/activate  # On macOS/Linux
   # venv\Scripts\activate   # On Windows
   
   python app.py
   ```
   
   The backend should start on http://localhost:5001

2. **Start Frontend Server** (in another terminal)
   ```bash
   cd frontend
   npm start
   ```
   
   The frontend should start on http://localhost:3000 and automatically open in your browser

### Step 5: Test the Application

1. Open your browser to http://localhost:3000
2. Try logging in with Google OAuth
3. Test basic functionality like browsing shows
4. Use the test account credentials:
   - Email: hi@hello.com
   - Password: applejacks

## Production Build

### Frontend Production Build

```bash
cd frontend
npm run build
```

This creates an optimized production build in the `frontend/build` directory.

### Backend Production Configuration

For production deployment, you'll need to:

1. Set environment variables on your hosting platform
2. Use a production WSGI server like Gunicorn (already in requirements.txt)
3. Configure your frontend to point to the production API URL

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure you've activated the Python virtual environment
   - Run `pip install -r requirements.txt` again

2. **"Firebase connection failed"**
   - Check that your Firebase JSON is properly formatted as a single line
   - Verify your Firebase project settings

3. **"TMDB API errors"**
   - Ensure your TMDB API key is correct and includes "Bearer " prefix
   - Check that your TMDB account has API access

4. **"Port already in use"**
   - Kill existing processes:
     ```bash
     # Kill processes on port 3000 (frontend)
     lsof -ti:3000 | xargs kill -9
     
     # Kill processes on port 5001 (backend)
     lsof -ti:5001 | xargs kill -9
     ```

5. **Frontend can't connect to backend**
   - Ensure backend is running on port 5001
   - Check that `REACT_APP_API_URL` in frontend/.env is correct

### Getting Help

- Check the console logs in your browser's developer tools
- Check the terminal output for error messages
- Ensure all environment variables are set correctly

## Environment Variables Reference

### Backend Variables (backend/.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account credentials as JSON string | `{"type":"service_account",...}` |
| `TMDB_API_KEY` | TMDB API authorization token | `Bearer eyJhbGciOiJIUzI1NiJ9...` |
| `FLASK_ENV` | Flask environment | `development` |
| `FLASK_DEBUG` | Flask debug mode | `True` |

### Frontend Variables (frontend/.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:5001/api` |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID | `566351392268-7fi1kkrd56q9sjglbs407roa83gbskkp.apps.googleusercontent.com` |

## Next Steps

Once you have the application running locally:

1. Explore the codebase structure
2. Review the API documentation in `backend/API_DOCUMENTATION.md`
3. Check out the development workflow guidelines in `.clinerules/`
4. Consider setting up the automated deployment process described in `DEPLOYMENT_SETUP.md`

For automated setup, you can also use the provided `setup.sh` script (see next section).
