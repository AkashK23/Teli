import firebase_admin
from firebase_admin import credentials, firestore
import logging
import os
import sys

logger = logging.getLogger(__name__)

# Get the directory where this file is located
current_dir = os.path.dirname(os.path.abspath(__file__))
service_account_path = os.path.join(current_dir, "serviceAccountKey.json")

try:
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    raise
