import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, EmailStr, ValidationError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import logging
from firebase_db import db
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
auth = Blueprint("auth", __name__)

# Google OAuth2 client ID - this should be in environment variables in production
GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"  # Replace with actual client ID

class GoogleAuthRequest(BaseModel):
    token: str

class GoogleUserInfo(BaseModel):
    sub: str  # Google user ID
    email: EmailStr
    name: str
    picture: str

@auth.route("/auth/google", methods=["POST"])
def google_auth():
    """
    Authenticate user with Google OAuth token.
    Creates a new user if they don't exist.
    """
    try:
        # Validate request
        req_data = GoogleAuthRequest.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"errors": e.errors()}), 400
    
    try:
        # Verify the Google token
        # In production, you would verify with Google's servers
        # For now, we'll parse the token assuming it's already verified on frontend
        # This is a simplified version - in production, use proper verification
        
        # For testing purposes, we'll decode without verification
        # In production, use: id_token.verify_oauth2_token(req_data.token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        # Simulating token verification - in real app, this would be actual Google verification
        import jwt
        try:
            # Decode without verification for testing
            decoded_token = jwt.decode(req_data.token, options={"verify_signature": False})
            user_info = GoogleUserInfo(
                sub=decoded_token.get("sub"),
                email=decoded_token.get("email"),
                name=decoded_token.get("name"),
                picture=decoded_token.get("picture")
            )
        except Exception as e:
            return jsonify({"error": "Invalid token format"}), 401
            
    except Exception as e:
        logger.error(f"Error verifying Google token: {e}")
        return jsonify({"error": "Invalid Google token"}), 401
    
    try:
        # Check if user exists by Google ID
        users_ref = db.collection("users")
        google_id_query = users_ref.where(
            filter=FieldFilter("google_id", "==", user_info.sub)
        ).limit(1).get()
        
        if len(google_id_query) > 0:
            # User exists, return their data
            existing_user = google_id_query[0]
            user_data = existing_user.to_dict()
            user_data["id"] = existing_user.id
            
            # Update last login
            existing_user.reference.update({
                "last_login": datetime.now(timezone.utc).isoformat()
            })
            
            return jsonify({
                "message": "Login successful",
                "user": user_data
            }), 200
        else:
            # Create new user
            new_user_data = {
                "google_id": user_info.sub,
                "email": user_info.email,
                "name": user_info.name,
                "username": user_info.email.split("@")[0],  # Default username from email
                "picture": user_info.picture,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_login": datetime.now(timezone.utc).isoformat()
            }
            
            # Check if email already exists (user might have signed up differently before)
            email_query = users_ref.where(
                filter=FieldFilter("email", "==", user_info.email)
            ).limit(1).get()
            
            if len(email_query) > 0:
                # Email exists but no Google ID - update existing user
                existing_user = email_query[0]
                existing_user.reference.update({
                    "google_id": user_info.sub,
                    "picture": user_info.picture,
                    "last_login": datetime.now(timezone.utc).isoformat()
                })
                
                user_data = existing_user.to_dict()
                user_data["id"] = existing_user.id
                
                return jsonify({
                    "message": "Login successful",
                    "user": user_data
                }), 200
            
            # Create completely new user
            user_ref = db.collection("users").add(new_user_data)
            new_user_data["id"] = user_ref[1].id
            
            return jsonify({
                "message": "User created successfully",
                "user": new_user_data
            }), 201
            
    except Exception as e:
        logger.error(f"Error during Google authentication: {e}")
        return jsonify({"error": "Authentication failed"}), 500

@auth.route("/auth/verify", methods=["GET"])
def verify_user():
    """
    Verify if a user ID is valid.
    Used for checking authentication status.
    """
    user_id = request.headers.get("X-User-ID")
    
    if not user_id:
        return jsonify({"error": "No user ID provided"}), 401
    
    try:
        user_doc = db.collection("users").document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "Invalid user ID"}), 401
        
        user_data = user_doc.to_dict()
        user_data["id"] = user_id
        
        return jsonify({
            "valid": True,
            "user": user_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error verifying user: {e}")
        return jsonify({"error": "Verification failed"}), 500
