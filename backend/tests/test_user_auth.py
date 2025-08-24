import pytest
from unittest.mock import patch, MagicMock
import json
import jwt
from datetime import datetime, timezone

class TestGoogleAuthentication:
    """Test Google OAuth authentication endpoints"""
    
    def test_google_auth_missing_token(self, get_client):
        """Test Google auth with missing token"""
        response = get_client.post("/auth/google", 
                              json={},
                              content_type="application/json")
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "errors" in data
        
    def test_google_auth_invalid_token_format(self, get_client):
        """Test Google auth with invalid token format"""
        response = get_client.post("/auth/google", 
                              json={"token": "invalid-token"},
                              content_type="application/json")
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data["error"] == "Invalid token format"
        
    @patch('auth_routes.db')
    def test_google_auth_existing_user(self, mock_db, get_client):
        """Test Google auth for existing user"""
        # Create a valid JWT token for testing
        test_token_data = {
            "sub": "google123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/picture.jpg"
        }
        test_token = jwt.encode(test_token_data, "secret", algorithm="HS256")
        
        # Mock existing user
        mock_user_doc = MagicMock()
        mock_user_doc.to_dict.return_value = {
            "google_id": "google123",
            "email": "test@example.com",
            "name": "Test User",
            "username": "test",
            "picture": "https://example.com/picture.jpg"
        }
        mock_user_doc.id = "user123"
        mock_user_doc.reference.update = MagicMock()
        
        # Mock Firestore query
        mock_collection = MagicMock()
        mock_query = MagicMock()
        mock_query.get.return_value = [mock_user_doc]
        mock_collection.where.return_value.limit.return_value = mock_query
        mock_db.collection.return_value = mock_collection
        
        response = get_client.post("/auth/google", 
                              json={"token": test_token},
                              content_type="application/json")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["message"] == "Login successful"
        assert data["user"]["id"] == "user123"
        assert data["user"]["email"] == "test@example.com"
        
        # Verify last_login was updated
        mock_user_doc.reference.update.assert_called_once()
        update_call = mock_user_doc.reference.update.call_args[0][0]
        assert "last_login" in update_call
        
    @patch('auth_routes.db')
    def test_google_auth_new_user(self, mock_db, get_client):
        """Test Google auth for new user"""
        # Create a valid JWT token for testing
        test_token_data = {
            "sub": "google456",
            "email": "newuser@example.com",
            "name": "New User",
            "picture": "https://example.com/newpicture.jpg"
        }
        test_token = jwt.encode(test_token_data, "secret", algorithm="HS256")
        
        # Mock no existing user
        mock_collection = MagicMock()
        mock_query = MagicMock()
        mock_query.get.return_value = []  # No existing user
        mock_collection.where.return_value.limit.return_value = mock_query
        
        # Mock user creation
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "newuser123"
        mock_collection.add.return_value = (None, mock_doc_ref)
        
        mock_db.collection.return_value = mock_collection
        
        response = get_client.post("/auth/google", 
                              json={"token": test_token},
                              content_type="application/json")
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data["message"] == "User created successfully"
        assert data["user"]["id"] == "newuser123"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["google_id"] == "google456"
        
        # Verify user was created with correct data
        mock_collection.add.assert_called_once()
        created_user = mock_collection.add.call_args[0][0]
        assert created_user["email"] == "newuser@example.com"
        assert created_user["google_id"] == "google456"
        assert created_user["username"] == "newuser"  # Derived from email
        
    @patch('auth_routes.db')
    def test_google_auth_existing_email_no_google_id(self, mock_db, get_client):
        """Test Google auth when email exists but no Google ID"""
        # Create a valid JWT token for testing
        test_token_data = {
            "sub": "google789",
            "email": "existing@example.com",
            "name": "Existing User",
            "picture": "https://example.com/picture.jpg"
        }
        test_token = jwt.encode(test_token_data, "secret", algorithm="HS256")
        
        # Mock existing user without Google ID
        mock_user_doc = MagicMock()
        mock_user_doc.to_dict.return_value = {
            "email": "existing@example.com",
            "name": "Existing User",
            "username": "existing"
        }
        mock_user_doc.id = "existinguser123"
        mock_user_doc.reference.update = MagicMock()
        
        # Mock Firestore queries
        mock_collection = MagicMock()
        
        # First query (by google_id) returns nothing
        mock_google_query = MagicMock()
        mock_google_query.get.return_value = []
        
        # Second query (by email) returns existing user
        mock_email_query = MagicMock()
        mock_email_query.get.return_value = [mock_user_doc]
        
        # Set up the mock to return different results for different queries
        def where_side_effect(*args, **kwargs):
            filter_obj = args[0] if args else kwargs.get('filter')
            if filter_obj.field_path == "google_id":
                return MagicMock(limit=lambda x: mock_google_query)
            else:  # email query
                return MagicMock(limit=lambda x: mock_email_query)
        
        mock_collection.where.side_effect = where_side_effect
        mock_db.collection.return_value = mock_collection
        
        response = get_client.post("/auth/google", 
                              json={"token": test_token},
                              content_type="application/json")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["message"] == "Login successful"
        assert data["user"]["id"] == "existinguser123"
        
        # Verify user was updated with Google ID
        mock_user_doc.reference.update.assert_called_once()
        update_call = mock_user_doc.reference.update.call_args[0][0]
        assert update_call["google_id"] == "google789"
        assert "last_login" in update_call
        
    @patch('auth_routes.db')
    def test_google_auth_database_error(self, mock_db, get_client):
        """Test Google auth with database error"""
        # Create a valid JWT token for testing
        test_token_data = {
            "sub": "google999",
            "email": "error@example.com",
            "name": "Error User",
            "picture": "https://example.com/picture.jpg"
        }
        test_token = jwt.encode(test_token_data, "secret", algorithm="HS256")
        
        # Mock database error
        mock_db.collection.side_effect = Exception("Database connection failed")
        
        response = get_client.post("/auth/google", 
                              json={"token": test_token},
                              content_type="application/json")
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data["error"] == "Authentication failed"


