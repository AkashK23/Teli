import pytest
import json
from unittest.mock import Mock, patch
from app import create_app
from firebase_db import db


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_user_doc():
    """Mock user document for testing"""
    mock_doc = Mock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "name": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "bio": "Original bio",
        "picture": "https://example.com/old-pic.jpg",
        "created_at": "2023-05-31T12:34:56.789Z"
    }
    mock_doc.reference = Mock()
    return mock_doc


@pytest.fixture
def mock_updated_user_doc():
    """Mock updated user document for testing"""
    mock_doc = Mock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "name": "Jane Smith",
        "username": "janesmith",
        "email": "jane@example.com",
        "bio": "Updated bio",
        "picture": "https://example.com/new-pic.jpg",
        "created_at": "2023-05-31T12:34:56.789Z",
        "updated_at": "2024-05-30T14:22:10Z"
    }
    return mock_doc


class TestUpdateUserProfile:
    """Test cases for the update user profile endpoint"""

    @patch('teli_routes.db')
    def test_update_profile_success_all_fields(self, mock_db, client, mock_user_doc, mock_updated_user_doc):
        """Test successful profile update with all fields"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.side_effect = [
            mock_user_doc,  # First call for user existence check
            mock_updated_user_doc  # Second call for getting updated data
        ]
        mock_db.collection.return_value.where.return_value.limit.return_value.get.return_value = []  # No conflicts

        request_data = {
            "name": "Jane Smith",
            "username": "janesmith",
            "email": "jane@example.com",
            "bio": "Updated bio",
            "picture": "https://example.com/new-pic.jpg"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["message"] == "Profile updated successfully"
        assert data["user"]["name"] == "Jane Smith"
        assert data["user"]["username"] == "janesmith"
        assert data["user"]["email"] == "jane@example.com"
        assert data["user"]["bio"] == "Updated bio"
        assert data["user"]["picture"] == "https://example.com/new-pic.jpg"
        assert data["user"]["id"] == "user123"

        # Verify update was called
        mock_user_doc.reference.update.assert_called_once()

    @patch('teli_routes.db')
    def test_update_profile_partial_update(self, mock_db, client, mock_user_doc, mock_updated_user_doc):
        """Test successful partial profile update"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.side_effect = [
            mock_user_doc,
            mock_updated_user_doc
        ]

        request_data = {
            "bio": "Just updating my bio"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["message"] == "Profile updated successfully"

        # Verify update was called
        mock_user_doc.reference.update.assert_called_once()

    @patch('teli_routes.db')
    def test_update_profile_user_not_found(self, mock_db, client):
        """Test profile update when user doesn't exist"""
        # Setup mock for non-existent user
        mock_doc = Mock()
        mock_doc.exists = False
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        request_data = {
            "name": "New Name"
        }

        response = client.put('/user/nonexistent/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["error"] == "User not found"

    @patch('teli_routes.db')
    def test_update_profile_username_conflict(self, mock_db, client, mock_user_doc):
        """Test profile update with username conflict"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.return_value = mock_user_doc
        
        # Mock username conflict
        mock_conflict_doc = Mock()
        mock_db.collection.return_value.where.return_value.limit.return_value.get.return_value = [mock_conflict_doc]

        request_data = {
            "username": "existinguser"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 409
        data = json.loads(response.data)
        assert data["error"] == "Username already exists"

    @patch('teli_routes.db')
    def test_update_profile_email_conflict(self, mock_db, client, mock_user_doc):
        """Test profile update with email conflict"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.return_value = mock_user_doc
        
        # Mock email conflict - since only email is being updated, only one query will be made
        mock_conflict_doc = Mock()
        mock_db.collection.return_value.where.return_value.limit.return_value.get.return_value = [mock_conflict_doc]

        request_data = {
            "email": "existing@example.com"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 409
        data = json.loads(response.data)
        assert data["error"] == "Email already exists"

    def test_update_profile_invalid_email(self, client):
        """Test profile update with invalid email format"""
        request_data = {
            "email": "invalid-email"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert "errors" in data

    def test_update_profile_empty_request(self, client):
        """Test profile update with empty request body"""
        response = client.put('/user/user123/profile', 
                            data=json.dumps({}),
                            content_type='application/json')

        # Should still work as all fields are optional
        assert response.status_code in [200, 404]  # 404 if user doesn't exist, 200 if mocked properly

    @patch('teli_routes.db')
    def test_update_profile_no_change_username(self, mock_db, client, mock_user_doc, mock_updated_user_doc):
        """Test profile update with same username (should not check for conflicts)"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.side_effect = [
            mock_user_doc,
            mock_updated_user_doc
        ]

        request_data = {
            "username": "johndoe"  # Same as current username
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 200
        # Should not call where() for conflict checking since username didn't change
        mock_user_doc.reference.update.assert_called_once()

    @patch('teli_routes.db')
    def test_update_profile_no_change_email(self, mock_db, client, mock_user_doc, mock_updated_user_doc):
        """Test profile update with same email (should not check for conflicts)"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.side_effect = [
            mock_user_doc,
            mock_updated_user_doc
        ]

        request_data = {
            "email": "john@example.com"  # Same as current email
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 200
        mock_user_doc.reference.update.assert_called_once()

    @patch('teli_routes.db')
    def test_update_profile_database_error(self, mock_db, client, mock_user_doc):
        """Test profile update with database error"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.return_value = mock_user_doc
        mock_db.collection.return_value.where.return_value.limit.return_value.get.return_value = []
        
        # Mock database error on update
        mock_user_doc.reference.update.side_effect = Exception("Database error")

        request_data = {
            "name": "New Name"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data["error"] == "Database error occurred"

    @patch('teli_routes.db')
    def test_update_profile_removes_sensitive_fields(self, mock_db, client, mock_user_doc):
        """Test that sensitive fields are removed from response"""
        # Setup mock with sensitive fields
        mock_updated_doc = Mock()
        mock_updated_doc.exists = True
        mock_updated_doc.to_dict.return_value = {
            "name": "Jane Smith",
            "username": "janesmith",
            "email": "jane@example.com",
            "password": "secret123",  # Should be removed
            "bio": "Updated bio",
            "picture": "https://example.com/new-pic.jpg"
        }
        
        mock_db.collection.return_value.document.return_value.get.side_effect = [
            mock_user_doc,
            mock_updated_doc
        ]
        mock_db.collection.return_value.where.return_value.limit.return_value.get.return_value = []

        request_data = {
            "name": "Jane Smith"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert "password" not in data["user"]
        assert data["user"]["name"] == "Jane Smith"

    def test_update_profile_invalid_json(self, client):
        """Test profile update with invalid JSON"""
        response = client.put('/user/user123/profile', 
                            data="invalid json",
                            content_type='application/json')

        assert response.status_code == 400

    @patch('teli_routes.db')
    def test_update_profile_includes_updated_timestamp(self, mock_db, client, mock_user_doc, mock_updated_user_doc):
        """Test that updated_at timestamp is included in update"""
        # Setup mocks
        mock_db.collection.return_value.document.return_value.get.side_effect = [
            mock_user_doc,
            mock_updated_user_doc
        ]
        mock_db.collection.return_value.where.return_value.limit.return_value.get.return_value = []

        request_data = {
            "name": "Updated Name"
        }

        response = client.put('/user/user123/profile', 
                            data=json.dumps(request_data),
                            content_type='application/json')

        assert response.status_code == 200
        
        # Verify that update was called with updated_at timestamp
        update_call_args = mock_user_doc.reference.update.call_args[0][0]
        assert "updated_at" in update_call_args
        assert "name" in update_call_args
        assert "name_lowercase" in update_call_args
