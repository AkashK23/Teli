import pytest
import firebase_admin
from firebase_admin import credentials, firestore
import os
from app import create_app

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
