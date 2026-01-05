# Teli Application Quick Start Guide

## 🚀 Automated Setup (Recommended)

For the fastest setup experience, use the automated script:

```bash
./setup.sh
```

This script will:
- ✅ Check all prerequisites (Python, Node.js, npm)
- ✅ Set up Python virtual environment
- ✅ Install all dependencies (backend & frontend)
- ✅ Prompt for missing environment variables
- ✅ Start both servers
- ✅ Automatically open your browser to the application

## 📋 Prerequisites

Before running the setup script, ensure you have:

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## 🔑 Required Credentials

You'll need these credentials during setup:

### Firebase Service Account JSON
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings → Service Accounts
3. Click "Generate new private key"
4. Copy the entire JSON content as a single line

### TMDB API Key
1. Create account at [TMDB](https://www.themoviedb.org/)
2. Go to Settings → API → Request API key
3. Copy the Bearer token (starts with "Bearer eyJhbGciOiJIUzI1NiJ9...")

## 🎯 Quick Test

Once the application is running:

1. Browser should auto-open to http://localhost:3000
2. Test login with:
   - **Email**: hi@hello.com
   - **Password**: applejacks

## 🛑 Stopping the Application

Press `Ctrl+C` in the terminal where the script is running, or run:

```bash
lsof -ti:3000 | xargs kill -9 && lsof -ti:5001 | xargs kill -9
```

## 📚 Additional Resources

- **Manual Setup**: See `SETUP_INSTRUCTIONS.md` for detailed manual instructions
- **Deployment**: See `DEPLOYMENT_SETUP.md` for production deployment
- **API Documentation**: See `backend/API_DOCUMENTATION.md`
- **Development Guidelines**: See `.clinerules/` directory

## 🔧 Troubleshooting

### Common Issues

**"Port already in use"**
```bash
# Kill processes on ports 3000 and 5001
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

**"Python/Node.js not found"**
- Install the required software from the links above
- Restart your terminal after installation

**"Environment variables not configured"**
- The script will prompt you for missing credentials
- You can also manually edit `backend/.env`

### Getting Help

1. Check terminal output for specific error messages
2. Verify all prerequisites are installed
3. Ensure you have the correct Firebase and TMDB credentials
4. Check browser console for frontend errors

---

**Need more detailed instructions?** See `SETUP_INSTRUCTIONS.md` for comprehensive manual setup steps.