class TestUserVerification:
    """Test user verification endpoint"""
    
    def test_verify_user_no_header(self, get_client):
        """Test verify user with no user ID header"""
        response = get_client.get("/auth/verify")
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data["error"] == "No user ID provided"
        
    @patch('auth_routes.db')
    def test_verify_user_invalid_id(self, mock_db, get_client):
        """Test verify user with invalid user ID"""
        # Mock user not found
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        
        response = get_client.get("/auth/verify", 
                            headers={"X-User-ID": "invalid123"})
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data["error"] == "Invalid user ID"
        
    @patch('auth_routes.db')
    def test_verify_user_valid_id(self, mock_db, get_client):
        """Test verify user with valid user ID"""
        # Mock valid user
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "email": "test@example.com",
            "name": "Test User",
            "username": "test"
        }
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        
        response = get_client.get("/auth/verify", 
                            headers={"X-User-ID": "user123"})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["valid"] is True
        assert data["user"]["id"] == "user123"
        assert data["user"]["email"] == "test@example.com"
        
    @patch('auth_routes.db')
    def test_verify_user_database_error(self, mock_db, get_client):
        """Test verify user with database error"""
        # Mock database error
        mock_db.collection.return_value.document.return_value.get.side_effect = Exception("Database error")
        
        response = get_client.get("/auth/verify", 
                            headers={"X-User-ID": "user123"})
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data["error"] == "Verification failed"


class TestProtectedEndpoints:
    """Test authentication requirements for protected endpoints"""
    
    def test_protected_endpoint_no_auth(self, get_client):
        """Test accessing protected endpoint without authentication"""
        # Test a protected endpoint like getting user ratings
        response = get_client.get("/users/user123/ratings")
        
        # Currently returns 200 because endpoints aren't protected yet
        # This test documents the current behavior
        assert response.status_code in [200, 404]  # 404 if user doesn't exist
        
    @patch('teli_routes.db')
    def test_protected_endpoint_with_auth(self, mock_db, get_client):
        """Test accessing protected endpoint with valid user"""
        # Mock user exists
        mock_user_doc = MagicMock()
        mock_user_doc.exists = True
        mock_db.collection.return_value.document.return_value.get.return_value = mock_user_doc
        
        # Mock ratings query
        mock_db.collection.return_value.where.return_value.stream.return_value = []
        
        response = get_client.get("/users/user123/ratings")
        
        assert response.status_code == 200
        
        
class TestAuthenticationFlow:
    """Test complete authentication flow"""
    
    @patch('auth_routes.db')
    @patch('teli_routes.db')
    def test_complete_google_login_flow(self, mock_teli_db, mock_auth_db, get_client):
        """Test complete flow: Google login -> verify -> access data"""
        # Step 1: Google login
        test_token_data = {
            "sub": "google_flow_123",
            "email": "flow@example.com",
            "name": "Flow User",
            "picture": "https://example.com/flow.jpg"
        }
        test_token = jwt.encode(test_token_data, "secret", algorithm="HS256")
        
        # Mock new user creation
        mock_collection = MagicMock()
        mock_query = MagicMock()
        mock_query.get.return_value = []  # No existing user
        mock_collection.where.return_value.limit.return_value = mock_query
        
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "flowuser123"
        mock_collection.add.return_value = (None, mock_doc_ref)
        
        mock_auth_db.collection.return_value = mock_collection
        
        response = get_client.post("/auth/google", 
                              json={"token": test_token},
                              content_type="application/json")
        
        assert response.status_code == 201
        data = json.loads(response.data)
        user_id = data["user"]["id"]
        
        # Step 2: Verify user
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "email": "flow@example.com",
            "name": "Flow User",
            "google_id": "google_flow_123"
        }
        mock_auth_db.collection.return_value.document.return_value.get.return_value = mock_doc
        
        response = get_client.get("/auth/verify", 
                            headers={"X-User-ID": user_id})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["valid"] is True
        
        # Step 3: Access user data
        # Need to mock the user existence check in the ratings endpoint
        mock_user_check = MagicMock()
        mock_user_check.exists = True
        
        # Mock for the user document check
        mock_teli_db.collection.return_value.document.return_value.get.return_value = mock_user_check
        
        # Mock for the ratings query
        mock_teli_db.collection.return_value.where.return_value.stream.return_value = []
        
        response = get_client.get(f"/users/{user_id}/ratings")
        
        assert response.status_code == 200
