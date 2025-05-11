from flask import Flask, jsonify, request
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
from tmdb_routes import tmdb
from teli_routes import teli

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(tmdb)
    app.register_blueprint(teli)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
