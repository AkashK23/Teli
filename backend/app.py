from flask import Flask, jsonify, request, send_from_directory
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from flask_cors import CORS
from pydantic import BaseModel, EmailStr, Field, ValidationError
from werkzeug.exceptions import BadRequest
from typing import Optional, List
from datetime import datetime, timezone
import requests
import logging
import os
from tmdb_routes import tmdb
from teli_routes import teli
from auth_routes import auth

# Load environment variables from .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
    logging.info("Loaded environment variables from .env file")
except ImportError:
    # dotenv not installed, which is fine for production
    logging.info("python-dotenv not available, using system environment variables")
except Exception as e:
    logging.warning(f"Could not load .env file: {e}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
API_PREFIX = '/api'

def create_app():
    app = Flask(__name__, static_folder=None)
    CORS(app)

    build_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')

    # Register blueprints with API prefix
    app.register_blueprint(tmdb, url_prefix=API_PREFIX)
    app.register_blueprint(teli, url_prefix=API_PREFIX)
    app.register_blueprint(auth, url_prefix=API_PREFIX)

    # Serve React App
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        # Handle API routes that don't exist (remove leading slash for comparison)
        api_path = API_PREFIX.lstrip('/')
        if path.startswith(f'{api_path}/'):
            return jsonify({"error": "API endpoint not found"}), 404

        # Handle static files and React routes
        if path != "" and os.path.exists(os.path.join(build_dir, path)):
            return send_from_directory(build_dir, path)
        else:
            return send_from_directory(build_dir, 'index.html')
    
    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get('PORT', 5001))  # Heroku provides PORT
    app.run(host='0.0.0.0', port=port, debug=False)
