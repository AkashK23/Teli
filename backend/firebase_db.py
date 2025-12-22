import firebase_admin
from firebase_admin import credentials, firestore
import logging
import os
import sys
import json

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase with environment variable or service account file."""
    result = None
    
    # Try to get Firebase credentials from environment variable first
    firebase_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    
    if firebase_json:
        try:
            # Parse the JSON string from environment variable
            service_account_info = json.loads(firebase_json)
            cred = credentials.Certificate(service_account_info)
            logger.info("Using Firebase credentials from environment variable")
            result = cred
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"Error using Firebase environment variable: {e}")
            raise
    else:
        # Fall back to service account file for local development
        current_dir = os.path.dirname(os.path.abspath(__file__))
        service_account_path = os.path.join(current_dir, "serviceAccountKey.json")
        
        if os.path.exists(service_account_path):
            try:
                cred = credentials.Certificate(service_account_path)
                logger.info("Using Firebase credentials from service account file")
                result = cred
            except Exception as e:
                logger.error(f"Error reading service account file: {e}")
                raise
        else:
            logger.error("No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable or provide serviceAccountKey.json file")
            raise FileNotFoundError("Firebase credentials not found")
    
    return result

try:
    cred = initialize_firebase()
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    raise
