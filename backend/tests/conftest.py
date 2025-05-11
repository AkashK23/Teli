import pytest
import firebase_admin
from firebase_admin import credentials, firestore
import os
from unittest.mock import patch, MagicMock
from app import create_app

# Mock Firebase setup for testing
@pytest.fixture(scope="session")
def mock_firebase():
    # Create a mock for Firebase credentials and client
    cred_mock = MagicMock(spec=credentials.Certificate)
    client_mock = MagicMock(spec=firestore.Client)
    
    # Mock the collection references
    collections = {
        "users": MagicMock(),
        "follows": MagicMock(),
        "ratings": MagicMock(),
        "watchlists": MagicMock(),
        "feeds": MagicMock()
    }
    
    # Set up the client mock to return collection references
    client_mock.collection.side_effect = lambda name: collections[name]
    
    # Return the mock objects for use in tests
    return {
        "cred": cred_mock,
        "client": client_mock,
        "collections": collections
    }

@pytest.fixture(scope="module")
def get_client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(scope="module")
def get_db():
    from firebase_db import db
    yield db

# Optional fixture to use a real database for integration tests
@pytest.fixture(scope="module")
def real_db():
    # This uses the real Firestore connection from the app
    # Only use for integration tests
    from firebase_db import db
    yield db